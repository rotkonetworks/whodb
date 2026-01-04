import { describe, it, expect } from 'vitest'
import {
  validateWebsite,
  validateTwitterHandle,
  validateEmail,
  validateGithub,
  validatePgpFingerprint,
  validateMatrix,
  validateDiscord,
  validateDisplayName,
  validateIdentityData,
  sanitizeString,
  sanitizeIdentityData,
  hasAtLeastOneField,
  createSafeUrl,
} from './validation'

describe('validateWebsite', () => {
  it('should accept valid domains', () => {
    expect(validateWebsite('example.com')).toBe('example.com')
    expect(validateWebsite('sub.example.com')).toBe('sub.example.com')
    expect(validateWebsite('example.co.uk')).toBe('example.co.uk')
    expect(validateWebsite('example.com/path')).toBe('example.com/path')
  })

  it('should reject URLs with protocols', () => {
    expect(validateWebsite('http://example.com')).toBeNull()
    expect(validateWebsite('https://example.com')).toBeNull()
    expect(validateWebsite('ftp://example.com')).toBeNull()
  })

  it('should reject protocol-relative URLs', () => {
    expect(validateWebsite('//example.com')).toBeNull()
  })

  it('should reject invalid domains', () => {
    expect(validateWebsite('')).toBeNull()
    expect(validateWebsite('   ')).toBeNull()
    expect(validateWebsite('localhost')).toBeNull()
    expect(validateWebsite('example')).toBeNull()
  })

  it('should trim whitespace', () => {
    expect(validateWebsite('  example.com  ')).toBe('example.com')
  })
})

describe('validateTwitterHandle', () => {
  it('should accept valid handles', () => {
    expect(validateTwitterHandle('username')).toBe('username')
    expect(validateTwitterHandle('user_name')).toBe('user_name')
    expect(validateTwitterHandle('user123')).toBe('user123')
  })

  it('should strip @ prefix', () => {
    expect(validateTwitterHandle('@username')).toBe('username')
    expect(validateTwitterHandle('@@username')).toBe('username')
  })

  it('should reject handles over 15 characters', () => {
    expect(validateTwitterHandle('thisisaverylongusername')).toBeNull()
  })

  it('should reject handles with invalid characters', () => {
    expect(validateTwitterHandle('user-name')).toBeNull()
    expect(validateTwitterHandle('user.name')).toBeNull()
  })

  it('should handle empty input', () => {
    expect(validateTwitterHandle('')).toBeNull()
    expect(validateTwitterHandle('   ')).toBeNull()
  })
})

describe('createSafeUrl', () => {
  it('should create safe Twitter URLs', () => {
    expect(createSafeUrl('username', 'twitter')).toBe('https://twitter.com/username')
    expect(createSafeUrl('@username', 'twitter')).toBe('https://twitter.com/username')
  })

  it('should create safe website URLs', () => {
    expect(createSafeUrl('example.com', 'website')).toBe('https://example.com')
  })

  it('should return null for invalid input', () => {
    expect(createSafeUrl('invalid handle!!!', 'twitter')).toBeNull()
    expect(createSafeUrl('https://example.com', 'website')).toBeNull()
  })
})

describe('validateEmail', () => {
  it('should accept valid emails', () => {
    expect(validateEmail('test@example.com')).toBe(true)
    expect(validateEmail('user.name@example.co.uk')).toBe(true)
    expect(validateEmail('user+tag@example.com')).toBe(true)
  })

  it('should reject invalid emails', () => {
    expect(validateEmail('invalid')).toBe(false)
    expect(validateEmail('invalid@')).toBe(false)
    expect(validateEmail('@example.com')).toBe(false)
    expect(validateEmail('test@example')).toBe(false)
  })

  it('should accept empty (optional field)', () => {
    expect(validateEmail('')).toBe(true)
  })
})

describe('validateGithub', () => {
  it('should accept valid usernames', () => {
    expect(validateGithub('username')).toBe(true)
    expect(validateGithub('user-name')).toBe(true)
    expect(validateGithub('user123')).toBe(true)
    expect(validateGithub('a')).toBe(true)
  })

  it('should reject invalid usernames', () => {
    expect(validateGithub('-username')).toBe(false)
    expect(validateGithub('username-')).toBe(false)
    expect(validateGithub('user_name')).toBe(false)
  })

  it('should accept empty (optional field)', () => {
    expect(validateGithub('')).toBe(true)
  })
})

describe('validatePgpFingerprint', () => {
  it('should accept valid fingerprints', () => {
    expect(validatePgpFingerprint('A' + '0'.repeat(39))).toBe(true)
    expect(validatePgpFingerprint('0x' + 'A'.repeat(40))).toBe(true)
    expect(validatePgpFingerprint('abcdef0123456789abcdef0123456789abcdef01')).toBe(true)
  })

  it('should reject invalid fingerprints', () => {
    expect(validatePgpFingerprint('short')).toBe(false)
    expect(validatePgpFingerprint('G' + '0'.repeat(39))).toBe(false) // G is not hex
    expect(validatePgpFingerprint('0'.repeat(41))).toBe(false) // too long
  })

  it('should accept empty (optional field)', () => {
    expect(validatePgpFingerprint('')).toBe(true)
  })
})

