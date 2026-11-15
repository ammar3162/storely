import { describe, it, expect } from 'vitest'
import { transferAvgCost } from './transferCost'

describe('transferAvgCost', () => {
  it('new/empty destination takes source cost', () => {
    expect(transferAvgCost(0, 0, 5, 12)).toBe(12)
    expect(transferAvgCost(3, 0, 5, 12)).toBe(12)
  })
  it('weighted average with existing stock', () => {
    expect(transferAvgCost(10, 10, 10, 20)).toBe(15)
  })
  it('source without cost leaves destination unchanged', () => {
    expect(transferAvgCost(10, 10, 5, 0)).toBeNull()
  })
  it('negative destination qty treated as empty', () => {
    expect(transferAvgCost(-2, 8, 4, 10)).toBe(10)
  })
})
