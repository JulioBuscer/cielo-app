import { useState, useCallback, useRef, useEffect, createContext, useContext, type ReactNode } from 'react';
import { NativeModules, AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getOrCreateDeviceId } from './device';
import type { SyncOffer, SyncPayload, SyncMessage, SyncStep, SyncRole, PairedDevice } from './types';
import { generateKey } from './crypto';
import { gatherLocalPayload, mergeSyncPayload, type MergeResult } from './merge';
import { syncHistory } from '@/src/db/schema';
import { getDb } from '@/src/db/client';
import { generateId } from '@/src/utils/id';

const LAST_SYNC_STORAGE = '@sync/last_sync_ats';
const PEER_NAME_PREFIX = 'Dispositivo';
const PRESENCE_HEARTBEAT_MS = 30000;
const PERIODIC_SYNC_MS = 300000;

interface SyncContextValue {
  step: SyncStep;
  role: SyncRole;
  offer: SyncOffer | null;
  log: string[];
  mergedCount: number;
  conflictCount: number;
  error: string | null;
  pairedDevices: PairedDevice[];
  knownPeers: { deviceId: string; sessionId: string }[];
  startHost: (targetPeerId?: string) => Promise<void>;
  startJoin: (offer: SyncOffer) => Promise<void>;
  reset: () => Promise<void>;
}

const SyncContext = createContext<SyncContextValue | null>(null);

