import { describe, it, expect } from 'vitest'
import { groupLogs, timesAr } from './accountantActivity'

const u = { name: 'عمار', email: 'a@x.test' }
const log = (action: string, start: string, at: string) => ({ action, period_start: start, period_end: '2026-10-11', created_at: at, accountant_users: u })

describe('accountant activity', () => {
  it('collapses repeated views of the same report into one line with a count and the latest time', () => {
    const g = groupLogs([
      log('view', '2026-10-01', '2026-10-11T10:00:00Z'),
      log('view', '2026-10-01', '2026-10-11T12:00:00Z'),
      log('download', '2026-10-01', '2026-10-09T09:00:00Z'),
      log('view', '2026-10-01', '2026-10-08T09:00:00Z'),
      log('view', '2026-09-01', '2026-10-07T09:00:00Z'),
    ])
    expect(g.map(x => [x.action, x.period_start, x.count])).toEqual([['view', '2026-10-01', 3], ['download', '2026-10-01', 1], ['view', '2026-09-01', 1]])
    expect(g[0].created_at).toBe('2026-10-11T12:00:00Z')
  })
  it('counts in Arabic', () => {
    expect([2, 3, 10, 11].map(timesAr)).toEqual(['مرتين', '3 مرات', '10 مرات', '11 مرة'])
  })
})
