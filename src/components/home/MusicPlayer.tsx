'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { playTheme, themeFor } from '@/lib/music';
import { sfx, tryAutoplay } from '@/lib/sound';

/** Changes the background tune as she moves between the corners of her desk (with a soft page turn). */
export default function MusicPlayer() {
  const path = usePathname();
  const first = useRef(true);
  // try to start straight away (browsers often wait for a first tap; then the radio shows a hint)
  useEffect(() => tryAutoplay(), []);
  useEffect(() => {
    playTheme(themeFor(path));
    if (first.current) first.current = false;
    else sfx('page');
  }, [path]);
  return null;
}
