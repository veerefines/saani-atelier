'use client';

import { useEffect, useState } from 'react';
import { randomPhrase, type Phrase } from '@/content/italian';
import CallPlanner from './CallPlanner';

type Today = {
  weather: null | { now: number; feels: number; min: number; max: number; rainChance: number; rainFrom: string | null; sunset: string; sky: { icon: string; words: string } };
  outfit: string | null;
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

/** Top of her desk: Milano weather and what to wear, a new Italian word to learn, and when to call her people. */
export default function TodayCard() {
  const [t, setT] = useState<Today | null>(null);
  const [failed, setFailed] = useState(false);
  // picked on her screen, so every visit brings a new one
  const [phrase, setPhrase] = useState<Phrase | null>(null);

  useEffect(() => {
    setPhrase(randomPhrase());
    fetch('/api/today')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setT)
      .catch(() => setFailed(true));
  }, []);

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

      {phrase && (
        <div className="today-phrase">
          <span className="hand">impara l’italiano</span>
          <p lang="it">
            <b>{phrase.it}</b>
            <button type="button" className="today-say" onClick={() => speak(phrase.it)} aria-label={`Hear “${phrase.it}” in Italian`}>
              🔊
            </button>
          </p>
          <span className="today-pron">
            say it: <b>{phrase.say}</b>
          </span>
          <small>
            means <b>{phrase.en}</b> · <i>{phrase.when}</i>
          </small>
          <button type="button" className="today-more" onClick={() => setPhrase(randomPhrase(phrase.it))}>
            another one ↻
          </button>
        </div>
      )}

      <CallPlanner firstName="Saanika" />
    </section>
  );
}
