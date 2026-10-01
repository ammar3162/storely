import { describe, it, expect, beforeAll } from 'vitest'
import { encryptPin, decryptPin } from './pinVault'

beforeAll(() => { process.env.STAFF_TOKEN_SECRET = 'test-secret' })

describe('pinVault', () => {
  it('round-trips a PIN', () => {
    expect(decryptPin(encryptPin('4827'))).toBe('4827')
  })

  it('uses a fresh IV each time', () => {
    expect(encryptPin('1234')).not.toBe(encryptPin('1234'))
  })

  it('rejects tampered or empty values', () => {
    const enc = encryptPin('1234')
    const parts = enc.split(':')
    parts[3] = Buffer.from('9999').toString('base64')
    expect(decryptPin(parts.join(':'))).toBeNull()
    expect(decryptPin(null)).toBeNull()
    expect(decryptPin('garbage')).toBeNull()
  })

  it('does not decrypt with a different secret', () => {
    const enc = encryptPin('5555')
    process.env.STAFF_TOKEN_SECRET = 'other-secret'
    expect(decryptPin(enc)).toBeNull()
    process.env.STAFF_TOKEN_SECRET = 'test-secret'
  })
})
