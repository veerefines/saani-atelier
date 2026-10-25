'use client';

import { useEffect, useRef, useState } from 'react';

export const MAX_AUDIO_SECS = 180;
export const MAX_VIDEO_SECS = 90;

/** Safari's recorder can stall when asked for small slices, so it records in one piece there. */
const isSafari = () => typeof navigator !== 'undefined' && /^((?!chrome|android|crios|fxios).)*safari/i.test(navigator.userAgent);

/**
 * Records audio, or video with sound, in the browser.
 * Stop always works: it ends the recording and frees the camera right away, and if the browser
 * never reports back (an iPhone Safari quirk), the recording is put together from what's been captured.
 */
export function useRecorder(kind: 'audio' | 'video') {
  const [state, setState] = useState<'idle' | 'starting' | 'recording' | 'stopping' | 'done' | 'denied' | 'failed'>('idle');
  const [blob, setBlob] = useState<Blob | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [secs, setSecs] = useState(0);
  const rec = useRef<MediaRecorder | null>(null);
  const live = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<number>(0);
  const watchdog = useRef<number>(0);
  const finished = useRef(false);
  const max = kind === 'video' ? MAX_VIDEO_SECS : MAX_AUDIO_SECS;

  /** Wrap up exactly once, whether the browser reported back or not. */
  function finish() {
    if (finished.current) return;
    finished.current = true;
    clearInterval(timer.current);
    clearTimeout(watchdog.current);
    live.current?.getTracks().forEach((t) => t.stop());
    live.current = null;
    setStream(null);
    const r = rec.current;
    const type = (r?.mimeType || (kind === 'video' ? 'video/mp4' : 'audio/mp4')).split(';')[0];
    if (!chunks.current.length) {
      setState('failed');
      return;
    }
    setBlob(new Blob(chunks.current, { type }));
    setState('done');
  }

  async function start() {
    setState('starting');
    try {
      const s = await navigator.mediaDevices.getUserMedia(
        kind === 'video' ? { audio: true, video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } } : { audio: true },
      );
      const types =
        kind === 'video'
          ? ['video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']
          : ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm'];
      const type = types.find((t) => MediaRecorder.isTypeSupported(t));
      // keep a full-length recording comfortably under the 50 MB upload limit (~30 MB for 90s of video)
      const bits = kind === 'video' ? { videoBitsPerSecond: 2_500_000, audioBitsPerSecond: 128_000 } : { audioBitsPerSecond: 96_000 };
      const r = new MediaRecorder(s, { ...(type ? { mimeType: type } : {}), ...bits });
      chunks.current = [];
      finished.current = false;
      r.ondataavailable = (e) => {
        if (e.data && e.data.size) chunks.current.push(e.data);
      };
      // the normal ending: the last piece has arrived
      r.onstop = () => setTimeout(finish, 0);
      live.current = s;
      setStream(s);
      if (isSafari()) r.start();
      else r.start(1000);
      rec.current = r;
      setSecs(0);
      setState('recording');
      timer.current = window.setInterval(() => {
        setSecs((n) => {
          if (n + 1 >= max) setTimeout(stop, 0);
          return n + 1;
        });
      }, 1000);
    } catch {
      setState('denied');
    }
  }

  function stop() {
    const r = rec.current;
    if (!r || finished.current) return;
    clearInterval(timer.current);
    setState('stopping');
    try {
      if (r.state === 'recording') {
        r.requestData?.();
        r.stop();
      }
    } catch {}
    // if the browser never reports back, finish with what was captured
    watchdog.current = window.setTimeout(finish, 2500);
  }

  const reset = () => {
    const r = rec.current;
    finished.current = true;
    if (r && r.state !== 'inactive') {
      r.onstop = null;
      try {
        r.stop();
      } catch {}
    }
    live.current?.getTracks().forEach((t) => t.stop());
    live.current = null;
    clearInterval(timer.current);
    clearTimeout(watchdog.current);
    chunks.current = [];
    setStream(null);
    setBlob(null);
    setState('idle');
    setSecs(0);
  };
  useEffect(
    () => () => {
      clearInterval(timer.current);
      clearTimeout(watchdog.current);
      live.current?.getTracks().forEach((t) => t.stop());
    },
    [],
  );
  return { state, blob, stream, secs, max, start, stop, reset };
}

export const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/** An object URL that's cleaned up when the thing changes. */
export function useObjectUrl(b: Blob | null) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    if (!b) return setUrl('');
    const u = URL.createObjectURL(b);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [b]);
  return url;
}

/** Live camera preview while recording. */
export function LiveCam({ stream }: { stream: MediaStream }) {
  const v = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (v.current) v.current.srcObject = stream;
  }, [stream]);
  return <video ref={v} className="w-preview w-live" autoPlay muted playsInline />;
}

