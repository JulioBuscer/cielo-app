import { randomUUID } from 'expo-crypto';

const DB_PATH = 'sessions';

let _db: any = null;
let _dbError = false;
async function getDb() {
  if (_db) return _db;
  if (_dbError) throw new Error('Firebase no disponible');
  try {
    const mod = await import('@react-native-firebase/database');
    _db = typeof mod === 'function' ? mod : mod.default;
    return _db;
  } catch (e) {
    _dbError = true;
    throw e;
  }
}

export type FirebaseSessionData = {
  hostSdp?: string;
  joinSdp?: string;
  status: 'waiting' | 'paired' | 'done';
  createdAt: number;
};

export async function createSession(): Promise<string> {
  const sessionId = randomUUID();
  const ref = (await getDb()).ref(`${DB_PATH}/${sessionId}`);
  await ref.set({
    status: 'waiting',
    createdAt: Date.now(),
  });
  return sessionId;
}

export async function writeHostSdp(sessionId: string, sdp: string) {
  await (await getDb()).ref(`${DB_PATH}/${sessionId}/hostSdp`).set(sdp);
}

export async function writeJoinSdp(sessionId: string, sdp: string) {
  await (await getDb()).ref(`${DB_PATH}/${sessionId}/joinSdp`).set(sdp);
}

export async function updateSessionStatus(sessionId: string, status: 'waiting' | 'paired' | 'done') {
  await (await getDb()).ref(`${DB_PATH}/${sessionId}/status`).set(status);
}

export function listenHostSdp(
  sessionId: string,
  callback: (sdp: string) => void,
  onError: (err: Error) => void,
): () => void {
  const unsubs: (() => void)[] = [];
  getDb().then((db) => {
    const ref = db.ref(`${DB_PATH}/${sessionId}/hostSdp`);
    const listener = ref.on('value', (snapshot: any) => {
      const sdp = snapshot.val();
      if (sdp) callback(sdp);
    }, onError);
    unsubs.push(() => ref.off('value', listener));
  }).catch(() => {});
  return () => unsubs.forEach((fn) => fn());
}

export function listenJoinSdp(
  sessionId: string,
  callback: (sdp: string) => void,
  onError: (err: Error) => void,
): () => void {
  const unsubs: (() => void)[] = [];
  getDb().then((db) => {
    const ref = db.ref(`${DB_PATH}/${sessionId}/joinSdp`);
    const listener = ref.on('value', (snapshot: any) => {
      const sdp = snapshot.val();
      if (sdp) callback(sdp);
    }, onError);
    unsubs.push(() => ref.off('value', listener));
  }).catch(() => {});
  return () => unsubs.forEach((fn) => fn());
}

export async function cleanupSession(sessionId: string) {
  await (await getDb()).ref(`${DB_PATH}/${sessionId}`).remove();
}

export function listenSessionStatus(
  sessionId: string,
  callback: (status: string) => void,
): () => void {
  const unsubs: (() => void)[] = [];
  getDb().then((db) => {
    const ref = db.ref(`${DB_PATH}/${sessionId}/status`);
    const listener = ref.on('value', (snapshot: any) => {
      const status = snapshot.val();
      if (status) callback(status);
    });
    unsubs.push(() => ref.off('value', listener));
  }).catch(() => {});
  return () => unsubs.forEach((fn) => fn());
}
