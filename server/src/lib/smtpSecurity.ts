import dns from "dns/promises";
import net from "net";

// SMTP hosts are administrator-configured, so validate the resolved destination
// as well as the hostname. Disallow non-global ranges to prevent SSRF to private,
// loopback, link-local, mapped, multicast, and reserved addresses.
export function isBlockedSmtpAddress(address: string): boolean {
  const ip = address.split("%")[0];
  const family = net.isIP(ip);
  if (family === 4) {
    const [a, b, c] = ip.split(".").map(Number);
    return a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && (b === 0 || b === 168)) ||
      (a === 198 && (b === 18 || b === 19 || b === 51)) ||
      (a === 203 && b === 0 && c === 113);
  }
  if (family === 6) {
    const lower = ip.toLowerCase();
    const first = Number.parseInt(lower.split(":")[0] || "0", 16);
    // Only allow global-unicast 2000::/3, excluding known special blocks.
    return !(first >= 0x2000 && first <= 0x3fff) ||
      lower.startsWith("2001:db8:") ||
      lower.startsWith("2001:0:") ||
      lower.startsWith("2001:2:") ||
      lower.startsWith("2001:10:") ||
      lower.startsWith("2001:20:") ||
      lower.startsWith("2002:");
  }
  return true;
}

export function normalizeSmtpHostname(host: unknown): string {
  if (typeof host !== "string") throw new Error("Invalid SMTP hostname.");
  const hostname = host.trim().replace(/\.$/, "").toLowerCase();
  if (!hostname || hostname.length > 253 ||
      /[\s\0-\x1f\x7f]/.test(hostname) ||
      net.isIP(hostname) !== 0 ||
      !hostname.includes(".") ||
      hostname.split(".").some((label) =>
        !label || label.length > 63 ||
        !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label)
      )) {
    throw new Error("SMTP host must be a valid public DNS hostname.");
  }
  return hostname;
}

/**
 * Resolve and pin an allowed public IP for the actual SMTP connection.
 * Passing the resolved IP to Nodemailer prevents a second DNS resolution
 * from redirecting the socket after validation. The servername preserves TLS
 * certificate/SNI validation against the configured DNS hostname.
 */
export async function resolvePublicSmtpHost(host: unknown): Promise<{ address: string; servername: string }> {
  const hostname = normalizeSmtpHostname(host);
  const addresses = await dns.lookup(hostname, { all: true, verbatim: true });
  if (addresses.length === 0 || addresses.some(({ address }) => isBlockedSmtpAddress(address))) {
    throw new Error("SMTP host resolves to a non-public or blocked address.");
  }
  return { address: addresses[0].address, servername: hostname };
}
