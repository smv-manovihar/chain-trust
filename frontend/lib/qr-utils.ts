/**
 * QR Code Generation Utilities
 */
import { hashSHA256 } from './crypto-utils';

/**
 * Derive a unit-level salt from a batch salt and unit index.
 * Formula: SHA-256(batchSalt + "-" + unitIndex)
 * Uses Web Crypto API for client-side hashing.
 */
export async function deriveUnitSalt(batchSalt: string, unitIndex: number): Promise<string> {
  return hashSHA256(`${batchSalt}-${unitIndex}`);
}

/**
 * Generate the verification URL that will be encoded into the QR code.
 */
export function generateVerifyUrl(salt: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
  return `${baseUrl}/verify?salt=${encodeURIComponent(salt)}`;
}
