'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { MOOD_NAMES, radioPause, radioSkip, useRadio } from '@/lib/radio';
import { setExternalMusic } from '@/lib/music';
import { spotifyKind, spotifyUri } from '@/lib/spotify';
import { api } from '@/lib/upload-client';
import { isUnlocked, usePrefs } from '@/lib/sound';
import type { JellyView } from '@/lib/jelly';

type Station = 'italia' | 'saani';
type Controller = { loadUri: (uri: string) => void; play: () => void; pause: () => void; togglePlay: () => void; destroy: () => void; addListener: (e: string, f: (ev: { data: { isPaused: boolean } }) => void) => void };
type IFrameAPI = { createController: (el: HTMLElement, o: { uri: string; width: string; height: number }, cb: (c: Controller) => void) => void };
declare global {
  interface Window {
    onSpotifyIframeApiReady?: (api: IFrameAPI) => void;
    __spotifyApi?: Promise<IFrameAPI>;
  }
}

/** Spotify's official player, loaded once (only when she first opens Saani's radio). */
function spotifyApi(): Promise<IFrameAPI> {
  if (!window.__spotifyApi)
    window.__spotifyApi = new Promise((res) => {
      window.onSpotifyIframeApiReady = res;
      const s = document.createElement('script');
      s.src = 'https://open.spotify.com/embed/iframe-api/v1';
      s.async = true;
      document.body.appendChild(s);
    });
  return window.__spotifyApi;
}

const LABEL: Record<string, string> = { playlist: 'playlist', album: 'album', artist: 'artist', track: 'song', show: 'podcast', episode: 'episode' };

/**
 * The radio in the corner: a little round icon that opens (on hover, or a tap on phones) into two
 * stations: Radio Italia, her Italian music; and Saani's radio, her own Spotify, through Spotify's
 * official player. When Spotify plays, Radio Italia steps aside.
 */
