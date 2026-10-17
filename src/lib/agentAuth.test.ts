import { describe, it, expect, beforeAll } from 'vitest'

beforeAll(() => { process.env.STAFF_TOKEN_SECRET = process.env.STAFF_TOKEN_SECRET || 'test-secret' })

// قاعدة بيانات وهمية بسيطة: from(table).select().eq().eq().maybeSingle()
function fakeDb(rows: Record<string, any>) {
  return {
    from: (t: string) => {
      const q: any = { select: () => q, eq: () => q, update: () => q, maybeSingle: async () => ({ data: rows[t] ?? null }) }
      return q
    },
  } as any
}

describe('currentAgent', () => {
  const sess = { id: 's1', last_seen_at: new Date().toISOString(), revoked_at: null }
  const agent = { id: 'g1', code: 'ABC', name: 'م', email: 'a@b.co', phone: '0500000000', payout_method: 'cash', iban_last4: null }
  const req = async () => {
    const { makeAgentSession, AGENT_COOKIE } = await import('./agentAuth')
    return new Request('http://t/', { headers: { cookie: `${AGENT_COOKIE}=${makeAgentSession('g1', 's1')}` } })
  }

  it('returns an active agent with a valid session', async () => {
    const { currentAgent } = await import('./agentAuth')
    const me = await currentAgent(fakeDb({ sales_agents: { ...agent, status: 'active' }, agent_sessions: sess }), await req())
    expect(me?.id).toBe('g1')
  })

  it('logs out a suspended agent even if the session is still valid', async () => {
    const { currentAgent } = await import('./agentAuth')
    expect(await currentAgent(fakeDb({ sales_agents: { ...agent, status: 'suspended' }, agent_sessions: sess }), await req())).toBeNull()
  })

  it('refuses a revoked device', async () => {
    const { currentAgent } = await import('./agentAuth')
    expect(await currentAgent(fakeDb({ sales_agents: { ...agent, status: 'active' }, agent_sessions: { ...sess, revoked_at: new Date().toISOString() } }), await req())).toBeNull()
  })
})
