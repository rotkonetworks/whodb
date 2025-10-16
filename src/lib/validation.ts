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
