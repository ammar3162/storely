import { describe, it, expect } from 'vitest'
import { countSince, usageLevel, parseResendTime } from './emailUsage'

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
  it('reads the real Resend time format ("+00" offset)', async () => {
    expect(parseResendTime('2026-11-13 10:00:00.674981+00')).toBe(Date.UTC(2026, 10, 13, 10, 0, 0, 674))
    const page = { data: [{ id: 'a', created_at: '2026-11-13 10:00:00.1+00' }, { id: 'b', created_at: '2026-11-01 10:00:00.1+00' }], has_more: false }
    expect(await countSince(async () => page, Date.UTC(2026, 10, 12))).toBe(1)
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
