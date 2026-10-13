import { describe, it, expect } from 'vitest'
import { canCloseCashier, cleanPerms } from './staffRoles'

describe('staff roles', () => {
  it('cashier role or cashier permission can close the till', () => {
    expect(canCloseCashier({ role: 'cashier' })).toBe(true)
    expect(canCloseCashier({ role: 'staff', permissions: { cashier: true } })).toBe(true)
    expect(canCloseCashier({ role: 'staff', permissions: { dispense: true } })).toBe(false)
    expect(canCloseCashier(null)).toBe(false)
  })
  it('keeps only known permission keys as booleans', () => {
    expect(cleanPerms({ dispense: true, cashier: 'yes', admin: true, reports: 1 })).toEqual({ dispense: true, inventory: false, purchases: false, reports: false, cashier: false })
    expect(cleanPerms(null)).toEqual({ dispense: false, inventory: false, purchases: false, reports: false, cashier: false })
  })
})
