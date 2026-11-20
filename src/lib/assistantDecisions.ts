// قرارات Soul — المرحلة الأولى (طلب المالك 2026-11-19: «ننقل اتخاذ القرارات من الواتساب والتنقل بين الصفحات إلى Soul»).
// كل شي ينتظر قرار من صاحب الحساب يطلع بطاقة في Soul بأزراره، والأزرار تنادي نفس واجهات الصفحات وبنفس صلاحياتها:
//   العجز واليوم الإضافي: المالك بس · الاستئذان: الموارد البشرية أو الحضور · الإجازة والسلفة: الموارد البشرية
//   طلب التوريد: صلاحية الموردين وميزة المخزون · تسجيل دفع فاتورة مورد: المشتريات أو التقارير
// بدون ذكاء اصطناعي ولا تكلفة: البطاقات من القاعدة مباشرة، والقرار نفسه يتحقق منه الخادم مرة ثانية وقت التنفيذ.
import type { SupabaseClient } from '@supabase/supabase-js'
import { managerMay } from '@/lib/managerPerms'
import { orderedSinceLastRestock, failedRecently } from '@/lib/supplierOrderGate'
import { orgFeatures, type Features } from '@/lib/planFeatures'
import { closingReturns } from '@/lib/closingReturns'
import { currencySymbol } from '@/lib/currencySymbol'
import { unitFor } from '@/lib/arabicCount'
import { countAr, DECISION_ORDER, type Decision, type DecisionKind } from '@/lib/soulDecisions'

export type { Decision, DecisionKind } from '@/lib/soulDecisions'

export type DecisionUser = { role?: string | null; permissions?: Record<string, unknown> | null }

/** يقدر هذا المستخدم ياخذ هذا النوع من القرارات؟ — نفس شروط واجهات القرار (والخادم يتحقق مرة ثانية) */
export function canDecide(kind: DecisionKind, u: DecisionUser, f: Partial<Features>): boolean {
  const owner = u.role === 'owner'
  switch (kind) {
    case 'deficit': return owner && f.cashier !== false
    case 'extra_day': return owner && f.hr !== false
    case 'excuse': return f.hr !== false && managerMay(u, 'hr', 'attendance')
    case 'leave': case 'advance': return f.hr !== false && managerMay(u, 'hr')
    case 'payable': return f.purchases !== false && managerMay(u, 'purchases', 'reports')
    case 'stock': return f.inventory !== false && managerMay(u, 'suppliers')
  }
}

// ── صياغة عربية (أرقام إنجليزية، تاريخ ووقت السعودية) ──
const DAY = 86400000
const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
const WEEKDAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
export const saudiDay = (ms: number) => new Date(ms + 3 * 3600e3).toISOString().slice(0, 10)
const addDays = (d: string, n: number) => new Date(Date.parse(`${d}T12:00:00Z`) + n * DAY).toISOString().slice(0, 10)
const dayDiff = (a: string, b: string) => Math.round((Date.parse(`${a}T12:00:00Z`) - Date.parse(`${b}T12:00:00Z`)) / DAY)
export const fmt = (n: number) => Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })

export function dayLabel(d: string, today: string) {
  const diff = dayDiff(today, d)
  if (diff === 0) return 'اليوم'
  if (diff === 1) return 'أمس'
  if (diff === -1) return 'غداً'
  const dt = new Date(`${d}T12:00:00Z`)
  return `${WEEKDAYS[dt.getUTCDay()]} ${dt.getUTCDate()} ${MONTHS[dt.getUTCMonth()]}`
}
const shortDate = (d: string) => { const dt = new Date(`${d}T12:00:00Z`); return `${dt.getUTCDate()} ${MONTHS[dt.getUTCMonth()]}` }
export function ago(iso: string, nowMs: number) {
  const m = Math.max(0, Math.round((nowMs - Date.parse(iso)) / 60000))
  if (m < 1) return 'الآن'
  if (m < 60) return 'قبل ' + countAr(m, ['دقيقة', 'دقيقتين', 'دقائق', 'دقيقة'])
  const h = Math.round(m / 60)
  if (h < 24) return 'قبل ' + countAr(h, ['ساعة', 'ساعتين', 'ساعات', 'ساعة'])
  return dayLabel(saudiDay(Date.parse(iso)), saudiDay(nowMs))
}
function dueLabel(due: string, today: string) {
  const diff = dayDiff(due, today)
  if (diff < 0) return `استحقت ${dayLabel(due, today)}`
  if (diff === 0) return 'تستحق اليوم'
  if (diff === 1) return 'تستحق غداً'
  return 'تستحق بعد ' + countAr(diff, ['يوم', 'يومين', 'أيام', 'يوماً'])
}
const join = (...parts: (string | null | undefined | false)[]) => parts.filter(Boolean).join('، ')

