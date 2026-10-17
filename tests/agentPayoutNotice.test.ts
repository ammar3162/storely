import { describe, it, expect, vi, beforeEach } from 'vitest'

// تغيير طريقة استلام المكافآت لازم يرسل تنبيه للمندوب (إيميل + واتساب)
const state = { agent: null as any }
const notify = vi.fn(async () => {})
vi.mock('@/lib/agentAuth', () => ({ currentAgent: async () => state.agent, encryptIban: (x: string) => 'enc:' + x }))
vi.mock('@/lib/agentNotify', () => ({ notifyAgent: notify }))
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ from: () => { const q: any = { update: () => q, eq: async () => ({ error: null }) }; return q } }),
}))

const { PATCH } = await import('@/app/api/agents/me/route')
const patch = (body: unknown) => PATCH(new Request('http://t/api/agents/me', { method: 'PATCH', body: JSON.stringify(body) }))
const IBAN = 'SA0380000000608010167519'

describe('agent payout change notice', () => {
  beforeEach(() => { notify.mockClear(); state.agent = { id: 'g1', payout_method: 'cash', iban_last4: null } })

  it('alerts the agent when the IBAN is set or changed, showing only the last 4 digits', async () => {
    expect((await patch({ payout_method: 'transfer', iban: IBAN })).status).toBe(200)
    expect(notify).toHaveBeenCalledTimes(1)
    const msg = (notify.mock.calls[0] as any)[2]
    expect(msg.whatsapp).toContain('7519')
    expect(msg.whatsapp).not.toContain(IBAN)
    expect(msg.lines.join(' ')).toContain('تواصل معنا')
  })

  it('alerts when switching from transfer to cash, but not when nothing changed', async () => {
    state.agent = { id: 'g1', payout_method: 'transfer', iban_last4: '7519' }
    await patch({ payout_method: 'cash' })
    expect(notify).toHaveBeenCalledTimes(1)
    state.agent = { id: 'g1', payout_method: 'cash', iban_last4: null }
    await patch({ payout_method: 'cash' })
    expect(notify).toHaveBeenCalledTimes(1)
  })

  it('does not alert on an invalid IBAN', async () => {
    expect((await patch({ payout_method: 'transfer', iban: 'SA12' })).status).toBe(400)
    expect(notify).not.toHaveBeenCalled()
  })
})
