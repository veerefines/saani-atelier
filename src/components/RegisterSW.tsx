'use client';

import { useEffect } from 'react';

/** The service worker keeps pages and photos for offline use, and shows notifications (and the icon's badge). */
export default function RegisterSW() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const go = () => navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {});
    if (document.readyState === 'complete') go();
    else window.addEventListener('load', go, { once: true });
    // opening the atelier clears the number on its home-screen icon
    const clear = () => document.visibilityState === 'visible' && (navigator as { clearAppBadge?: () => Promise<void> }).clearAppBadge?.().catch(() => {});
    clear();
    document.addEventListener('visibilitychange', clear);
    return () => document.removeEventListener('visibilitychange', clear);
  }, []);
  return null;
}
