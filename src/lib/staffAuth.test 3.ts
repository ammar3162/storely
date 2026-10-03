import { describe, it, expect, vi, beforeAll } from 'vitest'

// فحص الاشتراك داخل verifyStaffToken يقرأ من قاعدة البيانات — نرجّع "لا يوجد تاريخ انتهاء"
vi.mock('@supabase/supabase-js', () => {
  const chain: any = { select: () => chain, eq: () => chain, maybeSingle: async () => ({ data: null }) }
  return { createClient: () => ({ from: () => chain }) }
})

beforeAll(() => { process.env.STAFF_TOKEN_SECRET = 'test-secret' })

const load = () => import('./staffAuth')

describe('staff token', () => {
  it('accepts a freshly generated token and returns its payload', async () => {
    const { generateStaffToken, verifyStaffToken } = await load()
    const token = generateStaffToken('staff-1', 'org-1', 'branch-1')
    const res = await verifyStaffToken(token)
    expect(res.valid).toBe(true)
    expect(res.data).toMatchObject({ staff_id: 'staff-1', org_id: 'org-1', branch_id: 'branch-1' })
  })

  it('rejects a token whose payload was tampered with (e.g. another org)', async () => {
    const { generateStaffToken, verifyStaffToken } = await load()
    const [payload, sig] = generateStaffToken('staff-1', 'org-1', null).split('.')
    const forged = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(payload, 'base64url').toString()), org_id: 'org-2' })).toString('base64url')
    expect((await verifyStaffToken(`${forged}.${sig}`)).valid).toBe(false)
  })

  it('rejects missing, malformed and expired tokens', async () => {
    const { generateStaffToken, verifyStaffToken } = await load()
    expect((await verifyStaffToken(null)).valid).toBe(false)
    expect((await verifyStaffToken('not-a-token')).valid).toBe(false)

    vi.useFakeTimers()
    const token = generateStaffToken('staff-1', 'org-1', null)
    vi.setSystemTime(Date.now() + 13 * 60 * 60 * 1000) // التوكن صالح 12 ساعة
    expect((await verifyStaffToken(token)).valid).toBe(false)
    vi.useRealTimers()
  })
})

describe('extractStaffToken', () => {
  it('reads the bearer token and ignores other headers', async () => {
    const { extractStaffToken } = await load()
    expect(extractStaffToken(new Request('https://x', { headers: { authorization: 'Bearer abc.def' } }))).toBe('abc.def')
    expect(extractStaffToken(new Request('https://x'))).toBe(null)
  })
})