describe('validateMatrix', () => {
  it('should accept valid Matrix IDs', () => {
    expect(validateMatrix('@user:matrix.org')).toBe(true)
    expect(validateMatrix('@user123:server.example.com')).toBe(true)
    expect(validateMatrix('@user_name:matrix.org')).toBe(true)
  })

  it('should reject invalid Matrix IDs', () => {
    expect(validateMatrix('user:matrix.org')).toBe(false) // missing @
    expect(validateMatrix('@user@matrix.org')).toBe(false) // @ instead of :
    expect(validateMatrix('@user:localhost')).toBe(false) // no TLD
  })

  it('should accept empty (optional field)', () => {
    expect(validateMatrix('')).toBe(true)
  })
})

describe('validateDiscord', () => {
  it('should accept valid usernames', () => {
    expect(validateDiscord('ab')).toBe(true)
    expect(validateDiscord('a'.repeat(32))).toBe(true)
    expect(validateDiscord('username#1234')).toBe(true)
  })

  it('should reject invalid usernames', () => {
    expect(validateDiscord('a')).toBe(false) // too short
    expect(validateDiscord('a'.repeat(33))).toBe(false) // too long
  })

  it('should accept empty (optional field)', () => {
    expect(validateDiscord('')).toBe(true)
  })
})

describe('validateDisplayName', () => {
  it('should accept valid names', () => {
    expect(validateDisplayName('Alice')).toBe(true)
    expect(validateDisplayName('A')).toBe(true)
    expect(validateDisplayName('A'.repeat(64))).toBe(true)
  })

  it('should reject names that are too long', () => {
    expect(validateDisplayName('A'.repeat(65))).toBe(false)
  })

  it('should accept empty (optional field)', () => {
    expect(validateDisplayName('')).toBe(true)
    expect(validateDisplayName('   ')).toBe(true)
  })
})

describe('hasAtLeastOneField', () => {
  it('should return true if any field is filled', () => {
    expect(hasAtLeastOneField({ display: 'Alice' } as any)).toBe(true)
    expect(hasAtLeastOneField({ email: 'test@example.com' } as any)).toBe(true)
    expect(hasAtLeastOneField({ twitter: 'username' } as any)).toBe(true)
  })

  it('should return false if no fields are filled', () => {
    expect(hasAtLeastOneField({} as any)).toBe(false)
    expect(hasAtLeastOneField({ display: '', email: '' } as any)).toBe(false)
    expect(hasAtLeastOneField({ display: '   ', email: '   ' } as any)).toBe(false)
  })
})

describe('validateIdentityData', () => {
  it('should return no errors for valid data', () => {
    const data = {
      display: 'Alice',
      email: 'alice@example.com',
      twitter: 'alice',
      github: 'alice',
      web: 'alice.com',
      matrix: '@alice:matrix.org',
      discord: 'alice#1234',
      pgp_fingerprint: '0'.repeat(40),
      legal: '',
      image: '',
    }
    expect(validateIdentityData(data)).toEqual([])
  })

  it('should return error if no fields are filled', () => {
    const errors = validateIdentityData({} as any)
    expect(errors).toHaveLength(1)
    expect(errors[0].message).toContain('At least one identity field')
  })

  it('should collect multiple validation errors', () => {
    const data = {
      display: 'Alice',
      email: 'invalid-email',
      twitter: 'this_is_way_too_long_for_twitter',
      github: '-invalid',
      web: '',
      matrix: '',
      discord: '',
      pgp_fingerprint: '',
      legal: '',
      image: '',
    }
    const errors = validateIdentityData(data)
    expect(errors.length).toBeGreaterThan(1)
  })
})

describe('sanitizeString', () => {
  it('should remove HTML tags', () => {
    expect(sanitizeString('<script>alert("xss")</script>')).toBe('alert("xss")')
    expect(sanitizeString('<b>bold</b>')).toBe('bold')
    expect(sanitizeString('text<br>more')).toBe('textmore')
  })

  it('should remove javascript: protocol', () => {
    expect(sanitizeString('javascript:alert(1)')).toBe('alert(1)')
  })

  it('should remove event handlers', () => {
    expect(sanitizeString('onclick=alert(1)')).toBe('alert(1)')
    expect(sanitizeString('onmouseover = evil()')).toBe('evil()')
  })

  it('should normalize whitespace', () => {
    expect(sanitizeString('  multiple   spaces  ')).toBe('multiple spaces')
    expect(sanitizeString('line\n\nbreaks')).toBe('line breaks')
  })

  it('should handle empty input', () => {
    expect(sanitizeString('')).toBe('')
    expect(sanitizeString(null as any)).toBe('')
    expect(sanitizeString(undefined as any)).toBe('')
  })
})

describe('sanitizeIdentityData', () => {
  it('should sanitize all fields', () => {
    const data = {
      display: '  Alice  ',
      email: '  alice@example.com  ',
      twitter: '@alice',
      github: 'alice',
      web: 'alice.com',
      matrix: '@alice:matrix.org',
      discord: 'alice',
      pgp_fingerprint: '0xABCD' + '0'.repeat(36),
      legal: '<script>xss</script>',
      image: 'https://example.com/image.png',
    }

    const sanitized = sanitizeIdentityData(data)

    expect(sanitized.display).toBe('Alice')
    expect(sanitized.email).toBe('alice@example.com')
    expect(sanitized.twitter).toBe('alice') // @ stripped
    expect(sanitized.pgp_fingerprint).toBe('ABCD' + '0'.repeat(36)) // 0x stripped
    expect(sanitized.legal).toBe('xss') // script tags removed
  })

  it('should handle undefined/null fields', () => {
    const data = {
      display: undefined,
      email: null,
    } as any

    const sanitized = sanitizeIdentityData(data)

    expect(sanitized.display).toBe('')
    expect(sanitized.email).toBe('')
  })
})
