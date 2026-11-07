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
