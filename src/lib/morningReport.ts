// التقرير الصباحي (واتساب): لكل فرع أقسام — وكل قسم بس لو ميزته مفعّلة (lib/planFeatures، والتجربة تفتح الكل):
// قرارات اليوم (الذكاء) · مبيعات أمس (الكاشير) · الموظفين أمس ودوام اليوم (إدارة الموظفين) · المخزون الناقص · مشتريات أمس.
// المالك يوصله تقرير كل الفروع برسالة وحدة، ورقم الفرع ومدير الفرع يوصلهم تقرير فرعهم (lib — api/notify-low-stock يرسل).
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Features } from '@/lib/planFeatures'
import { shiftIdForDate } from '@/lib/shiftSchedule'
import { offReason } from '@/lib/daysOff'

const DAY = 864e5
const saudiDate = (ms: number) => new Date(ms + 3 * 3600e3).toISOString().slice(0, 10)
const saudiDow = (date: string) => new Date(date + 'T12:00:00Z').getUTCDay()
const DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
const money = (v: number) => Math.round(v).toLocaleString('en-US')

/** محتوى فرع واحد — كل قسم نص جاهز أو null (ما ينذكر) */
export type BranchReport = {
  branchId: string; branchName: string
  decisions: string[] | null; sales: string | null; staff: string | null; stock: string | null; purchases: string | null
}
/** وش يشوف المستلم: المالك ورقم الفرع كل الأقسام المفعّلة، والمدير حسب صلاحياته */
export type ReportView = { decisions: boolean; sales: boolean; staff: boolean; stock: boolean; purchases: boolean }

export const fullView = (f: Features): ReportView => ({ decisions: f.ai, sales: f.cashier, staff: f.hr, stock: true, purchases: true })

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
    f.cashier ? db.from('cashier_closings').select('branch_id,total_sales,cash_amount,network_amount,difference').eq('org_id', orgId).eq('closing_date', yesterday) : Promise.resolve({ data: [] as any[] }),
    f.hr ? db.from('staff_members').select('id,name,branch_id,shift_id,weekday_shifts,date_shifts,days_off_mode,weekly_off_days,biweekly_anchor,off_dates').eq('org_id', orgId).eq('is_active', true) : Promise.resolve({ data: [] as any[] }),
    f.hr ? db.from('staff_attendance').select('staff_id,type,late_minutes,recorded_at').eq('org_id', orgId).eq('type', 'check_in').gte('recorded_at', startOf(yesterday)).lt('recorded_at', startOf(today)) : Promise.resolve({ data: [] as any[] }),
  ])
  // الإجازات المعتمدة (أمس واليوم) — صاحبها ما ينحسب «ما سجّل حضور»
  const { data: leaves } = f.hr ? await db.from('staff_leave_requests').select('staff_id,start_date,end_date').eq('org_id', orgId).eq('status', 'approved').lte('start_date', today).gte('end_date', yesterday) : { data: [] as any[] }

  return branches.map(b => {
    const prods = ((products || []) as any[]).filter(p => p.branch_id === b.id)

    // قرارات اليوم: أصناف تخلص خلال ٣ أيام (معدل آخر ٣٠ يوم) + يوم الذروة اليوم/بكرة (آخر ٨ أسابيع)
    let decisions: string[] | null = null
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
      const soon = prods.map(p => { const d = (out30.get(p.id) || 0) / 30; return { p, left: d > 0 ? Number(p.qty) / d : null } })
        .filter(x => x.left != null && x.left <= 3).sort((a, z) => a.left! - z.left!).slice(0, 4)
        .map(x => x.left! < 1 ? `اطلب ${x.p.name} اليوم — يخلص اليوم` : `اطلب ${x.p.name} — يخلص خلال ${Math.round(x.left!)} ${Math.round(x.left!) === 1 ? 'يوم' : 'أيام'}`)
      const avg = byDow.reduce((t, v) => t + v, 0) / 7
      const peak = byDow.indexOf(Math.max(...byDow))
      const dowToday = saudiDow(today)
      if (avg > 0 && byDow[peak] >= avg * 1.15) {
        if (peak === dowToday) soon.push(`اليوم (${DAYS[peak]}) أكثر يوم زحمة عندك — تأكد إن الأصناف الأساسية جاهزة`)
        else if (peak === (dowToday + 1) % 7) soon.push(`بكرة (${DAYS[peak]}) أكثر يوم زحمة عندك — جهّز مخزونك من اليوم`)
      }
      decisions = soon.length ? soon : null
    }

    // مبيعات أمس
    let sales: string | null = null
    if (f.cashier) {
      const cs = ((closings || []) as any[]).filter(c => c.branch_id === b.id)
      if (cs.length) {
        const sum = (k: string) => cs.reduce((t, c) => t + Number(c[k] || 0), 0)
        const diff = sum('difference')
        sales = `${money(sum('total_sales'))} ريال (كاش ${money(sum('cash_amount'))} · شبكة ${money(sum('network_amount'))})${diff < 0 ? ` · عجز ${money(-diff)} ريال` : diff > 0 ? ` · زيادة ${money(diff)} ريال` : ''}`
      }
    }

    // الموظفين: أمس (ما سجّل حضور / تأخر) واليوم (كم دوامه)
    let staffTxt: string | null = null
    if (f.hr) {
      const team = ((staff || []) as any[]).filter(s => s.branch_id === b.id)
      if (team.length) {
        // عنده دوام بالتاريخ: له شفت، ومو يوم إجازته (الأسبوعية/الشهرية/المعتمدة) — إلا لو حاط له شفت بهالتاريخ بالذات
        const works = (s: any, date: string) => !!shiftIdForDate(s, date) && (!!s.date_shifts?.[date] || !offReason(date, s, ((leaves || []) as any[]).filter(l => l.staff_id === s.id)))
        const ins = ((att || []) as any[])
        const absent = team.filter(s => works(s, yesterday) && !ins.some(a => a.staff_id === s.id)).map(s => s.name)
        const late = team.map(s => ({ s, a: ins.find(a => a.staff_id === s.id && Number(a.late_minutes) > 0) })).filter(x => x.a).map(x => `${x.s.name} (${x.a.late_minutes} دقيقة)`)
        const todayCount = team.filter(s => works(s, today)).length
        const lines = [
          absent.length ? `ما سجّل حضور أمس: ${absent.join('، ')}` : null,
          late.length ? `تأخر أمس: ${late.join('، ')}` : null,
          `دوام اليوم: ${todayCount} ${todayCount === 1 ? 'موظف' : 'موظفين'}`,
        ].filter(Boolean)
        staffTxt = lines.join('\n')
      }
    }

    // المخزون الناقص
    const out = prods.filter(p => Number(p.qty) <= 0).map(p => p.name)
    const low = prods.filter(p => Number(p.qty) > 0 && Number(p.qty) <= Number(p.reorder_point)).map(p => `${p.name} (${p.qty}/${p.reorder_point} ${p.unit || ''})`.replace(' )', ')'))
    const stock = out.length || low.length ? [out.length ? `نفد: ${out.join('، ')}` : null, low.length ? `ناقص: ${low.join('، ')}` : null].filter(Boolean).join('\n') : null

    // مشتريات أمس
    const bs = ((buys || []) as any[]).filter(x => x.branch_id === b.id)
    const purchases = bs.length ? `${money(bs.reduce((t, x) => t + Number(x.amount || 0), 0))} ريال (${bs.length} ${bs.length === 1 ? 'فاتورة' : 'فواتير'})` : null

    return { branchId: b.id, branchName: b.name, decisions, sales, staff: staffTxt, stock, purchases }
  })
}

