import { describe, it, expect, vi, beforeEach } from 'vitest'

const signIn = vi.fn()
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ auth: { signInWithPassword: (a: any) => signIn(a), signOut: async () => ({}) } }) }))

function fakeDb(state: any) {
  return {
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { ...state } }) }) }),
      update: (u: any) => ({ eq: async () => { Object.assign(state, u); return {} } }),
    }),
    auth: { admin: { getUserById: async (id: string) => ({ data: { user: id === 'u1' ? { email: 'owner@x.com' } : null } }) } },
  } as any
}

describe('owner password check', () => {
  beforeEach(() => signIn.mockReset())
  it('accepts the right password for the same user', async () => {
    signIn.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
    const { verifyOwnerPassword } = await import('./ownerPassword')
    const st: any = { owner_pin_failed: 2 }
    expect((await verifyOwnerPassword(fakeDb(st), 'o1', 'u1', 'secret')).ok).toBe(true)
    expect(signIn).toHaveBeenCalledWith({ email: 'owner@x.com', password: 'secret' })
    expect(st.owner_pin_failed).toBe(0)
  })
  it('wrong password counts and locks after 5', async () => {
    signIn.mockResolvedValue({ data: { user: null }, error: { message: 'Invalid login' } })
    const { verifyOwnerPassword } = await import('./ownerPassword')
    const st: any = { owner_pin_failed: 3 }
    let r: any = await verifyOwnerPassword(fakeDb(st), 'o1', 'u1', 'nope')
    expect(r.status).toBe(403); expect(st.owner_pin_failed).toBe(4)
    r = await verifyOwnerPassword(fakeDb(st), 'o1', 'u1', 'nope')
    expect(r.error).toContain('انقفل'); expect(st.owner_pin_locked_until).toBeTruthy()
    r = await verifyOwnerPassword(fakeDb(st), 'o1', 'u1', 'secret')
    expect(r.status).toBe(429)
  })
  it('empty password rejected without calling auth', async () => {
    const { verifyOwnerPassword } = await import('./ownerPassword')
    expect((await verifyOwnerPassword(fakeDb({}), 'o1', 'u1', '')).ok).toBe(false)
    expect(signIn).not.toHaveBeenCalled()
  })
})