export function useSyncContext(): SyncContextValue {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error('useSyncContext must be used within SyncProvider');
  return ctx;
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

function ensureKey(): string {
  return generateKey();
}

export function SyncProvider({ children }: { children: ReactNode }) {
  const [step, setStep] = useState<SyncStep>('idle');
  const [role, setRole] = useState<SyncRole>(null);
  const [offer, setOffer] = useState<SyncOffer | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [mergedCount, setMergedCount] = useState(0);
  const [conflictCount, setConflictCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pairedDevices, setPairedDevices] = useState<PairedDevice[]>([]);
  const [knownPeers, setKnownPeers] = useState<{ deviceId: string; sessionId: string }[]>([]);

  const channelRef = useRef<any>(null);
  const pcRef = useRef<any>(null);
  const stepRef = useRef<SyncStep>('idle');
  const sessionIdRef = useRef<string>('');
  const cleanupRef = useRef<Array<() => void>>([]);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(null);
  const pairedDeviceIdRef = useRef<string>('');
  const heartbeatRef = useRef<ReturnType<typeof setInterval>>(null);
  const periodicSyncRef = useRef<ReturnType<typeof setInterval>>(null);
  const cachedKeyRef = useRef<string | null>(null);

  const isSyncInProgress = () => {
    const s = stepRef.current;
    return s === 'signaling' || s === 'connecting_webrtc' || s === 'syncing' || s === 'merging';
  };

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

  const handleRemotePayload = useCallback(async (payload: SyncPayload) => {
    addLog('Datos recibidos, descifrando...');
    setStep('merging');
    stepRef.current = 'merging';

    try {
      const payloadSummary = `events=${payload.timelineEvents?.length ?? 0} items=${payload.catalogItems?.length ?? 0} tags=${payload.tags?.length ?? 0} profiles=${payload.profiles?.length ?? 0} babies=${payload.babies?.length ?? 0} ops=${payload.operations?.length ?? 0}`;
      addLog(`Payload recibido: ${payloadSummary}`);
      console.log('[Sync] Payload recibido:', {
        deviceId: payload.deviceId?.slice(0,8),
        timestamp: new Date(payload.timestamp).toISOString(),
        events: payload.timelineEvents?.length ?? 0,
        items: payload.catalogItems?.length ?? 0,
        tags: payload.tags?.length ?? 0,
        profiles: payload.profiles?.length ?? 0,
        babies: payload.babies?.length ?? 0,
        ops: payload.operations?.length ?? 0,
        hasTimelineEvents: !!payload.timelineEvents,
        hasCatalogItems: !!payload.catalogItems,
        hasTags: !!payload.tags,
        hasProfiles: !!payload.profiles,
        hasBabies: !!payload.babies,
        hasOperations: !!payload.operations,
        sampleIds: {
          events: payload.timelineEvents?.slice(0,2).map((r: any) => r?.id),
          items: payload.catalogItems?.slice(0,2).map((r: any) => r?.id),
          babies: payload.babies?.slice(0,2).map((r: any) => r?.id),
        },
      });
      const result: MergeResult = await mergeSyncPayload(payload, addLog);
      setMergedCount(result.mergedCount);
      setConflictCount(result.conflictCount);
      addLog(`Fusionados ${result.mergedCount} registros${result.conflictCount > 0 ? `, ${result.conflictCount} conflictos` : ''}`);

      const ats = await getLastSyncAts();
      ats[payload.deviceId] = Date.now();
      await saveLastSyncAts(ats);

      const status = result.conflictCount > 0 ? 'conflict' : 'success';
      await saveHistoryEntry('received', payload.deviceId, status, result.mergedCount, result.conflictCount);

      const { getPairedDevices, savePairedDevice } = await import('./presence');
      const devices = await getPairedDevices();
      const existing = devices.find((d) => d.deviceId === payload.deviceId);
      const device: PairedDevice = {
        deviceId: payload.deviceId,
        name: existing?.name ?? `${PEER_NAME_PREFIX} ${devices.length + 1}`,
        lastConnectedAt: Date.now(),
        sessionCount: (existing?.sessionCount ?? 0) + 1,
      };
      await savePairedDevice(device);
      pairedDeviceIdRef.current = payload.deviceId;
      setPairedDevices(await getPairedDevices());

      setStep('done');
      stepRef.current = 'done';
      addLog('Sincronización completada');
    } catch (err: any) {
      setStep('error');
      stepRef.current = 'error';
      const msg = err?.message || String(err) || 'Error desconocido';
      setError(msg);
      addLog(`Error al fusionar: ${msg}`);
      await saveHistoryEntry('received', payload.deviceId, 'error', 0, 0, msg);
    }
  }, [addLog]);

  async function doSendLocalData(channel: any) {
    const _deviceId = await getOrCreateDeviceId();
    addLog('Recopilando datos...');
    try {
      const payload = await gatherLocalPayload(await getLastSyncAts(), _deviceId, addLog);
      const { sendSyncMessage } = await import('./webrtc');
      sendSyncMessage(channel, { type: 'sync_response', payload });
    } catch (err: any) {
      addLog(`Error al enviar: ${err?.message || err}`);
    }
  }

  const reset = useCallback(async () => {
    runCleanup();
    const id = await getOrCreateDeviceId();
    const { removePresence } = await import('./presence');
    await removePresence(id).catch(() => {});
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

  const startHost = useCallback(async (targetPeerId?: string) => {
    runCleanup();
    setRole('host');
    cachedKeyRef.current = null;
    const key = ensureKey();
    cachedKeyRef.current = key;
    const deviceId = await getOrCreateDeviceId();

    setStep('generating');
    stepRef.current = 'generating';
    addLog('Generando clave de cifrado...');

    try {
      addLog('Creando sesión en Firebase...');
      const { createSession } = await import('./firebase');
      const sessionId = await createSession();
      sessionIdRef.current = sessionId;

      const { announcePresence } = await import('./presence');
      await announcePresence(deviceId, sessionId);
      addLog('Presencia anunciada');

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
      if (targetPeerId) {
        addLog(`Esperando conexión de dispositivo conocido...`);
      } else {
        addLog('Esperando escaneo del QR...');
      }

      const { createPeerConnection, createDataChannel, setupChannelListeners } = await import('./webrtc');
      const pc = createPeerConnection();
      pcRef.current = pc;
      const dc = createDataChannel(pc);
      channelRef.current = dc;

      setupChannelListeners(dc, (msg) => {
        if (msg.payload) handleRemotePayload(msg.payload);
      }, () => {
        addLog('Canal de datos abierto');
        setStep('syncing');
        stepRef.current = 'syncing';
        doSendLocalData(dc);
      });

      const { createOfferSdp } = await import('./webrtc');
      const sdpOffer = await createOfferSdp(pc);
      addLog('Oferta WebRTC generada');

      addLog('Publicando SDP en Firebase...');
      const { writeHostSdp } = await import('./firebase');
      await writeHostSdp(sessionId, sdpOffer);

      setStep('signaling');
      stepRef.current = 'signaling';
      addLog('Esperando respuesta...');

      const { listenJoinSdp, updateSessionStatus, cleanupSession } = await import('./firebase');
      const unsub = listenJoinSdp(sessionId, async (joinSdp) => {
        addLog('Respuesta recibida');
        runCleanup();
        try {
          const { setRemoteAnswer } = await import('./webrtc');
          await setRemoteAnswer(pc, joinSdp);
          addLog('Conexión WebRTC establecida');
          await updateSessionStatus(sessionId, 'paired');
        } catch (err: any) {
          addLog(`Error al conectar: ${err?.message || err}`);
        }
      }, (err) => {
        addLog(`Error de Firebase: ${err?.message || err}`);
      });
      cleanupRef.current.push(unsub);
      cleanupRef.current.push(() => {
        cleanupSession(sessionId).catch(() => {});
      });

      // If this is an auto-sync (triggered by a peer signal),
      // write host info so the peer can join
      if (targetPeerId) {
        const { writeHostInfo } = await import('./presence');
        await writeHostInfo(targetPeerId, deviceId, sessionId, key);
        addLog('Información de host enviada al dispositivo');
      }

    } catch (err: any) {
      setStep('error');
      stepRef.current = 'error';
      const msg = err?.message || String(err) || 'Error desconocido';
      setError(msg);
      addLog(`Error: ${msg}`);
    }
  }, [addLog, handleRemotePayload]);

  const startJoin = useCallback(async (scannedOffer: SyncOffer) => {
    runCleanup();
    setRole('join');
    cachedKeyRef.current = scannedOffer.key;
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
      const { createPeerConnection, setupChannelListeners } = await import('./webrtc');
      const pc = createPeerConnection();
      pcRef.current = pc;

      (pc as any).ondatachannel = (event: any) => {
        const dc = event.channel;
        channelRef.current = dc;
        setupChannelListeners(dc, (msg) => {
          if (msg.payload) handleRemotePayload(msg.payload);
        }, () => {
          addLog('Canal de datos abierto');
          setStep('syncing');
          stepRef.current = 'syncing';
          doSendLocalData(dc);
        });
      };

      const { listenHostSdp } = await import('./firebase');
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Tiempo de espera agotado esperando SDP del anfitrión')), 60000);
        const unsub = listenHostSdp(scannedOffer.sessionId!, async (hostSdp) => {
          clearTimeout(timeout);
          addLog('SDP del anfitrión recibido');
          try {
            const { createAnswerSdp } = await import('./webrtc');
            const answerSdp = await createAnswerSdp(pc, hostSdp);
            addLog('Respuesta SDP generada');
            const { writeJoinSdp } = await import('./firebase');
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
      const msg = err?.message || String(err) || 'Error desconocido';
      setError(msg);
      addLog(`Error: ${msg}`);
    }
  }, [addLog, handleRemotePayload]);

  // ─── PRESENCE HEARTBEAT ─────────────────────────────────────────────────

  const startHeartbeat = useCallback(async () => {
    const deviceId = await getOrCreateDeviceId();
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);

    const beat = async () => {
      try {
        const { announcePresence } = await import('./presence');
        await announcePresence(deviceId, sessionIdRef.current || 'heartbeat');
      } catch {}
    };

    await beat();
    heartbeatRef.current = setInterval(beat, PRESENCE_HEARTBEAT_MS);
  }, []);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  }, []);

  // ─── BACKGROUND SYNC ────────────────────────────────────────────────────

  const checkAndSync = useCallback(async () => {
    if (pairedDevices.length === 0) return;
    const { listenKnownPeers } = await import('./presence');
    const ids = pairedDevices.map((d) => d.deviceId);
    let found = false;
    const unsub = listenKnownPeers(ids, (online) => {
      if (online.length > 0 && !found) {
        found = true;
        startHost(online[0].deviceId);
      }
    });
    setTimeout(unsub, 5000);
  }, [pairedDevices, startHost]);

  // ─── LISTENERS ─────────────────────────────────────────────────────────

  // Load paired devices on mount
  useEffect(() => {
    (async () => {
      const { getPairedDevices } = await import('./presence');
      getPairedDevices().then(setPairedDevices);
    })();
  }, []);

  // Listen for known peers presence
  useEffect(() => {
    let unsub: (() => void) | null = null;
    (async () => {
      const { listenKnownPeers } = await import('./presence');
      const ids = pairedDevices.map((d) => d.deviceId);
      unsub = listenKnownPeers(ids, (online) => {
        setKnownPeers(online);
      });
    })();
    return () => { if (unsub) unsub(); };
  }, [pairedDevices]);

  // Listen for host info (when someone responds to our sync signal)
  useEffect(() => {
    let unsub: (() => void) | null = null;

    (async () => {
      const myId = await getOrCreateDeviceId();
      const { listenHostInfo } = await import('./presence');
      unsub = listenHostInfo(myId, async (info) => {
        addLog(`Host info recibida de ${info.senderDeviceId.slice(0, 6)}...`);

        if (isSyncInProgress()) return;

        await startJoin({
          v: 2,
          key: info.key,
          device: info.senderDeviceId,
          sessionId: info.sessionId,
        });
      });
    })();

    return () => {
      if (unsub) unsub();
    };
  }, [startJoin, addLog]);

  // Listen for sync signals from paired devices
  useEffect(() => {
    let unsub: (() => void) | null = null;

    (async () => {
      const myId = await getOrCreateDeviceId();
      const { listenSyncSignals } = await import('./presence');
      unsub = listenSyncSignals(myId, async (signal) => {
        const isPaired = pairedDevices.some((d) => d.deviceId === signal.senderDeviceId);
        if (!isPaired) return;

        if (isSyncInProgress()) return;

        addLog(`Señal de sync recibida de ${signal.senderDeviceId.slice(0, 6)}...`);

        if (signal.sessionId && signal.key) {
          await startJoin({
            v: 2,
            key: signal.key,
            device: signal.senderDeviceId,
            sessionId: signal.sessionId,
          });
        } else {
          await startHost(signal.senderDeviceId);
        }

        if (NativeModules.RNFBAppModule) {
          try {
            (await import('@react-native-firebase/database')).default()
              .ref(`sync_signals/${myId}/${signal.senderDeviceId}`).remove().catch(() => {});
          } catch {}
        }
      });
    })();

    return () => {
      if (unsub) unsub();
    };
  }, [pairedDevices, startHost, startJoin, addLog]);

  // Heartbeat: start on mount, stop on unmount
  useEffect(() => {
    startHeartbeat();
    return () => stopHeartbeat();
  }, [startHeartbeat, stopHeartbeat]);

  // Background sync: on app foreground + periodic
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      checkAndSync();
    });

    periodicSyncRef.current = setInterval(checkAndSync, PERIODIC_SYNC_MS);

    return () => {
      sub.remove();
      if (periodicSyncRef.current) clearInterval(periodicSyncRef.current);
    };
  }, [checkAndSync]);

  const value: SyncContextValue = {
    step, role, offer, log, mergedCount, conflictCount, error,
    pairedDevices, knownPeers,
    startHost, startJoin, reset,
  };

  return (
    <SyncContext.Provider value={value}>
      {children}
    </SyncContext.Provider>
  );
}
