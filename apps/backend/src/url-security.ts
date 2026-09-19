import dns from 'node:dns/promises';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';

const DEFAULT_MAX_BYTES = 5 * 1024 * 1024;
const DEFAULT_TIMEOUT_MS = 12_000;
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

export interface SafeFetchOptions {
  headers?: HeadersInit;
  signal?: AbortSignal;
  timeoutMs?: number;
  maxBytes?: number;
  maxRedirects?: number;
}

function ipv4Number(address: string): number {
  return address.split('.').reduce((acc, part) => ((acc << 8) | Number(part)) >>> 0, 0);
}

function ipv4InCidr(address: string, base: string, prefix: number): boolean {
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return (ipv4Number(address) & mask) === (ipv4Number(base) & mask);
}

export function isBlockedIp(address: string): boolean {
  const normalized = address.toLowerCase();

  if (net.isIPv4(normalized)) {
    const blocked: Array<[string, number]> = [
      ['0.0.0.0', 8],
      ['10.0.0.0', 8],
      ['100.64.0.0', 10],
      ['127.0.0.0', 8],
      ['169.254.0.0', 16],
      ['172.16.0.0', 12],
      ['192.0.0.0', 24],
      ['192.0.2.0', 24],
      ['192.168.0.0', 16],
      ['198.18.0.0', 15],
      ['198.51.100.0', 24],
      ['203.0.113.0', 24],
      ['224.0.0.0', 4],
      ['240.0.0.0', 4],
    ];
    return blocked.some(([base, prefix]) => ipv4InCidr(normalized, base, prefix));
  }

  if (net.isIPv6(normalized)) {
    if (normalized === '::' || normalized === '::1') return true;
    if (normalized.startsWith('::ffff:')) {
      const mapped = normalized.slice('::ffff:'.length);
      return net.isIPv4(mapped) ? isBlockedIp(mapped) : true;
    }
    return (
      normalized.startsWith('fc') ||
      normalized.startsWith('fd') ||
      /^fe[89ab]/.test(normalized) ||
      normalized.startsWith('ff') ||
      normalized.startsWith('2001:db8:')
    );
  }

  return true;
}

export async function resolvePublicAddress(url: URL): Promise<{ address: string; family: 4 | 6 }> {
  const hostname = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
    throw new Error('localhost is not allowed');
  }

  const literalFamily = net.isIP(hostname);
  if (literalFamily) {
    if (isBlockedIp(hostname)) throw new Error('private or reserved IP address is not allowed');
    return { address: hostname, family: literalFamily as 4 | 6 };
  }

  const answers = await dns.lookup(hostname, { all: true, verbatim: true });
  if (!answers.length) throw new Error('hostname did not resolve');
  if (answers.some(({ address }) => isBlockedIp(address))) {
    throw new Error('hostname resolves to a private or reserved IP address');
  }

  const selected = answers[0];
  return { address: selected.address, family: selected.family as 4 | 6 };
}

export async function assertPublicHttpUrl(rawUrl: string): Promise<URL> {
  const url = new URL(rawUrl);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('only http/https URLs are allowed');
  }
  if (url.username || url.password) throw new Error('URL credentials are not allowed');
  if (url.port && !['80', '443'].includes(url.port)) {
    throw new Error('only ports 80 and 443 are allowed');
  }
  await resolvePublicAddress(url);
  return url;
}

async function requestOnce(url: URL, options: SafeFetchOptions): Promise<Response> {
  const { address, family } = await resolvePublicAddress(url);
  const transport = url.protocol === 'https:' ? https : http;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
  const headers = new Headers(options.headers || {});
  headers.set('host', url.host);
  if (!headers.has('accept-encoding')) headers.set('accept-encoding', 'identity');

  return new Promise<Response>((resolve, reject) => {
    const req = transport.request({
      protocol: url.protocol,
      hostname: address,
      family,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: `${url.pathname}${url.search}`,
      method: 'GET',
      headers: Object.fromEntries(headers.entries()),
      servername: url.protocol === 'https:' ? url.hostname : undefined,
    }, (res) => {
      const contentLength = Number(res.headers['content-length'] || 0);
      if (contentLength > maxBytes) {
        res.destroy();
        reject(new Error(`response exceeds ${maxBytes} bytes`));
        return;
      }

      const chunks: Buffer[] = [];
      let total = 0;
      res.on('data', (chunk: Buffer) => {
        total += chunk.length;
        if (total > maxBytes) {
          res.destroy(new Error(`response exceeds ${maxBytes} bytes`));
          return;
        }
        chunks.push(chunk);
      });
      res.on('error', reject);
      res.on('end', () => {
        const responseHeaders = new Headers();
        for (const [key, value] of Object.entries(res.headers)) {
          if (Array.isArray(value)) value.forEach((item) => responseHeaders.append(key, item));
          else if (value !== undefined) responseHeaders.set(key, value);
        }
        resolve(new Response(Buffer.concat(chunks), {
          status: res.statusCode || 500,
          statusText: res.statusMessage || '',
          headers: responseHeaders,
        }));
      });
    });

    req.setTimeout(timeoutMs, () => req.destroy(new Error('request timed out')));
    req.on('error', reject);

    const abort = () => req.destroy(new Error('request aborted'));
    if (options.signal) {
      if (options.signal.aborted) abort();
      else options.signal.addEventListener('abort', abort, { once: true });
    }

    req.end();
  });
}

export async function safeFetchUrl(rawUrl: string, options: SafeFetchOptions = {}): Promise<Response> {
  let current = await assertPublicHttpUrl(rawUrl);
  const maxRedirects = options.maxRedirects ?? 5;

  for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount++) {
    const response = await requestOnce(current, options);
    if (!REDIRECT_STATUSES.has(response.status)) return response;

    const location = response.headers.get('location');
    if (!location) return response;
    if (redirectCount === maxRedirects) throw new Error('too many redirects');

    current = await assertPublicHttpUrl(new URL(location, current).toString());
  }

  throw new Error('too many redirects');
}
