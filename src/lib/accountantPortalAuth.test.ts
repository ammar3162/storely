import { describe, it, expect, beforeAll } from 'vitest'

beforeAll(() => { process.env.STAFF_TOKEN_SECRET = 'test-secret' })

describe('accountant portal session', () => {
  it('round trip, expiry and tampering', async () => {
    const { makeSession, readSession } = await import('./accountantPortalAuth')
    const t = makeSession('a1', 1000)
    expect(readSession(t, 2000)).toBe('a1')
    expect(readSession(t, 1000 + 15 * 86400e3)).toBeNull()                       // انتهت
    const [p, s] = t.split('.')
    const forged = Buffer.from(JSON.stringify({ aid: 'other', exp: 9e15 })).toString('base64url')
    expect(readSession(`${forged}.${s}`, 2000)).toBeNull()                        // تلاعب
    expect(readSession(`${p}.x${s.slice(1)}`, 2000)).toBeNull()
    expect(readSession('', 2000)).toBeNull()
  })
  it('codes are 6 digits and hashed per email', async () => {
    const { newCode, hashCode } = await import('./accountantPortalAuth')
    expect(newCode()).toMatch(/^\d{6}$/)
    expect(hashCode('a@x.sa', '123456')).not.toBe(hashCode('b@x.sa', '123456'))
  })
})
