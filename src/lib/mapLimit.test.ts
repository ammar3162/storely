import { describe, it, expect } from 'vitest'
import { mapLimit } from './mapLimit'

describe('mapLimit', () => {
  it('keeps order and never exceeds the limit', async () => {
    let running = 0, peak = 0
    const out = await mapLimit([5, 1, 4, 2, 3, 6, 7], 3, async (n) => {
      running++; peak = Math.max(peak, running)
      await new Promise(r => setTimeout(r, n * 3))
      running--
      return n * 10
    })
    expect(out).toEqual([50, 10, 40, 20, 30, 60, 70])
    expect(peak).toBeLessThanOrEqual(3)
  })
  it('handles an empty list', async () => {
    expect(await mapLimit([], 4, async x => x)).toEqual([])
  })
})
