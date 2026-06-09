import database from '@react-native-firebase/database';
import { randomUUID } from 'expo-crypto';

const DB_PATH = 'sessions';

export type FirebaseSessionData = {
  hostSdp?: string;
  joinSdp?: string;
  status: 'waiting' | 'paired' | 'done';
  createdAt: number;
};

export async function createSession(): Promise<string> {
  const sessionId = randomUUID();
  const ref = database().ref(`${DB_PATH}/${sessionId}`);
  await ref.set({
    status: 'waiting',
    createdAt: Date.now(),
  });
  return sessionId;
}

export async function writeHostSdp(sessionId: string, sdp: string) {
  await database().ref(`${DB_PATH}/${sessionId}/hostSdp`).set(sdp);
}

export async function writeJoinSdp(sessionId: string, sdp: string) {
  await database().ref(`${DB_PATH}/${sessionId}/joinSdp`).set(sdp);
}

export async function updateSessionStatus(sessionId: string, status: 'waiting' | 'paired' | 'done') {
  await database().ref(`${DB_PATH}/${sessionId}/status`).set(status);
}

export function listenHostSdp(
  sessionId: string,
  callback: (sdp: string) => void,
  onError: (err: Error) => void,
): () => void {
  const ref = database().ref(`${DB_PATH}/${sessionId}/hostSdp`);
  const listener = ref.on('value', (snapshot) => {
    const sdp = snapshot.val();
    if (sdp) callback(sdp);
  }, onError);
  return () => ref.off('value', listener);
}

export function listenJoinSdp(
  sessionId: string,
  callback: (sdp: string) => void,
  onError: (err: Error) => void,
): () => void {
  const ref = database().ref(`${DB_PATH}/${sessionId}/joinSdp`);
  const listener = ref.on('value', (snapshot) => {
    const sdp = snapshot.val();
    if (sdp) callback(sdp);
  }, onError);
  return () => ref.off('value', listener);
}

export async function cleanupSession(sessionId: string) {
  await database().ref(`${DB_PATH}/${sessionId}`).remove();
}

export function listenSessionStatus(
  sessionId: string,
  callback: (status: string) => void,
): () => void {
  const ref = database().ref(`${DB_PATH}/${sessionId}/status`);
  const listener = ref.on('value', (snapshot) => {
    const status = snapshot.val();
    if (status) callback(status);
  });
  return () => ref.off('value', listener);
}
