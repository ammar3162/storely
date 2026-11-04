import { describe, it, expect } from 'vitest'
import { findAuthUserByEmail, AUTH_PAGE_SIZE } from './authUsers'

// قاعدة وهمية: n حساب مرتبين بالصفحات
const fakeDb = (n: number, calls: number[] = []) => ({
  auth: { admin: { listUsers: async ({ page, perPage }: { page: number; perPage: number }) => {
    calls.push(page)
    const start = (page - 1) * perPage
    const users = Array.from({ length: Math.max(0, Math.min(perPage, n - start)) }, (_, i) => ({ id: `u${start + i}`, email: `user${start + i}@mail.com` }))
    return { data: { users }, error: null }
  } } },
}) as never

describe('findAuthUserByEmail', () => {
  it('finds an account beyond the first 1000', async () => {
    const calls: number[] = []
    const u = await findAuthUserByEmail(fakeDb(2500, calls), 'user2100@mail.com')
    expect(u?.id).toBe('u2100')
    expect(calls).toEqual([1, 2, 3])
  })

  it('ignores case and spaces', async () => {
    expect((await findAuthUserByEmail(fakeDb(10), '  USER7@Mail.com '))?.id).toBe('u7')
  })

  it('stops at the last page when not found', async () => {
    const calls: number[] = []
    expect(await findAuthUserByEmail(fakeDb(AUTH_PAGE_SIZE + 5, calls), 'nobody@mail.com')).toBeNull()
    expect(calls).toEqual([1, 2])
  })

  it('returns null for empty input without calling the database', async () => {
    const calls: number[] = []
    expect(await findAuthUserByEmail(fakeDb(5, calls), '')).toBeNull()
    expect(calls).toEqual([])
  })
})
