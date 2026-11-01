// بيانات المساعد الذكي — كل قسم مربوط بميزته (lib/planFeatures) وبصلاحية مدير الفرع (lib/managerPerms):
// الاشتراك والباقة: دايماً | المخزون والمشتريات والتوقعات: الذكاء الاصطناعي | الموظفين والدوام والحضور: إدارة الموظفين
// إقفالات الكاشير: إقفال الكاشير | الربحية: الربحية. القسم المقفل ما ينرسل للنموذج أصلاً.
import type { SupabaseClient } from '@supabase/supabase-js'
import { orgFeatures, FEATURE_LABEL, type Features } from '@/lib/planFeatures'
import { managerMay } from '@/lib/managerPerms'
import { billLines, planLabel, planKeyOf, activeDiscount, staffBase, supplierBase, PLAN_CAPS, PLAN_PRICING } from '@/lib/planPricing'
import { getBranchLimit } from '@/lib/branchLimit'

type Access = { role?: string | null; permissions?: Record<string, unknown> | null }
const DAY = 864e5
const saudiDay = (d: Date | string) => new Date(new Date(d).getTime() + 3 * 3600e3).toISOString().slice(0, 10)
const saudiTime = (d: string) => new Date(new Date(d).getTime() + 3 * 3600e3).toISOString().slice(11, 16)
const n = (v: unknown) => Math.round((Number(v) || 0) * 100) / 100

export type AssistantContext = { prompt: string; sections: { key: string; label: string; on: boolean }[] }

export async function buildAssistantContext(db: SupabaseClient, orgId: string, branchId: string | null, access: Access): Promise<AssistantContext> {
  const { data: org } = await db.from('organizations')
    .select('name,plan,max_branches,max_staff,max_suppliers,billing_cycle,locked_plan_monthly,discount_type,discount_value,discount_note,discount_until,currency')
    .eq('id', orgId).single()
  const o = (org || {}) as any
  const features = await orgFeatures(db, orgId, o.plan || 'basic')
  const isManager = access.role === 'manager'

  // الأقسام المتاحة: الميزة مفعّلة + (للمدير) عنده صلاحيتها
  const allow = {
    data: features.ai && managerMay(access, 'ai_tools', 'inventory', 'reports'),
    hr: features.hr && managerMay(access, 'staff', 'attendance', 'hr'),
    salaries: features.hr && managerMay(access, 'hr'),
    cashier: features.cashier && managerMay(access, 'reports'),
    profit: features.profitability && managerMay(access, 'profitability'),
  }
  const sections = [
    { key: 'subscription', label: 'الاشتراك والباقة', on: !isManager },
    { key: 'data', label: 'المخزون والمشتريات والتوقعات', on: allow.data, feature: 'ai' as const },
    { key: 'hr', label: 'الموظفين والدوامات والحضور', on: allow.hr, feature: 'hr' as const },
    { key: 'cashier', label: 'إقفالات الكاشير', on: allow.cashier, feature: 'cashier' as const },
    { key: 'profit', label: 'الربحية', on: allow.profit, feature: 'profitability' as const },
  ]

  const parts: string[] = []
  if (!isManager) parts.push(await subscriptionSection(db, orgId, o, features))
  if (allow.data) parts.push(await inventorySection(db, orgId, branchId))
  if (allow.hr) parts.push(await hrSection(db, orgId, branchId, allow.salaries))
  if (allow.cashier) parts.push(await cashierSection(db, orgId, branchId))
  if (allow.profit) parts.push(await profitSection(db, orgId, branchId))

  const locked = sections.filter(s => !s.on && s.key !== 'subscription').map(s => {
    const f = (s as any).feature as keyof Features | undefined
    const why = f && !features[f] ? `يحتاج إضافة «${FEATURE_LABEL[f]}» (أو الباقة الشاملة)` : 'ما عندك صلاحيته — يفعّلها لك مالك المنشأة'
    return `• ${s.label}: ${why}`
  })

  const prompt = `أنت المساعد الذكي في نظام Storely لمنشأة «${o.name || ''}». تجاوب بالعربي (لهجة سعودية بسيطة)، مختصر وعملي، وبأرقام محددة من البيانات تحت فقط.

قواعد:
- لا تخمّن ولا تخترع أرقام. لو المعلومة مو موجودة في البيانات قل ذلك بوضوح.
- اليوم بتوقيت السعودية: ${saudiDay(new Date())}.
- الأقسام المقفلة تحت ما عندك بياناتها: لو سأل عنها، قل إنها تحتاج تفعيل وكيف (بدون أي أرقام).${isManager ? '\n- المستخدم مدير فرع: أسئلة الاشتراك والفواتير يجاوب عليها مالك المنشأة.' : ''}
${locked.length ? `\n═══ أقسام مقفلة ═══\n${locked.join('\n')}\n` : ''}
${parts.join('\n\n')}`
  return { prompt, sections: sections.map(({ key, label, on }) => ({ key, label, on })) }
}

