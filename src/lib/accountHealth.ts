// صحة حسابات العملاء (للأدمن) — مثل Customer Health Score في شركات الاشتراكات:
// مين يستخدم النظام فعلاً، ومين شغله ماشي، ومين يحتاج متابعة قبل ما يلغي (خامل، إقفالات ناقصة، واتساب فاشل، يدفع على إضافة وما يستخدمها).
// assessHealth دالة صافية (تنختبر)، و loadAccountHealth تجمع الإشارات من الجداول الموجودة — قراءة بس، بدون تعديل قاعدة البيانات.
import type { SupabaseClient } from '@supabase/supabase-js'
import { FEATURE_ADDONS, FEATURE_LABEL, featuresFrom, type Feature, type Features } from '@/lib/planFeatures'
import { planLabel } from '@/lib/planPricing'

const DAY = 86400e3
const saudiDay = (ms: number) => new Date(ms + 3 * 3600e3).toISOString().slice(0, 10)
const FEATURES = Object.keys(FEATURE_ADDONS) as Feature[]

export type HealthStatus = 'active' | 'attention' | 'dormant' | 'expired'
export type HealthReason = { tone: 'danger' | 'warning'; text: string }
export type OrgSignals = {
  now: number
  createdAt: string | null
  subscriptionType: string | null
  endsAt: string | null
  lastLogin: string | null
  ops7: number                  // حركات المخزون + فواتير المشتريات آخر 7 أيام
  lastOp: string | null
  products: number
  staff: number
  closingDays7: number          // أيام فيها إقفال كاشير من آخر 7 أيام (قبل اليوم)
  attendance7: number           // تسجيلات حضور آخر 7 أيام
  waSent7: number
  waFailed7: number
  usage30: Record<Feature, number>   // استخدام كل ميزة آخر 30 يوم (الربحية 60)
  paidAddons: Feature[]         // ميزات مفتوحة بإضافة مدفوعة (مو من الباقة ولا التجربة)
  features: Features
  stuckCodeAt?: string | null   // طلب رمز دخول (جهاز جديد) وما أدخله — غالباً علق في الدخول
}

const daysSince = (now: number, d: string | null) => d ? Math.floor((now - new Date(d).getTime()) / DAY) : null
const ago = (n: number) => n <= 0 ? 'اليوم' : n === 1 ? 'أمس' : n === 2 ? 'قبل يومين' : n <= 10 ? `قبل ${n} أيام` : `قبل ${n} يوم`

export function assessHealth(s: OrgSignals): { status: HealthStatus; reasons: HealthReason[]; unusedPaid: Feature[]; unusedIncluded: Feature[] } {
  const reasons: HealthReason[] = []
  const unusedPaid = s.paidAddons.filter(f => !s.usage30[f])
  const unusedIncluded = FEATURES.filter(f => s.features[f] && !s.paidAddons.includes(f) && !s.usage30[f])
  const age = daysSince(s.now, s.createdAt) ?? 0
  const left = s.endsAt ? Math.ceil((new Date(s.endsAt).getTime() - s.now) / DAY) : null

  if (left !== null && left < 0) {
    reasons.push({ tone: 'danger', text: `الاشتراك منتهي من ${-left} يوم` })
    return { status: 'expired', reasons, unusedPaid, unusedIncluded }
  }
  if (s.stuckCodeAt) {
    const h = Math.floor((s.now - new Date(s.stuckCodeAt).getTime()) / 3600e3)
    const when = h < 1 ? 'قبل أقل من ساعة' : h < 24 ? `قبل ${h} ${h === 1 ? 'ساعة' : h === 2 ? 'ساعتين' : h <= 10 ? 'ساعات' : 'ساعة'}` : ago(Math.floor(h / 24))
    reasons.push({ tone: 'warning', text: `طلب رمز دخول ${when} وما أدخله — يمكن علق في الدخول، أرسل له «رمز دخول مؤقت» من ملفه` })
  }
  const login = daysSince(s.now, s.lastLogin), op = daysSince(s.now, s.lastOp)
  const dormant = s.ops7 === 0 && (login === null || login >= 7) && age >= 3
  if (dormant) reasons.push({ tone: 'danger', text: login === null ? 'ما دخل النظام أبداً' : `ما دخل من ${login} يوم، وما فيه أي عملية هالأسبوع` })
  else if (s.ops7 === 0 && age >= 3) reasons.push({ tone: 'warning', text: `يدخل بس ما سجّل أي عملية هالأسبوع${op !== null ? ` (آخر عملية ${ago(op)})` : ''}` })
  else if (login !== null && login >= 4) reasons.push({ tone: 'warning', text: `آخر دخول ${ago(login)}` })
  if (s.products === 0 && age >= 2) reasons.push({ tone: 'warning', text: 'ما أضاف أصناف للمخزون' })
  // الإقفال: نحاسبه بس لو الميزة عنده ويستخدمها أو يدفع عليها
  if (s.features.cashier && (s.usage30.cashier > 0 || s.paidAddons.includes('cashier')) && s.closingDays7 < 5)
    reasons.push({ tone: s.closingDays7 <= 2 ? 'danger' : 'warning', text: s.closingDays7 === 0 ? 'ما سجّل أي إقفال كاشير هالأسبوع' : `إقفال الكاشير: ${s.closingDays7} ${s.closingDays7 === 1 ? 'يوم' : 'أيام'} بس من آخر 7` })
  if (s.features.hr && s.usage30.hr > 0 && s.attendance7 === 0 && s.staff > 0) reasons.push({ tone: 'warning', text: 'تسجيل الحضور توقف هالأسبوع' })
  if (s.waFailed7 >= 2 && s.waFailed7 >= s.waSent7 * .2) reasons.push({ tone: 'warning', text: `${s.waFailed7} رسائل واتساب فشلت هالأسبوع (يمكن الرقم أو الموافقة)` })
  for (const f of unusedPaid) reasons.push({ tone: 'danger', text: `يدفع على «${FEATURE_LABEL[f]}» وما استخدمها هالشهر` })
  if (left !== null && s.subscriptionType === 'trial' && left <= 3) reasons.push({ tone: 'warning', text: `التجربة تنتهي ${left <= 0 ? 'اليوم' : `بعد ${left} ${left === 1 ? 'يوم' : 'أيام'}`}` })
  else if (left !== null && s.subscriptionType === 'paid' && left <= 7) reasons.push({ tone: 'warning', text: `الاشتراك ينتهي ${left <= 0 ? 'اليوم' : `بعد ${left} ${left === 1 ? 'يوم' : 'أيام'}`}` })

  const status: HealthStatus = dormant ? 'dormant' : reasons.length ? 'attention' : 'active'
  return { status, reasons, unusedPaid, unusedIncluded }
}

