// سجل تكلفة الذكاء الاصطناعي: كل طلب لـ Anthropic ينحفظ في ai_usage مع التوكنز والتكلفة بالريال.
// ما يوقف الطلب أبداً — لو فشل الحفظ نتجاهله.
import { createClient } from '@supabase/supabase-js'

export type AiFeature =
  | 'invoice_scan' | 'invoice_agent' | 'smart_insights' | 'assistant' | 'assistant_topic'
  | 'translate_products' | 'translate_tasks'

export type AnthropicUsage = {
  input_tokens?: number
  output_tokens?: number
  cache_creation_input_tokens?: number
  cache_read_input_tokens?: number
}

const USD_TO_SAR = 3.75

// أسعار Anthropic بالدولار لكل مليون توكن (إدخال / إخراج). كتابة الكاش ×1.25 من الإدخال، وقراءته ×0.1
const PRICES: { match: RegExp; input: number; output: number }[] = [
  { match: /haiku/i, input: 1, output: 5 },
  { match: /sonnet/i, input: 3, output: 15 },
  { match: /opus/i, input: 5, output: 25 },
]
const FALLBACK = { input: 3, output: 15 }

/** تكلفة طلب واحد بالريال من رد Anthropic (usage) */
export function aiCostSar(model: string, usage: AnthropicUsage | null | undefined): number {
  if (!usage) return 0
  const p = PRICES.find(x => x.match.test(model)) || FALLBACK
  const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : 0)
  const usd =
    (n(usage.input_tokens) * p.input +
      n(usage.cache_creation_input_tokens) * p.input * 1.25 +
      n(usage.cache_read_input_tokens) * p.input * 0.1 +
      n(usage.output_tokens) * p.output) / 1_000_000
  return Math.round(usd * USD_TO_SAR * 10000) / 10000
}

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

/** يحفظ طلب ذكاء واحد في السجل. ما يرمي خطأ أبداً */
export async function logAiUsage(entry: {
  orgId?: string | null
  feature: AiFeature
  model: string
  usage?: AnthropicUsage | null
  ok?: boolean
}): Promise<void> {
  try {
    const u = entry.usage || {}
    const int = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.round(v) : 0)
    await sb().from('ai_usage').insert({
      org_id: entry.orgId || null,
      feature: entry.feature,
      model: entry.model,
      input_tokens: int(u.input_tokens),
      output_tokens: int(u.output_tokens),
      cache_write_tokens: int(u.cache_creation_input_tokens),
      cache_read_tokens: int(u.cache_read_input_tokens),
      cost_sar: aiCostSar(entry.model, u),
      ok: entry.ok !== false,
    })
  } catch {}
}
