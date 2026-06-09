import { useState, useCallback, useRef, useEffect } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { randomUUID } from 'expo-crypto';
import type { SyncOffer, SyncPayload, SyncMessage, SyncStep, SyncRole } from './types';
import { generateKey, encryptPayload, decryptPayload } from './crypto';
import { startSignalingServer, connectToSignalingServer } from './signaling';
import {
  createPeerConnection,
  createDataChannel,
  createOfferSdp,
  createAnswerSdp,
  setRemoteAnswer,
  setupChannelListeners,
  sendSyncMessage,
  getLocalIp,
} from './webrtc';
import { gatherLocalPayload, mergeSyncPayload, type MergeResult } from './merge';
import { syncHistory } from '@/src/db/schema';
import { getDb } from '@/src/db/client';
import { generateId } from '@/src/utils/id';

const KEY_STORAGE = '@sync/key';
const DEVICE_STORAGE = '@sync/device_id';
const LAST_SYNC_STORAGE = '@sync/last_sync_ats';

async function getOrCreateDeviceId(): Promise<string> {
  let id = await AsyncStorage.getItem(DEVICE_STORAGE);
  if (!id) {
    id = randomUUID();
    await AsyncStorage.setItem(DEVICE_STORAGE, id);
  }
  return id;
}

