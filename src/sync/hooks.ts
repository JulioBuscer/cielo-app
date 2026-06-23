import { getOrCreateDeviceId } from './device';
import { useSyncContext } from './SyncProvider';
import { getActiveChannel, getLastOutboxSync, setLastOutboxSync } from './channelState';

let lastSignalTime = 0;
const MIN_SIGNAL_INTERVAL = 2000;

export function useSync() {
  return useSyncContext();
}

export async function signalPeers() {
  const channel = getActiveChannel();
  if (channel && channel.readyState === 'open') {
    try {
      const deviceId = await getOrCreateDeviceId();
      const lastSync = getLastOutboxSync();
      const { readOutbox } = await import('./outbox');
      const ops = await readOutbox(lastSync);
      if (ops.length > 0) {
        const { sendSyncMessage } = await import('./webrtc');
        for (const op of ops) {
          sendSyncMessage(channel, { type: 'operation', operation: op, deviceId });
        }
        setLastOutboxSync(Date.now());
      }
      return;
    } catch (e) {
      console.warn('[Sync] signalPeers channel send falló:', e);
    }
  }

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
