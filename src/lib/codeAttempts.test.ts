import { describe, it, expect } from 'vitest'
import { claimAttempt, consumeCode } from './codeAttempts'

// قاعدة وهمية تطبّق التحديث المشروط مثل Postgres: الصف يتغير بس لو كل الشروط متحققة
function fakeDb(row: { id: string; attempts: number; used_at: string | null }) {
  return {
    from: () => ({
      update(patch: any) {
        const conds: [string, any][] = []
        const q: any = {
          eq(k: string, v: any) { conds.push([k, v]); return q },
          is(k: string, v: any) { conds.push([k, v]); return q },
          async select() {
            const ok = conds.every(([k, v]) => (row as any)[k] === v)
            if (ok) Object.assign(row, patch)
            return { data: ok ? [{ id: row.id }] : [], error: null }
          },
        }
        return q
      },
    }),
  } as any
}

describe('verification code attempts', () => {
  it('two parallel guesses that read the same count: only one is allowed', async () => {
    const row = { id: 'c1', attempts: 0, used_at: null }
    const db = fakeDb(row)
    const results = await Promise.all([claimAttempt(db, 't', 'c1', 0), claimAttempt(db, 't', 'c1', 0), claimAttempt(db, 't', 'c1', 0)])
    expect(results.filter(Boolean)).toHaveLength(1)
    expect(row.attempts).toBe(1)
  })
  it('a correct code is consumed only once', async () => {
    const row = { id: 'c1', attempts: 1, used_at: null as string | null }
    const db = fakeDb(row)
    expect(await consumeCode(db, 't', 'c1')).toBe(true)
    expect(await consumeCode(db, 't', 'c1')).toBe(false)
  })
})
