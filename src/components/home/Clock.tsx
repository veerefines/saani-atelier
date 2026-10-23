'use client';

import { useEffect, useState } from 'react';

export function useNow(ms = 30_000) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

export function timeIn(now: Date | null, zone: string) {
  if (!now) return '--:--';
  return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: zone }).format(now);
}

export function hourIn(now: Date, zone: string) {
  return Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hour12: false, timeZone: zone }).format(now));
}

/** A little rubber-stamp clock. */
export function ClockStamp({ city, zone, now }: { city: string; zone: string; now: Date | null }) {
  return (
    <span className="h-stamp">
      <span className="h-stamp-city">{city}</span>
      <span className="h-stamp-time" suppressHydrationWarning>
        {timeIn(now, zone)}
      </span>
    </span>
  );
}

export function dayInfo(now: Date | null, arrival: string) {
  if (!now) return { label: '', n: 0, before: false };
  const a = new Date(arrival + 'T00:00:00');
  const diff = Math.floor((now.getTime() - a.getTime()) / 86_400_000);
  if (diff < 0) return { label: `${-diff} ${-diff === 1 ? 'sleep' : 'sleeps'} until Milano`, n: -diff, before: true };
  return { label: `Day ${diff + 1} in Milano`, n: diff + 1, before: false };
}
