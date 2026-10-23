'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Spot } from '@/content/milano';

export type HereStatus = 'off' | 'asking' | 'on' | 'denied' | 'unavailable';

const KEY = 'sa_here';

/**
 * Where she is, only when she asks. It stays in her browser (kept for this visit so
 * the page doesn't ask again on every reload) and is never sent to our server.
 */
export function useHere() {
  const [status, setStatus] = useState<HereStatus>('off');
  const [at, setAt] = useState<Spot | null>(null);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(KEY);
      if (saved) {
        setAt(JSON.parse(saved));
        setStatus('on');
      }
    } catch {}
  }, []);

  const ask = useCallback(() => {
    if (!('geolocation' in navigator)) return setStatus('unavailable');
    setStatus('asking');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const spot = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        try {
          sessionStorage.setItem(KEY, JSON.stringify(spot));
        } catch {}
        setAt(spot);
        setStatus('on');
      },
      (err) => setStatus(err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable'),
      { enableHighAccuracy: false, timeout: 12_000, maximumAge: 5 * 60_000 },
    );
  }, []);

  return { status, at, ask };
}