/** الباقة والاشتراك والإضافات والفاتورة — للمالك دايماً */
async function subscriptionSection(db: SupabaseClient, orgId: string, o: any, features: Features) {
  const [{ data: owner }, { data: addons }, { data: subs }, limit, { count: staffCount }, { count: supCount }] = await Promise.all([
    db.from('profiles').select('subscription_type,subscription_ends_at').eq('org_id', orgId).eq('role', 'owner').maybeSingle(),
    db.from('marketplace_addons').select('id,name,slug,monthly_price,is_active'),
    db.from('org_addon_subscriptions').select('addon_id,status,expires_at,quantity,locked_price').eq('org_id', orgId).eq('status', 'active'),
    getBranchLimit(db, orgId),
    db.from('staff_members').select('id', { count: 'exact', head: true }).eq('org_id', orgId).eq('is_active', true),
    db.from('suppliers').select('id', { count: 'exact', head: true }).eq('org_id', orgId).eq('is_active', true),
  ])
  const now = Date.now()
  const rows = ((addons || []) as any[]).map(a => ({ ...a, subscriptions: ((subs || []) as any[]).filter(s => s.addon_id === a.id).map(s => ({ ...s, isValid: new Date(s.expires_at).getTime() > now })) }))
  const plan = planKeyOf(o.plan, o.max_branches)
  const cycle = o.billing_cycle === 'yearly' ? 'yearly' : 'monthly'
  const bill = billLines(plan, cycle, rows, o.locked_plan_monthly, o)
  const ow = (owner || {}) as any
  const ends = ow.subscription_ends_at ? new Date(ow.subscription_ends_at) : null
  const daysLeft = ends ? Math.ceil((ends.getTime() - now) / DAY) : null
  const extraStaff = rows.filter(a => a.slug === 'extra_staff').flatMap(a => a.subscriptions).filter((s: any) => s.isValid).reduce((t: number, s: any) => t + (Number(s.quantity) || 0), 0)
  const extraSup = rows.filter(a => a.slug === 'extra_suppliers').flatMap(a => a.subscriptions).filter((s: any) => s.isValid).reduce((t: number, s: any) => t + (Number(s.quantity) || 0), 0)
  const active = rows.filter(a => a.subscriptions.some((s: any) => s.isValid)).map(a => {
    const s = a.subscriptions.find((x: any) => x.isValid)
    return `${a.name}${Number(s.quantity) > 1 ? ` × ${s.quantity}` : ''} (لين ${saudiDay(s.expires_at)})`
  })
  const forSale = rows.filter(a => a.is_active).map(a => `${a.name} ${n(a.monthly_price)} ريال`)
  const disc = activeDiscount(o)
  return `═══ الاشتراك والباقة ═══
الباقة: ${planLabel(o.plan, o.max_branches)} (${cycle === 'yearly' ? 'سنوي' : 'شهري'})
نوع الاشتراك: ${ow.subscription_type === 'trial' ? 'تجربة مجانية (كل المميزات مفتوحة طول التجربة)' : 'مدفوع'}
ينتهي: ${ends ? `${saudiDay(ends)} (${daysLeft! >= 0 ? `باقي ${daysLeft} يوم` : `منتهي من ${-daysLeft!} يوم`})` : 'غير محدد'}
الفروع: ${limit.total} مسموح (${limit.base} من الباقة + ${limit.extra} إضافي)
الموظفين النشطين: ${staffCount || 0} من ${staffBase(o.plan, o.max_staff, limit.extra) + extraStaff}
الموردين النشطين: ${supCount || 0} من ${supplierBase(o.plan, o.max_suppliers, limit.extra) + extraSup}
الإضافات المفعّلة: ${active.length ? active.join('، ') : 'لا يوجد'}
الميزات المفتوحة: ${(Object.keys(features) as (keyof Features)[]).filter(k => features[k]).map(k => FEATURE_LABEL[k]).join('، ') || 'الأساسية فقط'}
${disc ? `خصم خاص: ${disc.type === 'percent' ? `${disc.value}%` : `${disc.value} ريال شهرياً`}${disc.note ? ` (${disc.note})` : ''}${disc.until ? ` لين ${disc.until}` : ''}\n` : ''}الفاتورة ${cycle === 'yearly' ? 'السنوية' : 'الشهرية'}:
${bill.lines.map(l => `• ${l.label}: ${l.amount} ريال`).join('\n')}
• الإجمالي: ${bill.total} ريال

الباقات المتاحة:
• الأساسية ${PLAN_PRICING.basic.monthly} ريال: فرع واحد (يوصل ${PLAN_CAPS.basic.maxBranches})، ${PLAN_CAPS.basic.staff} موظفين، ${PLAN_CAPS.basic.suppliers} موردين، والمميزات بالإضافات
• الشاملة ${PLAN_PRICING.pro.monthly} ريال: كل المميزات، ${PLAN_CAPS.pro.branches} فروع (يوصل ${PLAN_CAPS.pro.maxBranches})، ${PLAN_CAPS.pro.staff} موظف، ${PLAN_CAPS.pro.suppliers} مورد
• المتقدمة ${PLAN_PRICING.advanced.monthly} ريال: كل المميزات، ${PLAN_CAPS.advanced.branches} فروع (يوصل ${PLAN_CAPS.advanced.maxBranches})، ${PLAN_CAPS.advanced.staff} موظف، ${PLAN_CAPS.advanced.suppliers} مورد
• المؤسسات: أكثر من ${PLAN_CAPS.advanced.maxBranches} فروع بسعر خاص (تواصل معنا)
• الدفع السنوي بخصم 20%
الإضافات للأساسية: ${forSale.join('، ')}
الترقية: من الإعدادات ← الاشتراك ← «اطلب الترقية». الإضافات: من صفحة الإضافات. فرع إضافي: من صفحة الفروع.`
}

