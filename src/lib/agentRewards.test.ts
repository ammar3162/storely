import { describe, it, expect, beforeAll } from 'vitest'
import { agentReward, isValidSaIban, normalizeIban, newAgentCode, normalizeAgentCode } from './agentRewards'

beforeAll(() => { process.env.STAFF_TOKEN_SECRET = 'test-secret' })

describe('agent rewards', () => {
  it('per plan, yearly doubles', () => {
    expect(agentReward('basic', 'monthly')).toBe(50)
    expect(agentReward('pro', 'monthly')).toBe(100)
    expect(agentReward('advanced', 'monthly')).toBe(150)
    expect(agentReward('pro', 'yearly')).toBe(200)
  })
  it('Saudi IBAN check', () => {
    expect(isValidSaIban(normalizeIban('SA03 8000 0000 6080 1016 7519'))).toBe(true)
    expect(isValidSaIban('SA0380000000608010167518')).toBe(false)
    expect(isValidSaIban('AE070331234567890123456')).toBe(false)
  })
  it('codes', () => {
    expect(newAgentCode()).toMatch(/^[A-HJ-NP-Z2-9]{6}$/)
    expect(normalizeAgentCode(' ab-12 ')).toBe('AB12')
  })
})

describe('agent auth', () => {
  it('session round trip and tamper', async () => {
    const { makeAgentSession, readAgentSession } = await import('./agentAuth')
    const t = makeAgentSession('g1', 's1', 1000)
    expect(readAgentSession(t, 2000)).toEqual({ gid: 'g1', sid: 's1' })
    expect(readAgentSession(t, 1000 + 31 * 86400e3)).toBeNull()
    expect(readAgentSession(t.slice(0, -2) + 'xx', 2000)).toBeNull()
  })
  it('accountant session is not an agent session', async () => {
    const { makeSession } = await import('./accountantPortalAuth')
    const { readAgentSession } = await import('./agentAuth')
    expect(readAgentSession(makeSession('a', 's', 1000), 2000)).toBeNull()
  })
  it('IBAN vault', async () => {
    const { encryptIban, decryptIban } = await import('./agentAuth')
    const e = encryptIban('SA0380000000608010167519')
    expect(e).not.toContain('SA03')
    expect(decryptIban(e)).toBe('SA0380000000608010167519')
  })
})