// ---------- علق في رمز الدخول ----------
type CodeRow = { user_id: string; created_at: string; used_at: string | null }
type DeviceRow = { user_id: string; created_at: string; last_seen_at?: string | null }
const STUCK_AFTER_MS = 30 * 60e3, STUCK_WINDOW_MS = 3 * DAY

/** آخر رمز دخول طلبه أحد المستخدمين وما أدخله (أقدم من 30 دقيقة، آخر 3 أيام) وما وثّق جهاز بعده — يرجع وقته أو null */
export function stuckCodeAt(codes: CodeRow[], devices: DeviceRow[], userIds: string[], now: number): string | null {
  let out: string | null = null
  for (const uid of userIds) {
    const latest = codes.filter(c => c.user_id === uid && now - new Date(c.created_at).getTime() <= STUCK_WINDOW_MS)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))[0]
    if (!latest || latest.used_at || now - new Date(latest.created_at).getTime() < STUCK_AFTER_MS) continue
    // وثّق جهاز بعده، أو دخل من جهاز موثّق من قبل → مو عالق
    if (devices.some(d => d.user_id === uid && (d.created_at > latest.created_at || (d.last_seen_at || '') > latest.created_at))) continue
    if (!out || latest.created_at > out) out = latest.created_at
  }
  return out
}

async function recentCodes(db: SupabaseClient, userIds: string[], now: number): Promise<{ codes: CodeRow[]; devices: DeviceRow[] }> {
  if (!userIds.length) return { codes: [], devices: [] }
  const since = new Date(now - STUCK_WINDOW_MS).toISOString()
  const [{ data: codes }, { data: devices }] = await Promise.all([
    db.from('login_codes').select('user_id,created_at,used_at').in('user_id', userIds).gte('created_at', since).limit(5000),
    db.from('trusted_devices').select('user_id,created_at,last_seen_at').in('user_id', userIds).is('revoked_at', null).or(`created_at.gte.${since},last_seen_at.gte.${since}`).limit(5000),
  ])
  return { codes: (codes || []) as CodeRow[], devices: (devices || []) as DeviceRow[] }
}

// ---------- جمع الإشارات ----------
export type AccountHealthRow = {
  org_id: string; org_name: string; owner_id: string; owner_name: string | null; phone: string | null
  plan: string; plan_label: string; subscription_type: string | null; ends_at: string | null; profile_status: string | null
  status: HealthStatus; reasons: HealthReason[]; unused_paid: string[]; unused_included: string[]
  last_login: string | null; last_op: string | null; ops7: number; products: number; staff: number
  closing_days7: number | null; attendance7: number | null; wa_sent7: number; wa_failed7: number
  stuck_code_at: string | null
}

