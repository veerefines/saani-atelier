'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

export type Unlocked = { role: 'saanika' | 'wellwisher'; name: string };

export default function GiftTag({
  initialError,
  onUnlocked,
}: {
  initialError?: string;
  onUnlocked: (who: Unlocked) => void;
}) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(
    initialError === 'link' ? "That link didn't open anything. Type your code instead." : '',
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || busy) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      if (!res.ok) {
        setError("That code didn't open anything. Check it matches what was sent to you.");
        setBusy(false);
        return;
      }
      const data = (await res.json()) as Unlocked;
      onUnlocked(data);
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
      setBusy(false);
    }
  }

  return (
    <motion.div
      className="tag-wrap"
      initial={false}
      animate={{ rotate: [-1.5, 1.5, -1.5] }}
      transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      exit={{ rotate: 16, y: 480, opacity: 0, transition: { duration: 0.8, ease: 'easeIn' } }}
    >
      <img className="tag-pin" src="/reveal/tag-top.webp" alt="" draggable={false} />
      <div className="tag">
        <h1 className="hand tag-title">For Saanika</h1>
        <p className="whisper tag-sub">Type the code that came with your link.</p>
        <form onSubmit={submit}>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="your code"
            aria-label="Invite code"
            aria-invalid={Boolean(error)}
            autoComplete="off"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
          />
          <button className="cta" type="submit" disabled={busy || !code.trim()}>
            {busy ? 'Opening' : 'Open'}
          </button>
        </form>
        {error && (
          <p className="tag-error" role="alert">
            {error}
          </p>
        )}
      </div>
    </motion.div>
  );
}
