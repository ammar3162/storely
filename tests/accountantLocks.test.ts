import { describe, it, expect, vi, beforeEach } from 'vitest'

// إقفال الشهر يقفل المنشأة كاملة — مسموح بس لمحاسب إذنه على المنشأة كاملة (بدون فرع)
const state = { access: null as any }
const writes: string[] = []
vi.mock('@/lib/accountantPortalAuth', () => ({
  currentAccountant: async () => ({ id: 'acc1', email: 'a@b.co', name: 'محاسب', sessionId: 's1' }),
  accessFor: async () => state.access,
  accessExpired: () => false,
}))
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (t: string) => {
      const q: any = {
        select: () => q, eq: () => q, in: async () => ({ data: [] }), delete: () => { writes.push(t + ':delete'); return q },
        upsert: async () => { writes.push(t + ':upsert'); return { error: null } }, insert: async () => { writes.push(t + ':insert'); return { error: null } },
        then: (r: any) => r({ data: [], error: null }),
      }
      return q
    },
  }),
}))

const { GET, POST } = await import('@/app/api/accountant-portal/locks/route')
const { closedMonths } = await import('@/lib/periodLock')
const month = closedMonths(1)[0]
const post = (action: string) => POST(new Request('http://t/', { method: 'POST', body: JSON.stringify({ org_id: '00000000-0000-0000-0000-000000000001', month, action }) }))

describe('accountant month locks', () => {
  beforeEach(() => { writes.length = 0 })

  it('refuses a branch-limited accountant and writes nothing', async () => {
    state.access = { org_id: 'o1', branch_id: 'b1' }
    for (const action of ['lock', 'unlock']) expect((await post(action)).status).toBe(403)
    expect(writes).toEqual([])
    const g = await (await GET(new Request('http://t/?org_id=00000000-0000-0000-0000-000000000001'))).json()
    expect(g.can_lock).toBe(false)
  })

  it('lets a whole-organization accountant lock the month', async () => {
    state.access = { org_id: 'o1', branch_id: null }
    expect((await post('lock')).status).toBe(200)
    expect(writes).toContain('period_locks:upsert')
    const g = await (await GET(new Request('http://t/?org_id=00000000-0000-0000-0000-000000000001'))).json()
    expect(g.can_lock).toBe(true)
  })
})
