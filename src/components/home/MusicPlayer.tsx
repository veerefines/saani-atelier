'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { playTheme, themeFor } from '@/lib/music';
import { sfx } from '@/lib/sound';

/** Changes the background tune as she moves between the corners of her desk (with a soft page turn). */
export default function MusicPlayer() {
  const path = usePathname();
  const first = useRef(true);
  useEffect(() => {
    playTheme(themeFor(path));
    if (first.current) first.current = false;
    else sfx('page');
  }, [path]);
  return null;
}
