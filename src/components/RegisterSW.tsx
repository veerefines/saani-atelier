'use client';

import { useEffect } from 'react';

/** The service worker keeps pages and photos for offline use, and shows notifications. */
export default function RegisterSW() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const go = () => navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {});
    if (document.readyState === 'complete') go();
    else window.addEventListener('load', go, { once: true });
  }, []);
  return null;
}
