import { describe, it, expect } from 'vitest'
import { uncoveredBranches, uncoveredMessage } from './branchCoverage'

describe('every branch needs at least one service', () => {
  const ids = ['b1', 'b2', 'b3']
  it('a service on all branches covers them all', () => {
    expect(uncoveredBranches(ids, [{ slug: 'mod_inventory', branchIds: null }, { slug: 'cashier_closing', branchIds: ['b1'] }])).toEqual([])
  })
  it('finds the branch left without any per-branch service; AI (org-wide) does not count', () => {
    expect(uncoveredBranches(ids, [{ slug: 'mod_inventory', branchIds: ['b1', 'b2'] }, { slug: 'ai_tools', branchIds: null }])).toEqual(['b3'])
    expect(uncoveredBranches(['b1'], [{ slug: 'ai_tools', branchIds: null }])).toEqual(['b1'])
    expect(uncoveredBranches(ids, [{ slug: 'cashier_closing', branchIds: ['b3'] }, { slug: 'hr_full', branchIds: ['b1', 'b2'] }])).toEqual([])
  })
  it('message names the branches', () => {
    expect(uncoveredMessage(['فرع الملقا'])).toBe('فرع الملقا بدون خدمات. اختر له خدمة واحدة على الأقل، أو أغلق الفرع من صفحة الفروع.')
    expect(uncoveredMessage(['فرع الملقا', 'فرع النخيل'])).toContain('فرع الملقا، فرع النخيل')
  })
})
