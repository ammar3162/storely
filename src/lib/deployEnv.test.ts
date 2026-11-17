import { describe, it, expect, afterEach } from 'vitest'
import { isProductionDb, normalizePhone, waRecipientAllowed, waRecipientOf, skipScheduledCron, PROD_SUPABASE_REF } from './deployEnv'
import { fetchExternal } from './fetchExternal'

const PROD = { NEXT_PUBLIC_SUPABASE_URL: `https://${PROD_SUPABASE_REF}.supabase.co` }
const STG = { NEXT_PUBLIC_SUPABASE_URL: 'https://vmdhaqpuobxeyydbksfu.supabase.co' }

describe('deploy environment guard', () => {
  it('detects the production database', () => {
    expect(isProductionDb(PROD)).toBe(true)
    expect(isProductionDb(STG)).toBe(false)
    expect(isProductionDb({})).toBe(false)
  })
  it('normalizes Saudi numbers in every common form', () => {
    for (const x of ['0551234567', '551234567', '+966551234567', '00966551234567', '966551234567@s.whatsapp.net', '966 55 123 4567'])
      expect(normalizePhone(x)).toBe('966551234567')
  })
  it('production sends to anyone; staging only to the allowlist + admin alert phone', () => {
    expect(waRecipientAllowed('0551234567', PROD)).toBe(true)
    expect(waRecipientAllowed('0551234567', STG)).toBe(false)
    expect(waRecipientAllowed('0551234567', { ...STG, STAGING_WA_ALLOWLIST: '966500000000, 0551234567' })).toBe(true)
    expect(waRecipientAllowed('966594351667', STG)).toBe(true)
    expect(waRecipientAllowed('0509999999', { ...STG, ADMIN_ALERT_PHONE: '0509999999' })).toBe(true)
    expect(waRecipientAllowed('', STG)).toBe(false)
  })
  it('reads the recipient from Wasender / Cloud API bodies', () => {
    expect(waRecipientOf(JSON.stringify({ to: '+966551234567', text: 'x' }))).toBe('+966551234567')
    expect(waRecipientOf('not json')).toBe('')
    expect(waRecipientOf(undefined)).toBe('')
  })
  it('skips Vercel scheduled jobs outside production only', () => {
    expect(skipScheduledCron('vercel-cron/1.0', STG)).toBe(true)
    expect(skipScheduledCron('vercel-cron/1.0', PROD)).toBe(false)
    expect(skipScheduledCron('Mozilla/5.0', STG)).toBe(false)
    expect(skipScheduledCron(null, STG)).toBe(false)
  })
})

describe('fetchExternal WhatsApp guard', () => {
  const orig = { fetch: globalThis.fetch, url: process.env.NEXT_PUBLIC_SUPABASE_URL, list: process.env.STAGING_WA_ALLOWLIST }
  afterEach(() => {
    globalThis.fetch = orig.fetch
    process.env.NEXT_PUBLIC_SUPABASE_URL = orig.url
    if (orig.list === undefined) delete process.env.STAGING_WA_ALLOWLIST; else process.env.STAGING_WA_ALLOWLIST = orig.list
  })
  const calls: string[] = []
  const stub = () => { calls.length = 0; globalThis.fetch = (async (u: string) => { calls.push(u); return new Response('{"success":true}') }) as typeof fetch }
  const send = (to: string) => fetchExternal('https://www.wasenderapi.com/api/send-message', { method: 'POST', body: JSON.stringify({ to, text: 'hi' }) })

  it('blocks non-allowlisted numbers on staging without calling the provider', async () => {
    stub(); process.env.NEXT_PUBLIC_SUPABASE_URL = STG.NEXT_PUBLIC_SUPABASE_URL; delete process.env.STAGING_WA_ALLOWLIST
    const r = await send('0551234567')
    expect(r.status).toBe(403)
    expect(calls).toHaveLength(0)
  })
  it('lets allowlisted numbers through on staging, and anyone on production', async () => {
    stub(); process.env.NEXT_PUBLIC_SUPABASE_URL = STG.NEXT_PUBLIC_SUPABASE_URL; process.env.STAGING_WA_ALLOWLIST = '0551234567'
    expect((await send('+966551234567')).ok).toBe(true)
    process.env.NEXT_PUBLIC_SUPABASE_URL = PROD.NEXT_PUBLIC_SUPABASE_URL
    expect((await send('0577777777')).ok).toBe(true)
    expect(calls).toHaveLength(2)
  })
  it('does not touch non-messaging calls', async () => {
    stub(); process.env.NEXT_PUBLIC_SUPABASE_URL = STG.NEXT_PUBLIC_SUPABASE_URL
    await fetchExternal('https://www.wasenderapi.com/api/status', {})
    expect(calls).toHaveLength(1)
  })
})