export default function RadioChip({ friend = false }: { friend?: boolean }) {
  const r = useRadio();
  // browsers wait for a first tap before any sound; until then, a gentle hint
  const [waiting, setWaiting] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => !isUnlocked() && setWaiting(true), 1500);
    const done = () => setWaiting(false);
    window.addEventListener('jelly:unlocked', done);
    return () => {
      clearTimeout(id);
      window.removeEventListener('jelly:unlocked', done);
    };
  }, []);
  const [prefs, setPrefs] = usePrefs();
  const [peek, setPeek] = useState(false);
  const [open, setOpen] = useState(false);
  const [station, setStation] = useState<Station>('italia');
  const [uri, setUri] = useState<string | null>(null);
  const [link, setLink] = useState('');
  const [editing, setEditing] = useState(false);
  const [err, setErr] = useState('');
  const [spotifyPlaying, setSpotifyPlaying] = useState(false);
  const [mountSpotify, setMountSpotify] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const holder = useRef<HTMLDivElement>(null);
  const ctl = useRef<Controller | null>(null);
  const closeAt = useRef(0);

  // her connected playlist, from the server
  useEffect(() => {
    if (friend) return; // Saani's radio is hers
    api<{ spotify: string | null }>('/api/jelly/settings', 'GET')
      .then((d) => d.spotify && setUri(d.spotify))
      .catch(() => {});
    try {
      if (!friend && localStorage.getItem('radio-station') === 'saani') setStation('saani');
    } catch {}
  }, []);

  // Spotify's player, made once and kept (so music carries on while the radio is folded away)
  useEffect(() => {
    if (!mountSpotify || !uri || !holder.current) return;
    if (ctl.current) {
      ctl.current.loadUri(uri);
      return;
    }
    const el = document.createElement('div');
    holder.current.appendChild(el);
    spotifyApi().then((a) =>
      a.createController(el, { uri, width: '100%', height: 152 }, (c) => {
        ctl.current = c;
        c.addListener('playback_update', (e) => {
          const playing = !e.data.isPaused;
          setSpotifyPlaying(playing);
          if (playing) radioPause(true); // Radio Italia steps aside (she can press play to go back)
          setExternalMusic(playing);
        });
      }),
    );
  }, [mountSpotify, uri]);

  // a new song: the name of its mood peeks out beside the record for a moment
  useEffect(() => {
    if (!r.track || r.paused) return;
    setPeek(true);
    const id = setTimeout(() => setPeek(false), 3800);
    return () => clearTimeout(id);
  }, [r.track, r.paused]);

  // Spotify loads the first time she opens Saani's radio (not on every page)
  useEffect(() => {
    if (open && station === 'saani') setMountSpotify(true);
  }, [open, station]);

  // sound turned off: Spotify stops too
  useEffect(() => {
    if (!prefs.on) ctl.current?.pause();
  }, [prefs.on]);

  // close on a tap outside
  useEffect(() => {
    if (!open) return;
    const h = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    window.addEventListener('pointerdown', h);
    return () => window.removeEventListener('pointerdown', h);
  }, [open]);

  const pick = useCallback((s: Station) => {
    setStation(s);
    try {
      localStorage.setItem('radio-station', s);
    } catch {}
    if (s === 'saani') setMountSpotify(true);
  }, []);

  async function connect(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    if (!spotifyUri(link)) return setErr('That doesn’t look like a Spotify link. In Spotify, tap ⋯ → Share → Copy link.');
    try {
      const v = await api<JellyView>('/api/jelly/settings', 'PATCH', { spotify: link });
      setUri(v.spotify ?? null);
      setLink('');
      setEditing(false);
      setMountSpotify(true);
    } catch (x) {
      setErr((x as Error).message);
    }
  }
  async function disconnect() {
    ctl.current?.pause();
    ctl.current?.destroy();
    ctl.current = null;
    if (holder.current) holder.current.innerHTML = '';
    setSpotifyPlaying(false);
    setExternalMusic(false);
    setUri(null);
    setMountSpotify(false);
    api('/api/jelly/settings', 'PATCH', { spotify: null }).catch(() => {});
  }
  const playItalia = () => {
    ctl.current?.pause();
    radioPause(false);
  };

  if (!prefs.on) return null;
  const italiaPlaying = r.on && !r.paused;
  const playing = spotifyPlaying ? 'saani' : italiaPlaying ? 'italia' : null;
  const mood = r.mood ? MOOD_NAMES[r.mood].split(' · ') : null;
  const hover = (v: boolean) => (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    clearTimeout(closeAt.current);
    if (v) setOpen(true);
    else closeAt.current = window.setTimeout(() => !box.current?.contains(document.activeElement) && setOpen(false), 450);
  };

  return (
    <div ref={box} className={`radio${open ? ' open' : ''}${playing ? ` playing ${playing}` : ''}`} onPointerEnter={hover(true)} onPointerLeave={hover(false)}>
      <button type="button" className="radio-icon" data-quiet onClick={() => setOpen(!open)} aria-expanded={open} aria-label={open ? 'Close the radio' : `Open the radio${playing ? ' (playing)' : ''}`}>
        <span className={`radio-disc${playing === 'saani' || (!playing && station === 'saani') ? ' green' : ''}`} aria-hidden="true">
          <span className="radio-disc-label" />
        </span>
        {playing && (
          <span className="radio-notes" aria-hidden="true">
            <i>♪</i>
            <i>♫</i>
            <i>♪</i>
          </span>
        )}
      </button>
      {waiting && !open && (
        <span className="radio-peek hint" aria-live="polite">
          <b>Tap anywhere</b> for music 🎶
        </span>
      )}
      {peek && !waiting && !open && playing === 'italia' && mood && (
        <span className="radio-peek" aria-live="polite">
          <b>{mood[0]}</b> {mood[1]}
        </span>
      )}

      {/* the card stays in the page while folded, so Spotify keeps playing */}
      <div className="radio-card" role="region" aria-label="Radio" aria-hidden={!open}>
        <div className="radio-head">
          <span className={`radio-disc big${station === 'saani' ? ' green' : ''}${playing === station ? ' spin' : ''}`} aria-hidden="true">
            <span className="radio-disc-label" />
          </span>
          <span className="radio-text">
            <small>{playing === station ? 'On air' : 'Radio'}</small>
            <b>{station === 'italia' ? 'Radio Italia' : 'Saani’s radio'}</b>
            <em>
              {station === 'saani'
                ? uri
                  ? spotifyPlaying
                    ? 'Playing your Spotify'
                    : 'Your Spotify, ready when you are'
                  : 'Your own Spotify music'
                : prefs.style === 'tunes'
                  ? 'Corner tunes are on (see Sound & feel)'
                  : spotifyPlaying
                    ? 'Resting while Saani’s radio plays'
                    : mood
                      ? `${mood[0]} · ${mood[1]}`
                      : 'Tap play to start'}
            </em>
          </span>
          <span className={`radio-wave${playing === station ? ' on' : ''}`} aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
            <i />
          </span>
        </div>

        <div className="radio-tabs" role="tablist" aria-label="Station" hidden={friend}>
          <button type="button" role="tab" aria-selected={station === 'italia'} onClick={() => pick('italia')}>
            Radio Italia
          </button>
          <button type="button" role="tab" aria-selected={station === 'saani'} onClick={() => pick('saani')}>
            Saani’s radio
          </button>
        </div>

        {station === 'italia' && (
          <div className="radio-controls">
            <button type="button" className="radio-play" onClick={() => (italiaPlaying ? radioPause(true) : playItalia())} aria-label={italiaPlaying ? 'Pause' : 'Play'} disabled={prefs.style === 'tunes'}>
              {italiaPlaying ? (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8 5.5v13l11-6.5z" />
                </svg>
              )}
            </button>
            <button type="button" className="radio-skip" onClick={() => (ctl.current?.pause(), radioSkip())} aria-label="Next song" disabled={prefs.style === 'tunes'}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M5 5.5v13l9-6.5zM15 5h3v14h-3z" />
              </svg>
            </button>
            <label className="radio-vol">
              <span aria-hidden="true">🔈</span>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={Math.round(prefs.music * 100)}
                style={{ ['--v' as string]: `${Math.round(prefs.music * 100)}%` }}
                onChange={(e) => setPrefs({ music: Number(e.target.value) / 100 })}
                aria-label="Music volume"
              />
            </label>
          </div>
        )}

        <div className="radio-saani" hidden={station !== 'saani'}>
          {(!uri || editing) && (
            <form className="radio-connect" onSubmit={connect}>
              <b>Connect your Spotify</b>
              <small>Paste a link to any playlist, album or artist. In Spotify: ⋯ → Share → Copy link.</small>
              <span className="radio-field">
                <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://open.spotify.com/playlist/…" aria-label="Spotify link" inputMode="url" />
                <button type="submit" className="radio-btn" aria-label="Connect" disabled={!link.trim()}>
                  ✓
                </button>
              </span>
              {err && <small className="radio-err">{err}</small>}
              {uri && (
                <button type="button" className="radio-link" onClick={() => setEditing(false)}>
                  Keep the one I have
                </button>
              )}
            </form>
          )}
          <div ref={holder} className="radio-spotify" hidden={!uri || editing} />
          {uri && !editing && (
            <span className="radio-row">
              <small>
                Your {LABEL[spotifyKind(uri)] ?? 'music'} · full songs when you’re{' '}
                <a href="https://accounts.spotify.com/login" target="_blank" rel="noreferrer">
                  logged in to Spotify
                </a>{' '}
                in this browser
              </small>
              <button type="button" className="radio-link" onClick={() => setEditing(true)}>
                Change
              </button>
              <button type="button" className="radio-link" onClick={disconnect}>
                Disconnect
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