/** المخزون والصرف والمشتريات والتوقعات — ميزة الذكاء الاصطناعي */
async function inventorySection(db: SupabaseClient, orgId: string, branchId: string | null) {
  let pq = db.from('products').select('id,name,qty,reorder_point,unit,category').eq('org_id', orgId).eq('is_active', true)
  if (branchId) pq = pq.eq('branch_id', branchId)
  const since90 = new Date(Date.now() - 90 * DAY).toISOString()
  let mq = db.from('stock_movements').select('qty_change,created_at,products!inner(id,org_id,branch_id)').eq('products.org_id', orgId).eq('type', 'out').gte('created_at', since90)
  if (branchId) mq = mq.eq('products.branch_id', branchId)
  let buyQ = db.from('purchases').select('amount,created_at,supplier').eq('org_id', orgId).is('deleted_at', null).gte('created_at', since90)
  if (branchId) buyQ = buyQ.eq('branch_id', branchId)
  const [{ data: products }, { data: moves }, { data: buys }] = await Promise.all([pq.order('name').limit(200), mq.limit(2000), buyQ.limit(300)])

  const out = new Map<string, number>()
  for (const m of (moves || []) as any[]) out.set(m.products.id, (out.get(m.products.id) || 0) + Math.abs(Number(m.qty_change) || 0))
  const prods = ((products || []) as any[]).map(p => {
    const total = out.get(p.id) || 0, daily = total / 90
    return { ...p, total, daily, daysLeft: daily > 0 ? Math.round(Number(p.qty) / daily) : null }
  })
  const low = prods.filter(p => Number(p.qty) <= Number(p.reorder_point))
  const soon = prods.filter(p => p.daysLeft != null && p.daysLeft <= 7).sort((a, b) => a.daysLeft! - b.daysLeft!)
  const top = [...prods].sort((a, b) => b.total - a.total).slice(0, 15).filter(p => p.total > 0)
  const idle = prods.filter(p => Number(p.qty) > 0 && !p.total).slice(0, 10)
  const monthStart = saudiDay(new Date()).slice(0, 7)
  const spent = ((buys || []) as any[]).reduce((t, b) => t + Number(b.amount || 0), 0)
  const spentMonth = ((buys || []) as any[]).filter(b => saudiDay(b.created_at).startsWith(monthStart)).reduce((t, b) => t + Number(b.amount || 0), 0)
  const bySupplier = new Map<string, number>()
  for (const b of (buys || []) as any[]) if (b.supplier) bySupplier.set(b.supplier, (bySupplier.get(b.supplier) || 0) + Number(b.amount || 0))

  return `═══ المخزون (${prods.length} صنف) ═══
${prods.map(p => `• ${p.name}: ${n(p.qty)} ${p.unit} (حد الطلب ${n(p.reorder_point)}) | صرف يومي ${n(p.daily)}${p.daysLeft != null ? ` | يخلص خلال ${p.daysLeft} يوم` : ''}`).join('\n')}

═══ التوقعات ═══
ناقصة الحين (تحت حد الطلب): ${low.length ? low.map(p => p.name).join('، ') : 'لا يوجد'}
تخلص خلال أسبوع: ${soon.length ? soon.map(p => `${p.name} (${p.daysLeft} يوم)`).join('، ') : 'لا يوجد'}
الأكثر صرفاً (90 يوم): ${top.map(p => `${p.name} ${n(p.total)} ${p.unit}`).join('، ') || 'لا يوجد'}
ما انصرف منها شي (90 يوم): ${idle.length ? idle.map(p => `${p.name} (${n(p.qty)} ${p.unit})`).join('، ') : 'لا يوجد'}

═══ المشتريات ═══
آخر 90 يوم: ${n(spent)} ريال (${(buys || []).length} فاتورة) | هالشهر: ${n(spentMonth)} ريال
حسب المورد (90 يوم): ${[...bySupplier.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([s, v]) => `${s} ${n(v)}`).join('، ') || 'لا يوجد'}`
}

