// وكيل الفواتير: يقرر لكل صنف بالفاتورة — واضح (يتسجل على صنف المخزون) ولا يحتاج سؤال العميل.
// يعتمد على اللي تعلّمه من إجابات العميل السابقة (product_aliases) ثم تشابه الأسماء.
import { normalizeName, nameScore } from '@/lib/productMatch'

export type AgentProduct = { id: string; name: string; unit?: string | null }
export type Candidate = { id: string; name: string; unit?: string | null; score: number }
// matched: مربوط بصنف موجود — new: صنف جديد بالمخزون — skip: ما ينسجّل — ask: ينتظر العميل
export type ItemStatus = 'matched' | 'new' | 'skip' | 'ask'
export type AgentItem = {
  name: string; qty: number | null; unit: string | null; total: number | null
  status: ItemStatus; product_id: string | null; product_name?: string | null
  candidates: Candidate[]
  // ليش يسأل: صنف مو واضح، أو كمية/سعر ناقص
  question?: 'which_product' | 'missing_qty' | 'missing_price' | null
  learned?: boolean   // انربط من إجابة سابقة للعميل
  choice?: 'product' | 'new' | null   // اختيار العميل (أو الوكيل لو واضح)
}

export const SURE = 0.9      // فوقها = نفس الصنف بدون سؤال
export const MAYBE = 0.5     // بين MAYBE و SURE = نسأل ونقترح

export const aliasKey = (name: string) => normalizeName(name)

/** يصنّف أصناف الفاتورة. aliases: اسم الفاتورة المطبّع → product_id */
export function classifyItems(items: { name: string; qty?: number | null; unit?: string | null; total?: number | null }[],
  products: AgentProduct[], aliases: Record<string, string>): AgentItem[] {
  const byId = new Map(products.map(p => [p.id, p]))
  return items.filter(it => String(it.name || '').trim()).map(it => {
    const base = { name: String(it.name).trim().slice(0, 120), qty: Number(it.qty) > 0 ? Number(it.qty) : null,
      unit: it.unit ? String(it.unit).slice(0, 30) : null, total: Number(it.total) > 0 ? Number(it.total) : null }
    const ranked = products.map(p => ({ id: p.id, name: p.name, unit: p.unit ?? null, score: nameScore(base.name, p.name) }))
      .filter(c => c.score >= MAYBE).sort((a, b) => b.score - a.score || a.name.length - b.name.length).slice(0, 3)

    const learnedId = aliases[aliasKey(base.name)]
    const learned = learnedId ? byId.get(learnedId) : null
    let product_id: string | null = null, product_name: string | null = null
    if (learned) { product_id = learned.id; product_name = learned.name }
    else if (ranked[0] && ranked[0].score >= SURE && !(ranked[1] && ranked[1].score >= SURE)) {
      // تطابق قوي وحيد — لو صنفين بنفس القوة نسأل
      product_id = ranked[0].id; product_name = ranked[0].name
    }
    return settle({ ...base, status: 'ask', product_id, product_name, candidates: ranked, question: null, learned: !!learned, choice: product_id ? 'product' : null })
  })
}

/** المسودة جاهزة للحفظ لما ما فيه صنف ينتظر إجابة، وفيه صنف واحد على الأقل بينسجّل */
export function draftStatus(items: AgentItem[]): 'needs_review' | 'ready' {
  const pending = items.some(it => it.status === 'ask')
  const saving = items.some(it => it.status === 'matched' || it.status === 'new')
  return !pending && saving ? 'ready' : 'needs_review'
}

/** حالة الصنف من اختياره وبياناته: ما انحدد الصنف → سؤال «أي صنف»، ناقص سعر/كمية → سؤال عنه */
export function settle(it: AgentItem): AgentItem {
  if (it.status === 'skip') return { ...it, question: null }
  const chosen = it.product_id ? 'matched' : it.choice === 'new' ? 'new' : null
  if (!chosen) return { ...it, status: 'ask', question: 'which_product' }
  if (!it.total) return { ...it, status: 'ask', question: 'missing_price' }
  if (!it.qty) return { ...it, status: 'ask', question: 'missing_qty' }
  return { ...it, status: chosen, question: null }
}

/** يطبّق إجابة العميل على صنف */
export function applyAnswer(it: AgentItem, a: { action: 'match' | 'new' | 'skip' | 'set'; product_id?: string; product_name?: string | null; qty?: number; total?: number }): AgentItem {
  const next: AgentItem = { ...it }
  if (a.action === 'set') {
    if (Number(a.qty) > 0) next.qty = Number(a.qty)
    if (Number(a.total) > 0) next.total = Number(a.total)
    if (next.status === 'skip') return next
  } else if (a.action === 'match' && a.product_id) {
    next.product_id = a.product_id; next.product_name = a.product_name ?? null; next.choice = 'product'; next.status = 'ask'
  } else if (a.action === 'new') {
    next.product_id = null; next.product_name = null; next.choice = 'new'; next.status = 'ask'
  } else if (a.action === 'skip') {
    return { ...next, status: 'skip', question: null }
  }
  return settle(next)
}
