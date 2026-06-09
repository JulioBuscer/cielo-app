import { useState, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { randomUUID } from 'expo-crypto';
import type { SyncOffer, SyncPayload, SyncMessage, SyncStep, SyncRole } from './types';
import { generateKey } from './crypto';
import {
  createSession,
  writeHostSdp,
  writeJoinSdp,
  updateSessionStatus,
  listenJoinSdp,
  listenHostSdp,
  cleanupSession,
} from './firebase';
import {
  createPeerConnection,
  createDataChannel,
  createOfferSdp,
  createAnswerSdp,
  setRemoteAnswer,
  setupChannelListeners,
  sendSyncMessage,
} from './webrtc';
import { gatherLocalPayload, mergeSyncPayload, type MergeResult } from './merge';
import { syncHistory } from '@/src/db/schema';
import { getDb } from '@/src/db/client';
import { generateId } from '@/src/utils/id';

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
  const pcRef = useRef<any>(null);
  const stepRef = useRef<SyncStep>('idle');
  const sessionIdRef = useRef<string>('');
  const cleanupRef = useRef<Array<() => void>>([]);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

  const addLog = useCallback((msg: string) => {
    setLog((prev) => [...prev, msg]);
  }, []);

  function runCleanup() {
    cleanupRef.current.forEach((fn) => fn());
    cleanupRef.current = [];
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }

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
    runCleanup();
    setStep('idle');
    stepRef.current = 'idle';
    setRole(null);
    setOffer(null);
    setLog([]);
    setMergedCount(0);
    setConflictCount(0);
    setError(null);
    channelRef.current = null;
    pcRef.current = null;
    sessionIdRef.current = '';
  }, []);

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

  const startHost = useCallback(async () => {
    reset();
    setRole('host');
    cachedKey = null;
    const key = ensureKey();
    const deviceId = await getOrCreateDeviceId();

    setStep('generating');
    stepRef.current = 'generating';
    addLog('Generando clave de cifrado...');

    try {
      addLog('Creando sesión en Firebase...');
      const sessionId = await createSession();
      sessionIdRef.current = sessionId;

      const syncOffer: SyncOffer = {
        v: 2,
        key,
        device: deviceId,
        sessionId,
      };
      setOffer(syncOffer);
      addLog('Sesión creada');

      setStep('waiting_qr');
      stepRef.current = 'waiting_qr';
      addLog('Esperando escaneo del QR...');

      const pc = createPeerConnection();
      pcRef.current = pc;
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

      addLog('Publicando SDP en Firebase...');
      await writeHostSdp(sessionId, sdpOffer);

      setStep('signaling');
      stepRef.current = 'signaling';
      addLog('Esperando respuesta...');

      const unsub = listenJoinSdp(sessionId, async (joinSdp) => {
        addLog('Respuesta recibida');
        runCleanup();
        try {
          await setRemoteAnswer(pc, joinSdp);
          addLog('Conexión WebRTC establecida');
          await updateSessionStatus(sessionId, 'paired');
        } catch (err: any) {
          addLog(`Error al conectar: ${err.message}`);
        }
      }, (err) => {
        addLog(`Error de Firebase: ${err.message}`);
      });
      cleanupRef.current.push(unsub);
      cleanupRef.current.push(() => {
        cleanupSession(sessionId).catch(() => {});
      });

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
    cachedKey = scannedOffer.key;
    const key = scannedOffer.key;
    const deviceId = await getOrCreateDeviceId();
    sessionIdRef.current = scannedOffer.sessionId ?? '';
    setOffer(scannedOffer);

    if (!scannedOffer.sessionId) {
      setStep('error');
      stepRef.current = 'error';
      setError('Oferta inválida: sin sessionId');
      addLog('Error: sesión no encontrada en el QR');
      return;
    }

    setStep('signaling');
    stepRef.current = 'signaling';
    addLog('Esperando SDP del anfitrión...');

    try {
      const pc = createPeerConnection();
      pcRef.current = pc;
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

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Tiempo de espera agotado esperando SDP del anfitrión')), 60000);
        const unsub = listenHostSdp(scannedOffer.sessionId!, async (hostSdp) => {
          clearTimeout(timeout);
          addLog('SDP del anfitrión recibido');
          try {
            const answerSdp = await createAnswerSdp(pc, hostSdp);
            addLog('Respuesta SDP generada');
            await writeJoinSdp(scannedOffer.sessionId!, answerSdp);
            addLog('Respuesta publicada en Firebase');
            setStep('connecting_webrtc');
            stepRef.current = 'connecting_webrtc';
            resolve();
          } catch (err: any) {
            reject(err);
          }
        }, (err) => reject(err));
        cleanupRef.current.push(unsub);
      });

    } catch (err: any) {
      setStep('error');
      stepRef.current = 'error';
      setError(err.message);
      addLog(`Error: ${err.message}`);
    }
  }, [addLog, reset, handleRemotePayload]);

  return { step, role, offer, log, mergedCount, conflictCount, error, startHost, startJoin, reset };
}
