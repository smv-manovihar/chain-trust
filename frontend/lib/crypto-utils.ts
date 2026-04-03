import { sha256 } from 'js-sha256';

/**
 * Universally hash a string using SHA-256.
 * Works in:
 * - Node.js / SSR
 * - Secure Contexts (HTTPS/localhost)
 * - Non-secure Contexts (HTTP)
 * 
 * @param data The string to hash
 * @returns The hex-encoded result
 */
export function hashSHA256(data: string): string {
    return sha256(data);
}

/**
 * Promise-based wrapper for consistency with older crypto.subtle calls
 */
export async function hashSHA256Async(data: string): Promise<string> {
    return sha256(data);
}
