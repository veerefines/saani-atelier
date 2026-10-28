'use client';

import { useEffect, useState } from 'react';
import { speakAnswer, speakBrief, stopVoice, useSound, type Speaking } from '@/lib/sound';

/** ▶ to hear Jelly read an answer (or the morning brief) aloud, and ⏸ to stop her. Hidden while sound is off. */
export default function SpeakButton({ chatId, turnId, brief, text, onPlay }: { chatId?: string; turnId?: string; brief?: string; text: string; onPlay?: () => void }) {
  const [on] = useSound();
  const [state, setState] = useState<Speaking>('idle');
  useEffect(() => () => void (state !== 'idle' && stopVoice()), []); // eslint-disable-line react-hooks/exhaustive-deps
  if (!on) return null;
  const busy = state !== 'idle';
  return (
    <button
      type="button"
      className={`jv-btn ${state}`}
      onClick={() => {
        if (busy) {
          stopVoice();
          setState('idle');
        } else {
          onPlay?.();
          if (brief) speakBrief(brief, text, setState);
          else speakAnswer(chatId!, turnId!, text, setState);
        }
      }}
      aria-label={busy ? 'Stop Jelly reading' : 'Hear Jelly read this'}
    >
      {state === 'loading' ? (
        <>
          <span className="jv-dots" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          Getting ready…
        </>
      ) : busy ? (
        <>
          <span className="jv-wave" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
          </span>
          {state === 'backup' ? 'Backup voice · Stop' : 'Stop'}
        </>
      ) : (
        <>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M8 5.5v13l11-6.5z" />
          </svg>
          Listen
        </>
      )}
    </button>
  );
}
