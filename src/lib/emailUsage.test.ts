import { describe, it, expect } from 'vitest'
import { countSince, usageLevel } from './emailUsage'

const at = (h: number) => new Date(Date.UTC(2026, 10, 13, h)).toISOString()
describe('email usage', () => {
  it('counts only items newer than the window, across pages', async () => {
    const pages: Record<string, any> = {
      first: { data: [{ id: 'a', created_at: at(10) }, { id: 'b', created_at: at(9) }], has_more: true },
      b: { data: [{ id: 'c', created_at: at(8) }, { id: 'd', created_at: at(1) }], has_more: true },
    }
    const n = await countSince(async after => pages[after || 'first'] || null, Date.parse(at(5)))
    expect(n).toBe(3)
  })
  it('handles empty and failed pages', async () => {
    expect(await countSince(async () => null, 0)).toBe(0)
  })
  it('warns at 80 and stops at 100', () => {
    expect(usageLevel(79)).toBe('ok')
    expect(usageLevel(80)).toBe('warn')
    expect(usageLevel(100)).toBe('stop')
  })
})
