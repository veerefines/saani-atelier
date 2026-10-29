'use client';

import { useEffect, useState } from 'react';

type Platform = 'ios' | 'android' | 'other';
type InstallEvent = Event & { prompt: () => Promise<void> };

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;

/** "Keep it on your phone": the exact steps on iPhone (Safari can't prompt), a real button where the browser can. */
export default function InviteInstall({ code }: { code: string }) {
  const [platform, setPlatform] = useState<Platform>('other');
  const [notSafari, setNotSafari] = useState(false);
  const [prompt, setPrompt] = useState<InstallEvent | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // opened from the home screen (older iPhones start on this page rather than the magic link): carry on in
    if (isStandalone()) {
      window.location.replace(`/hello/${encodeURIComponent(code)}`);
      return;
    }
    const ua = navigator.userAgent;
    const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
    setPlatform(ios ? 'ios' : /Android/.test(ua) ? 'android' : 'other');
    setNotSafari(ios && /CriOS|FxiOS|EdgiOS|FBAN|FBAV|Instagram|Line\//.test(ua));
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as InstallEvent);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, [code]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {}
  }

  return (
    <section className="inv-keep" aria-labelledby="inv-keep-h">
      <h2 id="inv-keep-h" className="hand inv-keep-title">keep it on your phone</h2>
      <p className="inv-keep-sub">So it opens like an app, full screen, with its own little icon.</p>

      {platform === 'ios' ? (
        <>
          {notSafari ? (
            <p className="inv-warn">
              This only works from <b>Safari</b>. Tap <b>Copy link</b>, open Safari and paste it there.
            </p>
          ) : null}
          <ol className="inv-steps">
            <li>
              <span className="inv-n">1</span>
              <span>
                Tap the <b>Share</b> button <span className="inv-glyph" aria-hidden="true">⬆︎</span> at the bottom of Safari
                <small> (or <b>•••</b> then <b>Share</b>)</small>
              </span>
            </li>
            <li>
              <span className="inv-n">2</span>
              <span>Scroll down and tap <b>Add to Home Screen</b> <span className="inv-glyph" aria-hidden="true">＋</span></span>
            </li>
            <li>
              <span className="inv-n">3</span>
              <span>Keep <b>Open as Web App</b> switched on, then tap <b>Add</b></span>
            </li>
            <li>
              <span className="inv-n">4</span>
              <span>Open <b>{`Saani’s Atelier`}</b> from your home screen. You will already be inside.</span>
            </li>
          </ol>
          <button type="button" className="inv-copy" onClick={copyLink}>
            {copied ? 'Copied ♡' : 'Copy link'}
          </button>
        </>
      ) : platform === 'android' ? (
        prompt ? (
          <button
            type="button"
            className="cta"
            onClick={async () => {
              await prompt.prompt();
              setPrompt(null);
            }}
          >
            Add to home screen
          </button>
        ) : (
          <p className="inv-warn">
            In Chrome tap <b>⋮</b> then <b>Add to Home screen</b> (or <b>Install app</b>), then open it from there.
          </p>
        )
      ) : (
        <>
          <p className="inv-warn">Best on your phone: open this same link there and it will show you how.</p>
          <button type="button" className="inv-copy" onClick={copyLink}>
            {copied ? 'Copied ♡' : 'Copy link'}
          </button>
        </>
      )}
    </section>
  );
}
