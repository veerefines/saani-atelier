'use client';

import { useEffect, useState } from 'react';

export type Other = { name: string; tz: string; city: string; known: boolean };
export type Someone = { name: string; tz: string; saanika: boolean; me: boolean };
export type People = { tz: string; others: Other[]; everyone: Someone[] };

// one request per page load, shared by the clocks and "good time to call"
let pending: Promise<People | null> | null = null;

/** Tells the site where this browser is (its time zone) and gets back where everyone else is. */
export function usePeople() {
  const [data, setData] = useState<People | null>(null);
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    pending ??= fetch('/api/zone', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tz }) })
      .then((r) => (r.ok ? (r.json() as Promise<People>) : null))
      .catch(() => null);
    let alive = true;
    pending.then((d) => alive && setData(d ?? { tz, others: [], everyone: [] }));
    return () => {
      alive = false;
      pending = null; // the next page asks again, so moves show up
    };
  }, []);
  return data;
}
