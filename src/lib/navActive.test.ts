import { describe, expect, it } from 'vitest'
import { goingTo, isNavActive } from './navActive'

describe('navActive', () => {
  it('بدون ضغطة: الزر حسب الصفحة الحالية', () => {
    expect(isNavActive('/inventory', '/inventory', null)).toBe(true)
    expect(isNavActive('/inventory', '/inventory/count', null)).toBe(true)
    expect(isNavActive('/dashboard', '/inventory', null)).toBe(false)
  })

  it('الرئيسية بالمسار بالضبط', () => {
    expect(isNavActive('/dashboard', '/dashboard', null)).toBe(true)
    expect(isNavActive('/dashboard', '/dashboard-x', null)).toBe(false)
  })

  it('لحظة الضغط: الزر المضغوط يتلوّن والقديم ينطفي قبل ما توصل الصفحة', () => {
    const g = goingTo({ href: '/dispense', from: '/dashboard' }, '/dashboard')
    expect(g).toBe('/dispense')
    expect(isNavActive('/dispense', '/dashboard', g)).toBe(true)
    expect(isNavActive('/dashboard', '/dashboard', g)).toBe(false)
  })

  it('وصلت الصفحة (تغيّر المسار): ينتهي «رايح لـ» ويرجع الحساب للمسار', () => {
    expect(goingTo({ href: '/dispense', from: '/dashboard' }, '/dispense')).toBeNull()
    expect(goingTo(null, '/dashboard')).toBeNull()
  })
})
