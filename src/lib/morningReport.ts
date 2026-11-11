// التقرير الصباحي (واتساب): لكل فرع أقسام — وكل قسم بس لو ميزته مفعّلة (lib/planFeatures، والتجربة تفتح الكل):
// قرارات اليوم (الذكاء) · حالة إقفال الكاشير أمس (الكاشير) · الموظفين أمس ودوام اليوم (إدارة الموظفين) · اللي خلص · اللي قرب يخلص · مشتريات أمس.
// واضحة للكل: الصنف ما ينذكر مرتين، والقوائم مختصرة بالأهم أول (الباقي «تفاصيلها في صفحة المخزون»).
// المالك يوصله تقرير كل الفروع برسالة وحدة، ورقم الفرع ومدير الفرع يوصلهم تقرير فرعهم (lib — api/notify-low-stock يرسل).
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Features } from '@/lib/planFeatures'
import { shiftIdForDate } from '@/lib/shiftSchedule'
import { offReason } from '@/lib/daysOff'

const DAY = 864e5
const saudiDate = (ms: number) => new Date(ms + 3 * 3600e3).toISOString().slice(0, 10)
const saudiDow = (date: string) => new Date(date + 'T12:00:00Z').getUTCDay()
const DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
const n2 = (v: unknown) => Math.round((Number(v) || 0) * 100) / 100
const money = (v: number) => Math.round(v).toLocaleString('en-US')
/** «خلال يوم / يومين / 3 أيام / 11 يوم» */
const inDays = (d: number) => d <= 1 ? 'خلال يوم' : d === 2 ? 'خلال يومين' : d <= 10 ? `خلال ${d} أيام` : `خلال ${d} يوم`
/** «فاتورة وحدة / فاتورتين / 5 فواتير / 13 فاتورة» */
export const invoicesAr = (n: number) => n === 1 ? 'فاتورة واحدة' : n === 2 ? 'فاتورتين' : n <= 10 ? `${n} فواتير` : `${n} فاتورة`
const MAX_OUT = 10, MAX_LOW = 8
const moreItems = (n: number) => `و ${n} ${n === 1 ? 'صنف آخر' : n === 2 ? 'صنفان آخران' : n <= 10 ? 'أصناف أخرى' : 'صنفاً آخر'}`

/** محتوى فرع واحد — كل قسم نص جاهز أو null (ما ينذكر) */
export type BranchReport = {
  branchId: string; branchName: string
  decisions: string[] | null; sales: string[] | null; staff: string[] | null; staffNotable: boolean
  stockOut: string | null; stockLow: string[] | null; purchases: string | null
}
/** وش يشوف المستلم: المالك ورقم الفرع كل الأقسام المفعّلة، والمدير حسب صلاحياته */
export type ReportView = { decisions: boolean; sales: boolean; staff: boolean; stock: boolean; purchases: boolean }

// المخزون والمشتريات: كل الباقات فيها — تنشال بس لـ «ابنِ باقتك» لو ما اختارها
export const fullView = (f: Features): ReportView => ({ decisions: f.ai, sales: f.cashier, staff: f.hr, stock: f.inventory !== false, purchases: f.purchases !== false })

