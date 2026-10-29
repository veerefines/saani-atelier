import { findInvite } from '@/lib/invites';
import { site } from '@/content/site';

/**
 * The invite page's own manifest. Its start_url is her personal magic link, so the app on her home
 * screen signs her in the first time it opens, even though a home-screen app keeps its own cookies
 * apart from Safari's.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const invite = await findInvite(decodeURIComponent(code));
  if (!invite) return new Response('Not found', { status: 404 });

  const manifest = {
    id: '/',
    name: site.title,
    short_name: site.title,
    description: 'A little world of memories, fashion, and Saani’s journey from India to Milan.',
    start_url: `/hello/${encodeURIComponent(invite.code)}`,
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
  return new Response(JSON.stringify(manifest), {
    headers: { 'Content-Type': 'application/manifest+json', 'Cache-Control': 'private, no-store' },
  });
}
