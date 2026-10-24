import type { MetadataRoute } from 'next';
import { site } from '@/content/site';

/** Lets her add the atelier to her home screen and open it like an app. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: site.title,
    short_name: site.title,
    description: 'A little world of memories, fashion, and Saani’s journey from India to Milan.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#fbe7e7',
    theme_color: '#e9b6c9',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
