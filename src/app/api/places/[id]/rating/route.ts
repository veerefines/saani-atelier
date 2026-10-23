import { places } from '@/content/milano';
import { requireSession, isResponse, json, fail } from '@/lib/api';

type Rating = { rating: number | null; count: number | null; url: string | null };

// Ratings barely move; keep them for a week so we stay inside Google's free allowance.
const TTL = 7 * 24 * 60 * 60 * 1000;
const cache = new Map<string, { at: number; value: Rating }>();

/** Live Google rating for a guide place. Needs GOOGLE_MAPS_API_KEY (Places API, New). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await requireSession('saanika');
  if (isResponse(s)) return s;
  const { id } = await params;
  const place = places.find((p) => p.id === id);
  if (!place) return fail('Place not found.', 404);

  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return json({ configured: false });

  const hit = cache.get(id);
  if (hit && Date.now() - hit.at < TTL) return json({ configured: true, ...hit.value });

  try {
    const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': 'places.rating,places.userRatingCount,places.googleMapsUri',
      },
      body: JSON.stringify({
        textQuery: place.q,
        maxResultCount: 1,
        locationBias: { circle: { center: { latitude: place.lat, longitude: place.lng }, radius: 1500 } },
      }),
    });
    if (!res.ok) throw new Error(`Places API ${res.status}`);
    const data = (await res.json()) as { places?: { rating?: number; userRatingCount?: number; googleMapsUri?: string }[] };
    const top = data.places?.[0];
    const value: Rating = { rating: top?.rating ?? null, count: top?.userRatingCount ?? null, url: top?.googleMapsUri ?? null };
    cache.set(id, { at: Date.now(), value });
    return json({ configured: true, ...value });
  } catch (e) {
    console.error('Google rating lookup failed:', (e as Error).message);
    return json({ configured: true, rating: null, count: null, url: null });
  }
}
