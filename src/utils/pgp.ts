/**
 * Client-side PGP encryption utilities
 * Uses openpgp.js for browser-based encryption
 */

import { logger } from './logger'

export interface EncryptionResult {
  encrypted: string
  success: boolean
  error?: string
}

/**
 * Encrypts a message using the recipient's PGP public key
 * @param message - The plaintext message to encrypt
 * @param publicKeyArmored - The recipient's PGP public key in ASCII armor format
 * @returns Encrypted message or error
 */
export async function encryptMessage(
  message: string,
  publicKeyArmored: string
): Promise<string> {
  try {
    // Dynamic import to avoid SSR issues
    const openpgp = await import('openpgp')

    // Read the public key
    const publicKey = await openpgp.readKey({ armoredKey: publicKeyArmored })

    // Encrypt the message
    const encrypted = await openpgp.encrypt({
      message: await openpgp.createMessage({ text: message }),
      encryptionKeys: publicKey,
    })

    return encrypted as string
  } catch (err) {
    // Don't log the full error - it might contain plaintext message
    logger.error('PGP encryption failed')
    throw err
  }
}

/**
 * Fetches a PGP public key from a fingerprint
 * This could be extended to fetch from keyservers or on-chain storage
 * @param fingerprint - The PGP key fingerprint
 * @returns The public key in ASCII armor format or null
 */
export async function fetchPublicKeyFromFingerprint(
  _fingerprint: string
): Promise<string | null> {
  try {
    // TODO: Implement fetching from keyserver or on-chain storage
    // For now, this is a placeholder
    // Options:
    // 1. Fetch from keys.openpgp.org
    // 2. Store full public key on-chain (expensive)
    // 3. Store public key in IPFS and reference hash on-chain

    // Don't log fingerprints - metadata leakage
    logger.warn('Public key fetch not implemented')
    return null
  } catch (err) {
    logger.error('Failed to fetch public key:', err)
    return null
  }
}

/**
 * Validates a PGP fingerprint format
 * @param fingerprint - The fingerprint to validate (should be 40 hex chars)
 * @returns True if valid format
 */
export function isValidPgpFingerprint(fingerprint: string): boolean {
  // Remove any whitespace and convert to lowercase
  const cleaned = fingerprint.replace(/\s/g, '').toLowerCase()

  // PGP v4 fingerprints are 40 hexadecimal characters
  return /^[0-9a-f]{40}$/.test(cleaned)
}

/**
 * Formats a fingerprint for display (groups of 4 characters)
 * @param fingerprint - Raw fingerprint string
 * @returns Formatted fingerprint
 */
export function formatFingerprint(fingerprint: string): string {
  const cleaned = fingerprint.replace(/\s/g, '').toUpperCase()
  return cleaned.match(/.{1,4}/g)?.join(' ') || fingerprint
}
