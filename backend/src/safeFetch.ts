import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

const MAX_REDIRECTS = 3;
const FETCH_TIMEOUT_MS = 10_000;
const MAX_BODY_BYTES = 5 * 1024 * 1024; // 5 MB is far larger than any real iCal feed

/** Thrown when a user-supplied URL is rejected before any request is made. */
export class UnsafeUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnsafeUrlError';
  }
}

const isPrivateIPv4 = (ip: string): boolean => {
  const [a = 0, b = 0] = ip.split('.').map(Number);
  return (
    a === 0 || // "this" network
    a === 10 || // private
    a === 127 || // loopback
    (a === 100 && b >= 64 && b <= 127) || // carrier-grade NAT
    (a === 169 && b === 254) || // link-local, includes cloud metadata 169.254.169.254
    (a === 172 && b >= 16 && b <= 31) || // private
    (a === 192 && b === 168) || // private
    (a === 192 && b === 0) || // IETF protocol assignments
    (a === 198 && (b === 18 || b === 19)) || // benchmarking
    a >= 224 // multicast and reserved
  );
};

const isPrivateIPv6 = (ip: string): boolean => {
  const normalized = ip.toLowerCase();
  if (normalized === '::' || normalized === '::1') return true;
  const mapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped?.[1]) return isPrivateIPv4(mapped[1]);
  return (
    normalized.startsWith('fc') || // unique local
    normalized.startsWith('fd') || // unique local
    normalized.startsWith('fe8') || // link-local
    normalized.startsWith('fe9') ||
    normalized.startsWith('fea') ||
    normalized.startsWith('feb') ||
    normalized.startsWith('ff') // multicast
  );
};

export const isPrivateAddress = (ip: string): boolean =>
  isIP(ip) === 6 ? isPrivateIPv6(ip) : isPrivateIPv4(ip);

/**
 * Validates that a URL is http(s) and that its host resolves only to public IP addresses.
 *
 * @param rawUrl - The user-supplied URL.
 * @returns The parsed URL.
 * @throws {UnsafeUrlError} If the URL is malformed, uses another protocol, or points at a private network.
 */
export const assertPublicHttpUrl = async (rawUrl: string): Promise<URL> => {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new UnsafeUrlError('Calendar URL is not a valid URL.');
  }

  if (url.protocol === 'webcal:') {
    url = new URL(`https:${rawUrl.slice('webcal:'.length)}`);
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new UnsafeUrlError('Calendar URL must start with https:// or http://.');
  }
  if (url.username || url.password) {
    throw new UnsafeUrlError('Calendar URL must not contain credentials.');
  }

  const host = url.hostname.replace(/^\[|\]$/g, '');
  let addresses: string[];
  if (isIP(host)) {
    addresses = [host];
  } else {
    try {
      addresses = (await lookup(host, { all: true })).map((entry) => entry.address);
    } catch {
      throw new UnsafeUrlError('Calendar URL host could not be found.');
    }
  }

  if (addresses.length === 0 || addresses.some(isPrivateAddress)) {
    throw new UnsafeUrlError('Calendar URL must point to a public internet address.');
  }

  return url;
};

/**
 * Fetches a user-supplied URL as text, refusing private-network targets (including via redirects),
 * enforcing a timeout and a maximum response size.
 *
 * @param rawUrl - The user-supplied URL.
 * @returns The response body as text.
 */
export const fetchPublicText = async (rawUrl: string): Promise<string> => {
  let current = await assertPublicHttpUrl(rawUrl);

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const response = await fetch(current, {
      redirect: 'manual',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { Accept: 'text/calendar, text/plain;q=0.9, */*;q=0.1' },
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) throw new Error(`Failed to fetch calendar: ${response.status}`);
      current = await assertPublicHttpUrl(new URL(location, current).toString());
      continue;
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch calendar: ${response.status}`);
    }

    const declaredLength = Number(response.headers.get('content-length') ?? 0);
    if (declaredLength > MAX_BODY_BYTES) {
      throw new Error('Calendar feed is too large.');
    }

    const reader = response.body?.getReader();
    if (!reader) return '';
    const chunks: Uint8Array[] = [];
    let received = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > MAX_BODY_BYTES) {
        await reader.cancel();
        throw new Error('Calendar feed is too large.');
      }
      chunks.push(value);
    }
    return new TextDecoder().decode(Buffer.concat(chunks));
  }

  throw new Error('Calendar URL redirected too many times.');
};
