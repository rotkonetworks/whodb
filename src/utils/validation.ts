/**
 * Validation utilities for identity form fields
 */

export interface ValidationResult {
  isValid: boolean
  error: string | null
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const URL_REGEX = /^https?:\/\/.+/
const TWITTER_REGEX = /^@?[a-zA-Z0-9_]{1,15}$/
const MATRIX_REGEX = /^@[a-zA-Z0-9._=-]+:[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
const PGP_FINGERPRINT_REGEX = /^(0x)?[a-fA-F0-9]{40}$/
const DISCORD_REGEX = /^.{2,32}(#\d{4})?$/

export function validateEmail(value: string): ValidationResult {
  if (!value || value.trim() === '') {
    return { isValid: true, error: null }
  }

  if (!EMAIL_REGEX.test(value.trim())) {
    return { isValid: false, error: 'Please enter a valid email address' }
  }

  return { isValid: true, error: null }
}

export function validateUrl(value: string): ValidationResult {
  if (!value || value.trim() === '') {
    return { isValid: true, error: null }
  }

  if (!URL_REGEX.test(value.trim())) {
    return { isValid: false, error: 'URL must start with http:// or https://' }
  }

  try {
    new URL(value.trim())
    return { isValid: true, error: null }
  } catch {
    return { isValid: false, error: 'Please enter a valid URL' }
  }
}

export function validateTwitter(value: string): ValidationResult {
  if (!value || value.trim() === '') {
    return { isValid: true, error: null }
  }

  const cleaned = value.trim().replace(/^@/, '')
  if (!TWITTER_REGEX.test(cleaned)) {
    return { isValid: false, error: 'Twitter handle must be 1-15 alphanumeric characters' }
  }

  return { isValid: true, error: null }
}

export function validateMatrix(value: string): ValidationResult {
  if (!value || value.trim() === '') {
    return { isValid: true, error: null }
  }

  if (!MATRIX_REGEX.test(value.trim())) {
    return { isValid: false, error: 'Matrix format: @username:server.org' }
  }

  return { isValid: true, error: null }
}

export function validatePgpFingerprint(value: string): ValidationResult {
  if (!value || value.trim() === '') {
    return { isValid: true, error: null }
  }

  if (!PGP_FINGERPRINT_REGEX.test(value.trim())) {
    return { isValid: false, error: 'PGP fingerprint must be 40 hex characters' }
  }

  return { isValid: true, error: null }
}

export function validateDiscord(value: string): ValidationResult {
  if (!value || value.trim() === '') {
    return { isValid: true, error: null }
  }

  if (!DISCORD_REGEX.test(value.trim())) {
    return { isValid: false, error: 'Please enter a valid Discord username' }
  }

  return { isValid: true, error: null }
}

export function validateDisplayName(value: string): ValidationResult {
  if (!value || value.trim() === '') {
    return { isValid: true, error: null }
  }

  if (value.trim().length < 2) {
    return { isValid: false, error: 'Display name must be at least 2 characters' }
  }

  if (value.trim().length > 32) {
    return { isValid: false, error: 'Display name must be 32 characters or less' }
  }

  return { isValid: true, error: null }
}

export function validateGithub(value: string): ValidationResult {
  if (!value || value.trim() === '') {
    return { isValid: true, error: null }
  }

  // GitHub usernames: 1-39 characters, alphanumeric and hyphens, no consecutive hyphens
  const githubRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/
  if (!githubRegex.test(value.trim()) || value.includes('--')) {
    return { isValid: false, error: 'Invalid GitHub username format' }
  }

  return { isValid: true, error: null }
}

export type FieldValidator = (value: string) => ValidationResult

export const fieldValidators: Record<string, FieldValidator> = {
  display: validateDisplayName,
  email: validateEmail,
  web: validateUrl,
  image: validateUrl,
  twitter: validateTwitter,
  matrix: validateMatrix,
  pgp_fingerprint: validatePgpFingerprint,
  discord: validateDiscord,
  github: validateGithub,
}

export function validateField(fieldName: string, value: string): ValidationResult {
  const validator = fieldValidators[fieldName]
  if (!validator) {
    return { isValid: true, error: null }
  }
  return validator(value)
}
