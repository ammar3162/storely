// أدوات المساعد الذكي (Tool Use): المساعد يختار الأداة حسب السؤال، والنظام يجيب البيانات من القاعدة مباشرة.
// كل أداة مربوطة بميزتها (lib/planFeatures) وصلاحية مدير الفرع (lib/managerPerms)، ومدير الفرع على فرعه بس.
// الأداة المقفلة ما تنعرض على النموذج أصلاً — فما يقدر يطلبها.
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Features } from '@/lib/planFeatures'
import { managerMay } from '@/lib/managerPerms'
import { loadAccountantReport } from '@/lib/accountantData'
import { vatReturn } from '@/lib/accountantExport'
import { offReason } from '@/lib/daysOff'
import { shiftIdForDate } from '@/lib/shiftSchedule'

type Access = { role?: string | null; permissions?: Record<string, unknown> | null }
export type ToolCtx = { db: SupabaseClient; orgId: string; branchId: string | null; vatRegistered: boolean; businessType: string | null }
type Tool = {
  name: string; description: string; input_schema: Record<string, unknown>
  allowed: (f: Features, a: Access) => boolean
  run: (ctx: ToolCtx, input: any) => Promise<unknown>
}

const DAY = 864e5
const r2 = (v: unknown) => Math.round((Number(v) || 0) * 100) / 100
const saudiDay = (ms: number) => new Date(ms + 3 * 3600e3).toISOString().slice(0, 10)
const DATE = /^\d{4}-\d{2}-\d{2}$/
/** الفترة: from/to بصيغة YYYY-MM-DD بتوقيت السعودية — الافتراضي آخر 30 يوم، وأقصاها سنة */
function period(input: any) {
  const today = saudiDay(Date.now())
  let to = DATE.test(String(input?.to || '')) ? String(input.to) : today
  let from = DATE.test(String(input?.from || '')) ? String(input.from) : saudiDay(Date.now() - 29 * DAY)
  if (from > to) [from, to] = [to, from]
  if (Date.parse(to) - Date.parse(from) > 366 * DAY) from = saudiDay(Date.parse(to + 'T12:00:00Z') - 365 * DAY)
  return { from, to, start: `${from}T00:00:00+03:00`, end: `${to}T23:59:59.999+03:00` }
}
const range = { from: { type: 'string', description: 'بداية الفترة YYYY-MM-DD (افتراضي: قبل 30 يوم)' }, to: { type: 'string', description: 'نهاية الفترة YYYY-MM-DD (افتراضي: اليوم)' } }
const like = (s: unknown) => `%${String(s || '').trim().replace(/[%_]/g, '').slice(0, 60)}%`
const branchNames = async (ctx: ToolCtx) => new Map((((await ctx.db.from('branches').select('id,name').eq('org_id', ctx.orgId)).data) || [] as any[]).map((b: any) => [b.id, b.name]))

const data = (f: Features) => f.ai   // تحليل البيانات = ميزة الذكاء الاصطناعي

