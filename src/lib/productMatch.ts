// مطابقة اسم صنف من الفاتورة مع أصناف المخزون — الأسماء نادراً تتطابق حرف بحرف
// («دجاج كامل طازج» بالفاتورة و«دجاج» بالمخزون)، فنطبّع العربي ونقارن الكلمات

const AR_DIGITS: Record<string, string> = { '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9' }
const STOP = new Set(['و', 'من', 'في', 'مع', 'حبة', 'حبه', 'قطعة', 'قطعه', 'كيس', 'كرتون', 'علبة', 'علبه', 'عبوة', 'عبوه', 'جديد', 'طازج', 'طازه', 'pcs', 'pc', 'x'])

export function normalizeName(s: string): string {
  return String(s || '').toLowerCase()
    .replace(/[٠-٩]/g, d => AR_DIGITS[d])
    .replace(/[ً-ْـ]/g, '')            // تشكيل وتطويل
    .replace(/[أإآٱ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/(\d)(\p{L})/gu, '$1 $2').replace(/(\p{L})(\d)/gu, '$1 $2')   // 12oz = 12 oz
    .replace(/\s+/g, ' ').trim()
}
function tokens(s: string): string[] {
  return normalizeName(s).split(' ').map(t => t.length > 3 && t.startsWith('ال') ? t.slice(2) : t).filter(t => t && !STOP.has(t))
}

/** درجة التشابه 0..1 */
export function nameScore(a: string, b: string): number {
  const na = normalizeName(a), nb = normalizeName(b)
  if (!na || !nb) return 0
  if (na === nb) return 1
  const ta = tokens(a), tb = tokens(b)
  if (!ta.length || !tb.length) return 0
  const sb = new Set(tb)
  const common = ta.filter(t => sb.has(t) || [...sb].some(x => x.length >= 3 && t.length >= 3 && (x.startsWith(t) || t.startsWith(x)))).length
  // كل كلمات الصنف الموجود موجودة باسم الفاتورة («دجاج» ⊂ «دجاج كامل طازج») = تطابق قوي
  const coverShort = common / Math.min(ta.length, tb.length)
  const jaccard = common / (ta.length + tb.length - common)
  return Math.round((0.7 * coverShort + 0.3 * jaccard) * 100) / 100
}

export type MatchCandidate = { id: string; name: string; unit?: string | null }
/** أقرب صنف (لو التشابه كافي) */
export function bestMatch<T extends MatchCandidate>(name: string, products: T[], min = 0.75): (T & { score: number }) | null {
  let best: (T & { score: number }) | null = null
  for (const p of products) {
    const score = nameScore(name, p.name)
    if (score >= min && (!best || score > best.score || (score === best.score && p.name.length < best.name.length))) best = { ...p, score }
  }
  return best
}
