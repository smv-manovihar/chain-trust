/**
 * QR Code Generation Utilities
 */
import { hashSHA256 } from './crypto-utils';

export const PAGE_WIDTH_MM = 210;
export const PAGE_MARGIN_MM = 10;
export const AVAILABLE_WIDTH_MM = PAGE_WIDTH_MM - (2 * PAGE_MARGIN_MM);

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
export function generateVerifyUrl(s: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
  return `${baseUrl}/verify?s=${encodeURIComponent(s)}`;
}

/**
 * Calculate the maximum number of columns that can fit in an A4 page 
 * for a given QR size and label padding.
 */
export function calculateMaxColumns(qrSizeMm: number, paddingMm: number): number {
  if (qrSizeMm <= 0) return 4;
  const unitWidth = qrSizeMm + (2 * paddingMm);
  return Math.max(1, Math.floor(AVAILABLE_WIDTH_MM / unitWidth));
}
