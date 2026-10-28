/**
 * Milano guide: places to eat, sip, wander and swim, for the Milano corner.
 * Every place was checked against OpenStreetMap; lat/lng come from there.
 * q is what Google Maps searches for. The list is in data/places.json (a weekly Claude routine adds
 * new finds there; `added` is when a place joined, so it can wear a "New find" badge for a month).
 */
import PLACES from './data/places.json';

export type Category = 'food' | 'sweet' | 'home' | 'vibes' | 'fashion' | 'places' | 'local' | 'bloom' | 'golden' | 'beach';

export const categories: { id: Category; label: string; short: string; icon: string; tint: string }[] = [
  { id: 'food', label: 'Food', short: 'Food', icon: '🍝', tint: '#ffd9c7' },
  { id: 'sweet', label: 'Coffee, matcha & sweets', short: 'Coffee & matcha', icon: '🍵', tint: '#d4efdf' },
  { id: 'home', label: 'A taste of home', short: 'Home', icon: '🪔', tint: '#fde2c8' },
  { id: 'vibes', label: 'Vibes', short: 'Vibes', icon: '🍹', tint: '#e6dcf7' },
  { id: 'fashion', label: 'Fashion houses & shopping', short: 'Fashion', icon: '👠', tint: '#f6d3ea' },
  { id: 'places', label: 'Sights & day trips', short: 'Places', icon: '🏛️', tint: '#fbe0d0' },
  { id: 'local', label: 'Local spots', short: 'Local', icon: '🧺', tint: '#f8ebbf' },
  { id: 'bloom', label: 'Flowers & green', short: 'Flowers', icon: '🌷', tint: '#dcefd5' },
  { id: 'golden', label: 'Sunrise & sunset', short: 'Golden hour', icon: '🌅', tint: '#ffe0c4' },
  { id: 'beach', label: 'Beaches', short: 'Beaches', icon: '🐚', tint: '#d3e9f6' },
];

export type Place = {
  id: string;
  name: string;
  cat: Category;
  area: string;
  note: string;
  try: string[];
  q: string;
  lat: number;
  lng: number;
  /** beaches only */
  region?: string;
  reach?: string;
  /** when it joined the guide (YYYY-MM-DD) */
  added?: string;
};
/** Joined the guide in the last 30 days. */
export const isNewFind = (p: { added?: string }, today = new Date().toISOString().slice(0, 10)) =>
  Boolean(p.added) && Date.parse(today) - Date.parse(p.added!) <= 30 * 86_400_000 && p.added! > '2026-10-24';

/** The places themselves live in data/places.json, so the weekly update can add new finds safely. */
export const places: Place[] = PLACES as Place[];

export const mapsLink = (p: Place) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.q)}`;

export type Spot = { lat: number; lng: number };

/** Straight-line distance in km. */
export function distanceKm(a: Spot, b: Spot) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** "900 m · 14 min walk", "6.2 km away", "320 km away". Streets aren't straight, so walking adds ~30%. */
export function distanceLabel(km: number) {
  if (km < 3) {
    const mins = Math.max(1, Math.round(((km * 1.3) / 4.8) * 60));
    return `${km < 1 ? `${Math.round(km * 100) * 10} m` : `${km.toFixed(1)} km`} · ${mins} min walk`;
  }
  return `${km < 20 ? km.toFixed(1) : Math.round(km)} km away`;
}

/** Google Maps search centred on her, e.g. "matcha" around where she's standing. */
export const mapsAround = (q: string, at: Spot) => `https://www.google.com/maps/search/${encodeURIComponent(q)}/@${at.lat},${at.lng},15z`;
