import { describe, it, expect } from 'vitest'
import { selectAll } from './selectAll'

// استعلام وهمي يحاكي Supabase: يرجّع شريحة من مصفوفة حسب range
const fakeTable = (n: number, failAt?: number) => {
  const rows = Array.from({ length: n }, (_, i) => ({ id: i }))
  return () => ({
    range: async (from: number, to: number) =>
      failAt !== undefined && from >= failAt ? { data: null, error: { message: 'boom' } } : { data: rows.slice(from, to + 1), error: null },
  })
}

describe('selectAll', () => {
  it('returns every row past the 1000-row cap', async () => {
    const { data, error } = await selectAll(fakeTable(2500))
    expect(error).toBeNull()
    expect(data).toHaveLength(2500)
    expect(data[2499]).toEqual({ id: 2499 })
  })
  it('handles exact multiples and empty tables', async () => {
    expect((await selectAll(fakeTable(2000))).data).toHaveLength(2000)
    expect((await selectAll(fakeTable(0))).data).toHaveLength(0)
  })
  it('surfaces errors', async () => {
    const { error } = await selectAll(fakeTable(3000, 1000))
    expect(error).toEqual({ message: 'boom' })
  })
})
