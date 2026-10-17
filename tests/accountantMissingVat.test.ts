import { describe, it, expect, vi, beforeEach } from 'vitest'

// «اطلب من المنشأة تكمّلها»: طلب لكل فاتورة ناقصة، بدون تكرار، وبإشعار واحد
const state = { open: [] as any[], inserted: [] as any[], notes: [] as any[] }
vi.mock('@/lib/accountantPortalAuth', () => ({
  currentAccountant: async () => ({ id: 'acc1', email: 'a@b.co', name: 'محاسب', sessionId: 's1' }),
  accessFor: async () => ({ org_id: 'o1', branch_id: null }),
  accessExpired: () => false,
}))
vi.mock('@/lib/accountantRequests', async (orig) => ({
  ...(await orig() as any),
  validateTarget: async (_db: any, _o: string, t: any) => t.invoice_group === 'bad' ? null : { invoice_group: t.invoice_group || null, purchase_id: t.invoice_group ? null : t.purchase_id || null, closing_id: null },
  withTargets: async (_db: any, _o: string, rows: any[]) => rows,
}))
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (t: string) => {
      const q: any = {
        select: (_c: string, opts?: any) => { q.head = !!opts?.head; return q }, eq: () => q, neq: () => q, limit: async () => ({ data: state.open.slice(0, 1) }),
        insert: (rows: any) => { if (t === 'notifications') state.notes.push(rows); else state.inserted.push(...(Array.isArray(rows) ? rows : [rows])); const r: any = Promise.resolve({ error: null }); r.select = () => ({ single: async () => ({ data: rows, error: null }) }); return r },
        then: (res: any) => res(q.head ? { count: state.open.length } : { data: state.open }),
      }
      return q
    },
  }),
}))

const { POST } = await import('@/app/api/accountant-portal/requests/route')
const post = async (body: any) => { const r = await POST(new Request('http://t/', { method: 'POST', body: JSON.stringify({ org_id: '00000000-0000-0000-0000-000000000001', ...body }) })); return { status: r.status, json: await r.json() } }
const G = (n: number) => `00000000-0000-0000-0000-00000000000${n}`

describe('request missing VAT details', () => {
  beforeEach(() => { state.open = []; state.inserted = []; state.notes = [] })

  it('creates one request per incomplete invoice and a single notification', async () => {
    const r = await post({ targets: [{ invoice_group: G(1) }, { purchase_id: G(2) }, { invoice_group: G(1) }] })
    expect(r.json).toMatchObject({ success: true, created: 2, skipped: 1 })
    expect(state.inserted.every(x => x.kind === 'missing_vat')).toBe(true)
    expect(state.notes.length).toBe(1)
    expect(state.notes[0].message).toContain('2')
  })

  it('skips invoices that already have an open request', async () => {
    state.open = [{ invoice_group: G(1), purchase_id: null }]
    const r = await post({ targets: [{ invoice_group: G(1) }] })
    expect(r.json).toMatchObject({ success: true, created: 0 })
    expect(state.inserted).toEqual([])
    expect(state.notes).toEqual([])
  })

  it('refuses a duplicate single request on the same invoice', async () => {
    state.open = [{ id: 'r1' }]
    const r = await post({ kind: 'missing_vat', invoice_group: G(1) })
    expect(r.status).toBe(409)
  })
})
