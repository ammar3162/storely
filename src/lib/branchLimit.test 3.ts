import { describe, it, expect } from 'vitest'
import { combineBranchLimit } from './branchLimit'

const now = new Date('2026-09-24T12:00:00Z')
const future = '2026-10-24T12:00:00Z'
const past = '2026-09-01T12:00:00Z'

describe('combineBranchLimit', () => {
  it('uses the plan branches when there is no addon', () => {
    expect(combineBranchLimit(10, [], now)).toEqual({ base: 10, extra: 0, total: 10 })
  })

  it('adds the purchased quantity of extra branches', () => {
    expect(combineBranchLimit(10, [{ quantity: 3, expires_at: future }], now).total).toBe(13)
    expect(combineBranchLimit(1, [{ quantity: 2, expires_at: future }], now).total).toBe(3)
  })

  it('ignores an expired addon', () => {
    expect(combineBranchLimit(10, [{ quantity: 3, expires_at: past }], now).total).toBe(10)
  })

  it('treats a missing plan limit as one branch and a missing quantity as one', () => {
    expect(combineBranchLimit(null, [{ quantity: null, expires_at: future }], now)).toEqual({ base: 1, extra: 1, total: 2 })
  })
})