/** الموظفين والدوامات والحضور — ميزة إدارة الموظفين (الرواتب لمن عنده صلاحيتها) */
async function hrSection(db: SupabaseClient, orgId: string, branchId: string | null, withSalaries: boolean) {
  let sq = db.from('staff_members').select('id,name,role,branch_id,shift_id,monthly_salary,weekly_off_days,is_active').eq('org_id', orgId).eq('is_active', true)
  if (branchId) sq = sq.eq('branch_id', branchId)
  let shQ = db.from('shifts').select('id,name,start_time,end_time,is_24h,branch_id').eq('org_id', orgId)
  if (branchId) shQ = shQ.eq('branch_id', branchId)
  const since30 = new Date(Date.now() - 30 * DAY).toISOString()
  let aq = db.from('staff_attendance').select('staff_id,type,recorded_at,late_minutes,overtime_minutes').eq('org_id', orgId).gte('recorded_at', since30)
  if (branchId) aq = aq.eq('branch_id', branchId)
  const [{ data: staff }, { data: shifts }, { data: att }, { data: branches }] = await Promise.all([
    sq.order('name'), shQ, aq.order('recorded_at').limit(5000), db.from('branches').select('id,name').eq('org_id', orgId),
  ])
  const shiftName = new Map(((shifts || []) as any[]).map(s => [s.id, `${s.name} ${s.is_24h ? '24 ساعة' : `${String(s.start_time).slice(0, 5)}-${String(s.end_time).slice(0, 5)}`}`]))
  const branchName = new Map(((branches || []) as any[]).map(b => [b.id, b.name]))
  const today = saudiDay(new Date())
  const DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']

  const lines = ((staff || []) as any[]).map(s => {
    const mine = ((att || []) as any[]).filter(a => a.staff_id === s.id)
    const ins = mine.filter(a => a.type === 'check_in')
    const days = new Set(ins.map(a => saudiDay(a.recorded_at))).size
    const late = ins.filter(a => Number(a.late_minutes) > 0)
    const lateMin = late.reduce((t, a) => t + Number(a.late_minutes || 0), 0)
    const todayIn = ins.find(a => saudiDay(a.recorded_at) === today)
    const todayOut = mine.filter(a => a.type === 'check_out' && saudiDay(a.recorded_at) === today).pop()
    const offs = Array.isArray(s.weekly_off_days) ? s.weekly_off_days.map((d: any) => DAYS[Number(d)]).filter(Boolean).join(' و') : ''
    const todayTxt = todayIn ? `حضر ${saudiTime(todayIn.recorded_at)}${Number(todayIn.late_minutes) > 0 ? ` (متأخر ${todayIn.late_minutes} دقيقة)` : ''}${todayOut ? ` وانصرف ${saudiTime(todayOut.recorded_at)}` : ' وما انصرف'}` : 'ما سجّل حضور'
    return `• ${s.name} (${s.role === 'cashier' ? 'كاشير' : 'موظف'}${branchId ? '' : ` — ${branchName.get(s.branch_id) || 'بدون فرع'}`}): الدوام ${shiftName.get(s.shift_id) || 'بدون شفت'}${offs ? ` | إجازته ${offs}` : ''}${withSalaries && Number(s.monthly_salary) > 0 ? ` | الراتب ${n(s.monthly_salary)}` : ''} | اليوم: ${todayTxt} | آخر 30 يوم: حضر ${days} يوم، تأخر ${late.length} مرة (${lateMin} دقيقة)`
  })
  return `═══ الموظفين والدوامات والحضور (${(staff || []).length} موظف نشط) ═══
الشفتات: ${[...shiftName.values()].join('، ') || 'لا يوجد'}
${lines.join('\n') || 'ما فيه موظفين'}`
}

