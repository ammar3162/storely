import { routeFeatureNeed } from './featureRoutes'
import { describe, it, expect } from 'vitest'
import { routeFeatures } from './featureRoutes'

describe('feature routes (custom plan locks)', () => {
  it('maps inventory and purchases routes, longest prefix wins', () => {
    expect(routeFeatures('/api/stock-movements')).toEqual(['inventory'])
    expect(routeFeatures('/api/products/import')).toEqual(['inventory'])
    expect(routeFeatures('/api/products/abc')).toEqual(['inventory', 'purchases'])
    expect(routeFeatures('/api/purchases/bulk')).toEqual(['purchases'])
    expect(routeFeatures('/api/cashier-closing')).toBeNull()
    expect(routeFeatures('/api/me')).toBeNull()
  })
})

describe('routeFeatureNeed — قفل الميزات على مستوى الخادم', () => {
  it('أدوات الذكاء مقفلة حتى للقراءة', () => {
    expect(routeFeatureNeed('/api/waste-report', 'GET')).toEqual(['ai'])
    expect(routeFeatureNeed('/api/smart-insights', 'POST')).toEqual(['ai'])
  })
  it('الربحية مقفلة حتى للقراءة؛ الحضور والرواتب: السجلات تبقى للاطلاع والتعديل مقفل', () => {
    expect(routeFeatureNeed('/api/fixed-expenses', 'GET')).toEqual(['profitability'])
    expect(routeFeatureNeed('/api/profitability/closed-months', 'GET')).toEqual(['profitability'])
    // بعد إلغاء «الحضور والرواتب»: سجلات الحضور تنقرى (الصفحة تعرضها «قراءة فقط»)
    expect(routeFeatureNeed('/api/attendance-report', 'GET')).toBeNull()
    expect(routeFeatureNeed('/api/shifts', 'GET')).toBeNull()
    expect(routeFeatureNeed('/api/shifts', 'PATCH')).toEqual(['hr'])
    expect(routeFeatureNeed('/api/staff-tasks', 'POST')).toEqual(['hr'])
    expect(routeFeatureNeed('/api/staff-payroll-adjustments', 'POST')).toEqual(['hr'])
    expect(routeFeatureNeed('/api/attendance-permission-request', 'GET')).toEqual(['hr'])
  })
  it('قرارات عجز الكاشير ما تنقفل (تحسم إقفالات قديمة والرواتب تعتمد عليها)', () => {
    expect(routeFeatureNeed('/api/cashier-deficit-decision', 'POST')).toBeNull()
  })
  it('المخزون والمشتريات: التعديل مقفل والقراءة مسموحة', () => {
    expect(routeFeatureNeed('/api/purchases', 'GET')).toBeNull()
    expect(routeFeatureNeed('/api/purchases', 'POST')).toEqual(['purchases'])
    expect(routeFeatureNeed('/api/products/import', 'POST')).toEqual(['inventory'])
  })
  it('مسار ما يحتاج ميزة', () => {
    expect(routeFeatureNeed('/api/me', 'GET')).toBeNull()
    expect(routeFeatureNeed('/api/staff-tasks', 'GET')).toBeNull()
  })
})
