import { describe, it, expect } from 'vitest'
import { isSubscriptionActive, subStateFromOwner, orgSubscriptionState } from './subscription'

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

describe('subStateFromOwner (اشتراك المنشأة لكل حساباتها)', () => {
  it('running subscription → open', () => {
    expect(subStateFromOwner({ status: 'active', subscription_type: 'paid', subscription_ends_at: future })).toMatchObject({ blocked: false })
  })
  it('ended paid or trial → expired', () => {
    expect(subStateFromOwner({ status: 'active', subscription_type: 'paid', subscription_ends_at: past })).toMatchObject({ blocked: true, reason: 'expired' })
    expect(subStateFromOwner({ status: 'active', subscription_type: 'trial', subscription_ends_at: past })).toMatchObject({ blocked: true, reason: 'expired' })
  })
  it('suspended or deleted owner → suspended', () => {
    expect(subStateFromOwner({ status: 'suspended', subscription_ends_at: future })).toMatchObject({ blocked: true, reason: 'suspended' })
    expect(subStateFromOwner({ status: 'deleted', subscription_ends_at: future })).toMatchObject({ blocked: true, reason: 'suspended' })
  })
  it('old accounts without an end date, and a pending owner, stay open', () => {
    expect(subStateFromOwner({ status: 'active', subscription_ends_at: null }).blocked).toBe(false)
    expect(subStateFromOwner({ status: 'pending', subscription_ends_at: future }).blocked).toBe(false)
  })
  it('no owner row → not blocked here', () => {
    expect(subStateFromOwner(null).blocked).toBe(false)
  })
})

describe('orgSubscriptionState', () => {
  const counting = (owner: any, calls = { n: 0 }, err = false) => ({
    from: () => { const q: any = { select: () => q, eq: () => q, maybeSingle: async () => { calls.n++; if (err) throw new Error('down'); return { data: owner, error: null } } }; return q },
  })
  it('reads the owner and caches it', async () => {
    const calls = { n: 0 }
    const db = counting({ status: 'active', subscription_ends_at: past }, calls)
    expect((await orgSubscriptionState('org-cache', db)).blocked).toBe(true)
    expect((await orgSubscriptionState('org-cache', db)).blocked).toBe(true)
    expect(calls.n).toBe(1)
  })
  it('a database error never locks anyone out', async () => {
    expect((await orgSubscriptionState('org-err', counting(null, { n: 0 }, true))).blocked).toBe(false)
  })
})