/** نص قسم فرع حسب اللي يشوفه المستلم — null لو ما فيه شي يستاهل */
export function branchBlock(r: BranchReport, v: ReportView): string | null {
  const parts = [
    v.decisions && r.decisions ? `*قرارات اليوم*\n${r.decisions.map(d => `• ${d}`).join('\n')}` : null,
    v.sales && r.sales ? `*مبيعات أمس:* ${r.sales}` : null,
    v.staff && r.staff ? `*الموظفين*\n${r.staff}` : null,
    v.stock && r.stock ? `*المخزون*\n${r.stock}` : null,
    v.purchases && r.purchases ? `*مشتريات أمس:* ${r.purchases}` : null,
  ].filter(Boolean)
  // دوام اليوم لحاله ما يكفي يرسل تقرير
  const meaningful = parts.some(p => !String(p).startsWith('*الموظفين*') || /ما سجّل|تأخر/.test(String(p)))
  return parts.length && meaningful ? parts.join('\n\n') : null
}

/** الرسالة كاملة: عنوان + فرع أو أكثر */
export function reportMessage(orgName: string, blocks: { name: string; text: string }[], multiBranch: boolean, nowMs = Date.now()): string | null {
  if (!blocks.length) return null
  const date = new Date(nowMs).toLocaleDateString('ar-SA', { numberingSystem: 'latn', timeZone: 'Asia/Riyadh', weekday: 'long', day: 'numeric', month: 'long' })
  const body = blocks.map(b => (multiBranch ? `━━ *${b.name}* ━━\n` : '') + b.text).join('\n\n')
  return `*التقرير الصباحي — ${orgName}*\n${date}\n\n${body}\n\n_Storely_`
}
