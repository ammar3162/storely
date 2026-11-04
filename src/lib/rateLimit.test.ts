import { describe, it, expect } from 'vitest'
import { hitLimits, limit, waitText, tooMany, LIMITS } from './rateLimit'

const fakeDb = (replies: Record<string, unknown>, calls: any[] = []) => ({
  rpc: async (_fn: string, args: any) => {
    calls.push(args)
    const r = replies[args.p_key]
    if (r instanceof Error) throw r
    return r === 'error' ? { data: null, error: { message: 'x' } } : { data: r ?? 0, error: null }
  },
}) as any

describe('rateLimit', () => {
  it('allows when every counter returns 0', async () => {
    expect(await hitLimits([limit('otpSendPhone', '+966500000000'), limit('otpSendIp', '1.2.3.4')], fakeDb({}))).toBe(0)
  })

  it('returns the longest wait across limits', async () => {
    const db = fakeDb({ 'otpsendphone:+966500000000': 120, 'otpsendip:1.2.3.4': 900 })
    expect(await hitLimits([limit('otpSendPhone', '+966500000000'), limit('otpSendIp', '1.2.3.4')], db)).toBe(900)
  })

  it('fails open when the database errors or throws', async () => {
    const db = fakeDb({ 'aichatorg:o1': 'error', 'aichatorgday:o1': new Error('down') })
    expect(await hitLimits([limit('aiChatOrg', 'o1'), limit('aiChatOrgDay', 'o1')], db)).toBe(0)
  })

  it('sends normalized key, max and window to the database', async () => {
    const calls: any[] = []
    await hitLimits([limit('resetTarget', 'Owner@Mail.COM')], fakeDb({}, calls))
    expect(calls[0]).toEqual({ p_key: 'resettarget:owner@mail.com', p_max: LIMITS.resetTarget.max, p_window_seconds: LIMITS.resetTarget.windowSec })
  })

  it('formats waits in Arabic', () => {
    expect(waitText(30)).toBe('30 ثانية')
    expect(waitText(5)).toBe('5 ثوانٍ')
    expect(waitText(120)).toBe('دقيقتين')
    expect(waitText(575)).toBe('10 دقائق')
    expect(waitText(15 * 60)).toBe('15 دقيقة')
    expect(waitText(86400)).toBe('24 ساعة')
  })

  it('429 response carries Retry-After and an Arabic message', async () => {
    const r = tooMany(120)
    expect(r.status).toBe(429)
    expect(r.headers.get('Retry-After')).toBe('120')
    const j = await r.json()
    expect(j.rate_limited).toBe(true)
    expect(j.error).toContain('حاول مرة ثانية بعد دقيقتين')
  })
})
