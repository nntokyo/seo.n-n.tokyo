const PUBLISHER_ID_PATTERN = /^(?:ca-)?(pub-\d+)$/;

export const dynamic = 'force-dynamic';

export function GET() {
  const configuredId = process.env.GOOGLE_ADSENSE_PUBLISHER_ID?.trim() || '';
  const publisherId = configuredId.match(PUBLISHER_ID_PATTERN)?.[1];

  if (!publisherId) {
    return new Response('Google AdSense publisher ID is not configured.\n', {
      status: 404,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  }

  return new Response(`google.com, ${publisherId}, DIRECT, f08c47fec0942fa0\n`, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  });
}
