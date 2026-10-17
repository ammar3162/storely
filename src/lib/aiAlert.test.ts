import { describe, it, expect, vi, beforeEach } from 'vitest'

const state = { recent: [] as any[], inserted: [] as any[] }
const wa = vi.fn(async () => ({})), mail = vi.fn(async () => ({}))
vi.mock('@/lib/whatsapp', () => ({ sendWhatsAppMessage: wa }))
vi.mock('@/lib/email', () => ({ sendEmail: mail }))
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (t: string) => {
      const q: any = {
        select: () => q, gte: () => q, filter: () => q, eq: () => q,
        limit: async () => ({ data: state.recent }),
        insert: async (row: any) => { state.inserted.push(row); return { error: null } },
        then: (r: any) => r({ data: t === 'admin_users' ? [{ email: 'owner@storely.dev' }] : [] }),
      }
      return q
    },
  }),
}))

const { aiFailureKind, reportAiFailure } = await import('./aiAlert')
const CREDIT = '{"type":"error","error":{"type":"invalid_request_error","message":"Your credit balance is too low to access the Anthropic API."}}'

describe('AI outage alert', () => {
  beforeEach(() => { state.recent = []; state.inserted = []; wa.mockClear(); mail.mockClear() })

  it('recognises an empty credit balance and a rejected key, but not temporary errors', () => {
    expect(aiFailureKind(400, CREDIT)).toBe('billing')
    expect(aiFailureKind(401, '{"error":{"type":"authentication_error"}}')).toBe('auth')
    expect(aiFailureKind(529, 'overloaded')).toBeNull()
    expect(aiFailureKind(429, 'rate limit')).toBeNull()
    expect(aiFailureKind(400, 'image too large')).toBeNull()
  })

  it('alerts the platform owner by WhatsApp and email, and logs it for the admin panel', async () => {
    expect(await reportAiFailure(400, CREDIT, 'قراءة الفواتير')).toBe(true)
    expect(wa).toHaveBeenCalledTimes(1)
    expect((wa.mock.calls[0] as any)[1]).toContain('console.anthropic.com')
    expect(mail).toHaveBeenCalledTimes(1)
    expect(state.inserted[0].issues[0]).toMatchObject({ type: 'ai_billing', severity: 'critical' })
  })

  it('sends only once per window, and never for temporary errors', async () => {
    state.recent = [{ id: 'x' }]
    expect(await reportAiFailure(400, CREDIT, 'قراءة الفواتير')).toBe(false)
    state.recent = []
    expect(await reportAiFailure(529, 'overloaded', 'قراءة الفواتير')).toBe(false)
    expect(wa).not.toHaveBeenCalled()
  })
})
