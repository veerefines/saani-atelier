'use client';

import { moodSrc } from '@/lib/jelly-mood';
import { sfx, useSound } from '@/lib/sound';

/** The one switch for every voice and sound on her desk, at the very bottom of it. */
export default function SoundSwitch() {
  const [on, set] = useSound();
  return (
    <section className={`sound-switch${on ? ' on' : ''}`} aria-label="Voices and sounds">
      <img src={moodSrc(on ? 'joyful' : 'sleepy')} alt="" width={64} height={64} />
      <div>
        <b>Jelly’s voice & sounds</b>
        <small>{on ? 'Jelly talks, and achievements, pats and stamps make little sounds.' : 'All quiet. Jelly will just smile and wave.'}</small>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={() => {
          set(!on);
          if (!on) setTimeout(() => sfx('sparkle'), 60);
        }}
      >
        <span className="sound-knob" aria-hidden="true">
          {on ? '🔊' : '🔇'}
        </span>
        <span className="sound-label">{on ? 'On' : 'Off'}</span>
      </button>
    </section>
  );
}
