import { describe, it, expect } from 'vitest'
import { botMayAct, botBranch, managerWithoutBranch, botBlockedText } from './botAccess'

const owner = { id: 'u1', org_id: 'o1', role: 'owner', branch_id: null, permissions: null }
const manager = (permissions: Record<string, boolean>) => ({ id: 'u2', org_id: 'o1', role: 'manager', branch_id: 'b1', permissions })

describe('WhatsApp bot access', () => {
  it('owner can do everything; manager only with the matching permission', () => {
    for (const a of ['stock', 'purchases', 'dispense'] as const) expect(botMayAct(owner, a)).toBe(true)
    expect(botMayAct(manager({ inventory: true }), 'stock')).toBe(true)
    expect(botMayAct(manager({ inventory: true }), 'dispense')).toBe(false)
    expect(botMayAct(manager({ dispense: true }), 'dispense')).toBe(true)
    expect(botMayAct(manager({}), 'purchases')).toBe(false)
    expect(botMayAct(manager({ purchases: true }), 'purchases')).toBe(true)
  })
  it('a manager is locked to their own branch whatever they select', () => {
    expect(botBranch(manager({}), 'b9')).toBe('b1')
    expect(botBranch(owner, 'b9')).toBe('b9')
    expect(botBranch(owner, null)).toBeNull()
    expect(managerWithoutBranch({ ...manager({}), branch_id: null })).toBe(true)
    expect(managerWithoutBranch(owner)).toBe(false)
  })
  it('explains expired vs suspended', () => {
    expect(botBlockedText('expired')).toContain('انتهى اشتراك')
    expect(botBlockedText('suspended')).toContain('موقوف')
  })
})
