import { milanoWeather, outfit, sky } from '@/lib/today';
import { requireSession, isResponse, json } from '@/lib/api';

/** The Today card: Milano weather, and an outfit idea (the Italian phrase is picked on her screen). */
export async function GET() {
  const s = await requireSession('saanika');
  if (isResponse(s)) return s;
  const w = await milanoWeather();
  return json({
    weather: w ? { ...w, sky: sky(w.code, w.isDay) } : null,
    outfit: w ? outfit(w) : null,
  });
}