export type BuildCtx = { today: string; nowMs: number; cur: string; branchName: (id?: string | null) => string | null }

// ── بطاقة لكل نوع (دوال خالصة، عليها الاختبارات) ──
export function deficitDecision(c: any, x: BuildCtx): Decision {
  const amt = Math.round(Math.abs(Number(c.difference || 0)) * 100) / 100
  const staff = c.staff_name || 'الكاشير'
  const rets = closingReturns(c).length
  return {
    key: `deficit:${c.id}`, kind: 'deficit', refId: c.id, staff, amountText: `${fmt(amt)} ${x.cur}`,
    title: `عجز ${fmt(amt)} ${x.cur} في إقفال ${staff}`,
    meta: join(dayLabel(c.closing_date, x.today), x.branchName(c.branch_id), c.deficit_reason ? `السبب: ${c.deficit_reason}` : 'بدون سبب مكتوب'),
    lines: rets ? [{ label: 'فواتير مرتجعة مصوّرة في الإقفال', value: String(rets) }] : undefined,
    at: c.created_at || `${c.closing_date}T00:00:00Z`,
    old: dayDiff(x.today, c.closing_date) > 7,
  }
}
export function excuseDecision(r: any, x: BuildCtx): Decision {
  const staff = r.staff_name || 'موظف'
  return {
    key: `excuse:${r.id}`, kind: 'excuse', refId: r.id, staff,
    // صياغة محايدة: ما نعرف إذا الموظف رجل أو امرأة
    title: `طلب انصراف مبكر من ${staff}`,
    meta: join(r.reason ? `السبب: ${r.reason}` : null, ago(r.requested_at, x.nowMs), x.branchName(r.branch_id)),
    at: r.requested_at,
  }
}
export function leaveDecision(r: any, x: BuildCtx): Decision {
  const staff = r.staff_members?.name || 'موظف'
  const days = Math.max(1, Number(r.days_count || 0))
  const range = r.start_date === r.end_date ? `يوم ${shortDate(r.start_date)}` : `من ${shortDate(r.start_date)} إلى ${shortDate(r.end_date)}`
  return {
    key: `leave:${r.id}`, kind: 'leave', refId: r.id, staff,
    title: `طلب إجازة ${countAr(days, ['يوم واحد', 'يومين', 'أيام', 'يوماً'])} من ${staff}`,
    meta: join(range, r.reason ? `السبب: ${r.reason}` : null, x.branchName(r.staff_members?.branch_id)),
    at: r.requested_at,
  }
}
export function advanceDecision(r: any, x: BuildCtx): Decision {
  const staff = r.staff_members?.name || 'موظف'
  const amt = Number(r.amount || 0)
  return {
    key: `advance:${r.id}`, kind: 'advance', refId: r.id, staff, amountText: `${fmt(amt)} ${x.cur}`,
    title: `طلب سلفة ${fmt(amt)} ${x.cur} من ${staff}`,
    meta: join(r.reason ? `السبب: ${r.reason}` : null, ago(r.created_at, x.nowMs), x.branchName(r.staff_members?.branch_id)),
    at: r.created_at,
  }
}
export function extraDayDecision(r: any, x: BuildCtx): Decision {
  const staff = r.staff_members?.name || 'موظف'
  const suggested = Math.round((Number(r.staff_members?.monthly_salary || 0) / 30) * 100) / 100
  return {
    key: `extra_day:${r.id}`, kind: 'extra_day', refId: r.id, staff, workDate: r.work_date, suggested: suggested > 0 ? suggested : undefined,
    title: `يوم عمل إضافي من ${staff}`,
    meta: join(dayLabel(r.work_date, x.today), suggested > 0 ? `أجر يوم ${fmt(suggested)} ${x.cur}` : null, x.branchName(r.staff_members?.branch_id)),
    at: r.created_at || `${r.work_date}T00:00:00Z`,
  }
}
/** فاتورة مورد مستحقة: سطور الفاتورة الوحدة (invoice_group) بطاقة وحدة، و«تم الدفع» يعلّمها كلها */
export function payableDecision(rows: any[], x: BuildCtx): Decision {
  const first = rows[0]
  const ref = first.invoice_group || first.id
  const total = Math.round(rows.reduce((t, r) => t + Number(r.total_amount || 0), 0) * 100) / 100
  const due = rows.map(r => r.due_date).filter(Boolean).sort()[0] || x.today
  return {
    key: `payable:${ref}`, kind: 'payable', refId: ref, ids: rows.map(r => r.id), amountText: `${fmt(total)} ${x.cur}`,
    title: `فاتورة ${first.supplier || first.name || 'مورد'} مستحقة`,
    meta: join(`${fmt(total)} ${x.cur}`, dueLabel(due, x.today), x.branchName(first.branch_id)),
    at: first.created_at || `${due}T00:00:00Z`,
  }
}
/** أصناف وصلت حد طلب المورد وما انرسل طلبها — «اطلب من الموردين» يرسلها (نفس شروط الإرسال التلقائي) */
export function stockDecision(items: any[], scope: string): Decision {
  const n = items.length
  const ids = items.map(p => String(p.id)).sort().join(',')
  let h = 5381
  for (let i = 0; i < ids.length; i++) h = ((h * 33) ^ ids.charCodeAt(i)) >>> 0
  return {
    key: `stock:${scope}:${h.toString(36)}`, kind: 'stock', refId: scope,
    title: `${countAr(n, ['صنف واحد', 'صنفان', 'أصناف', 'صنفاً'])} ${n === 1 ? 'وصل' : n === 2 ? 'وصلا' : 'وصلت'} حد الطلب`,
    meta: 'لم يُرسل طلبها للمورد بعد',
    lines: items.slice(0, 6).map(p => ({ label: String(p.name), value: `المتبقي ${fmt(Number(p.qty))} ${unitFor(Number(p.qty), p.unit || '')}`.trim() })),
    at: new Date().toISOString(),
  }
}