export async function buildBranchReports(db: SupabaseClient, orgId: string, branches: { id: string; name: string }[], f: Features, nowMs = Date.now()): Promise<BranchReport[]> {
  const today = saudiDate(nowMs), yesterday = saudiDate(nowMs - DAY)
  const ids = branches.map(b => b.id)
  // حدود اليوم بتوقيت السعودية (UTC-3 ساعات)
  const startOf = (d: string) => new Date(Date.parse(d + 'T00:00:00Z') - 3 * 3600e3).toISOString()
  const since56 = new Date(nowMs - 56 * DAY).toISOString()

  const [{ data: products }, { data: moves }, { data: buys }, { data: closings }, { data: staff }, { data: att }] = await Promise.all([
    db.from('products').select('id,name,qty,unit,reorder_point,branch_id').eq('org_id', orgId).eq('is_active', true).in('branch_id', ids),
    f.ai ? db.from('stock_movements').select('qty_change,created_at,products!inner(id,org_id,branch_id)').eq('products.org_id', orgId).eq('type', 'out').gte('created_at', since56).limit(20000) : Promise.resolve({ data: [] as any[] }),
    db.from('purchases').select('amount,branch_id').eq('org_id', orgId).is('deleted_at', null).gte('created_at', startOf(yesterday)).lt('created_at', startOf(today)),
    f.cashier ? db.from('cashier_closings').select('branch_id,difference').eq('org_id', orgId).eq('closing_date', yesterday) : Promise.resolve({ data: [] as any[] }),
    f.hr ? db.from('staff_members').select('id,name,branch_id,shift_id,weekday_shifts,date_shifts,days_off_mode,weekly_off_days,biweekly_anchor,off_dates').eq('org_id', orgId).eq('is_active', true) : Promise.resolve({ data: [] as any[] }),
    f.hr ? db.from('staff_attendance').select('staff_id,type,late_minutes,recorded_at').eq('org_id', orgId).eq('type', 'check_in').gte('recorded_at', startOf(yesterday)).lt('recorded_at', startOf(today)) : Promise.resolve({ data: [] as any[] }),
  ])
  // أصناف كميتها صفر وما عليها ولا حركة (أُضيفت وقت الإعداد بدون جرد): ما نعدّها «نفدت» — كان أول تقرير للعميل الجديد كله نواقص وهمية
  const zeroIds = ((products || []) as any[]).filter(p => Number(p.qty) <= 0).map(p => p.id)
  const { data: zeroMoves } = zeroIds.length ? await db.from('stock_movements').select('product_id').in('product_id', zeroIds).limit(20000) : { data: [] as any[] }
  const everMoved = new Set(((zeroMoves || []) as any[]).map(m => m.product_id))
  // الإجازات المعتمدة (أمس واليوم) — صاحبها ما ينحسب «ما سجّل حضور»
  const { data: leaves } = f.hr ? await db.from('staff_leave_requests').select('staff_id,start_date,end_date').eq('org_id', orgId).eq('status', 'approved').lte('start_date', today).gte('end_date', yesterday) : { data: [] as any[] }

  return branches.map(b => {
    const prods = ((products || []) as any[]).filter(p => p.branch_id === b.id)

    // قرارات اليوم: أصناف تخلص خلال ٣ أيام (معدل آخر ٣٠ يوم) + يوم الذروة اليوم/بكرة (آخر ٨ أسابيع)
    let decisions: string[] | null = null
    const decided = new Set<string>()   // أصناف انذكرت في «المطلوب اليوم» — ما تتكرر في «قربت تخلص»
    if (f.ai) {
      const mine = ((moves || []) as any[]).filter(m => m.products?.branch_id === b.id)
      const since30 = nowMs - 30 * DAY
      const out30 = new Map<string, number>()
      const byDow = Array(7).fill(0)
      for (const m of mine) {
        const q = Math.abs(Number(m.qty_change) || 0)
        if (Date.parse(m.created_at) >= since30) out30.set(m.products.id, (out30.get(m.products.id) || 0) + q)
        byDow[saudiDow(saudiDate(Date.parse(m.created_at)))] += q
      }
      const soon = prods.filter(p => Number(p.qty) > 0).map(p => { const d = (out30.get(p.id) || 0) / 30; return { p, left: d > 0 ? Number(p.qty) / d : null } })
        .filter(x => x.left != null && x.left <= 3).sort((a, z) => a.left! - z.left!).slice(0, 4)
        .map(x => { decided.add(x.p.id); return x.left! < 1 ? `اطلب ${x.p.name} اليوم (ينفد اليوم)` : `اطلب ${x.p.name} (ينفد ${inDays(Math.round(x.left!))})` })
      const avg = byDow.reduce((t, v) => t + v, 0) / 7
      const peak = byDow.indexOf(Math.max(...byDow))
      const dowToday = saudiDow(today)
      if (avg > 0 && byDow[peak] >= avg * 1.15) {
        if (peak === dowToday) soon.push(`اليوم هو الأكثر ازدحاماً لديك — تأكد من جاهزية الأصناف الأساسية`)
        else if (peak === (dowToday + 1) % 7) soon.push(`غداً (${DAYS[peak]}) هو الأكثر ازدحاماً — جهّز مخزونك من اليوم`)
      }
      decisions = soon.length ? soon : null
    }

    // إقفال الكاشير أمس: الحالة بس (مطابق / زيادة / عجز) بدون أرقام — العميل ممكن يكون مقفل إرسال الإقفالات على الواتساب
    let sales: string[] | null = null
    if (f.cashier) {
      const cs = ((closings || []) as any[]).filter(c => c.branch_id === b.id)
      if (cs.length) {
        const st = (c: any) => Number(c.difference || 0) < 0 ? 'عجز' : Number(c.difference || 0) > 0 ? 'زيادة' : 'مطابق'
        if (cs.length === 1) { const k = st(cs[0]); sales = [k === 'مطابق' ? 'مطابق' : `${k} — راجع التفاصيل في صفحة الإقفال`] }
        else {
          const count = (k: string) => cs.filter(c => st(c) === k).length
          const parts = (['مطابق', 'زيادة', 'عجز'] as const).filter(k => count(k)).map(k => `${count(k)} ${k}`)
          sales = [count('مطابق') === cs.length ? `مطابق (${cs.length} إقفالات)` : parts.join(' · ')]
        }
      }
    }

    // الموظفين: أمس (ما سجّل حضور / تأخر) واليوم (كم دوامه)
    let staffTxt: string[] | null = null
    let staffNotable = false
    if (f.hr) {
      const team = ((staff || []) as any[]).filter(s => s.branch_id === b.id)
      if (team.length) {
        // عنده دوام بالتاريخ: له شفت، ومو يوم إجازته (الأسبوعية/الشهرية/المعتمدة) — إلا لو حاط له شفت بهالتاريخ بالذات
        const works = (s: any, date: string) => !!shiftIdForDate(s, date) && (!!s.date_shifts?.[date] || !offReason(date, s, ((leaves || []) as any[]).filter(l => l.staff_id === s.id)))
        const ins = ((att || []) as any[])
        const absent = team.filter(s => works(s, yesterday) && !ins.some(a => a.staff_id === s.id)).map(s => s.name)
        const late = team.map(s => ({ s, a: ins.find(a => a.staff_id === s.id && Number(a.late_minutes) > 0) })).filter(x => x.a).map(x => `${x.s.name} (${x.a.late_minutes} دقيقة)`)
        const todayCount = team.filter(s => works(s, today)).length
        staffNotable = absent.length > 0 || late.length > 0
        staffTxt = [
          absent.length ? `غياب أمس: ${absent.join('، ')}` : null,
          late.length ? `تأخير أمس: ${late.join('، ')}` : null,
          `دوام اليوم: ${todayCount} ${todayCount === 1 ? 'موظف' : todayCount === 2 ? 'موظفين' : todayCount <= 10 ? 'موظفين' : 'موظف'}`,
        ].filter(Boolean) as string[]
      }
    }

    // المخزون: اللي خلص (سطر واحد) واللي قرب يخلص (الأقل نسبة لحد الطلب أول) — مختصرة
    const out = prods.filter(p => Number(p.qty) <= 0 && everMoved.has(p.id)).map(p => p.name)
    const stockOut = out.length ? out.slice(0, MAX_OUT).join('، ') + (out.length > MAX_OUT ? `، ${moreItems(out.length - MAX_OUT)}` : '') : null
    const low = prods.filter(p => Number(p.qty) > 0 && Number(p.qty) <= Number(p.reorder_point) && !decided.has(p.id))
      .sort((a, z) => Number(a.qty) / (Number(a.reorder_point) || 1) - Number(z.qty) / (Number(z.reorder_point) || 1))
    const stockLow = low.length ? [
      ...low.slice(0, MAX_LOW).map(p => `${p.name} (المتبقي ${n2(p.qty)} من ${n2(p.reorder_point)}${p.unit ? ' ' + p.unit : ''})`),
      ...(low.length > MAX_LOW ? [`${moreItems(low.length - MAX_LOW)} تحت الحد الأدنى — التفاصيل في صفحة المخزون`] : []),
    ] : null

    // مشتريات أمس
    const bs = ((buys || []) as any[]).filter(x => x.branch_id === b.id)
    const purchases = bs.length ? `${money(bs.reduce((t, x) => t + Number(x.amount || 0), 0))} ريال (${invoicesAr(bs.length)})` : null

    return { branchId: b.id, branchName: b.name, decisions, sales, staff: staffTxt, staffNotable, stockOut, stockLow, purchases }
  })
}

