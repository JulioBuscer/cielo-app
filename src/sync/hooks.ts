import { getOrCreateDeviceId } from './device';
import { useSyncContext } from './SyncProvider';

let lastSignalTime = 0;
const MIN_SIGNAL_INTERVAL = 2000;

export function useSync() {
  return useSyncContext();
}

export async function signalPeers() {
  const now = Date.now();
  if (now - lastSignalTime < MIN_SIGNAL_INTERVAL) return;
  lastSignalTime = now;

  try {
    const deviceId = await getOrCreateDeviceId();
    const { signalAllPeers } = await import('./presence');
    await signalAllPeers(deviceId);
  } catch (e) {
    console.warn('[Sync] signalPeers falló:', e);
  }
}

export { SyncProvider, useSyncContext } from './SyncProvider';