const safe = (p: PromiseLike<any> | null) => (p ? Promise.resolve(p).then(r => r, () => ({ data: null })) : Promise.resolve({ data: null }))

/** أصناف مستحقة الطلب الحين — بنفس شروط api/notify-supplier بالضبط، فالزر يرسل اللي يظهر */
async function stockDue(db: SupabaseClient, orgId: string, branchId: string | null) {
  let q = db.from('products').select('id,name,qty,unit,supplier_reorder_point,branch_id')
    .eq('org_id', orgId).eq('is_active', true).not('supplier_id', 'is', null).not('supplier_reorder_point', 'is', null)
  if (branchId) q = q.eq('branch_id', branchId)
  const { data } = await q.limit(3000)
  const below = ((data || []) as any[]).filter(p => Number(p.qty) <= Number(p.supplier_reorder_point)).slice(0, 15)
  if (!below.length) return []
  const feat = new Map<string, boolean>()
  for (const b of new Set(below.map(p => p.branch_id || ''))) feat.set(b, (await orgFeatures(db, orgId, undefined, b || null)).inventory)
  const ok = await Promise.all(below.map(async p => feat.get(p.branch_id || '') && !(await orderedSinceLastRestock(db, p.id)) && !(await failedRecently(db, p.id))))
  return below.filter((_, i) => ok[i])
}

