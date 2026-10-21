import { describe, it, expect } from 'vitest'
import { slugifyShop, menuBranchIds, canEditItemBranch, cleanShopHours, safeDecode } from './shopMenu'
import { billLines } from './planPricing'

const A = { id: 'a', name: 'العليا', shop_slug: 'العليا', shop_hours: null }
const B = { id: 'b', name: 'النرجس', shop_slug: 'النرجس', shop_hours: null }

describe('shopMenu helpers', () => {
  it('slugifies Arabic and Latin branch names', () => {
    expect(slugifyShop('  فرع العليا  ')).toBe('فرع-العليا')
    expect(slugifyShop('Branch #2!')).toBe('branch-2')
    expect(slugifyShop('---')).toBe('')
  })

  it('treats a subscription without branches as the old org-wide menu', () => {
    expect(menuBranchIds(null)).toBeNull()
    expect(menuBranchIds({ branch_ids: null })).toBeNull()
    expect(menuBranchIds({ branch_ids: [] })).toBeNull()
    expect(menuBranchIds({ branch_ids: ['a', 'b'] })).toEqual(['a', 'b'])
  })

  it('owner edits any covered branch and all-branch items; manager only their branch', () => {
    const owner = { ok: true as const, mode: 'branch' as const, branchId: 'a', canManageOrg: true, branches: [A, B] }
    const manager = { ok: true as const, mode: 'branch' as const, branchId: 'b', canManageOrg: false, branches: [B] }
    const legacy = { ok: true as const, mode: 'org' as const, branchId: null, canManageOrg: true, branches: [] }
    expect(canEditItemBranch(owner, null)).toBe(true)
    expect(canEditItemBranch(owner, 'b')).toBe(true)
    expect(canEditItemBranch(owner, 'zzz')).toBe(false)
    expect(canEditItemBranch(manager, null)).toBe(false)
    expect(canEditItemBranch(manager, 'a')).toBe(false)
    expect(canEditItemBranch(manager, 'b')).toBe(true)
    expect(canEditItemBranch(legacy, null)).toBe(true)
  })

  it('cleans opening hours and rejects bad times', () => {
    expect(cleanShopHours(null)).toBeNull()
    expect(cleanShopHours({ enabled: true, is24h: false, open: '07:30', close: '25:00' })).toEqual({ enabled: true, is24h: false, open: '07:30', close: '22:00' })
    expect(cleanShopHours({ enabled: 1, open: 'x' })).toEqual({ enabled: true, is24h: true, open: '09:00', close: '22:00' })
  })

  it('decodes encoded Arabic URL parts safely', () => {
    expect(safeDecode(encodeURIComponent('العليا'))).toBe('العليا')
    expect(safeDecode('العليا')).toBe('العليا')
    expect(safeDecode('%E0%A4%A')).toBe('%E0%A4%A')
  })

  it('bills the menu per subscribed branch', () => {
    const menu = (quantity: number) => [{ name: 'المنيو الإلكتروني', slug: 'online_menu', monthly_price: 39, subscription: { isValid: true, quantity } }]
    expect(billLines('pro', 'monthly', menu(1)).total).toBe(249 + 39)
    expect(billLines('pro', 'monthly', menu(3)).total).toBe(249 + 3 * 39)
    expect(billLines('pro', 'yearly', menu(2)).total).toBe(2390 + 2 * 39 * 12)
  })
})
