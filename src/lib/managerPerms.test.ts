import { describe, it, expect } from 'vitest'
import { managerPageAllowed, cleanManagerPerms, managerMay, MANAGER_PERM_KEYS } from './managerPerms'

describe('branch manager permissions', () => {
  const p = { inventory: true, hr: false, attendance: true }
  it('pages follow their permission; home and notifications always open', () => {
    expect(managerPageAllowed('/inventory', p)).toBe(true)
    expect(managerPageAllowed('/hr-management', p)).toBe(false)
    expect(managerPageAllowed('/attendance', p)).toBe(true)
    expect(managerPageAllowed('/reports', p)).toBe(false)
    expect(managerPageAllowed('/dashboard', p)).toBe(true)
    expect(managerPageAllowed('/notifications', {})).toBe(true)
  })
  it('owner-only pages are always closed, including sub-pages', () => {
    for (const path of ['/settings', '/branches', '/branch-managers', '/addons-market', '/transfer-stock', '/settings/billing'])
      expect(managerPageAllowed(path, Object.fromEntries(MANAGER_PERM_KEYS.map(k => [k, true])))).toBe(false)
  })
  it('does not confuse prefixes (/reports vs /reportsx)', () => {
    expect(managerPageAllowed('/reports/x', { reports: true })).toBe(true)
    expect(managerPageAllowed('/inventoryx', {})).toBe(true)
  })
  it('cleans permissions to known booleans', () => {
    const c = cleanManagerPerms({ inventory: true, admin: true, hr: 'yes' })
    expect(Object.keys(c).sort()).toEqual([...MANAGER_PERM_KEYS].sort())
    expect(c.inventory).toBe(true); expect(c.hr).toBe(false); expect((c as any).admin).toBeUndefined()
  })
  it('API check: owner always, manager needs one of the keys', () => {
    expect(managerMay({ role: 'owner' }, 'hr')).toBe(true)
    expect(managerMay({ role: 'manager', permissions: { reports: true } }, 'attendance', 'reports')).toBe(true)
    expect(managerMay({ role: 'manager', permissions: {} }, 'hr')).toBe(false)
  })
})
