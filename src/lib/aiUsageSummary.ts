// تجميع سجل تكلفة الذكاء (ai_usage) لصفحة الإدارة: لكل ميزة، لكل منشأة، لكل يوم
export type AiUsageRow = {
  org_id: string | null; feature: string; cost_sar: number | string
  input_tokens: number; output_tokens: number; cache_write_tokens?: number; cache_read_tokens?: number
  created_at: string; organizations?: { name?: string } | null
}

const r4 = (n: number) => Math.round(n * 10000) / 10000

export function summarizeAiUsage(rows: AiUsageRow[]) {
  const byFeature = new Map<string, { feature: string; calls: number; cost: number; tokens: number }>()
  const byOrg = new Map<string, { org_id: string | null; name: string; calls: number; cost: number; features: Record<string, number> }>()
  const byDay = new Map<string, { day: string; calls: number; cost: number }>()
  let total = 0
  for (const r of rows) {
    const cost = Number(r.cost_sar) || 0
    const tokens = (r.input_tokens || 0) + (r.output_tokens || 0) + (r.cache_write_tokens || 0) + (r.cache_read_tokens || 0)
    total += cost
    const f = byFeature.get(r.feature) || { feature: r.feature, calls: 0, cost: 0, tokens: 0 }
    f.calls++; f.cost += cost; f.tokens += tokens; byFeature.set(r.feature, f)
    const ok = r.org_id || 'none'
    const o = byOrg.get(ok) || { org_id: r.org_id, name: r.organizations?.name || (r.org_id ? 'منشأة محذوفة' : 'بدون منشأة'), calls: 0, cost: 0, features: {} }
    o.calls++; o.cost += cost; o.features[r.feature] = r4((o.features[r.feature] || 0) + cost); byOrg.set(ok, o)
    const day = String(r.created_at).slice(0, 10)
    const d = byDay.get(day) || { day, calls: 0, cost: 0 }
    d.calls++; d.cost += cost; byDay.set(day, d)
  }
  return {
    total: { calls: rows.length, cost: r4(total) },
    features: [...byFeature.values()].map(x => ({ ...x, cost: r4(x.cost) })).sort((a, b) => b.cost - a.cost),
    orgs: [...byOrg.values()].map(x => ({ ...x, cost: r4(x.cost) })).sort((a, b) => b.cost - a.cost),
    daily: [...byDay.values()].map(x => ({ ...x, cost: r4(x.cost) })).sort((a, b) => a.day.localeCompare(b.day)),
  }
}

export type AiUsageSummary = ReturnType<typeof summarizeAiUsage>
