import database from '@react-native-firebase/database';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PRESENCE_PATH = 'presence';
const SIGNALS_PATH = 'sync_signals';
const PAIRED_STORAGE = '@sync/paired_devices';
const PRESENCE_TTL = 60000;

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
  const ref = database().ref(`${PRESENCE_PATH}/${deviceId}`);
  await ref.set({
    sessionId,
    lastSeen: Date.now(),
    deviceId,
  });
  ref.onDisconnect().remove();
}

export async function removePresence(deviceId: string) {
  await database().ref(`${PRESENCE_PATH}/${deviceId}`).remove();
}

export function listenKnownPeers(
  knownDeviceIds: string[],
  callback: (online: { deviceId: string; sessionId: string }[]) => void,
): () => void {
  if (knownDeviceIds.length === 0) return () => {};

  const unsubs = knownDeviceIds.map((deviceId) => {
    const ref = database().ref(`${PRESENCE_PATH}/${deviceId}`);
    const listener = ref.on('value', (snapshot) => {
      const val = snapshot.val();
      if (val && val.sessionId && (Date.now() - val.lastSeen) < PRESENCE_TTL) {
        callback([{ deviceId, sessionId: val.sessionId }]);
      } else {
        callback([]);
      }
    });
    return () => ref.off('value', listener);
  });

  return () => unsubs.forEach((fn) => fn());
}

// ─── SYNC SIGNALS ───────────────────────────────────────────────────────────

export async function sendSyncSignal(targetDeviceId: string, senderDeviceId: string) {
  await database().ref(`${SIGNALS_PATH}/${targetDeviceId}/${senderDeviceId}`).set({
    timestamp: Date.now(),
    senderDeviceId,
  });
}

export async function signalAllPeers(senderDeviceId: string) {
  const devices = await getPairedDevices();
  const promises = devices
    .filter((d) => d.deviceId !== senderDeviceId)
    .map((d) => sendSyncSignal(d.deviceId, senderDeviceId));
  await Promise.all(promises);
}

export function listenSyncSignals(
  deviceId: string,
  callback: (signal: { senderDeviceId: string; timestamp: number }) => void,
): () => void {
  const ref = database().ref(`${SIGNALS_PATH}/${deviceId}`);
  const listener = ref.on('child_added', (snapshot) => {
    const val = snapshot.val();
    if (val && val.senderDeviceId && val.timestamp) {
      callback({ senderDeviceId: val.senderDeviceId, timestamp: val.timestamp });
    }
  });
  return () => ref.off('child_added', listener);
}
