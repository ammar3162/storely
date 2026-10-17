import { describe, it, expect, vi, beforeEach } from 'vitest'

// حارس مدير الفرع داخل verifyOrgAccess: المسار يجي من proxy بالهيدر x-storely-path
const state = { headers: new Headers(), profile: {} as Record<string, unknown> }
vi.mock('next/headers', () => ({ headers: async () => state.headers, cookies: async () => ({ getAll: () => [] }) }))
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: 'u1', email: null } } }) },
    from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: state.profile }) }) }) }),
  }),
}))

const { verifyOrgAccess } = await import('./verifyOrgAccess')
const at = (path: string, method: string) => { state.headers = new Headers({ 'x-storely-path': path, 'x-storely-method': method }) }

describe('verifyOrgAccess — branch manager API guard', () => {
  beforeEach(() => { state.profile = { org_id: 'o1', role: 'manager', branch_id: 'b1', status: 'active', permissions: { inventory: true } } })

  it('refuses a manager on a route their permissions do not cover', async () => {
    at('/api/staff-payroll-adjustments', 'POST')
    expect(await verifyOrgAccess('o1')).toMatchObject({ authorized: false, status: 403 })
    at('/api/backup', 'GET')
    expect(await verifyOrgAccess('o1')).toMatchObject({ authorized: false, status: 403 })
  })

  it('allows the manager where the permission matches, and on open routes', async () => {
    at('/api/products', 'PATCH')
    expect(await verifyOrgAccess('o1')).toMatchObject({ authorized: true, role: 'manager' })
    at('/api/notifications', 'GET')
    expect((await verifyOrgAccess('o1')).authorized).toBe(true)
  })

  it('never limits the owner', async () => {
    state.profile = { org_id: 'o1', role: 'owner', branch_id: null, status: 'active', permissions: null }
    at('/api/backup', 'POST')
    expect((await verifyOrgAccess('o1')).authorized).toBe(true)
  })

  it('still refuses another organization first', async () => {
    at('/api/products', 'GET')
    expect(await verifyOrgAccess('o2')).toMatchObject({ authorized: false, status: 403 })
  })
})