/** القرارات اللي تنتظر هذا المستخدم (مدير الفرع: فرعه بس، والمالك: الفرع المختار أو الكل) */
export async function loadDecisions(db: SupabaseClient, o: {
  orgId: string; branchId: string | null; user: DecisionUser; features: Partial<Features>; nowMs?: number; kinds?: DecisionKind[]
}): Promise<Decision[]> {
  const nowMs = o.nowMs ?? Date.now(), today = saudiDay(nowMs)
  const want = (k: DecisionKind) => (!o.kinds || o.kinds.includes(k)) && canDecide(k, o.user, o.features)
  const br = (q: any) => (o.branchId ? q.eq('branch_id', o.branchId) : q)
  const inBranch = (bid?: string | null) => !o.branchId || bid === o.branchId

  const [org, branches, def, exc, lev, adv, ext, pay, stk] = await Promise.all([
    safe(db.from('organizations').select('currency').eq('id', o.orgId).maybeSingle()),
    safe(db.from('branches').select('id,name').eq('org_id', o.orgId)),
    safe(want('deficit') ? br(db.from('cashier_closings').select('id,staff_name,closing_date,difference,deficit_reason,returns,branch_id,created_at')
      .eq('org_id', o.orgId).eq('status', 'deficit').eq('deficit_decision', 'pending')).order('closing_date', { ascending: false }).limit(30) : null),
    // الاستئذان لنفس اليوم: طلب أقدم من يومين انتهى وقته
    safe(want('excuse') ? br(db.from('attendance_permission_requests').select('id,staff_name,reason,branch_id,requested_at')
      .eq('org_id', o.orgId).eq('status', 'pending').gte('requested_at', new Date(nowMs - 2 * DAY).toISOString())).order('requested_at', { ascending: false }).limit(20) : null),
    safe(want('leave') ? db.from('staff_leave_requests').select('id,start_date,end_date,days_count,reason,requested_at,staff_members(name,branch_id)')
      .eq('org_id', o.orgId).eq('status', 'pending').order('requested_at', { ascending: false }).limit(20) : null),
    safe(want('advance') ? db.from('staff_payroll_adjustments').select('id,amount,reason,created_at,staff_members(name,branch_id)')
      .eq('org_id', o.orgId).eq('status', 'pending').eq('type', 'advance').order('created_at', { ascending: false }).limit(20) : null),
    safe(want('extra_day') ? db.from('staff_extra_days').select('id,work_date,created_at,staff_members!inner(name,monthly_salary,branch_id)')
      .eq('org_id', o.orgId).eq('status', 'pending').order('work_date', { ascending: false }).limit(20) : null),
    safe(want('payable') ? br(db.from('purchases').select('id,name,supplier,total_amount,due_date,created_at,invoice_group,branch_id')
      .eq('org_id', o.orgId).eq('payment_status', 'unpaid').is('deleted_at', null)
      .gte('due_date', addDays(today, -30)).lte('due_date', addDays(today, 7))).order('due_date', { ascending: true }).limit(60) : null),
    want('stock') ? stockDue(db, o.orgId, o.branchId).then(data => ({ data }), () => ({ data: null })) : Promise.resolve({ data: null }),
  ])

  const names = new Map(((branches.data || []) as any[]).map(b => [b.id, b.name]))
  const x: BuildCtx = { today, nowMs, cur: currencySymbol((org.data as any)?.currency), branchName: id => (names.size > 1 && id ? names.get(id) || null : null) }
  const rows = (r: any) => (r?.data || []) as any[]

  const groups = new Map<string, any[]>()
  for (const p of rows(pay)) { const k = p.invoice_group || p.id; groups.set(k, [...(groups.get(k) || []), p]) }
  const stockItems = rows(stk)

  const out: Decision[] = [
    ...rows(def).map(c => deficitDecision(c, x)),
    ...rows(exc).map(r => excuseDecision(r, x)),
    ...rows(lev).filter(r => inBranch(r.staff_members?.branch_id)).map(r => leaveDecision(r, x)),
    ...rows(adv).filter(r => inBranch(r.staff_members?.branch_id)).map(r => advanceDecision(r, x)),
    ...rows(ext).filter(r => inBranch(r.staff_members?.branch_id)).map(r => extraDayDecision(r, x)),
    ...[...groups.values()].slice(0, 15).map(g => payableDecision(g, x)),
    ...(stockItems.length ? [stockDecision(stockItems, o.branchId || 'all')] : []),
  ]
  // العجز الجديد قبل القديم، وكل نوع بترتيبه
  return out.sort((a, b) => DECISION_ORDER.indexOf(a.kind) - DECISION_ORDER.indexOf(b.kind) || Number(!!a.old) - Number(!!b.old))
}