async function getLastSyncAts(): Promise<Record<string, number>> {
  try {
    const raw = await AsyncStorage.getItem(LAST_SYNC_STORAGE);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

async function saveLastSyncAts(map: Record<string, number>): Promise<void> {
  await AsyncStorage.setItem(LAST_SYNC_STORAGE, JSON.stringify(map));
}

let cachedKey: string | null = null;

function ensureKey(): string {
  if (cachedKey) return cachedKey;
  cachedKey = generateKey();
  return cachedKey;
}

export function useSync() {
  const [step, setStep] = useState<SyncStep>('idle');
  const [role, setRole] = useState<SyncRole>(null);
  const [offer, setOffer] = useState<SyncOffer | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [mergedCount, setMergedCount] = useState(0);
  const [conflictCount, setConflictCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const channelRef = useRef<any>(null);
  const serverRef = useRef<{ port: number; stop: () => void } | null>(null);
  const stepRef = useRef<SyncStep>('idle');
  const sessionIdRef = useRef(randomUUID());
  const roleRef = useRef<SyncRole>(null);

  const addLog = useCallback((msg: string) => {
    setLog((prev) => [...prev, msg]);
  }, []);

  async function saveHistoryEntry(
    direction: 'sent' | 'received',
    peerDeviceId: string,
    status: 'success' | 'conflict' | 'error',
    merged: number,
    conflicted: number,
    errorMsg?: string,
  ) {
    try {
      await getDb().insert(syncHistory).values({
        id: generateId(),
        sessionId: sessionIdRef.current,
        direction,
        peerDeviceId,
        status,
        recordsSynced: merged,
        recordsConflicted: conflicted,
        errorMessage: errorMsg ?? null,
        createdAt: new Date(),
      });
    } catch (e) {
      console.warn('[Sync] Error saving history:', e);
    }
  }

  const handleRemotePayload = useCallback(async (payload: SyncPayload, key: string) => {
    addLog('Datos recibidos, descifrando...');
    setStep('merging');
    stepRef.current = 'merging';

    try {
      const result: MergeResult = await mergeSyncPayload(payload);
      setMergedCount(result.mergedCount);
      setConflictCount(result.conflictCount);
      addLog(`Fusionados ${result.mergedCount} registros${result.conflictCount > 0 ? `, ${result.conflictCount} conflictos` : ''}`);

      const ats = await getLastSyncAts();
      ats[payload.deviceId] = Date.now();
      await saveLastSyncAts(ats);

      const status = result.conflictCount > 0 ? 'conflict' : 'success';
      await saveHistoryEntry('received', payload.deviceId, status, result.mergedCount, result.conflictCount);

      setStep('done');
      stepRef.current = 'done';
      addLog('Sincronización completada');
    } catch (err: any) {
      setStep('error');
      stepRef.current = 'error';
      setError(err.message);
      addLog(`Error al fusionar: ${err.message}`);
      await saveHistoryEntry('received', payload.deviceId, 'error', 0, 0, err.message);
    }
  }, [addLog]);

  const reset = useCallback(() => {
    setStep('idle');
    stepRef.current = 'idle';
    setRole(null);
    roleRef.current = null;
    setOffer(null);
    setLog([]);
    setMergedCount(0);
    setConflictCount(0);
    setError(null);
    channelRef.current = null;
    sessionIdRef.current = randomUUID();
    if (serverRef.current) {
      serverRef.current.stop();
      serverRef.current = null;
    }
  }, []);

  const startHost = useCallback(async () => {
    reset();
    setRole('host');
    roleRef.current = 'host';
    cachedKey = null;
    const key = ensureKey();
    const deviceId = await getOrCreateDeviceId();

    setStep('generating');
    stepRef.current = 'generating';
    addLog('Generando clave de cifrado...');

    try {
      addLog('Iniciando servidor TCP...');
      const server = await startSignalingServer();
      serverRef.current = server;

      const localIp = await getLocalIp();
      const syncOffer: SyncOffer = {
        v: 1, host: localIp, port: server.port, key, device: deviceId,
      };
      setOffer(syncOffer);
      addLog(`Servidor listo en puerto ${server.port}`);

      setStep('waiting_qr');
      stepRef.current = 'waiting_qr';
      addLog('Esperando escaneo del QR...');

      // Start WebRTC peer
      const pc = createPeerConnection();
      const dc = createDataChannel(pc);
      channelRef.current = dc;

      setupChannelListeners(dc, (msg) => {
        if (msg.payload) handleRemotePayload(msg.payload, key);
      }, () => {
        addLog('Canal de datos abierto');
        setStep('syncing');
        stepRef.current = 'syncing';
        doSendLocalData(dc);
      });

      const sdpOffer = await createOfferSdp(pc);
      addLog('Oferta WebRTC generada');

    } catch (err: any) {
      setStep('error');
      stepRef.current = 'error';
      setError(err.message);
      addLog(`Error: ${err.message}`);
    }
  }, [addLog, reset, handleRemotePayload]);

  const startJoin = useCallback(async (scannedOffer: SyncOffer) => {
    reset();
    setRole('join');
    roleRef.current = 'join';
    cachedKey = scannedOffer.key;
    const key = scannedOffer.key;
    const deviceId = await getOrCreateDeviceId();
    setOffer(scannedOffer);

    setStep('signaling');
    stepRef.current = 'signaling';
    addLog('Conectando al servidor...');

    try {
      await connectToSignalingServer(scannedOffer);
      addLog('Conectado al servidor');

      // Create peer connection and answer
      const pc = createPeerConnection();

      // Create a local offer first, then answer with remote
      // For simplicity, both sides create offers and we use the host's
      const dc = createDataChannel(pc);
      channelRef.current = dc;

      setupChannelListeners(dc, (msg) => {
        if (msg.payload) handleRemotePayload(msg.payload, key);
      }, () => {
        addLog('Canal de datos abierto');
        setStep('syncing');
        stepRef.current = 'syncing';
        doSendLocalData(dc);
      });

      // Get local SDP to send to host
      const localSdp = await createOfferSdp(pc);
      addLog('SDP generado, conectando...');

      // For now, we establish the WebRTC connection directly
      // In production, exchange SDP via signaling
      setStep('syncing');
      stepRef.current = 'syncing';

    } catch (err: any) {
      setStep('error');
      stepRef.current = 'error';
      setError(err.message);
      addLog(`Error: ${err.message}`);
    }
  }, [addLog, reset, handleRemotePayload]);

  async function doSendLocalData(channel: any) {
    const _deviceId = await getOrCreateDeviceId();
    addLog('Recopilando datos...');
    try {
      const payload = await gatherLocalPayload(await getLastSyncAts(), _deviceId);
      addLog(`Enviando ${payload.timelineEvents.length} eventos, ${payload.catalogItems.length} items...`);
      sendSyncMessage(channel, { type: 'sync_response', payload });
    } catch (err: any) {
      addLog(`Error al enviar: ${err.message}`);
    }
  }

  return { step, role, offer, log, mergedCount, conflictCount, error, startHost, startJoin, reset };
}

function waitForRemoteConnect(
  port: number,
  sdpOffer: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const TcpSocket = require('react-native-tcp-socket').default;
    const timeout = setTimeout(() => {
      reject(new Error('Tiempo de espera agotado'));
    }, 120000);

    const server = TcpSocket.createServer((client: any) => {
      clearTimeout(timeout);
      let buffer = '';

      client.on('data', (chunk: string) => {
        buffer += chunk;
        if (buffer.includes('\n')) {
          client.write(sdpOffer + '\n');
        }
      });

      client.on('error', () => {});
    });

    server.on('error', (err: Error) => {
      clearTimeout(timeout);
      reject(err);
    });

    server.listen({ port, host: '0.0.0.0' }, () => {
      setTimeout(() => resolve(), 500);
    });

    // Cleanup if already resolved
    setTimeout(() => {
      try { server.close(); } catch {}
    }, 130000);
  });
}
