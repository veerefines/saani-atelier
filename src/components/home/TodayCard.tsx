'use client';

import { useEffect, useMemo, useState } from 'react';
import { hourIn, useNow } from './Clock';

type Today = {
  weather: null | { now: number; feels: number; min: number; max: number; rainChance: number; rainFrom: string | null; sunset: string; sky: { icon: string; words: string } };
  outfit: string | null;
  phrase: { it: string; en: string; when: string };
};

type Zone = { city: string; zone: string };
const AWAKE = { from: 8, to: 23 }; // hours people are happy to pick up

/** For each hour in Milano today, who's awake where. */
function callWindow(now: Date, zones: Zone[]) {
  const milanHour = hourIn(now, 'Europe/Rome');
  const hours = Array.from({ length: 24 }, (_, h) => {
    const at = new Date(now.getTime() + (h - milanHour) * 3_600_000);
    const awake = zones.map((z) => {
      const local = hourIn(at, z.zone);
      return local >= AWAKE.from && local < AWAKE.to;
    });
    return { h, awake, all: awake.every(Boolean) };
  });
  const best = hours.filter((x) => x.all).map((x) => x.h);
  return { hours, best, milanHour };
}

const fmtRange = (hs: number[]) => {
  if (!hs.length) return null;
  // group consecutive hours
  const runs: [number, number][] = [];
  for (const h of hs) {
    const last = runs[runs.length - 1];
    if (last && h === last[1] + 1) last[1] = h;
    else runs.push([h, h]);
  }
  return runs.map(([a, b]) => `${String(a).padStart(2, '0')}:00–${String(b + 1).padStart(2, '0')}:00`).join(' and ');
};

function speak(text: string) {
  if (!('speechSynthesis' in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'it-IT';
  const it = speechSynthesis.getVoices().find((v) => v.lang.startsWith('it'));
  if (it) u.voice = it;
  u.rate = 0.9;
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
}

/** Top of her desk: Milano weather and what to wear, a phrase to practise, and when to call home. */
export default function TodayCard({ zones }: { zones: Zone[] }) {
  const now = useNow(60_000);
  const [t, setT] = useState<Today | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    fetch('/api/today')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setT)
      .catch(() => setFailed(true));
  }, []);

  const call = useMemo(() => (now ? callWindow(now, zones) : null), [now, zones]);
  const bestText = call ? fmtRange(call.best) : null;
  const upcoming = call?.best.filter((h) => h >= call.milanHour) ?? [];

  return (
    <section className="today" aria-label="Today">
      <div className="today-weather">
        {t?.weather ? (
          <>
            <div className="today-temp">
              <span className="today-icon" aria-hidden="true">
                {t.weather.sky.icon}
              </span>
              <b>{t.weather.now}°</b>
              <span>
                Milano, {t.weather.sky.words}
                <small>
                  {t.weather.min}°–{t.weather.max}° · feels {t.weather.feels}° · sunset {t.weather.sunset}
                </small>
              </span>
            </div>
            <p className="today-outfit">
              <span className="hand">wear</span> {t.outfit}
            </p>
          </>
        ) : (
          <p className="today-loading">{failed ? 'Couldn’t reach the weather just now.' : 'Checking the sky over Milano…'}</p>
        )}
      </div>

      {t?.phrase && (
        <div className="today-phrase">
          <span className="hand">parola del giorno</span>
          <p lang="it">
            <b>{t.phrase.it}</b>
            <button type="button" className="today-say" onClick={() => speak(t.phrase.it)} aria-label={`Hear “${t.phrase.it}” in Italian`}>
              🔊
            </button>
          </p>
          <small>
            {t.phrase.en} · <i>{t.phrase.when}</i>
          </small>
        </div>
      )}

      {call && (
        <div className="today-call">
          <span className="hand">good time to call</span>
          <div className="today-hours" aria-hidden="true">
            {call.hours.map((x) => (
              <i
                key={x.h}
                className={`${x.all ? 'all' : x.awake.some(Boolean) ? 'some' : ''}${x.h === call.milanHour ? ' now' : ''}`}
                title={`${String(x.h).padStart(2, '0')}:00 Milano`}
              />
            ))}
          </div>
          <div className="today-hours-scale" aria-hidden="true">
            <span>00</span>
            <span>06</span>
            <span>12</span>
            <span>18</span>
            <span>24</span>
          </div>
          <small>
            {bestText
              ? upcoming.length
                ? `Everyone’s awake ${bestText} Milano time.`
                : `Everyone was awake ${bestText}; try tomorrow.`
              : `No hour today when ${zones.map((z) => z.city).join(', ')} are all awake. Message, then call whoever’s up.`}
          </small>
        </div>
      )}
    </section>
  );
}
