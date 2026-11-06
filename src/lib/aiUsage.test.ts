import { describe, it, expect } from 'vitest'
import { aiCostSar } from './aiUsage'
import { summarizeAiUsage } from './aiUsageSummary'

describe('aiCostSar', () => {
  it('prices Sonnet input/output in SAR', () => {
    // 1M input × $3 + 1M output × $15 = $18 = 67.5 SAR
    expect(aiCostSar('claude-sonnet-4-6', { input_tokens: 1_000_000, output_tokens: 1_000_000 })).toBe(67.5)
  })
  it('prices Haiku cheaper and counts cache tokens', () => {
    // 1M in $1 + 1M cache write $1.25 + 1M cache read $0.1 + 0 out = $2.35 = 8.8125 SAR
    expect(aiCostSar('claude-haiku-4-5-20251001', { input_tokens: 1_000_000, cache_creation_input_tokens: 1_000_000, cache_read_input_tokens: 1_000_000 })).toBe(8.8125)
  })
  it('a typical invoice scan is about 0.1 SAR', () => {
    const c = aiCostSar('claude-sonnet-4-6', { input_tokens: 2500, output_tokens: 1200 })
    expect(c).toBeGreaterThan(0.05)
    expect(c).toBeLessThan(0.2)
  })
  it('missing or bad usage costs 0', () => {
    expect(aiCostSar('claude-sonnet-4-6', null)).toBe(0)
    expect(aiCostSar('claude-sonnet-4-6', { input_tokens: -5, output_tokens: NaN })).toBe(0)
  })
})

describe('summarizeAiUsage', () => {
  it('groups by feature, org and day', () => {
    const s = summarizeAiUsage([
      { org_id: 'a', feature: 'invoice_scan', cost_sar: '0.1', input_tokens: 100, output_tokens: 50, created_at: '2026-11-05T10:00:00Z', organizations: { name: 'A' } },
      { org_id: 'a', feature: 'assistant', cost_sar: 0.02, input_tokens: 10, output_tokens: 5, created_at: '2026-11-06T10:00:00Z', organizations: { name: 'A' } },
      { org_id: 'b', feature: 'invoice_scan', cost_sar: 0.3, input_tokens: 300, output_tokens: 50, created_at: '2026-11-06T11:00:00Z', organizations: { name: 'B' } },
    ])
    expect(s.total).toEqual({ calls: 3, cost: 0.42 })
    expect(s.features[0]).toMatchObject({ feature: 'invoice_scan', calls: 2, cost: 0.4 })
    expect(s.orgs.map(o => o.name)).toEqual(['B', 'A'])
    expect(s.orgs[1].features).toEqual({ invoice_scan: 0.1, assistant: 0.02 })
    expect(s.daily.map(d => d.day)).toEqual(['2026-11-05', '2026-11-06'])
  })
})
