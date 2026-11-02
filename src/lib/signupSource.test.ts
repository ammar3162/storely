import { describe, it, expect } from 'vitest'
import { normalizeSignupSource, normalizeSourceDetail, sanitizeUtm, utmFromSearch, captureUtm, buildAttributionRow, UTM_STORAGE_KEY } from './signupSource'

function memStorage(init: Record<string, string> = {}) {
  const m = new Map(Object.entries(init))
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v) }, m }
}

describe('signupSource', () => {
  it('accepts only known sources', () => {
    expect(normalizeSignupSource('tiktok')).toBe('tiktok')
    expect(normalizeSignupSource('TikTok')).toBeNull()
    expect(normalizeSignupSource('<script>')).toBeNull()
    expect(normalizeSignupSource(undefined)).toBeNull()
  })

  it('keeps free text detail only for other, trimmed and capped', () => {
    expect(normalizeSourceDetail('tiktok', 'x')).toBeNull()
    expect(normalizeSourceDetail('other', '  معرض فودكس  ')).toBe('معرض فودكس')
    expect(normalizeSourceDetail('other', 'a'.repeat(300))!.length).toBe(100)
    expect(normalizeSourceDetail('other', '   ')).toBeNull()
  })

  it('whitelists utm keys and strips control chars', () => {
    const u = sanitizeUtm({ utm_source: 'tiktok‮', utm_campaign: 'nov', evil: 'x', utm_term: 5 })
    expect(u).toEqual({ utm_source: 'tiktok', utm_campaign: 'nov' })
    expect(sanitizeUtm(null)).toEqual({})
    expect(sanitizeUtm({ utm_medium: 'b'.repeat(500) }).utm_medium!.length).toBe(100)
  })

  it('reads utm from the url', () => {
    expect(utmFromSearch('?mode=register&utm_source=snap&utm_medium=paid')).toEqual({ utm_source: 'snap', utm_medium: 'paid' })
    expect(utmFromSearch('?mode=register')).toEqual({})
  })

  it('first campaign link wins', () => {
    const st = memStorage()
    expect(captureUtm('?utm_source=tiktok', st)).toEqual({ utm_source: 'tiktok' })
    expect(JSON.parse(st.m.get(UTM_STORAGE_KEY)!)).toEqual({ utm_source: 'tiktok' })
    expect(captureUtm('?utm_source=google', st)).toEqual({ utm_source: 'tiktok' })
    expect(captureUtm('', st)).toEqual({ utm_source: 'tiktok' })
  })

  it('survives broken storage and no storage', () => {
    expect(captureUtm('?utm_source=x', memStorage({ [UTM_STORAGE_KEY]: '{bad json' }))).toEqual({ utm_source: 'x' })
    expect(captureUtm('?utm_source=x', null)).toEqual({ utm_source: 'x' })
    const empty = memStorage()
    captureUtm('', empty)
    expect(empty.m.has(UTM_STORAGE_KEY)).toBe(false)
  })

  it('builds a clean row from an untrusted body', () => {
    expect(buildAttributionRow('org1', { signupSource: 'other', signupSourceDetail: ' مندوب ', utm: { utm_source: 'tt', org_id: 'hack' } })).toEqual({
      org_id: 'org1', source: 'other', source_detail: 'مندوب',
      utm_source: 'tt', utm_medium: null, utm_campaign: null, utm_content: null, utm_term: null,
    })
    expect(buildAttributionRow('org1', {}).source).toBeNull()
  })
})
