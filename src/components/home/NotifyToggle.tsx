'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/upload-client';

type State = 'loading' | 'off' | 'on' | 'busy' | 'denied' | 'install' | 'unsupported' | 'unavailable';

function keyBytes(base64url: string) {
  const pad = '='.repeat((4 - (base64url.length % 4)) % 4);
  const raw = atob((base64url + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const standalone = () => window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;

/** "Tell me when something new arrives": web push for her, on this device. */
export default function NotifyToggle() {
  const [state, setState] = useState<State>('loading');
  const [err, setErr] = useState('');

  useEffect(() => {
    (async () => {
      const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
      if (!supported) return setState(isIOS() && !standalone() ? 'install' : 'unsupported');
      if (Notification.permission === 'denied') return setState('denied');
      try {
        const reg = await navigator.serviceWorker.getRegistration('/');
        const sub = await reg?.pushManager.getSubscription();
        setState(sub ? 'on' : 'off');
      } catch {
        setState('off');
      }
    })();
  }, []);

  async function turnOn() {
    setErr('');
    setState('busy');
    try {
      const { enabled, publicKey } = await api<{ enabled: boolean; publicKey: string | null }>('/api/push', 'GET');
      if (!enabled || !publicKey) return setState('unavailable');
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return setState(permission === 'denied' ? 'denied' : 'off');
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) }));
      await api('/api/push', 'POST', { subscription: sub.toJSON() });
      setState('on');
    } catch (e) {
      setErr((e as Error).message || 'Couldn’t turn notifications on.');
      setState('off');
    }
  }

  async function turnOff() {
    setErr('');
    setState('busy');
    try {
      const reg = await navigator.serviceWorker.getRegistration('/');
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await api('/api/push', 'DELETE', { endpoint: sub.endpoint }).catch(() => {});
        await sub.unsubscribe();
      }
      setState('off');
    } catch (e) {
      setErr((e as Error).message);
      setState('on');
    }
  }

  if (state === 'loading' || state === 'unsupported') return null;

  return (
    <div className="h-notify">
      {state === 'install' ? (
        <p>
          🔔 To get a ping when your people send something: tap <b>Share</b> → <b>Add to Home Screen</b>, open the atelier from there, then turn it on here.
        </p>
      ) : state === 'denied' ? (
        <p>🔔 Notifications are blocked for this site. Allow them in your browser or phone settings, then come back.</p>
      ) : state === 'unavailable' ? (
        <p>🔔 Notifications aren’t switched on for the atelier yet.</p>
      ) : (
        <button
          className={`h-notify-btn${state === 'on' ? ' on' : ''}`}
          onClick={state === 'on' ? turnOff : turnOn}
          disabled={state === 'busy'}
          aria-pressed={state === 'on'}
        >
          <span aria-hidden="true">{state === 'on' ? '🔔' : '🔕'}</span>
          {state === 'busy' ? 'One moment…' : state === 'on' ? 'You’ll get a ping when something new arrives' : 'Tell me when something new arrives'}
        </button>
      )}
      {err && <p className="h-err">{err}</p>}
    </div>
  );
}