async function count(q: any): Promise<number> { const { count: c } = await q; return c || 0 }
async function latest(q: any): Promise<string | null> { const { data } = await q.order('created_at', { ascending: false }).limit(1); return (data as any)?.[0]?.created_at || null }

async function signalsFor(db: SupabaseClient, orgId: string, now: number) {
  const s7 = new Date(now - 7 * DAY).toISOString(), s30 = new Date(now - 30 * DAY).toISOString(), s60 = new Date(now - 60 * DAY).toISOString()
  const head = (t: string) => db.from(t).select('id', { count: 'exact', head: true }).eq('org_id', orgId)
  const today = saudiDay(now), from7 = saudiDay(now - 7 * DAY)
  const [mov7, pur7, lastMov, lastPur, products, staff, closings, closings30, att7, att30, wa, assistant30, drafts30, profitClose, delivery, monthly] = await Promise.all([
    count(head('stock_movements').gte('created_at', s7)),
    count(head('purchases').is('deleted_at', null).gte('created_at', s7)),
    latest(db.from('stock_movements').select('created_at').eq('org_id', orgId)),
    latest(db.from('purchases').select('created_at').eq('org_id', orgId).is('deleted_at', null)),
    count(head('products').eq('is_active', true)),
    count(head('staff_members').eq('is_active', true)),
    db.from('cashier_closings').select('closing_date').eq('org_id', orgId).gte('closing_date', from7).lt('closing_date', today).limit(500),
    count(head('cashier_closings').gte('created_at', s30)),
    count(head('staff_attendance').eq('type', 'check_in').gte('recorded_at', s7)),
    count(head('staff_attendance').eq('type', 'check_in').gte('recorded_at', s30)),
    db.from('notification_logs').select('status').eq('org_id', orgId).gte('created_at', s7).limit(1000),
    count(head('assistant_questions').gte('created_at', s30)),
    count(head('invoice_drafts').gte('created_at', s30)),
    count(head('profitability_closings').gte('closed_at', s60)),
    count(head('delivery_income').gte('created_at', s60)),
    count(head('monthly_fixed_expenses').gte('created_at', s60)),
  ])
  const waRows = ((wa as any).data || []) as { status: string }[]
  return {
    ops7: mov7 + pur7,
    lastOp: [lastMov, lastPur].filter(Boolean).sort().at(-1) || null,
    products, staff,
    closingDays7: new Set((((closings as any).data || []) as any[]).map(c => c.closing_date)).size,
    attendance7: att7,
    waSent7: waRows.filter(r => r.status === 'sent').length,
    waFailed7: waRows.filter(r => r.status !== 'sent').length,
    usage30: { cashier: closings30, hr: att30, ai: assistant30 + drafts30, profitability: profitClose + delivery + monthly } as Record<Feature, number>,
  }
}

async function buildRow(db: SupabaseClient, o: any, owner: any, slugs: string[], lastLogin: string | null, now: number, stuck: string | null = null): Promise<AccountHealthRow> {
  const trial = owner.subscription_type === 'trial' && !!owner.subscription_ends_at && new Date(owner.subscription_ends_at).getTime() > now
  const features = featuresFrom(o.plan, slugs, trial)
  const planOnly = featuresFrom(o.plan, [], false)
  const paidAddons = FEATURES.filter(f => !trial && !planOnly[f] && FEATURE_ADDONS[f].some(sl => slugs.includes(sl)))
  const sig = await signalsFor(db, o.id, now)
  const s: OrgSignals = { now, createdAt: o.created_at, subscriptionType: owner.subscription_type, endsAt: owner.subscription_ends_at, lastLogin, ...sig, paidAddons, features, stuckCodeAt: stuck }
  const h = assessHealth(s)
  return {
    org_id: o.id, org_name: o.name || '—', owner_id: owner.id, owner_name: owner.full_name, phone: owner.phone,
    plan: o.plan || 'basic', plan_label: planLabel(o.plan, o.max_branches), subscription_type: owner.subscription_type, ends_at: owner.subscription_ends_at, profile_status: owner.status,
    status: h.status, reasons: h.reasons, unused_paid: h.unusedPaid.map(f => FEATURE_LABEL[f]), unused_included: h.unusedIncluded.map(f => FEATURE_LABEL[f]),
    last_login: s.lastLogin, last_op: s.lastOp, ops7: s.ops7, products: s.products, staff: s.staff,
    closing_days7: features.cashier ? s.closingDays7 : null, attendance7: features.hr ? s.attendance7 : null, wa_sent7: s.waSent7, wa_failed7: s.waFailed7,
    stuck_code_at: stuck,
  }
}