/** إقفالات الكاشير — ميزة إقفال الكاشير */
async function cashierSection(db: SupabaseClient, orgId: string, branchId: string | null) {
  const since = saudiDay(new Date(Date.now() - 30 * DAY))
  let q = db.from('cashier_closings').select('closing_date,branch_id,staff_name,total_sales,cash_amount,network_amount,difference,status').eq('org_id', orgId).gte('closing_date', since)
  if (branchId) q = q.eq('branch_id', branchId)
  const [{ data: rows }, { data: branches }] = await Promise.all([q.order('closing_date', { ascending: false }).limit(60), db.from('branches').select('id,name').eq('org_id', orgId)])
  const bn = new Map(((branches || []) as any[]).map(b => [b.id, b.name]))
  const list = (rows || []) as any[]
  const month = saudiDay(new Date()).slice(0, 7)
  const thisMonth = list.filter(r => String(r.closing_date).startsWith(month))
  const sales = thisMonth.reduce((t, r) => t + Number(r.total_sales || 0), 0)
  const diff = thisMonth.reduce((t, r) => t + Number(r.difference || 0), 0)
  return `═══ إقفالات الكاشير (آخر 30 يوم) ═══
هالشهر: ${thisMonth.length} إقفال | المبيعات ${n(sales)} ريال | مجموع الفروقات ${n(diff)} ريال (السالب = عجز)
${list.slice(0, 30).map(r => `• ${r.closing_date}${branchId ? '' : ` ${bn.get(r.branch_id) || ''}`} — ${r.staff_name || ''}: مبيعات ${n(r.total_sales)} | كاش ${n(r.cash_amount)} | شبكة ${n(r.network_amount)} | الفرق ${n(r.difference)}`).join('\n') || 'ما فيه إقفالات'}`
}

/** الربحية — الشهور المقفلة */
async function profitSection(db: SupabaseClient, orgId: string, branchId: string | null) {
  let q = db.from('profitability_closings').select('month,branch_id,total_in,total_purchases,fixed_expenses_total,salary_expense_total,total_out,net_profit').eq('org_id', orgId)
  if (branchId) q = q.eq('branch_id', branchId)
  const { data } = await q.order('month', { ascending: false }).limit(6)
  return `═══ الربحية (الشهور المقفلة) ═══
${((data || []) as any[]).map(r => `• ${String(r.month).slice(0, 7)}: الدخل ${n(r.total_in)} | المشتريات ${n(r.total_purchases)} | المصاريف الثابتة ${n(r.fixed_expenses_total)} | الرواتب ${n(r.salary_expense_total)} | المصروف الكلي ${n(r.total_out)} | صافي الربح ${n(r.net_profit)}`).join('\n') || 'ما فيه شهور مقفلة — الشهر الحالي يتقفل من صفحة الربحية'}`
}
