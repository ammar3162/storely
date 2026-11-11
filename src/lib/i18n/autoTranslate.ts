// ترجمة واجهة المالك للإنجليزية بدون لمس منطق الصفحات:
// نمر على نصوص الصفحة الظاهرة (وعناوين/placeholder) ونبدّل العربي بالإنجليزي من قاموس en.json.
// المفاتيح عربية بعد التطبيع: # = رقم، * = قيمة متغيرة (اسم، تاريخ...). الأسماء والبيانات نفسها ما تتترجم.

const AR = /[؀-ۿ]/
const NUM = /[0-9٠-٩]+(?:[.,][0-9٠-٩]+)*/g
const ATTRS = ['placeholder', 'title', 'aria-label', 'alt'] as const
const SKIP = 'script,style,textarea,[contenteditable="true"],[data-no-translate]'

const exact = new Map<string, string>()
type Pat = { re: RegExp; en: string; lit: string; size: number; slots: ('#' | '*')[] }
const pats: Pat[] = []

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// القاموس يُحمَّل فقط عند اختيار الإنجليزية (ما يثقل الصفحة على مستخدمي العربي)
let EN: Record<string, string> | null = null
export function loadDict(d: Record<string, string>) { EN = d; exact.clear(); pats.length = 0; cache.clear() }
function build() {
  if (exact.size || !EN) return
  for (const [ar, en] of Object.entries(EN)) {
    if (!en) continue
    if (!ar.includes('*') && !ar.includes('#')) { exact.set(ar, en); continue }
    if (!ar.includes('*')) { exact.set(ar, en); }   // أرقام فقط: يكفي التطبيع
    const slots: ('#' | '*')[] = []
    const re = ar.split(/([#*])/).map(part => {
      if (part === '#') { slots.push('#'); return '([0-9٠-٩]+(?:[.,][0-9٠-٩]+)*)' }
      if (part === '*') { slots.push('*'); return '(.+?)' }
      return esc(part)
    }).join('')
    const lit = ar.split(/[#*]/).sort((a, b) => b.length - a.length)[0].trim()
    // الأكثر تحديداً أولاً (نص ثابت أطول): «قبل * دقيقة» قبل «* دقيقة»
    if (ar.includes('*')) pats.push({ re: new RegExp('^' + re + '$'), en, lit, size: ar.replace(/[#*]/g, '').length, slots })
  }
  pats.sort((a, b) => b.size - a.size)
}

// أسماء الأشهر والأيام والوحدات اللي تطلع من toLocaleDateString أو البيانات الثابتة
const WORDS: Record<string, string> = {
  'يناير': 'Jan', 'فبراير': 'Feb', 'مارس': 'Mar', 'أبريل': 'Apr', 'مايو': 'May', 'يونيو': 'Jun', 'يوليو': 'Jul', 'أغسطس': 'Aug',
  'سبتمبر': 'Sep', 'أكتوبر': 'Oct', 'نوفمبر': 'Nov', 'ديسمبر': 'Dec',
  'الأحد': 'Sunday', 'الاثنين': 'Monday', 'الإثنين': 'Monday', 'الثلاثاء': 'Tuesday', 'الأربعاء': 'Wednesday', 'الخميس': 'Thursday', 'الجمعة': 'Friday', 'السبت': 'Saturday',
  'أحد': 'Sun', 'إثن': 'Mon', 'اثن': 'Mon', 'ثلث': 'Tue', 'أرب': 'Wed', 'خمس': 'Thu', 'جمع': 'Fri', 'سبت': 'Sat',
  'ص': 'AM', 'م': 'PM', 'ر.س': 'SAR', 'ريال': 'SAR', 'قطعة': 'pcs', 'كيس': 'bag', 'كرتون': 'carton', 'علبة': 'can', 'كجم': 'kg', 'جم': 'g', 'لتر': 'L', 'مل': 'ml', 'حبة': 'pc', 'باكيت': 'pack', 'صندوق': 'box', 'دقيقة': 'min', 'ساعة': 'h', 'يوم': 'day', 'أيام': 'days',
  'قطع': 'pcs', 'حبات': 'pcs', 'أكياس': 'bags', 'كراتين': 'cartons', 'علب': 'cans', 'صناديق': 'boxes', 'لترات': 'L', 'جالونات': 'gallons', 'زجاجات': 'bottles',
  'باكيتات': 'packs', 'شدات': 'packs', 'درازن': 'dozens', 'ربطات': 'bundles', 'رولات': 'rolls', 'أمتار': 'm', 'غرامات': 'g', 'عبوات': 'packs', 'فواتير': 'invoices', 'عمليات': 'operations',
}

const cache = new Map<string, string | null>()

function core(t: string, depth = 0): string | null {
  const hit = exact.get(t)
  if (hit !== undefined) return hit
  // أرقام: نطبّعها لـ # ثم نرجّعها بالترتيب
  const nums = t.match(NUM)
  if (nums) {
    const k = t.replace(NUM, '#')
    const en = exact.get(k)
    if (en !== undefined) { let i = 0; return en.replace(/#/g, () => nums[i++] ?? '') }
  }
  for (const p of pats) {
    if (p.lit && !t.includes(p.lit)) continue
    const m = p.re.exec(t)
    if (!m) continue
    let i = 0
    return p.en.replace(/[#*]/g, () => {
      const v = m[++i] ?? ''
      // قيمة متغيرة عربية معروفة (حالة/وحدة) نترجمها، والباقي (اسم صنف/موظف) يبقى كما هو
      return depth < 2 && AR.test(v) ? (translateText(v, depth + 1) ?? v) : v
    })
  }
  // نص مكوّن من كلمات تاريخ/وحدات وأرقام فقط
  const LET = /[\u0621-\u064A]/
  const toks = t.split(/(\s+|[،,:\-–—/()]+)/)
  if (toks.some(x => LET.test(x)) && toks.every(x => !LET.test(x) || WORDS[x] !== undefined)) {
    return toks.map(x => (LET.test(x) ? WORDS[x] : x)).join('').replace(/،/g, ',')
  }
  return null
}

export function translateText(raw: string, depth = 0): string | null {
  if (!raw || !AR.test(raw) || !EN) return null
  build()
  const lead = raw.match(/^\s*/)![0], trail = raw.match(/\s*$/)![0]
  const t = raw.trim().replace(/\s+/g, ' ')
  if (cache.has(t)) { const c = cache.get(t); return c == null ? null : lead + c + trail }
  let out = core(t, depth)
  // جمل منتهية بنقطة/علامة لم نجدها: جرّب بدونها
  if (out == null) {
    const m = t.match(/^(.*?)([.:،؟?!…]+)$/)
    if (m && m[1]) { const o = core(m[1], depth); if (o != null) out = o + m[2].replace('؟', '?').replace('،', ',') }
  }
  // جمل مركّبة بفواصل (« · » / « — » / « - » / « | » / «، »): نترجم كل جزء لحاله
  if (out == null && depth < 2) {
    const parts = t.split(/( · | — | - | \| |، |: )/)
    if (parts.length > 1) {
      let any = false
      const mapped = parts.map((x, i) => {
        if (i % 2) return x === '، ' ? ', ' : x
        if (!AR.test(x)) return x
        const r = translateText(x, depth + 1)
        if (r != null) { any = true; return r }
        return x
      })
      if (any) out = mapped.join('')
    }
  }
  if (out != null) out = out.replace(/،/g, ',').replace(/؟/g, '?').replace(/؛/g, ';')
  cache.set(t, out)
  return out == null ? null : lead + out + trail
}

// ── تطبيق على الصفحة ──
let observer: MutationObserver | null = null
const pending = new Set<Node>()
let raf = 0

function skip(el: Element | null) { return !el || !!el.closest(SKIP) }

function doText(n: Text) {
  const v = n.nodeValue
  if (!v || !AR.test(v) || skip(n.parentElement)) return
  if (!/[\u0621-\u064A]/.test(v)) { const p = v.replace(/،/g, ',').replace(/؟/g, '?').replace(/؛/g, ';'); if (p !== v) n.nodeValue = p; return }
  const tr = translateText(v)
  if (tr != null && tr !== v) n.nodeValue = tr
}
function doEl(el: Element) {
  if (skip(el)) return
  for (const a of ATTRS) {
    const v = el.getAttribute(a)
    if (v && AR.test(v)) { const tr = translateText(v); if (tr != null) el.setAttribute(a, tr) }
  }
  if (el instanceof HTMLInputElement && (el.type === 'button' || el.type === 'submit') && AR.test(el.value)) {
    const tr = translateText(el.value); if (tr != null) el.value = tr
  }
}
function walk(root: Node) {
  if (root.nodeType === 3) return doText(root as Text)
  if (root.nodeType !== 1) return
  const el = root as Element
  if (skip(el)) return
  doEl(el)
  const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT)
  let n: Node | null = w.nextNode()
  while (n) { if (n.nodeType === 3) doText(n as Text); else doEl(n as Element); n = w.nextNode() }
}
function flush() {
  raf = 0
  const list = [...pending]; pending.clear()
  for (const n of list) if (n.isConnected) walk(n)
  if (AR.test(document.title)) { const tr = translateText(document.title); if (tr) document.title = tr }
}
function queue(n: Node) { pending.add(n); if (!raf) raf = requestAnimationFrame(flush) }

export async function startAutoTranslate() {
  if (observer || typeof document === 'undefined') return
  if (!EN) loadDict((await import('./en.json')).default as Record<string, string>)
  if (observer) return
  walk(document.body)
  observer = new MutationObserver(muts => {
    for (const m of muts) {
      if (m.type === 'characterData') queue(m.target)
      else if (m.type === 'attributes') queue(m.target)
      else m.addedNodes.forEach(queue)
    }
  })
  observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: [...ATTRS, 'value'] })
}
export function stopAutoTranslate() { observer?.disconnect(); observer = null }

export const LANG_KEY = 'storely_lang'
export function savedLang(): 'ar' | 'en' {
  try { return localStorage.getItem(LANG_KEY) === 'en' ? 'en' : 'ar' } catch { return 'ar' }
}