export const ASSISTANT_TOOLS: Tool[] = [
  {
    name: 'purchases',
    description: 'فواتير المشتريات: آخر فاتورة، فواتير فترة، مشتريات مورد أو صنف، مع الصافي والضريبة والإجمالي.',
    input_schema: { type: 'object', properties: { ...range, supplier: { type: 'string', description: 'اسم المورد (جزء منه)' }, product: { type: 'string', description: 'اسم الصنف (جزء منه)' }, limit: { type: 'number', description: 'عدد الفواتير (افتراضي 10، أقصى 30)' } } },
    allowed: (f, a) => data(f) && managerMay(a, 'purchases', 'reports'),
    run: async (ctx, i) => {
      const p = period(i)
      let q = ctx.db.from('purchases').select('created_at,supplier,invoice_number,invoice_group,name,qty,unit,amount,vat_amount,total_amount,branch_id,payment_status')
        .eq('org_id', ctx.orgId).is('deleted_at', null).gte('created_at', p.start).lte('created_at', p.end).order('created_at', { ascending: false }).limit(1000)
      if (ctx.branchId) q = q.eq('branch_id', ctx.branchId)
      if (i?.supplier) q = q.ilike('supplier', like(i.supplier))
      if (i?.product) q = q.ilike('name', like(i.product))
      const [{ data: rows }, bn] = await Promise.all([q, branchNames(ctx)])
      const groups = new Map<string, any>()
      for (const r of (rows || []) as any[]) {
        const k = r.invoice_group || r.invoice_number || `${r.created_at}|${r.supplier}`
        const g = groups.get(k) || { date: saudiDay(Date.parse(r.created_at)), supplier: r.supplier || '—', invoice: r.invoice_number || null, branch: bn.get(r.branch_id) || null, unpaid: r.payment_status === 'unpaid', items: [] as string[], net: 0, vat: 0, total: 0 }
        g.items.push(`${r.name} ${r.qty || ''} ${r.unit || ''}`.trim()); g.net += Number(r.amount || 0); g.vat += Number(r.vat_amount || 0); g.total += Number(r.total_amount || 0)
        groups.set(k, g)
      }
      const all = [...groups.values()]
      const limit = Math.min(30, Math.max(1, Number(i?.limit) || 10))
      return {
        period: `${p.from} → ${p.to}`, invoices_count: all.length,
        totals: { net: r2(all.reduce((t, g) => t + g.net, 0)), vat: r2(all.reduce((t, g) => t + g.vat, 0)), total: r2(all.reduce((t, g) => t + g.total, 0)) },
        latest: all.slice(0, limit).map(g => ({ ...g, items: g.items.slice(0, 8), net: r2(g.net), vat: r2(g.vat), total: r2(g.total) })),
      }
    },
  },
  {
    name: 'supplier_prices',
    description: 'مقارنة أسعار الموردين: مين الأرخص لصنف معيّن (متوسط سعر الوحدة من فواتير آخر 6 شهور).',
    input_schema: { type: 'object', properties: { product: { type: 'string', description: 'اسم الصنف (جزء منه) — بدونه يرجع الأصناف اللي لها أكثر من مورد' } } },
    allowed: (f, a) => data(f) && managerMay(a, 'purchases', 'suppliers', 'reports'),
    run: async (ctx, i) => {
      let q = ctx.db.from('purchases').select('name,supplier,qty,total_amount,unit,created_at').eq('org_id', ctx.orgId).is('deleted_at', null)
        .gte('created_at', new Date(Date.now() - 180 * DAY).toISOString()).not('supplier', 'is', null).limit(3000)
      if (ctx.branchId) q = q.eq('branch_id', ctx.branchId)
      if (i?.product) q = q.ilike('name', like(i.product))
      const { data: rows } = await q
      const g: Record<string, Record<string, { total: number; qty: number; last: string; unit: string }>> = {}
      for (const r of (rows || []) as any[]) {
        const name = String(r.name || '').trim(), sup = String(r.supplier || '').trim(), qty = Number(r.qty) || 0, amt = Number(r.total_amount) || 0
        if (!name || !sup || qty <= 0 || amt <= 0) continue
        const s = ((g[name] ||= {})[sup] ||= { total: 0, qty: 0, last: r.created_at, unit: r.unit || '' })
        s.total += amt; s.qty += qty; if (r.created_at > s.last) s.last = r.created_at
      }
      const items = Object.entries(g).map(([name, sups]) => ({
        product: name,
        suppliers: Object.entries(sups).map(([supplier, d]) => ({ supplier, unit_price_with_vat: r2(d.total / d.qty), unit: d.unit, last_purchase: saudiDay(Date.parse(d.last)) })).sort((a, b) => a.unit_price_with_vat - b.unit_price_with_vat),
      })).filter(x => i?.product || x.suppliers.length > 1).slice(0, 20)
      return { items, note: items.length ? 'الأول بكل صنف هو الأرخص' : 'ما فيه مشتريات كافية للمقارنة' }
    },
  },
  {
    name: 'dispense',
    description: 'الصرف من المخزون: حسب الموظف (مين أكثر واحد صرف) أو حسب الصنف (وش أكثر صنف انصرف)، مع الهدر والتالف.',
    input_schema: { type: 'object', properties: { ...range, by: { type: 'string', enum: ['staff', 'product'], description: 'التجميع: staff أو product' }, product: { type: 'string' }, staff: { type: 'string', description: 'اسم الموظف (جزء منه)' } } },
    allowed: (f, a) => data(f) && managerMay(a, 'dispense', 'inventory', 'reports'),
    run: async (ctx, i) => {
      const p = period(i)
      let q = ctx.db.from('stock_movements').select('qty_change,staff_name,waste_reason,created_at,products!inner(name,unit,org_id)')
        .eq('products.org_id', ctx.orgId).eq('type', 'out').gte('created_at', p.start).lte('created_at', p.end).limit(20000)
      if (ctx.branchId) q = q.eq('branch_id', ctx.branchId)
      if (i?.product) q = q.ilike('products.name', like(i.product))
      if (i?.staff) q = q.ilike('staff_name', like(i.staff))
      const { data: rows } = await q
      const by = i?.by === 'product' ? 'product' : 'staff'
      const m = new Map<string, { count: number; qty: number; waste: number; unit?: string }>()
      for (const r of (rows || []) as any[]) {
        const k = by === 'staff' ? (r.staff_name || 'المالك / بدون اسم') : r.products?.name
        const e = m.get(k) || { count: 0, qty: 0, waste: 0, unit: by === 'product' ? r.products?.unit : undefined }
        const q2 = Math.abs(Number(r.qty_change) || 0)
        e.count++; e.qty += q2; if (r.waste_reason) e.waste += q2
        m.set(k, e)
      }
      return { period: `${p.from} → ${p.to}`, by, operations: (rows || []).length, ranking: [...m.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, 15).map(([name, e]) => ({ name, operations: e.count, qty: r2(e.qty), waste_qty: r2(e.waste), unit: e.unit })) }
    },
  },
  {
    name: 'inventory',
    description: 'المخزون الحالي والتوقعات: كمية صنف، الأصناف الناقصة، ومتى يخلص كل صنف (حسب صرف آخر 30 يوم).',
    input_schema: { type: 'object', properties: { product: { type: 'string', description: 'اسم الصنف (جزء منه)' }, only_low: { type: 'boolean', description: 'الناقصة والقريبة من النفاد بس' } } },
    allowed: (f, a) => data(f) && managerMay(a, 'inventory', 'dispense', 'ai_tools'),
    run: async (ctx, i) => {
      let pq = ctx.db.from('products').select('id,name,qty,unit,reorder_point,category,branch_id').eq('org_id', ctx.orgId).eq('is_active', true).limit(500)
      if (ctx.branchId) pq = pq.eq('branch_id', ctx.branchId)
      if (i?.product) pq = pq.ilike('name', like(i.product))
      const [{ data: prods }, bn] = await Promise.all([pq, branchNames(ctx)])
      const ids = ((prods || []) as any[]).map(p => p.id)
      const out = new Map<string, number>()
      if (ids.length) {
        const { data: mv } = await ctx.db.from('stock_movements').select('product_id,qty_change').eq('type', 'out').in('product_id', ids.slice(0, 500)).gte('created_at', new Date(Date.now() - 30 * DAY).toISOString()).limit(20000)
        for (const r of (mv || []) as any[]) out.set(r.product_id, (out.get(r.product_id) || 0) + Math.abs(Number(r.qty_change) || 0))
      }
      let list = ((prods || []) as any[]).map(p => {
        const daily = (out.get(p.id) || 0) / 30
        return { name: p.name, branch: bn.get(p.branch_id) || null, qty: r2(p.qty), unit: p.unit, reorder_point: r2(p.reorder_point), daily_use: r2(daily), days_left: daily > 0 ? Math.round(Number(p.qty) / daily) : null, low: Number(p.qty) <= Number(p.reorder_point) }
      })
      if (i?.only_low) list = list.filter(p => p.low || (p.days_left != null && p.days_left <= 7))
      list.sort((a, b) => (a.days_left ?? 9999) - (b.days_left ?? 9999))
      return { count: list.length, products: list.slice(0, 60) }
    },
  },
  {
    name: 'vat',
    description: 'ضريبة القيمة المضافة لفترة: ضريبة المبيعات والمشتريات والصافي المستحق وآخر موعد للإقرار (نفس الإقرار الضريبي بالنظام).',
    input_schema: { type: 'object', properties: { month: { type: 'string', description: 'الشهر YYYY-MM (افتراضي: الشهر الحالي)' }, ...range } },
    allowed: (f, a) => data(f) && managerMay(a, 'reports'),
    run: async (ctx, i) => {
      let p: { start: string; end: string }
      if (/^\d{4}-\d{2}$/.test(String(i?.month || ''))) {
        const [y, mo] = String(i.month).split('-').map(Number)
        p = { start: `${i.month}-01`, end: new Date(Date.UTC(y, mo, 0)).toISOString().slice(0, 10) }
      } else if (i?.from || i?.to) { const pp = period(i); p = { start: pp.from, end: pp.to } }
      else { const t = saudiDay(Date.now()); p = { start: t.slice(0, 7) + '-01', end: t } }
      const rep = await loadAccountantReport(ctx.db, { orgId: ctx.orgId, branchId: ctx.branchId, period: p, sections: ['sales', 'purchases', 'vat'], vatRegistered: ctx.vatRegistered })
      const v = vatReturn(rep)
      const box = (no: number) => v.boxes.find(b => b.no === no)
      return {
        period: `${p.start} → ${p.end}`, vat_registered: ctx.vatRegistered,
        sales: { net: box(1)?.amount ?? 0, vat: box(1)?.vat ?? 0 }, purchases: { net: box(7)?.amount ?? 0, vat: box(7)?.vat ?? 0 },
        net_due: v.netDue, deadline: v.deadline,
        incomplete_invoices: { count: v.review.count, vat: v.review.vat }, purchases_without_vat: v.nonVat.count,
        note: 'المبيعات من إقفالات الكاشير. الصافي الموجب = عليك تدفعه، السالب = مسترد. فواتير الشراء الناقصة (بدون رقم ضريبي للمورد) ما تنحسب ضريبتها لين تكتمل',
      }
    },
  },
  {
    name: 'cashier_closings',
    description: 'إقفالات الكاشير لفترة: المبيعات والكاش والشبكة والعجز أو الزيادة لكل إقفال، والمجموع.',
    input_schema: { type: 'object', properties: { ...range, staff: { type: 'string', description: 'اسم الكاشير (جزء منه)' } } },
    allowed: (f, a) => data(f) && f.cashier && managerMay(a, 'reports'),
    run: async (ctx, i) => {
      const p = period(i)
      let q = ctx.db.from('cashier_closings').select('closing_date,branch_id,staff_name,total_sales,cash_amount,network_amount,difference,status')
        .eq('org_id', ctx.orgId).gte('closing_date', p.from).lte('closing_date', p.to).order('closing_date', { ascending: false }).limit(500)
      if (ctx.branchId) q = q.eq('branch_id', ctx.branchId)
      if (i?.staff) q = q.ilike('staff_name', like(i.staff))
      const [{ data: rows }, bn] = await Promise.all([q, branchNames(ctx)])
      const list = (rows || []) as any[]
      const sum = (k: string) => r2(list.reduce((t, r) => t + Number(r[k] || 0), 0))
      return {
        period: `${p.from} → ${p.to}`, closings: list.length,
        totals: { sales: sum('total_sales'), cash: sum('cash_amount'), network: sum('network_amount'), difference: sum('difference'), deficits: list.filter(r => Number(r.difference) < 0).length },
        latest: list.slice(0, 20).map(r => ({ date: r.closing_date, branch: bn.get(r.branch_id) || null, cashier: r.staff_name, sales: r2(r.total_sales), cash: r2(r.cash_amount), network: r2(r.network_amount), difference: r2(r.difference) })),
      }
    },
  },
  {
    name: 'attendance',
    description: 'الحضور والانصراف لفترة: لكل موظف أيام الحضور والغياب ومرات التأخير ودقائقه — أو موظف معيّن.',
    input_schema: { type: 'object', properties: { ...range, staff: { type: 'string', description: 'اسم الموظف (جزء منه)' } } },
    allowed: (f, a) => data(f) && f.hr && managerMay(a, 'attendance', 'staff', 'hr'),
    run: async (ctx, i) => {
      const p = period(i)
      let sq = ctx.db.from('staff_members').select('id,name,branch_id,shift_id,weekday_shifts,date_shifts,days_off_mode,weekly_off_days,biweekly_anchor,off_dates').eq('org_id', ctx.orgId).eq('is_active', true)
      if (ctx.branchId) sq = sq.eq('branch_id', ctx.branchId)
      if (i?.staff) sq = sq.ilike('name', like(i.staff))
      const { data: staff } = await sq.limit(200)
      const ids = ((staff || []) as any[]).map(s => s.id)
      if (!ids.length) return { period: `${p.from} → ${p.to}`, staff: [] }
      const [{ data: att }, { data: leaves }] = await Promise.all([
        ctx.db.from('staff_attendance').select('staff_id,type,recorded_at,late_minutes').eq('org_id', ctx.orgId).eq('type', 'check_in').in('staff_id', ids).gte('recorded_at', p.start).lte('recorded_at', p.end).limit(20000),
        ctx.db.from('staff_leave_requests').select('staff_id,start_date,end_date').eq('org_id', ctx.orgId).eq('status', 'approved').in('staff_id', ids).lte('start_date', p.to).gte('end_date', p.from),
      ])
      const today = saudiDay(Date.now())
      const days: string[] = []
      for (let d = p.from; d <= p.to && d < today; d = saudiDay(Date.parse(d + 'T12:00:00Z') + DAY - 3 * 3600e3)) days.push(d)
      return {
        period: `${p.from} → ${p.to}`,
        staff: ((staff || []) as any[]).map(s => {
          const ins = ((att || []) as any[]).filter(a => a.staff_id === s.id)
          const present = new Set(ins.map(a => saudiDay(Date.parse(a.recorded_at))))
          const lv = ((leaves || []) as any[]).filter(l => l.staff_id === s.id)
          const absent = days.filter(d => !present.has(d) && !!shiftIdForDate(s, d) && (!!s.date_shifts?.[d] || !offReason(d, s, lv)))
          const late = ins.filter(a => Number(a.late_minutes) > 0)
          return { name: s.name, present_days: present.size, absent_days: absent.length, absent_dates: absent.slice(-10), late_times: late.length, late_minutes: late.reduce((t, a) => t + Number(a.late_minutes || 0), 0) }
        }).sort((a, b) => b.absent_days - a.absent_days || b.late_minutes - a.late_minutes),
      }
    },
  },
]

/** الأدوات المسموحة للمستخدم (بصيغة Anthropic tools) */
export function allowedTools(f: Features, a: Access) {
  return ASSISTANT_TOOLS.filter(t => t.allowed(f, a))
}

export async function runTool(name: string, input: unknown, ctx: ToolCtx, f: Features, a: Access): Promise<unknown> {
  const t = ASSISTANT_TOOLS.find(x => x.name === name)
  if (!t || !t.allowed(f, a)) return { error: 'هذي البيانات مو متاحة لهالمستخدم' }
  try { return await t.run(ctx, input || {}) } catch { return { error: 'تعذر جلب البيانات' } }
}
