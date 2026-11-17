import { describe, it, expect, vi, beforeEach } from 'vitest'

// PATCH /api/me — تغيير الجوال من جهاز موثوق فقط، بدون تكرار بين الحسابات، مع تنبيه إيميل
const state = vi.hoisted(() => ({
  profile: null as any,
  cur: { phone: '0551234567', full_name: 'عمار' } as any,
  taken: [] as any[],
  updates: [] as { table: string; data: any }[],
  mails: [] as any[],
}))

vi.mock('@/lib/verifyOrgAccess', () => ({ getCurrentProfile: async () => state.profile }))
vi.mock('@/lib/email', () => ({ sendEmail: async (m: any) => { state.mails.push(m); return { success: true } } }))
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (table: string) => {
      const chain: any = {
        select: () => chain, eq: () => chain, neq: () => chain, in: () => chain,
        limit: async () => ({ data: state.taken }),
        maybeSingle: async () => ({ data: state.cur }),
        update: (data: any) => { state.updates.push({ table, data }); return { eq: async () => ({ error: null }) } },
      }
      return chain
    },
  }),
}))

const patch = async (body: any) => {
  const { PATCH } = await import('@/app/api/me/route')
  const res = await PATCH(new Request('http://x/api/me', { method: 'PATCH', body: JSON.stringify(body) }))
  return { status: res.status, json: await res.json() }
}

beforeEach(() => {
  state.profile = { userId: 'u1', orgId: 'o1', role: 'owner', deviceTrusted: true, email: 'owner@example.com', status: 'active' }
  state.cur = { phone: '0551234567', full_name: 'عمار' }
  state.taken = []; state.updates = []; state.mails = []
})

describe('PATCH /api/me', () => {
  it('blocks phone change from an unverified device', async () => {
    state.profile.deviceTrusted = false
    const r = await patch({ phone: '0599999999' })
    expect(r.status).toBe(403)
    expect(state.updates).toHaveLength(0)
  })
  it('still lets an unverified device save the name only', async () => {
    state.profile.deviceTrusted = false
    expect((await patch({ full_name: 'اسم' })).status).toBe(200)
  })
  it('rejects a number already used by another account', async () => {
    state.taken = [{ id: 'other' }]
    const r = await patch({ phone: '0599999999' })
    expect(r.status).toBe(409)
    expect(state.updates).toHaveLength(0)
  })
  it('saves a new number and emails a security notice', async () => {
    const r = await patch({ full_name: 'عمار', phone: '0599999999' })
    expect(r.status).toBe(200)
    expect(state.updates[0].data.phone).toBe('0599999999')
    expect(state.mails).toHaveLength(1)
    expect(state.mails[0].to).toBe('owner@example.com')
  })
  it('same number in another format is not a change (no email, no duplicate check)', async () => {
    state.taken = [{ id: 'legacy-duplicate' }]
    const r = await patch({ full_name: 'عمار', phone: '+966551234567' })
    expect(r.status).toBe(200)
    expect(state.updates[0].data.phone).toBeUndefined()
    expect(state.mails).toHaveLength(0)
  })
  it('a branch manager cannot cancel the owner\'s scheduled deletion', async () => {
    state.profile.role = 'manager'
    await patch({ cancel_org_deletion: true })
    expect(state.updates.filter(u => u.table === 'organizations')).toHaveLength(0)
    state.profile.role = 'owner'
    await patch({ cancel_org_deletion: true })
    expect(state.updates.filter(u => u.table === 'organizations')).toHaveLength(1)
  })
})
