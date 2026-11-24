import dns from 'node:dns/promises';
import net from 'node:net';

// Remote images are fetched by the server, so a pasted URL must not be able to reach
// services on the host or the local network (loopback, private ranges, cloud metadata).
// Set ALLOW_PRIVATE_IMAGE_HOSTS=true to download images from LAN hosts on purpose.
export const privateImageHostsAllowed = () => process.env.ALLOW_PRIVATE_IMAGE_HOSTS === 'true';

function isPrivateIPv4(address: string) {
  const [a, b] = address.split('.').map(Number);
  return a === 0 || a === 10 || a === 127 || a >= 224
    || (a === 100 && b >= 64 && b <= 127)
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 168)
    || (a === 192 && b === 0)
    || (a === 198 && (b === 18 || b === 19));
}

export function isPrivateAddress(address: string): boolean {
  const version = net.isIP(address);
  if (version === 4) return isPrivateIPv4(address);
  if (version !== 6) return false;
  const normalized = address.toLowerCase();
  const mapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateIPv4(mapped[1]);
  const hexMapped = normalized.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (hexMapped) {
    const high = parseInt(hexMapped[1], 16);
    const low = parseInt(hexMapped[2], 16);
    return isPrivateIPv4(`${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`);
  }
  return normalized === '::' || normalized === '::1'
    || /^f[cd]/.test(normalized) // fc00::/7 unique local
    || /^fe[89ab]/.test(normalized) // fe80::/10 link local
    || normalized.startsWith('ff'); // multicast
}

export function isBlockedHostname(hostname: string) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '');
  if (host === 'localhost' || host.endsWith('.localhost')) return true;
  return net.isIP(host) !== 0 && isPrivateAddress(host);
}

/** Throws when the URL points at a loopback/private address. DNS failures are left to fetch. */
export async function assertPublicHost(url: URL): Promise<void> {
  if (privateImageHostsAllowed()) return;
  if (isBlockedHostname(url.hostname)) throw new PrivateHostError();
  if (net.isIP(url.hostname.replace(/^\[|\]$/g, ''))) return;
  let addresses: { address: string }[];
  try {
    addresses = await dns.lookup(url.hostname, { all: true });
  } catch {
    return; // The download itself will fail with a normal "could not be downloaded" error.
  }
  if (addresses.some(({ address }) => isPrivateAddress(address))) throw new PrivateHostError();
}

export class PrivateHostError extends Error {
  constructor() {
    super('The image host resolves to a private or loopback address.');
    this.name = 'PrivateHostError';
  }
}
