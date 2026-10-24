import { addStamp } from '@/lib/extras';
import { distanceKm, places } from '@/content/milano';
import { requireSession, isResponse, json, fail } from '@/lib/api';

const NEAR_KM = 0.3;

/** A passport stamp: "here" needs her to be within 300m of the place; "manual" is her word for it. */
export async function POST(req: Request) {
  const s = await requireSession('saanika');
  if (isResponse(s)) return s;
  const { placeId, lat, lng, manual } = await req.json().catch(() => ({}));
  const place = places.find((p) => p.id === placeId);
  if (!place) return fail('Unknown place.');
  if (manual) return json(await addStamp(place.id, 'manual'), 201);
  if (typeof lat !== 'number' || typeof lng !== 'number') return fail('Share your location to check in, or mark it as visited.');
  const km = distanceKm({ lat, lng }, place);
  if (km > NEAR_KM) return fail(`You’re about ${km < 10 ? km.toFixed(1) : Math.round(km)} km away. Check in when you’re there!`, 422);
  return json(await addStamp(place.id, 'here'), 201);
}
