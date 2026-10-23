'use client';

import { useEffect, useRef } from 'react';
import type { Map as LMap, Marker, LayerGroup } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { categories, type Place, type Spot } from '@/content/milano';

const MILANO: [number, number] = [45.4642, 9.19];
const km = (p: Place) => Math.hypot((p.lat - MILANO[0]) * 111, (p.lng - MILANO[1]) * 78);
const near = (p: Place) => km(p) < 20;
const tint = (p: Place) => categories.find((c) => c.id === p.cat)!;

/** A soft pastel map of her places. Pins open the place card; the card's place is highlighted here. */
export default function MiniMap({
  places,
  selected,
  onPick,
  me,
  nearMe,
}: {
  places: Place[];
  selected: Place | null;
  onPick: (p: Place) => void;
  /** her position, when she's shared it */
  me: Spot | null;
  /** frame her and the places around her instead of the city */
  nearMe: boolean;
}) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<LMap | null>(null);
  const layer = useRef<LayerGroup | null>(null);
  const markers = useRef(new Map<string, Marker>());
  const meMarker = useRef<Marker | null>(null);
  const pick = useRef(onPick);
  pick.current = onPick;
  const ready = useRef<Promise<typeof import('leaflet')> | null>(null);

  // the map itself, once
  useEffect(() => {
    let cancelled = false;
    ready.current = import('leaflet').then((mod) => {
      const L = mod.default ?? mod;
      if (cancelled || !box.current || map.current) return L;
      const m = L.map(box.current, { zoomControl: false, scrollWheelZoom: false, attributionControl: true }).setView(MILANO, 13);
      L.control.zoom({ position: 'topright' }).addTo(m);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
        // OSM's tile servers need a referrer; the site otherwise sends none cross-origin
        referrerPolicy: 'strict-origin-when-cross-origin',
      }).addTo(m);
      // wheel zoom only once she has tapped the map, so the page still scrolls past it
      m.on('click', () => m.scrollWheelZoom.enable());
      m.on('mouseout', () => m.scrollWheelZoom.disable());
      layer.current = L.layerGroup().addTo(m);
      map.current = m;
      return L;
    });
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
      markers.current.clear();
      meMarker.current = null;
    };
  }, []);

  // a soft pulsing dot where she is
  useEffect(() => {
    ready.current?.then((L) => {
      const m = map.current;
      if (!m) return;
      meMarker.current?.remove();
      meMarker.current = null;
      if (!me) return;
      const icon = L.divIcon({ className: 'mm-me-wrap', html: '<span class="mm-me"></span>', iconSize: [22, 22], iconAnchor: [11, 11] });
      meMarker.current = L.marker([me.lat, me.lng], { icon, title: 'You are here', keyboard: false, zIndexOffset: 2000 }).addTo(m);
    });
  }, [me]);

  // pins for the current filter
  useEffect(() => {
    ready.current?.then((L) => {
      const m = map.current;
      if (!m || !layer.current) return;
      layer.current.clearLayers();
      markers.current.clear();
      places.forEach((p) => {
        const c = tint(p);
        const icon = L.divIcon({
          className: 'mm-pin-wrap',
          html: `<span class="mm-pin" style="--tint:${c.tint}"><span>${c.icon}</span></span>`,
          iconSize: [34, 40],
          iconAnchor: [17, 38],
        });
        const mk = L.marker([p.lat, p.lng], { icon, title: p.name, keyboard: true, riseOnHover: true })
          .on('click', () => pick.current(p))
          .addTo(layer.current!);
        markers.current.set(p.id, mk);
      });
      // near her: frame her and what's around; otherwise the centre of town, else the wider area, else everything
      const pts: [number, number][] = [];
      if (nearMe && me) {
        pts.push([me.lat, me.lng], ...places.slice(0, 8).map((p) => [p.lat, p.lng] as [number, number]));
      } else {
        const centre = places.filter((p) => km(p) < 4);
        const inCity = places.filter(near);
        const focus = centre.length >= 5 ? centre : inCity.length >= 3 ? inCity : places;
        pts.push(...focus.map((p) => [p.lat, p.lng] as [number, number]));
      }
      if (pts.length) m.fitBounds(L.latLngBounds(pts), { padding: [32, 32], maxZoom: 15 });
    });
  }, [places, nearMe, me]);

  // highlight + fly to the chosen place
  useEffect(() => {
    ready.current?.then(() => {
      const m = map.current;
      if (!m) return;
      markers.current.forEach((mk, id) => mk.getElement()?.classList.toggle('is-on', id === selected?.id));
      if (!selected) return;
      markers.current.get(selected.id)?.setZIndexOffset(1000);
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const zoom = near(selected) ? Math.max(m.getZoom(), 14) : 10;
      if (reduce) m.setView([selected.lat, selected.lng], zoom);
      else m.flyTo([selected.lat, selected.lng], zoom, { duration: 0.9 });
    });
  }, [selected, places]);

  return <div ref={box} className="mm" role="region" aria-label="Map of Milano places" />;
}