/** صحة منشأة وحدة (لملف العميل بالأدمن) — نفس حساب صفحة «صحة الحسابات»، بدون المرور على كل الحسابات */
export async function loadOrgHealth(db: SupabaseClient, orgId: string, now = Date.now()): Promise<(AccountHealthRow & { branches: number; managers: number }) | null> {
  const [{ data: o }, { data: profiles }, { data: addonRows }, { count: branches }] = await Promise.all([
    db.from('organizations').select('id,name,plan,max_branches,created_at').eq('id', orgId).maybeSingle(),
    db.from('profiles').select('id,org_id,role,full_name,phone,status,subscription_type,subscription_ends_at').eq('org_id', orgId).in('role', ['owner', 'manager']),
    db.from('org_addon_subscriptions').select('org_id,status,expires_at,marketplace_addons!inner(slug)').eq('org_id', orgId).eq('status', 'active'),
    db.from('branches').select('id', { count: 'exact', head: true }).eq('org_id', orgId),
  ])
  const owner = ((profiles || []) as any[]).find(p => p.role === 'owner')
  if (!o || !owner) return null
  // آخر دخول: الأحدث بين المالك ومديري الفروع
  const logins = await Promise.all(((profiles || []) as any[]).map(async p => (await db.auth.admin.getUserById(p.id)).data?.user?.last_sign_in_at || null))
  const lastLogin = (logins.filter(Boolean) as string[]).sort().at(-1) || null
  const slugs = ((addonRows || []) as any[]).filter(a => !a.expires_at || new Date(a.expires_at).getTime() >= now).map(a => a.marketplace_addons.slug)
  const ids = ((profiles || []) as any[]).map(p => p.id)
  const rc = await recentCodes(db, ids, now)
  const row = await buildRow(db, o, owner, slugs, lastLogin, now, stuckCodeAt(rc.codes, rc.devices, ids, now))
  return { ...row, branches: branches || 0, managers: ((profiles || []) as any[]).filter(p => p.role === 'manager').length }
}

export async function loadAccountHealth(db: SupabaseClient, now = Date.now()): Promise<AccountHealthRow[]> {
  const [{ data: orgs }, { data: profiles }, { data: addonRows }] = await Promise.all([
    db.from('organizations').select('id,name,plan,max_branches,created_at'),
    db.from('profiles').select('id,org_id,role,full_name,phone,status,subscription_type,subscription_ends_at').in('role', ['owner', 'manager']),
    db.from('org_addon_subscriptions').select('org_id,status,expires_at,marketplace_addons!inner(slug)').eq('status', 'active'),
  ])
  // آخر دخول من حسابات الدخول (المالك والمديرين)
  const lastSignIn = new Map<string, string>()
  for (let page = 1; page <= 20; page++) {
    const { data } = await db.auth.admin.listUsers({ page, perPage: 1000 })
    const users = data?.users || []
    for (const u of users) if (u.last_sign_in_at) lastSignIn.set(u.id, u.last_sign_in_at)
    if (users.length < 1000) break
  }
  const owners = new Map<string, any>(), loginByOrg = new Map<string, string>(), usersByOrg = new Map<string, string[]>()
  for (const p of (profiles || []) as any[]) {
    if (!p.org_id) continue
    usersByOrg.set(p.org_id, [...(usersByOrg.get(p.org_id) || []), p.id])
    if (p.role === 'owner') owners.set(p.org_id, p)
    const l = lastSignIn.get(p.id)
    if (l && (!loginByOrg.get(p.org_id) || l > loginByOrg.get(p.org_id)!)) loginByOrg.set(p.org_id, l)
  }
  const addons = new Map<string, string[]>()
  for (const a of (addonRows || []) as any[]) {
    if (a.expires_at && new Date(a.expires_at).getTime() < now) continue
    addons.set(a.org_id, [...(addons.get(a.org_id) || []), a.marketplace_addons.slug])
  }
  // منشآت العملاء بس: لها مالك ومو محذوف، وبدون منشآت الاختبارات الآلية
  const list = ((orgs || []) as any[]).filter(o => owners.has(o.id) && owners.get(o.id).status !== 'deleted' && !String(o.name || '').startsWith('__it_'))
  const rc = await recentCodes(db, list.flatMap(o => usersByOrg.get(o.id) || []), now)
  const rows: AccountHealthRow[] = []
  for (let i = 0; i < list.length; i += 6) {   // 6 منشآت بالتوازي — ما نضغط القاعدة
    rows.push(...await Promise.all(list.slice(i, i + 6).map(o => buildRow(db, o, owners.get(o.id), addons.get(o.id) || [], loginByOrg.get(o.id) || null, now,
      stuckCodeAt(rc.codes, rc.devices, usersByOrg.get(o.id) || [], now)))))
  }
  const rank: Record<HealthStatus, number> = { dormant: 0, attention: 1, expired: 2, active: 3 }
  return rows.sort((a, b) => rank[a.status] - rank[b.status] || b.reasons.length - a.reasons.length || a.org_name.localeCompare(b.org_name, 'ar'))
}
