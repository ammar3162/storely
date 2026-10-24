import { describe, it, expect } from 'vitest'
import { isSubscriptionActive } from './subscription'

// قاعدة بيانات وهمية ترجع ملف المالك المعطى
const db = (owner: any, fail = false) => ({
  from: () => { const q: any = { select: () => q, eq: () => q, maybeSingle: async () => { if (fail) throw new Error('x'); return { data: owner } } }; return q },
})
const future = new Date(Date.now() + 864e5).toISOString(), past = new Date(Date.now() - 864e5).toISOString()

describe('isSubscriptionActive (يوقف كل الإرسال التلقائي)', () => {
  it('active owner with a running subscription', async () => {
    expect(await isSubscriptionActive(db({ status: 'active', subscription_ends_at: future }), 'o')).toBe(true)
  })
  it('suspended owner stops everything', async () => {
    expect(await isSubscriptionActive(db({ status: 'suspended', subscription_ends_at: future }), 'o')).toBe(false)
  })
  it('expired subscription stops everything, paid or trial', async () => {
    expect(await isSubscriptionActive(db({ status: 'active', subscription_type: 'paid', subscription_ends_at: past }), 'o')).toBe(false)
  })
  it('org without an owner (deleted) gets nothing', async () => {
    expect(await isSubscriptionActive(db(null), 'o')).toBe(false)
  })
  it('legacy owner without an end date keeps working', async () => {
    expect(await isSubscriptionActive(db({ status: 'active', subscription_ends_at: null }), 'o')).toBe(true)
  })
})
