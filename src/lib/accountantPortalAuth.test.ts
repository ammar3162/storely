import { describe, it, expect, beforeAll } from 'vitest'

beforeAll(() => { process.env.STAFF_TOKEN_SECRET = 'test-secret' })

describe('accountant portal session', () => {
  it('round trip, expiry and tampering', async () => {
    const { makeSession, readSession } = await import('./accountantPortalAuth')
    const t = makeSession('a1', 's1', 1000)
    expect(readSession(t, 2000)).toEqual({ aid: 'a1', sid: 's1' })
    expect(readSession(t, 1000 + 15 * 86400e3)).toBeNull()                       // انتهت
    const [p, s] = t.split('.')
    const forged = Buffer.from(JSON.stringify({ aid: 'other', sid: 's1', exp: 9e15 })).toString('base64url')
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

describe('access expiry and devices', () => {
  it('expires after the last day (Saudi time)', async () => {
    const { accessExpired } = await import('./accountantPortalAuth')
    expect(accessExpired(null)).toBe(false)
    expect(accessExpired('2026-10-06', Date.parse('2026-10-06T23:00:00+03:00'))).toBe(false)
    expect(accessExpired('2026-10-06', Date.parse('2026-10-07T00:30:00+03:00'))).toBe(true)
  })
  it('device labels', async () => {
    const { deviceLabel } = await import('./accountantPortalAuth')
    expect(deviceLabel('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1')).toBe('آيفون · Safari')
    expect(deviceLabel('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/129.0 Safari/537.36')).toBe('ويندوز · Chrome')
    expect(deviceLabel(null)).toBe('جهاز')
  })
})

describe('accountant invite link', () => {
  it('round trip, expiry, tampering, and not usable as a session', async () => {
    const { makeInviteToken, readInviteToken, readSession, INVITE_DAYS } = await import('./accountantPortalAuth')
    const t = makeInviteToken('i1', 'cpa@office.sa', 1000)
    expect(readInviteToken(t, 2000)).toEqual({ iid: 'i1', em: 'cpa@office.sa' })
    expect(readInviteToken(t, 1000 + INVITE_DAYS * 86400e3 + 1)).toBe('expired')
    const [p, s] = t.split('.')
    const forged = Buffer.from(JSON.stringify({ iid: 'i1', em: 'attacker@x.com', exp: 9e15 })).toString('base64url')
    expect(readInviteToken(`${forged}.${s}`, 2000)).toBeNull()
    expect(readInviteToken(`${p}.x${s.slice(1)}`, 2000)).toBeNull()
    expect(readInviteToken('', 2000)).toBeNull()
    expect(readSession(t, 2000)).toBeNull()   // توقيع مختلف — رابط الدعوة ما يصير جلسة
  })
})
