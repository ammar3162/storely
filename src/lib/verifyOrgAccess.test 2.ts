import { describe, it, expect, vi } from 'vitest'

// الملف يستورد عملاء Supabase وnext/headers — نختبر هنا المنطق النقي فقط
vi.mock('next/headers', () => ({ headers: async () => new Headers(), cookies: async () => ({ getAll: () => [] }) }))
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))

const { enforcedBranchId } = await import('./verifyOrgAccess')

describe('enforcedBranchId', () => {
  it('forces a branch manager to their own branch, whatever the request asks for', () => {
    expect(enforcedBranchId({ role: 'manager', branchId: 'b-own' }, 'b-other')).toBe('b-own')
    expect(enforcedBranchId({ role: 'manager', branchId: 'b-own' }, null)).toBe('b-own')
  })

  it('lets the owner choose any branch, or all branches', () => {
    expect(enforcedBranchId({ role: 'owner', branchId: null }, 'b-1')).toBe('b-1')
    expect(enforcedBranchId({ role: 'owner', branchId: null }, null)).toBe(null)
  })
})
