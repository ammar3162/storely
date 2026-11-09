import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { managerPageAllowed, cleanManagerPerms, managerMay, MANAGER_PERM_KEYS, managerApiAllowed, API_GUARDS, API_OPEN } from './managerPerms'

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
    for (const path of ['/settings', '/branches', '/branch-managers', '/addons-market', '/settings/billing'])
      expect(managerPageAllowed(path, Object.fromEntries(MANAGER_PERM_KEYS.map(k => [k, true])))).toBe(false)
  })
  it('stock transfer between branches: owner, or a manager only with the transfer permission', () => {
    expect(managerPageAllowed('/transfer-stock', {})).toBe(false)
    expect(managerPageAllowed('/transfer-stock', { inventory: true, dispense: true })).toBe(false)
    expect(managerPageAllowed('/transfer-stock', { transfer: true })).toBe(true)
    expect(managerApiAllowed('/api/branch-transfer', 'POST', { inventory: true })).toBe(false)
    expect(managerApiAllowed('/api/branch-transfer', 'POST', { transfer: true })).toBe(true)
    expect(managerApiAllowed('/api/branch-transfer', 'GET', {})).toBe(false)
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

describe('branch manager API guard', () => {
  const p = { inventory: true, hr: false, purchases: true }
  it('reads follow every page that uses the route; writes follow the owning page', () => {
    expect(managerApiAllowed('/api/products', 'GET', {})).toBe(true)
    expect(managerApiAllowed('/api/products', 'PATCH', p)).toBe(true)
    expect(managerApiAllowed('/api/products', 'DELETE', { dispense: true })).toBe(false)
    expect(managerApiAllowed('/api/staff-payroll-adjustments', 'POST', p)).toBe(false)
    expect(managerApiAllowed('/api/staff-payroll-adjustments', 'GET', { hr: true })).toBe(true)
    expect(managerApiAllowed('/api/suppliers', 'GET', p)).toBe(true)
    expect(managerApiAllowed('/api/suppliers', 'DELETE', p)).toBe(false)
  })
  it('owner-only routes are closed to managers, including sub-routes', () => {
    const all = Object.fromEntries(MANAGER_PERM_KEYS.map(k => [k, true]))
    for (const r of ['/api/backup', '/api/backup/list', '/api/branch-managers', '/api/accountant-link', '/api/period-locks', '/api/delete-account'])
      expect(managerApiAllowed(r, 'GET', all), r).toBe(false)
    expect(managerApiAllowed('/api/extra-days', 'POST', all)).toBe(false)
  })
  it('unknown permission keys in the map would be a typo', () => {
    for (const [route, g] of Object.entries(API_GUARDS))
      for (const rule of [g.read, g.write]) if (Array.isArray(rule)) for (const k of rule) expect(MANAGER_PERM_KEYS, `${route}: ${k}`).toContain(k)
  })
  it('every org API route is classified (guarded or intentionally open)', () => {
    const root = path.resolve(__dirname, '../app/api')
    const routes: string[] = []
    const walk = (d: string) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const f = path.join(d, e.name)
      if (e.isDirectory()) walk(f)
      else if (e.name === 'route.ts' && fs.readFileSync(f, 'utf8').includes('verifyOrgAccess(')) routes.push('/api/' + path.relative(root, d).split(path.sep).join('/'))
    } }
    walk(root)
    expect(routes.length).toBeGreaterThan(50)
    const covered = (r: string) => { let q = r; while (q.split('/').length > 2) { if (API_GUARDS[q] || API_OPEN.includes(q)) return true; q = q.slice(0, q.lastIndexOf('/')) } return false }
    expect(routes.filter(r => !covered(r)), 'أضف المسار الجديد لـ API_GUARDS أو API_OPEN في managerPerms.ts').toEqual([])
  })
})

describe('permissions follow the plan features («ابنِ باقتك»)', () => {
  it('hides permissions whose feature is off; unknown features stay available', async () => {
    const { permAvailable } = await import('./managerPerms')
    const cashierOnly = { inventory: false, purchases: false, cashier: true, hr: false, ai: false, profitability: true }
    expect(['inventory', 'dispense', 'purchases', 'suppliers', 'attendance', 'hr', 'ai_tools'].map(k => permAvailable(k, cashierOnly))).toEqual([false, false, false, false, false, false, false])
    expect(['reports', 'staff', 'profitability', 'cashier'].map(k => permAvailable(k, cashierOnly))).toEqual([true, true, true, true])
    expect(permAvailable('suppliers', { inventory: false, purchases: true })).toBe(true)
    expect(permAvailable('dispense', {})).toBe(true)   // قبل ما توصل الميزات: كل شي ظاهر
  })
})
