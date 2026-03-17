/**
 * QR Code Generation Utilities
 * For ChainTrust pharmaceutical verification system
 */

/**
 * Derive a unit-level salt from a batch salt and unit index.
 * Formula: SHA-256(batchSalt + "-" + unitIndex)
 * Uses Web Crypto API for client-side hashing.
 */
export async function deriveUnitSalt(batchSalt: string, unitIndex: number): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${batchSalt}-${unitIndex}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate the verification URL that will be encoded into the QR code.
 */
export function generateVerifyUrl(salt: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
  return `${baseUrl}/verify-product?salt=${encodeURIComponent(salt)}`;
}
