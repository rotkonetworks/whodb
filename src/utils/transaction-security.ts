import { logger } from "./logger"
import BigNumber from "bignumber.js"

/**
 * Security utilities for blockchain transactions
 */

/**
 * Add safety margin to gas estimates
 * @param estimatedGas - Gas estimate from chain
 * @param marginPercent - Safety margin percentage (default 20%)
 * @returns Gas with safety margin applied
 */
export function addGasSafetyMargin(estimatedGas: BigNumber, marginPercent: number = 20): BigNumber {
  const margin = estimatedGas.multipliedBy(marginPercent / 100)
  return estimatedGas.plus(margin)
}

/**
 * Verify transaction parameters before submission
 */
export function verifyTransactionParams(params: {
  walletAddress: string
  balance: BigNumber | null
  estimatedCost: BigNumber
}): { valid: boolean; error?: string } {
  const { walletAddress, balance, estimatedCost } = params

  // Check wallet address format
  if (!walletAddress || walletAddress.length < 32) {
    return { valid: false, error: "Invalid wallet address" }
  }

  // Check balance is available
  if (!balance || balance.isLessThanOrEqualTo(0)) {
    return { valid: false, error: "Balance information unavailable" }
  }

  // Check sufficient balance
  if (balance.isLessThan(estimatedCost)) {
    return { valid: false, error: "Insufficient balance for transaction" }
  }

  // Add minimum balance check for existential deposit
  const minRetainedBalance = new BigNumber("0.1") // Keep at least 0.1 DOT
  if (balance.minus(estimatedCost).isLessThan(minRetainedBalance)) {
    return {
      valid: false,
      error: "Transaction would leave balance below minimum threshold"
    }
  }

  return { valid: true }
}

/**
 * Generate transaction hash for logging/tracking
 */
export function generateTransactionId(walletAddress: string, timestamp: number): string {
  const data = `${walletAddress}-${timestamp}`
  // Simple hash function for client-side tracking
  let hash = 0
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return `tx-${Math.abs(hash).toString(16)}-${timestamp}`
}

/**
 * Validate PGP fingerprint format for security
 */
export function validatePgpFingerprint(fingerprint: string): { valid: boolean; error?: string } {
  if (!fingerprint) {
    return { valid: true } // Optional field
  }

  // Remove 0x prefix if present
  const cleaned = fingerprint.replace(/^0x/i, '')

  // Must be exactly 40 hex characters
  if (cleaned.length !== 40) {
    return {
      valid: false,
      error: `PGP fingerprint must be 40 hex characters (got ${cleaned.length})`
    }
  }

  // Must be valid hex
  if (!/^[0-9A-Fa-f]{40}$/.test(cleaned)) {
    return {
      valid: false,
      error: "PGP fingerprint must contain only hexadecimal characters"
    }
  }

  return { valid: true }
}

/**
 * Check if transaction is potentially malicious based on patterns
 */
export function detectSuspiciousPatterns(identityData: Record<string, string>): string[] {
  const warnings: string[] = []

  // Check for excessively long fields (potential DoS)
  for (const [field, value] of Object.entries(identityData)) {
    if (value && value.length > 200) {
      warnings.push(`Field '${field}' is unusually long (${value.length} chars)`)
    }
  }

  // Check for suspicious characters
  const suspiciousChars = /[<>{}[\]\\]/
  for (const [field, value] of Object.entries(identityData)) {
    if (value && suspiciousChars.test(value)) {
      warnings.push(`Field '${field}' contains suspicious characters`)
    }
  }

  // Check for potential command injection
  const commandPatterns = /(\$\(|`|&&|\|\||;)/
  for (const [field, value] of Object.entries(identityData)) {
    if (value && commandPatterns.test(value)) {
      warnings.push(`Field '${field}' contains shell-like syntax`)
    }
  }

  if (warnings.length > 0) {
    logger.warn("Suspicious patterns detected in identity data:", warnings)
  }

  return warnings
}

/**
 * Sanitize transaction metadata before logging
 */
export function sanitizeForLogging(data: any): any {
  // Deep clone to avoid modifying original
  const sanitized = JSON.parse(JSON.stringify(data))

  // Redact sensitive fields
  const sensitiveFields = ['privateKey', 'seed', 'mnemonic', 'password']

  function redact(obj: any) {
    for (const key in obj) {
      if (sensitiveFields.includes(key)) {
        obj[key] = '[REDACTED]'
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        redact(obj[key])
      }
    }
  }

  redact(sanitized)
  return sanitized
}
