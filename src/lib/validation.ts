import { IdentityData } from "@/types/Identity"

export interface ValidationError {
  field: keyof IdentityData
  message: string
}

export class RegistrationValidationError extends Error {
  constructor(public errors: ValidationError[]) {
    super(`Validation failed: ${errors.map(e => `${e.field}: ${e.message}`).join(', ')}`)
    this.name = 'RegistrationValidationError'
  }
}

/**
 * Validate and sanitize a website URL
 */
export function validateWebsite(input: string): string | null {
  if (!input || typeof input !== 'string') return null
  const cleaned = input.trim()
  if (cleaned.length === 0) return null
  if (cleaned.includes('://')) return null
  if (cleaned.startsWith('//')) return null
  const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9.-]*[a-zA-Z0-9](\/[a-zA-Z0-9._~:/?#[\]@!$&'()*+,;=-]*)?$/
  if (!domainRegex.test(cleaned)) return null
  if (!cleaned.split('/')[0].includes('.')) return null
  return cleaned
}

/**
 * Validate Twitter handle
 */
export function validateTwitterHandle(input: string): string | null {
  if (!input || typeof input !== 'string') return null
  const cleaned = input.trim().replace(/^@+/, '')
  if (cleaned.length === 0) return null
  const handleRegex = /^[a-zA-Z0-9_]{1,15}$/
  if (!handleRegex.test(cleaned)) return null
  return cleaned
}

export function createSafeUrl(input: string, type: 'website' | 'twitter'): string | null {
  if (type === 'twitter') {
    const handle = validateTwitterHandle(input)
    return handle ? `https://twitter.com/${handle}` : null
  }
  if (type === 'website') {
    const domain = validateWebsite(input)
    return domain ? `https://${domain}` : null
  }
  return null
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  if (!email) return true // Optional field
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validate GitHub username
 */
export function validateGithub(username: string): boolean {
  if (!username) return true
  const githubRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/
  return githubRegex.test(username)
}

/**
 * Validate PGP fingerprint
 */
export function validatePgpFingerprint(fingerprint: string): boolean {
  if (!fingerprint) return true
  const cleaned = fingerprint.startsWith('0x') ? fingerprint.slice(2) : fingerprint
  const pgpRegex = /^[0-9A-Fa-f]{40}$/
  return pgpRegex.test(cleaned)
}

/**
 * Validate Matrix ID
 */
export function validateMatrix(matrixId: string): boolean {
  if (!matrixId) return true
  const matrixRegex = /^@[a-z0-9._=-]+:[a-z0-9.-]+\.[a-z]{2,}$/i
  return matrixRegex.test(matrixId)
}

/**
 * Validate Discord username
 */
export function validateDiscord(username: string): boolean {
  if (!username) return true
  return username.length >= 2 && username.length <= 32
}

/**
 * Validate display name
 */
export function validateDisplayName(name: string): boolean {
  if (!name || name.trim() === '') return true // Display name is optional
  return name.trim().length >= 1 && name.trim().length <= 64
}

/**
 * Check if at least one field is filled
 */
export function hasAtLeastOneField(data: IdentityData): boolean {
  const fields = [
    data.display,
    data.email,
    data.legal,
    data.web,
    data.twitter,
    data.github,
    data.matrix,
    data.discord,
    data.pgp_fingerprint,
    data.image
  ]
  return fields.some(field => field && field.trim().length > 0)
}

/**
 * Comprehensive identity data validation
 */
export function validateIdentityData(data: IdentityData): ValidationError[] {
  const errors: ValidationError[] = []

  // Require at least one field to be filled (not specifically display name)
  if (!hasAtLeastOneField(data)) {
    errors.push({
      field: 'display', // Use display as the error field for backward compatibility
      message: 'At least one identity field must be filled'
    })
  }

  // Validate display name if provided
  if (data.display && !validateDisplayName(data.display)) {
    errors.push({
      field: 'display',
      message: 'Display name must be 1-64 characters'
    })
  }

  if (data.email && !validateEmail(data.email)) {
    errors.push({ field: 'email', message: 'Invalid email format' })
  }

  if (data.twitter && !validateTwitterHandle(data.twitter)) {
    errors.push({ field: 'twitter', message: 'Invalid Twitter handle (max 15 chars)' })
  }

  if (data.github && !validateGithub(data.github)) {
    errors.push({ field: 'github', message: 'Invalid GitHub username' })
  }

  if (data.web && !validateWebsite(data.web)) {
    errors.push({ field: 'web', message: 'Invalid URL format' })
  }

  if (data.pgp_fingerprint && !validatePgpFingerprint(data.pgp_fingerprint)) {
    errors.push({ field: 'pgp_fingerprint', message: 'Invalid PGP fingerprint (40 hex chars)' })
  }

  if (data.matrix && !validateMatrix(data.matrix)) {
    errors.push({ field: 'matrix', message: 'Invalid Matrix ID (@user:server.tld)' })
  }

  if (data.discord && !validateDiscord(data.discord)) {
    errors.push({ field: 'discord', message: 'Invalid Discord username (2-32 chars)' })
  }

  return errors
}

/**
 * Sanitize string to prevent XSS attacks
 */
export function sanitizeString(input: string): string {
  if (!input) return ""

  // Remove any HTML tags
  let sanitized = input.replace(/<[^>]*>/g, '')

  // Remove any script-like patterns
  sanitized = sanitized.replace(/javascript:/gi, '')
  sanitized = sanitized.replace(/on\w+\s*=/gi, '')

  // Normalize whitespace
  sanitized = sanitized.replace(/\s+/g, ' ').trim()

  return sanitized
}

/**
 * Sanitize identity data before submission
 * Applies XSS protection and format normalization
 */
export function sanitizeIdentityData(data: IdentityData): IdentityData {
  return {
    display: sanitizeString(data.display?.trim() || ""),
    email: sanitizeString(data.email?.trim() || ""),
    legal: sanitizeString(data.legal?.trim() || ""),
    web: sanitizeString(data.web?.trim() || ""),
    twitter: sanitizeString(data.twitter?.trim().replace(/^@/, '') || ""),
    github: sanitizeString(data.github?.trim() || ""),
    matrix: sanitizeString(data.matrix?.trim() || ""),
    discord: sanitizeString(data.discord?.trim() || ""),
    pgp_fingerprint: sanitizeString(data.pgp_fingerprint?.trim().replace(/^0x/i, '') || ""),
    image: sanitizeString(data.image?.trim() || ""),
  }
}
