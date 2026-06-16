import { getOrCreateDeviceId } from './device';
import { useSyncContext } from './SyncProvider';

export function useSync() {
  return useSyncContext();
}

export async function signalPeers() {
  try {
    const deviceId = await getOrCreateDeviceId();
    const { signalAllPeers } = await import('./presence');
    await signalAllPeers(deviceId);
  } catch (e) {
    console.warn('[Sync] signalPeers falló:', e);
  }
}

export { SyncProvider, useSyncContext } from './SyncProvider';
