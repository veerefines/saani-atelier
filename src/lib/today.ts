import { clock12, fromHHMM } from './time';
/**
 * The Today card: Milano weather (Open-Meteo, free, no key) and an outfit idea a fashion student
 * would actually wear. Weather is cached for 30 minutes per server instance.
 */

export type Weather = {
  now: number;
  feels: number;
  min: number;
  max: number;
  code: number;
  wind: number;
  /** highest chance of rain in the rest of the day, and the first hour it's likely */
  rainChance: number;
  rainFrom: string | null;
  sunrise: string;
  sunset: string;
  isDay: boolean;
};

const URL_ =
  'https://api.open-meteo.com/v1/forecast?latitude=45.4642&longitude=9.19' +
  '&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,is_day' +
  '&hourly=precipitation_probability&daily=temperature_2m_max,temperature_2m_min,sunrise,sunset' +
  '&timezone=Europe%2FRome&forecast_days=1';

let cache: { at: number; w: Weather } | null = null;

export async function milanoWeather(): Promise<Weather | null> {
  if (cache && Date.now() - cache.at < 30 * 60_000) return cache.w;
  try {
    const r = await fetch(URL_, { cache: 'no-store', signal: AbortSignal.timeout(6000) });
    if (!r.ok) throw new Error(String(r.status));
    const j = await r.json();
    const hour = Number(String(j.current.time).slice(11, 13));
    const probs: number[] = j.hourly.precipitation_probability ?? [];
    const ahead = probs.map((p, h) => ({ p, h })).filter((x) => x.h >= hour);
    const likely = ahead.find((x) => x.p >= 50);
    const w: Weather = {
      now: Math.round(j.current.temperature_2m),
      feels: Math.round(j.current.apparent_temperature),
      min: Math.round(j.daily.temperature_2m_min[0]),
      max: Math.round(j.daily.temperature_2m_max[0]),
      code: j.current.weather_code,
      wind: Math.round(j.current.wind_speed_10m),
      rainChance: ahead.reduce((m, x) => Math.max(m, x.p), 0),
      rainFrom: likely ? clock12(likely.h) : null,
      sunrise: fromHHMM(String(j.daily.sunrise[0]).slice(11, 16)),
      sunset: fromHHMM(String(j.daily.sunset[0]).slice(11, 16)),
      isDay: j.current.is_day === 1,
    };
    cache = { at: Date.now(), w };
    return w;
  } catch {
    return cache?.w ?? null;
  }
}

/** WMO weather codes, in her words. */
export function sky(code: number, isDay = true) {
  if (code === 0) return { icon: isDay ? '☀️' : '🌙', words: 'clear' };
  if (code <= 2) return { icon: isDay ? '🌤️' : '☁️', words: 'a few clouds' };
  if (code === 3) return { icon: '☁️', words: 'grey and cloudy' };
  if (code === 45 || code === 48) return { icon: '🌫️', words: 'foggy (very Milano)' };
  if (code >= 51 && code <= 57) return { icon: '🌦️', words: 'drizzly' };
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return { icon: '🌧️', words: 'rainy' };
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { icon: '❄️', words: 'snowy' };
  if (code >= 95) return { icon: '⛈️', words: 'stormy' };
  return { icon: '🌤️', words: 'mixed' };
}

/** A real outfit for the day: layers from the feel, then rain, wind and sun on top. */
export function outfit(w: Weather): string {
  const t = Math.min(w.feels, w.min + 2);
  const base =
    t <= 2
      ? 'Your warmest coat, a chunky knit, scarf and gloves, boots with thick socks'
      : t <= 8
        ? 'A wool coat over a soft knit, a scarf, and ankle boots'
        : t <= 14
          ? 'A trench or leather jacket over a knit, straight jeans and loafers'
          : t <= 20
            ? 'A light jacket or cardigan you can take off later, with your favourite trousers'
            : t <= 26
              ? 'A linen shirt or a light dress, with sandals or clean trainers'
              : 'Something floaty and breathable, sunglasses, and a hat for the sun';
  const extras: string[] = [];
  if (w.rainChance >= 50) extras.push(w.rainFrom ? `take an umbrella, rain likely from ${w.rainFrom}` : 'take an umbrella');
  else if (w.rainChance >= 30) extras.push('a compact umbrella in your bag, just in case');
  if (w.wind >= 30) extras.push('it’s windy, so maybe not the floaty skirt');
  if (w.max - w.min >= 10) extras.push(`layers: it goes from ${w.min}° to ${w.max}°`);
  if (sky(w.code).words === 'clear' && w.max >= 18) extras.push('your Gentle Monsters');
  return extras.length ? `${base}. Plus: ${extras.join('; ')}.` : `${base}.`;
}
