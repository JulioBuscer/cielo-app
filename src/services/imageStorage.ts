import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

const CIELO_DIR = `${FileSystem.documentDirectory}cielo/diapers/`;

async function ensureDir() {
  const info = await FileSystem.getInfoAsync(CIELO_DIR);
  if (!info.exists) await FileSystem.makeDirectoryAsync(CIELO_DIR, { intermediates: true });
}

export async function captureAndStore(): Promise<string | null> {
  const { granted } = await ImagePicker.requestCameraPermissionsAsync();
  if (!granted) return null;

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.7, allowsEditing: false, base64: false,
  });

  if (result.canceled || !result.assets[0]) return null;
  await ensureDir();
  const dest = `${CIELO_DIR}${crypto.randomUUID()}.jpg`;
  await FileSystem.moveAsync({ from: result.assets[0].uri, to: dest });
  return dest;
}

export async function deletePhoto(uri: string) {
  const info = await FileSystem.getInfoAsync(uri);
  if (info.exists) await FileSystem.deleteAsync(uri, { idempotent: true });
}