/** نص قسم فرع حسب اللي يشوفه المستلم — null لو ما فيه شي يستاهل.
 *  الترتيب: إقفال الكاشير ← خلصت ← المطلوب اليوم ← الموظفين ← قربت تخلص ← المشتريات */
export function branchBlock(r: BranchReport, v: ReportView): string | null {
  const list = (items: string[]) => items.map(x => `• ${x}`).join('\n')
  const parts = [
    v.sales && r.sales ? `*إقفال الكاشير (أمس)*\n${list(r.sales)}` : null,
    v.stock && r.stockOut ? `*نفدت — اطلبها اليوم*\n• ${r.stockOut}` : null,
    v.decisions && r.decisions ? `*المطلوب اليوم*\n${list(r.decisions)}` : null,
    v.staff && r.staff && r.staffNotable ? `*الموظفون*\n${list(r.staff)}` : null,
    v.stock && r.stockLow ? `*قاربت على النفاد*\n${list(r.stockLow)}` : null,
    v.purchases && r.purchases ? `*المشتريات (أمس)*\n• ${r.purchases}` : null,
  ].filter(Boolean)
  return parts.length ? parts.join('\n\n') : null
}

/** الرسالة كاملة: عنوان + فرع أو أكثر */
export function reportMessage(orgName: string, blocks: { name: string; text: string }[], multiBranch: boolean, nowMs = Date.now()): string | null {
  if (!blocks.length) return null
  const date = new Date(nowMs).toLocaleDateString('ar-SA-u-ca-gregory', { numberingSystem: 'latn', timeZone: 'Asia/Riyadh', weekday: 'long', day: 'numeric', month: 'long' })
  const body = blocks.map(b => (multiBranch ? `▬▬ *${b.name}* ▬▬\n\n` : '') + b.text).join('\n\n\n')
  return `*التقرير الصباحي*\n${orgName} | ${date}\n\n${body}\n\n_ستورلي · storely.dev_`
}
