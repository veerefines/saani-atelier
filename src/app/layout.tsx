import type { Metadata, Viewport } from 'next';
import '@fontsource/bagel-fat-one/400.css';
import '@fontsource/instrument-serif/400.css';
import '@fontsource/instrument-serif/400-italic.css';
import '@fontsource-variable/figtree/index.css';
import '@fontsource-variable/caveat/index.css';
import './globals.css';
import { site } from '@/content/site';
import RegisterSW from '@/components/RegisterSW';

export const metadata: Metadata = {
  title: site.title,
  description: 'A little something is waiting.',
  robots: { index: false, follow: false, nocache: true },
  icons: {
    icon: [
      { url: '/icons/favicon.ico', sizes: 'any' },
      { url: '/icons/favicon-32.png', type: 'image/png', sizes: '32x32' },
      { url: '/icons/favicon-16.png', type: 'image/png', sizes: '16x16' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180' }],
  },
  appleWebApp: { capable: true, title: site.title, statusBarStyle: 'default' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#fbe3e8',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="aura" aria-hidden="true" />
        <div className="grain" aria-hidden="true" />
        {children}
        <RegisterSW />
      </body>
    </html>
  );
}
