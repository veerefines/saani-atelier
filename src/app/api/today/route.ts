import { milanoWeather, outfit, sky } from '@/lib/today';
import { phraseOfDay } from '@/content/italian';
import { milanDay } from '@/lib/extras';
import { requireSession, isResponse, json } from '@/lib/api';

/** The Today card: Milano weather, an outfit idea and the Italian phrase of the day. */
export async function GET() {
  const s = await requireSession('saanika');
  if (isResponse(s)) return s;
  const w = await milanoWeather();
  return json({
    weather: w ? { ...w, sky: sky(w.code, w.isDay) } : null,
    outfit: w ? outfit(w) : null,
    phrase: phraseOfDay(milanDay()),
  });
}
