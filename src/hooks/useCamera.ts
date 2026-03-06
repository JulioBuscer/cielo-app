import { useState, useCallback } from 'react';
import { captureAndStore, deletePhoto } from '@/src/services/imageStorage';

export function useCamera() {
  const [uri, setUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const capture = useCallback(async () => {
    setLoading(true);
    try { const r = await captureAndStore(); setUri(r); return r; }
    finally { setLoading(false); }
  }, []);

  const discard = useCallback(async () => {
    if (uri) { await deletePhoto(uri); setUri(null); }
  }, [uri]);

  return { uri, capture, discard, loading };
}
