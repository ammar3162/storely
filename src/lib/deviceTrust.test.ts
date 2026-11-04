import { describe, it, expect } from 'vitest'
import { newDeviceId, validDeviceId, hashDevice, newCode, hashCode, sameHash, normalizeCode, maskEmail, deviceLabel } from './deviceTrust'

describe('device ids', () => {
  it('new ids are valid, random and hashed one-way', () => {
    const a = newDeviceId(), b = newDeviceId()
    expect(validDeviceId(a)).toBe(true)
    expect(a).not.toBe(b)
    expect(hashDevice(a)).toMatch(/^[0-9a-f]{64}$/)
    expect(hashDevice(a)).not.toContain(a)
  })
  it('rejects tampered or short ids', () => {
    expect(validDeviceId('abc')).toBe(false)
    expect(validDeviceId(newDeviceId() + 'x')).toBe(false)
    expect(validDeviceId(null)).toBe(false)
  })
})

describe('login codes', () => {
  it('codes are 6 digits', () => {
    for (let i = 0; i < 50; i++) expect(newCode()).toMatch(/^\d{6}$/)
  })
  it('hash is bound to the user', () => {
    expect(sameHash(hashCode('u1', '123456'), hashCode('u1', '123456'))).toBe(true)
    expect(sameHash(hashCode('u1', '123456'), hashCode('u2', '123456'))).toBe(false)
    expect(sameHash(hashCode('u1', '123456'), hashCode('u1', '123457'))).toBe(false)
    expect(sameHash('', '')).toBe(false)
  })
  it('accepts Arabic digits and spaces', () => {
    expect(normalizeCode('١٢٣ ٤٥٦')).toBe('123456')
    expect(normalizeCode(' 12-34 56 ')).toBe('123456')
    expect(normalizeCode(undefined)).toBe('')
  })
})

describe('display helpers', () => {
  it('masks the email', () => {
    expect(maskEmail('ammar@gmail.com')).toBe('a****@gmail.com')
    expect(maskEmail('a@x.com')).toBe('a**@x.com')
    expect(maskEmail('')).toBe('')
  })
  it('names the device from the user agent', () => {
    expect(deviceLabel('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1')).toBe('Safari على iPhone')
    expect(deviceLabel('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36')).toBe('Chrome على Windows')
    expect(deviceLabel('Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/120.0 Safari/537.36 Edg/120.0')).toBe('Edge على Windows')
    expect(deviceLabel('')).toBe('جهاز غير معروف')
  })
})
