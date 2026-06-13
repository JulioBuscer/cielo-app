import { NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PRESENCE_PATH = 'presence';
const SIGNALS_PATH = 'sync_signals';
const PAIRED_STORAGE = '@sync/paired_devices';
const PRESENCE_TTL = 120000;

let _db: any = null;
let _dbError = false;

async function getDb() {
  if (_db) return _db;
  if (_dbError) throw new Error('Firebase no disponible');

  if (!NativeModules.RNFBAppModule) {
    _dbError = true;
    throw new Error('Firebase no disponible en Expo Go');
  }

  try {
    const mod = await import('@react-native-firebase/database');
    const dbFn = typeof mod === 'function' ? mod : mod.default;
    _db = dbFn();
    return _db;
  } catch (e) {
    _dbError = true;
    throw e;
  }
}

export interface PairedDevice {
  deviceId: string;
  name: string;
  lastConnectedAt: number;
  sessionCount: number;
}

export async function getPairedDevices(): Promise<PairedDevice[]> {
  try {
    const raw = await AsyncStorage.getItem(PAIRED_STORAGE);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function savePairedDevice(device: PairedDevice) {
  const devices = await getPairedDevices();
  const idx = devices.findIndex((d) => d.deviceId === device.deviceId);
  if (idx >= 0) {
    devices[idx] = device;
  } else {
    devices.push(device);
  }
  await AsyncStorage.setItem(PAIRED_STORAGE, JSON.stringify(devices));
}

export async function announcePresence(deviceId: string, sessionId: string) {
  const ref = (await getDb()).ref(`${PRESENCE_PATH}/${deviceId}`);
  await ref.set({
    sessionId,
    lastSeen: Date.now(),
    deviceId,
  });
  ref.onDisconnect().remove();
}

export async function removePresence(deviceId: string) {
  const db = await getDb();
  await db.ref(`${PRESENCE_PATH}/${deviceId}`).remove();
}

export function listenKnownPeers(
  knownDeviceIds: string[],
  callback: (online: { deviceId: string; sessionId: string }[]) => void,
): () => void {
  if (knownDeviceIds.length === 0) return () => {};

  const unsubs: (() => void)[] = [];
  getDb().then((db) => {
    knownDeviceIds.forEach((deviceId) => {
      const ref = db.ref(`${PRESENCE_PATH}/${deviceId}`);
      const listener = ref.on('value', (snapshot: any) => {
        const val = snapshot.val();
        if (val && val.sessionId && (Date.now() - val.lastSeen) < PRESENCE_TTL) {
          callback([{ deviceId, sessionId: val.sessionId }]);
        } else {
          callback([]);
        }
      });
      unsubs.push(() => ref.off('value', listener));
    });
  }).catch(() => {});

  return () => unsubs.forEach((fn) => fn());
}

// ─── SYNC SIGNALS ───────────────────────────────────────────────────────

export async function sendSyncSignal(
  targetDeviceId: string,
  senderDeviceId: string,
  sessionId?: string,
  key?: string,
) {
  const db = await getDb();
  const data: any = {
    timestamp: Date.now(),
    senderDeviceId,
  };
  if (sessionId) data.sessionId = sessionId;
  if (key) data.key = key;
  await db.ref(`${SIGNALS_PATH}/${targetDeviceId}/${senderDeviceId}`).set(data);
}

export async function signalAllPeers(
  senderDeviceId: string,
  sessionId?: string,
  key?: string,
) {
  const devices = await getPairedDevices();
  const promises = devices
    .filter((d) => d.deviceId !== senderDeviceId)
    .map((d) => sendSyncSignal(d.deviceId, senderDeviceId, sessionId, key));
  await Promise.all(promises);
}

// ─── HOST INFO (auto-sync response) ────────────────────────────────────

export async function writeHostInfo(
  targetDeviceId: string,
  senderDeviceId: string,
  sessionId: string,
  key: string,
) {
  const db = await getDb();
  await db.ref(`sync_host_info/${targetDeviceId}/${senderDeviceId}`).set({
    sessionId,
    key,
    senderDeviceId,
    timestamp: Date.now(),
  });
}

export function listenHostInfo(
  deviceId: string,
  callback: (info: { sessionId: string; key: string; senderDeviceId: string }) => void,
): () => void {
  const unsubs: (() => void)[] = [];
  getDb().then((db) => {
    const ref = db.ref(`sync_host_info/${deviceId}`);
    const listener = ref.on('child_added', (snapshot: any) => {
      const val = snapshot.val();
      if (val && val.sessionId && val.key && val.senderDeviceId) {
        callback({
          sessionId: val.sessionId,
          key: val.key,
          senderDeviceId: val.senderDeviceId,
        });
        ref.child(snapshot.key).remove().catch(() => {});
      }
    });
    unsubs.push(() => ref.off('child_added', listener));
  }).catch(() => {});
  return () => unsubs.forEach((fn) => fn());
}

export function listenSyncSignals(
  deviceId: string,
  callback: (signal: {
    senderDeviceId: string;
    timestamp: number;
    sessionId?: string;
    key?: string;
  }) => void,
): () => void {
  const unsubs: (() => void)[] = [];
  getDb().then((db) => {
    const ref = db.ref(`${SIGNALS_PATH}/${deviceId}`);
    const listener = ref.on('child_added', (snapshot: any) => {
      const val = snapshot.val();
      if (val && val.senderDeviceId && val.timestamp) {
        callback({
          senderDeviceId: val.senderDeviceId,
          timestamp: val.timestamp,
          sessionId: val.sessionId,
          key: val.key,
        });
      }
    });
    unsubs.push(() => ref.off('child_added', listener));
  }).catch(() => {});
  return () => unsubs.forEach((fn) => fn());
}
