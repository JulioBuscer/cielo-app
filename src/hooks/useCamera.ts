import { useState, useCallback } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { captureAndStore, deletePhoto } from '@/src/services/imageStorage';

export function useCamera() {
  const [uri, setUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const takePhoto = useCallback(async () => {
    setLoading(true);
    try { const r = await captureAndStore(); setUri(r); return r; }
    finally { setLoading(false); }
  }, []);

  const pickImage = useCallback(async () => {
    setLoading(true);
    try {
      const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!granted) return null;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.7,
        allowsEditing: false,
      });
      if (result.canceled || !result.assets[0]) return null;
      const r = result.assets[0].uri;
      setUri(r);
      return r;
    } finally { setLoading(false); }
  }, []);

  const discard = useCallback(async () => {
    if (uri) { await deletePhoto(uri); setUri(null); }
  }, [uri]);

  return { uri, takePhoto, pickImage, discard, loading };
}
