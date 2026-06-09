import AsyncStorage from '@react-native-async-storage/async-storage';
import { randomUUID } from 'expo-crypto';

const DEVICE_STORAGE = '@sync/device_id';
let cachedDeviceId: string | null = null;

export async function getOrCreateDeviceId(): Promise<string> {
  if (cachedDeviceId) return cachedDeviceId;
  let id = await AsyncStorage.getItem(DEVICE_STORAGE);
  if (!id) {
    id = randomUUID();
    await AsyncStorage.setItem(DEVICE_STORAGE, id);
  }
  cachedDeviceId = id;
  return id;
}

export function getCachedDeviceId(): string | null {
  return cachedDeviceId;
}
