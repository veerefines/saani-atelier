'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { DEFAULT_PREFS, type AudioPrefs } from '@/lib/audio-prefs';
import { moodSrc } from '@/lib/jelly-mood';
import { THEME_NAMES, themeFor, type ThemeId } from '@/lib/music';
import { haptic, sfx, usePrefs, voice } from '@/lib/sound';
import { PETTED } from '@/components/jelly/lines';

const CORNERS: [ThemeId, string][] = [
  ['desk', 'Your desk'],
  ['italia', 'Milano & passport'],
  ['love', 'Letters, love wall & jar'],
  ['studio', 'My Corner, chapter & checklist'],
  ['runway', 'Lookbook & moments'],
  ['play', 'Bingo'],
  ['ocean', 'Jelly’s Corner'],
];

/** One volume slider, with a little preview when she lets go. */
function Level({ icon, label, hint, value, onChange, onTry }: { icon: string; label: string; hint: string; value: number; onChange: (v: number) => void; onTry: () => void }) {
  return (
    <div className="ss-row">
      <span className="ss-icon" aria-hidden="true">
        {icon}
      </span>
      <div className="ss-text">
        <b>{label}</b>
        <small>{hint}</small>
      </div>
      <label className="ss-slider">
        <span className="ss-sr">{label} volume</span>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={Math.round(value * 100)}
          style={{ ['--v' as string]: `${Math.round(value * 100)}%` }}
          onChange={(e) => onChange(Number(e.target.value) / 100)}
          onPointerUp={onTry}
          onKeyUp={onTry}
        />
        <output>{value === 0 ? 'off' : `${Math.round(value * 100)}%`}</output>
      </label>
    </div>
  );
}

/** Sound & feel: one switch for everything at the bottom of her desk, and a panel for the details. */
export default function SoundSettings() {
  const [p, set] = usePrefs();
  const [open, setOpen] = useState(false);
  const here = themeFor(usePathname());
  const change = (patch: Partial<AudioPrefs>) => set(patch);

  return (
    <section className={`sound-switch${p.on ? ' on' : ''}${open ? ' open' : ''}`} aria-label="Sound and feel">
      <div className="ss-head">
        <img src={moodSrc(p.on ? 'joyful' : 'sleepy')} alt="" width={64} height={64} />
        <div>
          <b>Sound & feel</b>
          <small>{p.on ? 'Music in every corner, little jingles, Jelly’s voice and gentle buzzes.' : 'All quiet. Jelly will just smile and wave.'}</small>
        </div>
        <button
          type="button"
          role="switch"
          data-quiet
          aria-checked={p.on}
          aria-label="Voices and sounds"
          onClick={() => {
            change({ on: !p.on });
            if (!p.on) setTimeout(() => (sfx('sparkle'), haptic('success')), 80);
          }}
        >
          <span className="sound-knob" aria-hidden="true">
            {p.on ? '🔊' : '🔇'}
          </span>
          <span className="sound-label">{p.on ? 'On' : 'Off'}</span>
        </button>
      </div>

      <button type="button" className="ss-more" onClick={() => setOpen(!open)} aria-expanded={open}>
        ⚙️ {open ? 'Hide settings' : 'Settings: volume for each sound'} <span aria-hidden="true">{open ? '▴' : '▾'}</span>
      </button>

      {open && (
        <div className={`ss-panel${p.on ? '' : ' muted'}`}>
          {!p.on && <p className="ss-note">Sound is off. Turn it on above to hear any of these.</p>}
          <Level icon="🎵" label="Background music" hint={here ? `Now: ${THEME_NAMES[here]}` : 'No music on this page'} value={p.music} onChange={(music) => change({ music })} onTry={() => {}} />
          <ul className="ss-tunes" aria-label="A tune for every corner">
            {CORNERS.map(([id, where]) => (
              <li key={id} className={id === here ? 'on' : ''}>
                <b>{where}</b> {THEME_NAMES[id]}
              </li>
            ))}
          </ul>
          <Level icon="🔔" label="Sounds & jingles" hint="Taps, achievements, stamps, pats" value={p.sfx} onChange={(sfx_) => change({ sfx: sfx_ })} onTry={() => sfx('sparkle')} />
          <Level icon="🪼" label="Jelly’s voice" hint="Her chatter, facts, cheers and answers read aloud" value={p.voice} onChange={(v) => change({ voice: v })} onTry={() => voice(PETTED[0]) || sfx('blip')} />
          <Level icon="🎙️" label="Voice notes & videos" hint="From your people, and your moments" value={p.notes} onChange={(notes) => change({ notes })} onTry={() => {}} />
          <div className="ss-row">
            <span className="ss-icon" aria-hidden="true">
              📳
            </span>
            <div className="ss-text">
              <b>Vibration</b>
              <small>Little buzzes on iPhone (iOS 18+) and Android</small>
            </div>
            <button
              type="button"
              role="switch"
              data-quiet
              aria-checked={p.haptics}
              className={`ss-toggle${p.haptics ? ' on' : ''}`}
              onClick={() => {
                change({ haptics: !p.haptics });
                if (!p.haptics) setTimeout(() => haptic('success'), 30);
              }}
            >
              <span aria-hidden="true" />
              <span className="ss-sr">Vibration</span>
            </button>
          </div>
          <button type="button" className="ss-reset" onClick={() => change({ ...DEFAULT_PREFS })}>
            Back to the usual levels
          </button>
        </div>
      )}
    </section>
  );
}
