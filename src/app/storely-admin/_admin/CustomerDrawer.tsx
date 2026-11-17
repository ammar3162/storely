'use client'
import { useEffect, useState } from 'react'
import NumberInput from '@/components/NumberInput'
import { MessageCircle, Send, Trash2, PauseCircle, PlayCircle, KeyRound, BadgePercent, Eye } from 'lucide-react'
import { confirmDialog } from '@/components/ConfirmDialog'
import { toast } from '@/components/toast'
import { billLines, activeDiscount, PLAN_CAPS, ENTERPRISE_LABEL, addonPeriodEnd, proratedCharge, planPriceFor, unitPrice, isNewPlan, type PlanKey } from '@/lib/planPricing'
import { A, Badge, Btn, Card, Drawer, Tabs, adminFetch, daysLeft, fmtDate, inputStyle } from './kit'
import { type Customer, STATUS, PLAN_KEYS, PLAN_LIMITS, planLabel } from './customers'
import ActivityCard from './ActivityCard'
import { addMonths, offerItems as buildOfferItems, sendOffer, activateOffer, offerStart } from './offerFlow'
import { offerState, offerMonthsLabel } from '@/lib/offerQuote'
import { renewalEnd, resumeOutcome } from '@/lib/subscriptionLifecycle'
import CustomerEmailCard from './CustomerEmailCard'

const QTY_SLUGS = ['extra_staff', 'extra_suppliers', 'extra_branch']
const DURATIONS = [{ d: 7, l: '7 أيام' }, { d: 30, l: 'شهر' }, { d: 90, l: '3 أشهر' }, { d: 365, l: 'سنة' }]
// العرض الخاص: مدة بالأشهر وسعر يتفق عليه مع العميل (لمرة وحدة — التجديد القادم بعرض جديد أو بالسعر العادي)
const OFFER_MONTHS = [{ m: 1, l: 'شهر' }, { m: 3, l: '3 أشهر' }, { m: 6, l: '6 أشهر' }, { m: 12, l: 'سنة' }]
type TabKey = 'sub' | 'plan' | 'contact' | 'account'
const TABS: { k: TabKey; l: string }[] = [{ k: 'sub', l: 'الاشتراك والدفع' }, { k: 'plan', l: 'الباقة والإضافات' }, { k: 'contact', l: 'النشاط والتواصل' }, { k: 'account', l: 'الحساب' }]

export default function CustomerDrawer({ customer, onClose, onChanged }: {
  customer: Customer | null
  onClose: () => void
  /** بعد أي تعديل: patch = تحديث محلي، بدون patch = إعادة تحميل القائمة */
  onChanged: (patch?: Partial<Customer>) => void
}) {
  const [addons, setAddons] = useState<any[]>([])
  const [loadingAddons, setLoadingAddons] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [deviceCode, setDeviceCode] = useState<string | null>(null)
  const [days, setDays] = useState(30)
  const [qty, setQty] = useState<Record<string, number>>({})
  // فروع الإضافة (الباقات الجديدة: الكاشير والحضور لفروع معيّنة)
  const [pick, setPick] = useState<Record<string, string[]>>({})
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([])
  const [staffUsage, setStaffUsage] = useState<{ active: number; limit: number } | null>(null)
  const [ent, setEnt] = useState({ branches: '', staff: '', suppliers: '', price: '' })
  // الخصم الخاص: نسبة أو مبلغ شهري، وملاحظة، وتاريخ انتهاء اختياري
  const [disc, setDisc] = useState<{ type: 'percent' | 'amount'; value: string; note: string; until: string }>({ type: 'percent', value: '', note: '', until: '' })
  const [offer, setOffer] = useState<{ months: number; price: string; note: string }>({ months: 6, price: '', note: '' })
  const [tab, setTab] = useState<TabKey>('sub')
  const [offers, setOffers] = useState<any[]>([])

  const c = customer
  useEffect(() => {
    setAddons([]); setQty({}); setDays(30); setBranches([]); setTab('sub'); setOffer({ months: 6, price: '', note: '' })
    setOffers([])
    if (c?.org_id) { loadAddons(c.org_id); loadOffers(c.org_id) }
  }, [c?.org_id])

  async function loadAddons(orgId: string) {
    setLoadingAddons(true)
    const j = await adminFetch(`/api/admin/addon-subscriptions?org_id=${orgId}`)
    if (j.success) { setAddons(j.addons || []); setBranches(j.branches || []); setStaffUsage(j.staff_usage || null); setPick({}) }
    setLoadingAddons(false)
  }

  async function loadOffers(orgId: string) {
    const j = await adminFetch(`/api/admin/offers?org_id=${orgId}`)
    if (j.success) setOffers(j.offers || [])
  }

  if (!c) return null
  const st = STATUS[c.status] || STATUS.pending
  const dl = daysLeft(c.subscription_ends_at)
  const bill = billLines(c.plan, c.billing_cycle, addons, c.locked_plan_monthly, c.discount, c.max_branches, c.staff_included)
  const newPlan = isNewPlan(c.plan)
  // الجديدة: فروع الباقة الحالية (1–10) — القديمة تنتقل بنفس عدد فروعها
  const planBranches = Math.max(1, Math.min(10, c.max_branches || 1))
  const curDiscount = activeDiscount(c.discount)
  // معاينة التفعيل المدفوع للمدة المختارة — نفس قاعدة الخادم
  const paidPreview = renewalEnd({ type: c.subscription_type, endsAt: c.subscription_ends_at }, 'paid', { days })
  const resumeInfo = resumeOutcome({ type: c.subscription_type, endsAt: c.subscription_ends_at })
  const hasPhone = !!c.phone
  // السعر العادي للمدة = الفاتورة الشهرية الحالية × الأشهر (السنوي: فاتورته ÷ 12)
  const monthlyBill = c.billing_cycle === 'yearly' ? Math.round(bill.total / 12) : bill.total
  const listPrice = monthlyBill * offer.months
  const offerPrice = Number(offer.price) || 0
  const offerSaving = listPrice > 0 && offerPrice > 0 && offerPrice < listPrice ? Math.round((1 - offerPrice / listPrice) * 100) : 0
  // مشترك مدفوع ساري: المدة تبدأ من نهاية اشتراكه الحالي
  const offerFrom = offerStart({ type: c.subscription_type, ends: c.subscription_ends_at })
  const offerEnds = addMonths(offer.months, offerFrom)
  const offerLabel = OFFER_MONTHS.find(x => x.m === offer.months)?.l || `${offer.months} أشهر`
  const offerItems = buildOfferItems(offer.months, offerPrice, offer.note, 'manual', offerFrom)

  async function activate(type: 'trial' | 'paid', d: number) {
    const label = type === 'paid' ? 'تفعيل مدفوع' : 'تفعيل تجربة'
    // أول اشتراك مدفوع بعد التجربة (على الشاملة): ذكّر الأدمن يحوّله للباقة اللي اختارها — مكافأة السفير والفاتورة تنحسب على باقته الحالية
    const wanted = c!.requested_plan as PlanKey | undefined
    const planNote = type === 'paid' && c!.subscription_type === 'trial' && wanted && wanted !== c!.plan && (PLAN_KEYS as string[]).includes(wanted)
      ? `\n\nتنبيه: باقته الحالية «${planLabel(c!.plan)}» (التجربة)، والباقة التي اختارها عند التسجيل «${planLabel(wanted)}». غيّر الباقة أولاً إن كان سيشترك فيها، لأن الفاتورة ومكافأة السفير تُحتسبان على الباقة الحالية.`
      : ''
    const p = renewalEnd({ type: c!.subscription_type, endsAt: c!.subscription_ends_at }, type, { days: d })
    const fromEnd = p.start.getTime() > Date.now() + 60000
    const durLabel = DURATIONS.find(x => x.d === d)?.l || d + ' يوم'
    if (!(await confirmDialog({ title: label, message: `${label} لـ«${c!.org_name}» لمدة ${durLabel}.\n\nيبدأ: ${fromEnd ? `بعد نهاية اشتراكه الحالي (${fmtDate(p.start.toISOString())}) — ما يخسر أيامه المتبقية` : 'من اليوم'}\nينتهي: ${fmtDate(p.end.toISOString())}${c!.status === 'suspended' ? '\nويُستأنف الحساب الموقوف.' : ''}\n\nتتجدد الإضافات المفعّلة حتى التاريخ نفسه.${planNote}`, type: planNote ? 'warning' : undefined }))) return
    setBusy('activate')
    // الخادم يحسب التاريخ النهائي بنفس القاعدة (lib/subscriptionLifecycle)
    const j = await adminFetch('/api/admin/activate-user', { method: 'POST', body: { userId: c!.id, type, days: d } })
    if (!j.success) { setBusy(null); toast(j.error || 'تعذّر التفعيل', 'error'); return }
    const ends: string = j.ends
    await adminFetch('/api/notify-activation', { method: 'POST', body: { userId: c!.id, subscriptionType: type, subscriptionEndsAt: ends } })
    setBusy(null)
    toast(`تم التفعيل حتى ${fmtDate(ends)}`, 'success')
    onChanged({ status: 'active', subscription_type: type, subscription_ends_at: ends })
    loadAddons(c!.org_id)
  }

  async function suspend() {
    if (!(await confirmDialog({ title: 'إيقاف الحساب', message: `إيقاف «${c!.org_name}»؟\n\nيتوقف: دخول المالك ومديري الفروع والموظفين، وبوت واتساب، والرسائل والتقارير التلقائية، وتعديلات المحاسب.\n\nتاريخ انتهاء الاشتراك لا يتغيّر (${fmtDate(c!.subscription_ends_at)})، وتقدر تستأنفه لاحقاً لنفس التاريخ. الأيام التي يقضيها موقوفاً محسوبة من اشتراكه.` }))) return
    setBusy('suspend')
    const j = await adminFetch('/api/admin/suspend-user', { method: 'POST', body: { userId: c!.id } })
    setBusy(null)
    if (!j.success) { toast(j.error || 'تعذّر الإيقاف', 'error'); return }
    toast('تم إيقاف الحساب', 'success')
    onChanged({ status: 'suspended' })
  }

  // استئناف حساب موقوف: نفس الاشتراك السابق (نفس النوع ونفس تاريخ الانتهاء) — مو مدة جديدة
  async function resume() {
    const r = resumeOutcome({ type: c!.subscription_type, endsAt: c!.subscription_ends_at })
    const msg = r.expired
      ? `انتهى اشتراك «${c!.org_name}» أثناء الإيقاف (${fmtDate(r.endsAt)}).\n\nبعد الاستئناف يدخل على صفحة «انتهى الاشتراك» حتى تجدّد له من تبويب «الاشتراك والدفع».`
      : `يكمل «${c!.org_name}» اشتراكه نفسه حتى ${fmtDate(r.endsAt)} (متبقٍ ${r.daysLeft} يوم).\n\nيرجع دخول المالك والمديرين والموظفين وكل المزايا كما كانت.`
    if (!(await confirmDialog({ title: 'استئناف الاشتراك', message: msg, type: r.expired ? 'warning' : 'success', confirmText: 'استئناف' }))) return
    setBusy('resume')
    const j = await adminFetch('/api/admin/resume-user', { method: 'POST', body: { userId: c!.id } })
    if (!j.success) { setBusy(null); toast(j.error || 'تعذّر الاستئناف', 'error'); return }
    if (!j.expired && j.endsAt) await adminFetch('/api/notify-activation', { method: 'POST', body: { userId: c!.id, subscriptionType: j.type || c!.subscription_type, subscriptionEndsAt: j.endsAt } }).catch(() => null)
    setBusy(null)
    toast(j.expired ? 'استُؤنف الحساب — الاشتراك منتهٍ ويحتاج تجديد' : `استُؤنف حتى ${fmtDate(j.endsAt)}`, j.expired ? 'error' : 'success')
    onChanged({ status: 'active' })
  }

  // branchesOverride = تغيير عدد فروع الباقة الجديدة (نفس الباقة)
  async function changePlan(k: typeof PLAN_KEYS[number], branchesOverride?: number) {
    if (k === c!.plan && branchesOverride == null) return
    const lim = PLAN_LIMITS[k]
    // الجديدة: الحد لكل فرع × فروع الباقة — القديمة: حدود الباقة الثابتة
    const br = isNewPlan(k) ? Math.max(1, Math.min(10, branchesOverride ?? planBranches)) : lim.branches
    const staff = isNewPlan(k) ? lim.staff * br : lim.staff, sup = isNewPlan(k) ? lim.suppliers * br : lim.suppliers
    const price = planPriceFor(k, null, br)
    const msg = branchesOverride != null
      ? `تصبح فروع باقة «${planLabel(k)}» ${br}، والفاتورة ${price.monthly} ⃁ شهرياً (${staff} موظف، ${sup} مورد).`
      : `تغيير الباقة إلى «${planLabel(k)}»${k === 'custom' ? ` بـ ${br} ${br === 1 ? 'فرع' : 'فروع'}` : isNewPlan(k) ? ` بـ ${br} ${br === 1 ? 'فرع' : 'فروع'} (${price.monthly} ⃁ شهرياً)` : ''}؟${k === 'custom' ? '\n\nمهم: باقة «ابنِ باقتك» لا تتضمن أي مزايا حتى تفعّلها من الإضافات أدناه (المخزون، المشتريات، الكاشير…)، ودونها يُقفل عليه المخزون والمشتريات.' : ''}\n\nإن كانت فروعه أكثر من ${br} (إضافة إلى الفروع المشتراة)، تتوقف أحدث الفروع مؤقتاً مع موظفيها، وإن كان موظفوه أكثر من ${staff} (إضافة إلى الإضافات)، يتوقف أحدثهم مؤقتاً. تبقى البيانات كلها وتعود عند الترقية.${!isNewPlan(c!.plan) && isNewPlan(k) ? '\n\nالعميل على باقة قديمة: سيُلغى سعره المثبّت وينتقل إلى السعر الجديد.' : ''}`
    if (!(await confirmDialog({ title: branchesOverride != null ? 'فروع الباقة' : 'تغيير الباقة', message: msg }))) return
    setBusy('plan')
    const j = await adminFetch('/api/admin/update-plan', { method: 'POST', body: { orgId: c!.org_id, maxBranches: br, maxStaff: staff, maxSuppliers: sup, planName: k, orgName: c!.org_name, billingCycle: c!.billing_cycle } })
    setBusy(null)
    if (!j.success) { toast(j.error || 'تعذّر تغيير الباقة', 'error'); return }
    const notes = [j.locked && `توقف ${j.locked} فرع`, j.restored && `عاد ${j.restored} فرع`, j.staffLocked && `توقف ${j.staffLocked} موظف (الأحدث) لتجاوز الحد`, j.staffRestored && `عاد ${j.staffRestored} موظف`].filter(Boolean)
    toast(notes.length ? `تم التغيير: ${notes.join('، ')}` : 'تم تغيير الباقة', 'success')
    loadAddons(c!.org_id)
    onChanged({ plan: k, max_branches: br, ...(k !== c!.plan ? { locked_plan_monthly: null } : {}) })
  }

  async function changeCycle(cycle: 'monthly' | 'yearly') {
    if (cycle === c!.billing_cycle) return
    if (!(await confirmDialog({ title: 'تغيير دورة الدفع', message: `تحويل «${c!.org_name}» إلى الدفع ${cycle === 'yearly' ? 'السنوي (بخصم 20%)' : 'الشهري'}؟ ستُحتسب الفاتورة القادمة على الدورة الجديدة.`, type: 'warning', confirmText: 'تأكيد' }))) return
    setBusy('cycle')
    const j = await adminFetch('/api/admin/update-plan', { method: 'POST', body: { orgId: c!.org_id, maxBranches: c!.max_branches, planName: c!.plan, orgName: c!.org_name, billingCycle: cycle } })
    setBusy(null)
    if (!j.success) { toast(j.error || 'تعذّر التغيير', 'error'); return }
    onChanged({ billing_cycle: cycle })
  }

  // «ابنِ باقتك»: عدد الموظفين (يأثر على الفاتورة وحد الموظفين)
  async function setStaffIncluded(n: number) {
    if (!(await confirmDialog({ title: 'عدد الموظفين', message: `تغيير عدد موظفي «${c!.org_name}» إلى ${n}؟ ستُحدَّث الفاتورة، وإن كان موظفوه أكثر يتوقف أحدثهم مؤقتاً.`, type: 'warning', confirmText: 'تأكيد' }))) return
    setBusy('plan')
    const j = await adminFetch('/api/admin/update-plan', { method: 'POST', body: { orgId: c!.org_id, maxBranches: c!.max_branches, planName: c!.plan, orgName: c!.org_name, billingCycle: c!.billing_cycle, staffIncluded: n, maxStaff: n } })
    setBusy(null)
    if (!j.success) { toast(j.error || 'تعذّر الحفظ', 'error'); return }
    onChanged({ staff_included: n })
    loadAddons(c!.org_id)
  }

  // باقة المؤسسات: المتقدمة بحدود وسعر يتفق عليها مع العميل
  async function setEnterprise() {
    const br = Number(ent.branches), st = Number(ent.staff), su = Number(ent.suppliers), pr = Number(ent.price)
    if (!(br > PLAN_CAPS.advanced.maxBranches) || !(st > 0) || !(su > 0) || !(pr > 0)) { toast('أدخل عدد الفروع (أكثر من ' + PLAN_CAPS.advanced.maxBranches + ') والموظفين والموردين والسعر', 'error'); return }
    if (!(await confirmDialog({ title: 'باقة المؤسسات', message: `${br} فرع · ${st} موظف · ${su} مورد\nالسعر: ${pr} ⃁ شهرياً`, type: 'warning' }))) return
    setBusy('plan')
    const j = await adminFetch('/api/admin/update-plan', { method: 'POST', body: { orgId: c!.org_id, maxBranches: br, maxStaff: st, maxSuppliers: su, planName: 'advanced', orgName: c!.org_name, billingCycle: c!.billing_cycle, lockedMonthly: pr } })
    setBusy(null)
    if (!j.success) { toast(j.error || 'تعذّر التفعيل', 'error'); return }
    toast('تم تفعيل باقة المؤسسات', 'success')
    onChanged({ plan: 'advanced', max_branches: br, locked_plan_monthly: pr })
  }

  async function saveDiscount(remove = false) {
    const v = Number(disc.value)
    if (!remove && (!(v > 0) || (disc.type === 'percent' && v > 100))) { toast(disc.type === 'percent' ? 'النسبة بين 1 و 100' : 'أدخل مبلغ الخصم', 'error'); return }
    if (remove && !(await confirmDialog({ title: 'إلغاء الخصم', message: `إلغاء خصم «${c!.org_name}»؟ ستعود فاتورته القادمة دون خصم.`, type: 'warning' }))) return
    if (!remove && !(await confirmDialog({ title: 'حفظ الخصم', message: `خصم ${disc.type === 'percent' ? `${v}% من فاتورة` : `${v} ر.س شهرياً من فاتورة`} "${c!.org_name}"${disc.note ? ` (${disc.note})` : ''}${disc.until ? `\nحتى ${fmtDate(disc.until)}` : '\nبدون تاريخ انتهاء'}؟`, type: 'success', confirmText: 'تأكيد' }))) return
    setBusy('discount')
    const body = remove ? { orgId: c!.org_id, orgName: c!.org_name, type: null } : { orgId: c!.org_id, orgName: c!.org_name, type: disc.type, value: v, note: disc.note, until: disc.until || null }
    const j = await adminFetch('/api/admin/org-discount', { method: 'POST', body })
    setBusy(null)
    if (!j.success) { toast(j.error || 'تعذّر حفظ الخصم', 'error'); return }
    toast(remove ? 'أُلغي الخصم' : 'حُفظ الخصم، وسيظهر في فاتورته', 'success')
    onChanged({ discount: j.discount })
    if (!remove) setDisc({ type: 'percent', value: '', note: '', until: '' })
  }

  async function sendInvoice(items = bill.lines, title = 'إرسال الفاتورة', status: 'paid' | 'due' = 'paid', skipConfirm = false) {
    const total = items.reduce((s, it) => s + it.amount, 0)
    const lines = items.map(it => `${it.label}: ${it.amount} ر.س`).join('\n')
    if (!skipConfirm && !(await confirmDialog({ title, message: `${lines}\n\nالإجمالي: ${total} ر.س\nتُرسل عبر واتساب إلى ${c!.phone}، وإلى إيميل المالك`, type: 'success' }))) return false
    setBusy('invoice')
    const j = await adminFetch('/api/admin/send-invoice', { method: 'POST', body: { orgId: c!.org_id, orgName: c!.org_name, phone: c!.phone, items, status } })
    setBusy(null)
    toast(j.success ? `${status === 'due' ? 'أُرسل عرض السعر' : 'أُرسلت الفاتورة'} #${j.invoiceNumber}` : (j.error || 'تعذّر الإرسال'), j.success ? 'success' : 'error')
    return !!j.success
  }

  function offerValid() {
    if (!(offerPrice > 0)) { toast('اكتب السعر المتفق عليه', 'error'); return false }
    return true
  }

  // معاينة العرض بنفس شكل الـ PDF قبل الإرسال
  async function previewOffer() {
    if (!offerValid()) return
    const w = window.open('', '_blank')
    const j = await adminFetch('/api/admin/invoice-preview', { method: 'POST', body: { orgName: c!.org_name, items: offerItems, status: 'due' } })
    if (!j.success || !w) { w?.close(); toast(j.error || 'تعذّرت المعاينة', 'error'); return }
    w.document.open(); w.document.write(j.html); w.document.close()
  }

  // إرسال العرض فقط (مستحق الدفع) — بدون تفعيل، ويُحفظ في سجل العروض
  async function sendOfferNow() {
    if (!offerValid()) return
    const lines = offerItems.map(it => `${it.label}: ${it.amount} ر.س`).join('\n')
    if (!(await confirmDialog({ title: 'إرسال عرض السعر', type: 'success', message: `${lines}\n\nيُرسل عرض سعر مستحق الدفع، صالحاً 7 أيام، عبر واتساب إلى ${c!.phone} وإلى إيميل المالك.` }))) return
    setBusy('invoice')
    const j = await sendOffer({ orgId: c!.org_id, orgName: c!.org_name, phone: c!.phone, months: offer.months, amount: offerPrice, list: listPrice, note: offer.note, from: offerFrom })
    setBusy(null)
    if (!j.success) { toast(j.error || 'تعذّر الإرسال', 'error'); return }
    toast(`أُرسل عرض السعر #${j.invoiceNumber}`, 'success')
    loadOffers(c!.org_id)
  }

  // العميل دفع: تفعيل مدفوع حتى نهاية المدة + فاتورة مدفوعة بنفس السعر (من النموذج، أو من عرض في السجل)
  async function payOffer(o: { months: number; amount: number; note?: string | null; kind?: 'manual' | 'renewal'; id?: string | null; list?: number | null }) {
    const label = offerMonthsLabel(o.months), ends = addMonths(o.months, offerFrom)
    if (!(await confirmDialog({ title: 'تفعيل العرض', type: 'success', confirmText: 'تفعيل وإرسال الفاتورة',
      message: `تفعيل مدفوع لـ«${c!.org_name}» لمدة ${label}${offerFrom.getTime() > Date.now() + 86400000 ? ` تبدأ بعد نهاية اشتراكه الحالي (${fmtDate(offerFrom.toISOString())})` : ''}، حتى ${fmtDate(ends.toISOString())}.\n\nالمبلغ: ${o.amount} ر.س${o.list && o.amount < o.list ? ` (بدلاً من ${o.list} ر.س)` : ''}\nتتجدد الإضافات المفعّلة حتى التاريخ نفسه، ثم تُرسل فاتورة مدفوعة${hasPhone ? '' : ' (لا يوجد جوال، فلن تُرسل الفاتورة)'}.\n\nالسعر لهذه المدة فقط، والتجديد القادم بالسعر العادي أو بعرض جديد.` }))) return
    // تفعيل من النموذج: لو فيه عرض مرسل بنفس المدة والسعر نعلّمه مدفوع
    const match = o.id ?? offers.find(x => x.status === 'sent' && x.months === o.months && Number(x.amount) === o.amount)?.id ?? null
    setBusy('offer')
    const r = await activateOffer({ userId: c!.id, orgId: c!.org_id, orgName: c!.org_name, phone: c!.phone, months: o.months, amount: o.amount, note: o.note || '', kind: o.kind, offerId: match, from: offerFrom })
    setBusy(null)
    if (!r.ok) { toast(r.error, 'error'); return }
    toast(r.invoiceNumber ? `تم التفعيل وأُرسلت الفاتورة #${r.invoiceNumber}` : r.invoiceError ? `تم التفعيل، لكن ${r.invoiceError}` : 'تم التفعيل', r.invoiceError ? 'error' : 'success')
    onChanged({ status: 'active', subscription_type: 'paid', subscription_ends_at: r.ends })
    loadAddons(c!.org_id); loadOffers(c!.org_id)
    setOffer(x => ({ ...x, price: '', note: '' }))
  }

  async function cancelOffer(id: string) {
    if (!(await confirmDialog({ title: 'إلغاء العرض', message: 'إلغاء هذا العرض؟ لن يظهر في المتابعة، ويبقى في السجل.', type: 'warning' }))) return
    const j = await adminFetch('/api/admin/offers', { method: 'POST', body: { id, action: 'cancel' } })
    if (!j.success) { toast(j.error || 'تعذّر الإلغاء', 'error'); return }
    loadOffers(c!.org_id)
  }

  async function setAddon(a: any, on: boolean, quantity?: number) {
    // إضافة لكل فرع: الكمية = عدد الفروع المختارة
    const branchIds = a.per_branch ? (pick[a.id] || a.subscription?.branch_ids || branches.map(b => b.id)) : null
    if (on && branchIds && !branchIds.length) { toast('اختر فرعاً واحداً على الأقل', 'error'); return }
    const q = branchIds ? branchIds.length : quantity || qty[a.id] || (a.subscription?.quantity || 1)
    if (on) {
      const wasActive = !!a.subscription?.isValid
      const oldQty = wasActive ? (a.subscription?.quantity || 1) : 0
      const charged = wasActive ? Math.max(0, q - oldQty) : q
      const end = addonPeriodEnd(c!.subscription_ends_at)
      const unit = unitPrice(a.monthly_price, wasActive ? a.subscription : null)
      const pr = proratedCharge(unit, charged, end)
      // تقليل الكمية: ما فيه مستحق، والزايدين عن الحد الجديد يتوقفون مؤقتاً
      const lessNote = wasActive && q < oldQty
        ? `\n\nتنخفض الكمية من ${oldQty} إلى ${q}.${a.slug === 'extra_staff' ? ' وإن كان موظفوه أكثر من الحد الجديد، يتوقف أحدثهم مؤقتاً.' : a.slug === 'extra_branch' ? ' وإن كانت فروعه أكثر من الحد الجديد، يتوقف أحدثها مؤقتاً مع موظفيها.' : ''}`
        : ''
      if (!(await confirmDialog({ title: `${wasActive ? 'تغيير كمية' : 'تفعيل'} «${a.name}»${q > 1 ? ` × ${q}` : ''}`, type: lessNote ? 'warning' : 'success', confirmText: 'تأكيد', message:
        `تنتهي مع الباقة بتاريخ ${fmtDate(end.toISOString())}.\n\nالمستحق الآن: ${pr.amount} ر.س (${pr.days} يوم)\nومن التجديد: ${q * unit} ر.س شهرياً${lessNote}` }))) return
    } else if (!(await confirmDialog({ title: `إلغاء «${a.name}»`, message: 'تتوقف الإضافة فوراً، وتتوقف مؤقتاً أي فروع أو موظفين يتجاوزون الحد.' }))) return
    setBusy('addon:' + a.id)
    const j = await adminFetch('/api/admin/addon-subscriptions', { method: on ? 'POST' : 'DELETE', body: { org_id: c!.org_id, addon_id: a.id, org_name: c!.org_name, addon_name: a.name, quantity: q, ...(branchIds ? { branch_ids: branchIds } : {}) } })
    setBusy(null)
    if (!j.success) { toast(j.error || 'تعذّر تنفيذ الإجراء', 'error'); return }
    await loadAddons(c!.org_id)
    if (on && j.proratedAmount > 0 && hasPhone) {
      await sendInvoice([{ label: `إضافة «${a.name}»${q > 1 ? ` × ${q}` : ''} — ${j.proratedDays} يوم حتى تجديد الباقة`, amount: j.proratedAmount }], 'إرسال فاتورة الإضافة؟')
    }
  }

  // رمز دخول مؤقت لما رمز الإيميل ما يوصل العميل (يطلع مرة وحدة، صالح 10 دقايق، لأي جهاز)
  async function issueDeviceCode() {
    if (!(await confirmDialog({ title: 'رمز دخول مؤقت', message: `إصدار رمز دخول لـ«${c!.full_name || c!.org_name}»؟ سلّمه للعميل بعد التأكد من أنه صاحب الحساب.`, type: 'warning' }))) return
    setBusy('device-code')
    const j = await adminFetch('/api/admin/device-code', { method: 'POST', body: { userId: c!.id } })
    setBusy(null)
    if (!j.success) { toast(j.error || 'تعذّر إصدار الرمز', 'error'); return }
    setDeviceCode(j.code)
  }

  async function remove() {
    if (!(await confirmDialog({ title: 'حذف نهائي', message: `حذف «${c!.org_name}» وكل بياناتها نهائياً (المنتجات، المخزون، المشتريات، الموظفون، الحساب)؟ لا يمكن التراجع عن ذلك.` }))) return
    setBusy('delete')
    const j = await adminFetch('/api/admin/delete-user', { method: 'POST', body: { userId: c!.id, orgId: c!.org_id || null } })
    setBusy(null)
    if (!j.success) { toast('تعذّر الحذف: ' + (j.details ? j.details.join('، ') : j.error || ''), 'error'); return }
    toast('تم الحذف', 'success')
    onClose(); onChanged()
  }

  const waLink = hasPhone ? `https://wa.me/${c.phone.replace(/\D/g, '')}` : ''

  return (
    <Drawer open onClose={onClose} width={560}
      title={c.org_name}
      subtitle={<span>{c.full_name}{hasPhone && <> · <span dir="ltr">{c.phone}</span></>}{c.reg_phone && c.reg_phone.replace(/\D/g, '').slice(-9) !== c.phone.replace(/\D/g, '').slice(-9) && <span style={{ opacity: .6 }}> · جوال التسجيل <span dir="ltr">{c.reg_phone}</span></span>}</span>}>

      {/* الملخص */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <Badge tone={st.tone}>{st.label}</Badge>
        <Badge tone={c.subscription_type === 'paid' ? 'info' : 'violet'}>{c.subscription_type === 'paid' ? 'مدفوع' : 'تجربة'}</Badge>
        <Badge tone="neutral">{planLabel(c.plan, c.max_branches)} · {c.billing_cycle === 'yearly' ? 'سنوي' : 'شهري'}</Badge>
        {dl !== null && <Badge tone={dl <= 0 ? 'danger' : dl <= 7 ? 'warning' : 'neutral'}>{dl <= 0 ? 'الاشتراك منتهي' : `متبقٍ ${dl} يوم`}</Badge>}
      </div>
      <Card pad={16}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {[
            ['تاريخ التسجيل', fmtDate(c.created_at)],
            ['ينتهي الاشتراك', fmtDate(c.subscription_ends_at)],
            ['الباقة المطلوبة عند التسجيل', c.requested_plan ? planLabel(c.requested_plan as any) || c.requested_plan : '—'],
            ['الفاتورة الشهرية', `${monthlyBill} ⃁ · ${c.max_branches} ${c.max_branches === 1 ? 'فرع' : 'فروع'}`],
          ].map(([k, v]) => (
            <div key={k}>
              <div style={{ fontSize: 11.5, color: A.text3, fontWeight: 600 }}>{k}</div>
              <div style={{ fontSize: 13.5, fontWeight: 600, marginTop: 3 }}>{v}</div>
            </div>
          ))}
        </div>
        {hasPhone && (
          <a href={waLink} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 14, fontSize: 13, fontWeight: 600, color: A.primary, textDecoration: 'none' }}>
            <MessageCircle size={15} /> مراسلة على واتساب
          </a>
        )}
      </Card>

      <Tabs items={TABS} value={tab} onChange={setTab} />

      {tab === 'sub' && <>
      {/* الاشتراك */}
      <Card title={c.subscription_type === 'paid' ? 'تجديد بالسعر العادي' : 'تفعيل بالسعر العادي'} subtitle={paidPreview.start.getTime() > Date.now() + 60000 ? `يبدأ بعد نهاية اشتراكه الحالي (${fmtDate(paidPreview.start.toISOString())}) — ما يخسر أيامه` : 'يبدأ من اليوم'}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6, marginBottom: 12 }}>
          {DURATIONS.map(x => (
            <button key={x.d} onClick={() => setDays(x.d)} className="adm-btn"
              style={{ padding: '8px 4px', borderRadius: 8, fontSize: 12.5, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer',
                border: `1px solid ${days === x.d ? A.primary : A.borderStrong}`, background: days === x.d ? A.primarySoft : A.surface, color: days === x.d ? A.primary : A.text2 }}>
              {x.l}
            </button>
          ))}
        </div>
        <div style={{ fontSize: 12.5, color: A.text2, marginBottom: 10 }}>
          ينتهي المدفوع في <b style={{ color: A.text }}>{fmtDate(paidPreview.end.toISOString())}</b>
          {c.status === 'suspended' && ' · ويُستأنف الحساب الموقوف'}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn kind="primary" full loading={busy === 'activate'} onClick={() => activate('paid', days)}>{c.subscription_type === 'paid' ? 'تجديد مدفوع' : 'تفعيل مدفوع'}</Btn>
          <Btn full disabled={!!busy} onClick={() => activate('trial', days)}>{c.subscription_type === 'trial' && (dl ?? 0) > 0 ? 'تمديد التجربة' : 'تجربة مجانية'}</Btn>
        </div>
      </Card>

      {/* عرض سعر خاص */}
      <Card title="عرض سعر خاص" subtitle="مدة وسعر تتفق عليهما مع العميل، لهذه المرة فقط">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6, marginBottom: 12 }}>
          {OFFER_MONTHS.map(x => (
            <button key={x.m} onClick={() => setOffer(o => ({ ...o, months: x.m }))} className="adm-btn"
              style={{ padding: '8px 4px', borderRadius: 8, fontSize: 12.5, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer',
                border: `1px solid ${offer.months === x.m ? A.primary : A.borderStrong}`, background: offer.months === x.m ? A.primarySoft : A.surface, color: offer.months === x.m ? A.primary : A.text2 }}>
              {x.l}
            </button>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 8 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, fontWeight: 600, color: A.text2 }}>
            السعر المتفق عليه (ر.س)
            <NumberInput min={0} value={offer.price} aria-label="سعر العرض"
              onChange={e => setOffer(o => ({ ...o, price: String(e.target.value ?? '') }))}
              style={{ ...inputStyle, textAlign: 'center', fontWeight: 700 }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, fontWeight: 600, color: A.text2 }}>
            ملاحظة في الفاتورة (اختياري)
            <input value={offer.note} maxLength={60} placeholder="مثال: عرض الافتتاح" onChange={e => setOffer(o => ({ ...o, note: e.target.value }))} style={inputStyle} />
          </label>
        </div>
        {listPrice > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
            {[0, 10, 15, 20, 25].map(pct => {
              const v = Math.round(listPrice * (1 - pct / 100))
              const sel = offerPrice === v
              return (
                <button key={pct} type="button" onClick={() => setOffer(o => ({ ...o, price: String(v) }))} className="adm-btn"
                  style={{ padding: '5px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer',
                    border: `1px solid ${sel ? A.primary : A.border}`, background: sel ? A.primarySoft : A.surface, color: sel ? A.primary : A.text2 }}>
                  {pct ? `−${pct}% · ${v}` : `السعر العادي · ${v}`}
                </button>
              )
            })}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, padding: '10px 12px', borderRadius: 10, background: A.muted, fontSize: 12.5, color: A.text2, lineHeight: 1.7 }}>
          <BadgePercent size={16} style={{ flexShrink: 0 }} />
          <span>
            السعر العادي لـ{offerLabel}: <b style={{ color: A.text }}>{listPrice} ⃁</b>
            {offerSaving > 0 && <> · العميل يوفّر <b style={{ color: A.primary }}>{listPrice - offerPrice} ⃁ ({offerSaving}%)</b></>}
            {offerPrice > listPrice && listPrice > 0 && <> · أعلى من السعر العادي</>}
            {' '}· ينتهي في {fmtDate(offerEnds.toISOString())}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <Btn disabled={!!busy} onClick={previewOffer} title="معاينة عرض السعر"><Eye size={14} /> معاينة</Btn>
          <Btn full loading={busy === 'invoice'} disabled={!hasPhone || (!!busy && busy !== 'invoice')} onClick={sendOfferNow}><Send size={14} /> إرسال العرض</Btn>
          <Btn kind="primary" full loading={busy === 'offer'} disabled={!!busy && busy !== 'offer'} onClick={() => offerValid() && payOffer({ months: offer.months, amount: offerPrice, note: offer.note, list: listPrice })}>دفع العميل: تفعيل</Btn>
        </div>
        <div style={{ fontSize: 11.5, color: A.text3, marginTop: 8, lineHeight: 1.7 }}>
          «إرسال العرض» يرسل له عرض سعر مستحق الدفع، صالحاً 7 أيام، عبر واتساب والإيميل. وبعد ما يدفع، «تفعيل» يفعّل اشتراكه للمدة ويرسل له فاتورة مدفوعة.
        </div>
        {!hasPhone && <div style={{ fontSize: 12, color: A.danger, marginTop: 6 }}>لا يوجد رقم جوال مسجّل لهذا العميل</div>}
      </Card>

      {/* سجل العروض */}
      {offers.length > 0 && (
        <Card title="سجل العروض" subtitle="العروض المرسلة لهذا العميل وحالتها">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {offers.map(o => {
              const stt = offerState(o)
              const tone = stt === 'paid' ? 'primary' : stt === 'sent' ? 'warning' : 'neutral'
              const sttLabel = { paid: 'مدفوع', sent: 'بانتظار الدفع', expired: 'انتهت صلاحيته', cancelled: 'ملغى' }[stt]
              return (
                <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, border: `1px solid ${A.border}` }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>
                      {o.kind === 'renewal' ? 'عرض تجديد' : 'عرض'} {offerMonthsLabel(o.months)} · {Number(o.amount)} ⃁
                      {o.list_amount && Number(o.list_amount) > Number(o.amount) && <span style={{ color: A.text3, fontWeight: 500 }}> (بدلاً من {Number(o.list_amount)})</span>}
                    </div>
                    <div style={{ fontSize: 11.5, color: A.text3, marginTop: 2 }}>
                      أُرسل {fmtDate(o.created_at)}{o.invoice_number ? ` · #${o.invoice_number}` : ''}{stt === 'sent' ? ` · صالح حتى ${fmtDate(o.valid_until)}` : ''}{o.paid_at ? ` · دُفع ${fmtDate(o.paid_at)}` : ''}{o.note ? ` · ${o.note}` : ''}
                    </div>
                  </div>
                  <Badge tone={tone as any}>{sttLabel}</Badge>
                  {(stt === 'sent' || stt === 'expired') && <>
                    <Btn small kind="primary" disabled={!!busy} onClick={() => payOffer({ id: o.id, months: o.months, amount: Number(o.amount), note: o.note, kind: o.kind, list: o.list_amount ? Number(o.list_amount) : null })}>دفع: تفعيل</Btn>
                    <Btn small disabled={!!busy} onClick={() => cancelOffer(o.id)}>إلغاء</Btn>
                  </>}
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* الفاتورة */}
      <Card title="الفاتورة الدورية" subtitle="الباقة + الإضافات المفعّلة">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {bill.lines.map((l, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13, color: A.text2 }}>
              <span>{l.label}</span><span style={{ fontWeight: 600, color: A.text, whiteSpace: 'nowrap' }}>{l.amount} ⃁</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: `1px solid ${A.border}`, paddingTop: 8, marginTop: 4, fontSize: 14, fontWeight: 600 }}>
            <span>الإجمالي</span><span>{bill.total} ⃁</span>
          </div>
        </div>
        <div style={{ marginTop: 14 }}>
          <Btn full loading={busy === 'invoice'} disabled={!hasPhone || (!!busy && busy !== 'invoice')} onClick={() => sendInvoice()}>
            <Send size={14} /> إرسال الفاتورة عبر واتساب
          </Btn>
          {!hasPhone && <div style={{ fontSize: 12, color: A.danger, marginTop: 6 }}>لا يوجد رقم جوال مسجّل لهذا العميل</div>}
        </div>
      </Card>

      </>}
      {tab === 'plan' && <>
      {/* الباقة */}
      <Card title="الباقة" actions={
        <div style={{ display: 'inline-flex', border: `1px solid ${A.borderStrong}`, borderRadius: 8, overflow: 'hidden' }}>
          {(['monthly', 'yearly'] as const).map(cy => (
            <button key={cy} onClick={() => changeCycle(cy)} disabled={!!busy}
              style={{ padding: '5px 12px', border: 'none', fontSize: 12, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', background: c.billing_cycle === cy ? A.primary : A.surface, color: c.billing_cycle === cy ? 'white' : A.text2 }}>
              {cy === 'monthly' ? 'شهري' : 'سنوي'}
            </button>
          ))}
        </div>
      }>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* ما فيه باقات للجدد: «باقتك المخصصة» (يختار خدماته) أولاً، وباقته الحالية لو كان على باقة ثابتة
              (قديمة أو جاهزة) تنعرض له بس — للمشتركين الحاليين فقط، وما ينحط عليها عميل جديد بالغلط */}
          {(['custom', ...PLAN_KEYS.filter(k => k !== 'custom' && k === c.plan)] as typeof PLAN_KEYS).map(k => {
            const on = c.plan === k
            // باقته الحالية بسعره المثبّت (لو مشترك قبل تغيير الأسعار)، والباقي بالسعر الحالي — الجديدة لعدد فروعه
            const pp = planPriceFor(k, on ? c.locked_plan_monthly : null, planBranches)
            const price = k === 'custom' ? (on ? `${bill.total} ⃁${c.billing_cycle === 'yearly' ? '/سنة' : '/شهر'}` : 'حسب المزايا') : c.billing_cycle === 'yearly' ? `${pp.yearly} ⃁/سنة` : `${pp.monthly} ⃁/شهر`
            return (
              <button key={k} onClick={() => changePlan(k)} disabled={!!busy} className="adm-hover"
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 10, textAlign: 'right', fontFamily: 'inherit', cursor: on ? 'default' : 'pointer',
                  border: `1.5px solid ${on ? A.primary : A.border}`, background: on ? A.primarySoft : A.surface }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: on ? A.primary : A.text }}>{planLabel(k)} {on && '· الحالية'}</div>
                  <div style={{ fontSize: 11.5, color: A.text3, marginTop: 2 }}>{PLAN_LIMITS[k].desc}{k !== 'custom' && ' · للمشتركين الحاليين فقط'}</div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: on ? A.primary : A.text2, whiteSpace: 'nowrap' }}>{price}</div>
              </button>
            )
          })}
          {c.plan === 'custom' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderRadius: 10, border: `1px solid ${A.border}` }}>
              <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>عدد الموظفين <span style={{ fontSize: 11.5, fontWeight: 600, color: A.text3 }}>({6 * planBranches} مشمولين، 6 لكل فرع، وكل موظف إضافي 10 ⃁)</span></span>
              <Btn small disabled={!!busy || Math.max(c.staff_included ?? 0, 6 * planBranches) <= 6 * planBranches} onClick={() => setStaffIncluded(Math.max(c.staff_included ?? 0, 6 * planBranches) - 1)}>−</Btn>
              <b style={{ minWidth: 24, textAlign: 'center' }}>{Math.max(c.staff_included ?? 0, 6 * planBranches)}</b>
              <Btn small disabled={!!busy} onClick={() => setStaffIncluded(Math.max(c.staff_included ?? 0, 6 * planBranches) + 1)}>+</Btn>
            </div>
          )}
          {newPlan && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderRadius: 10, border: `1px solid ${A.border}` }}>
              <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>فروع الباقة <span style={{ fontSize: 11.5, fontWeight: 600, color: A.text3 }}>(الفرع الإضافي {PLAN_CAPS[c.plan].branchPrice} ⃁)</span></span>
              <Btn small disabled={!!busy || planBranches <= 1} onClick={() => changePlan(c.plan, planBranches - 1)}>−</Btn>
              <b style={{ minWidth: 20, textAlign: 'center' }}>{planBranches}</b>
              <Btn small disabled={!!busy || planBranches >= 10} onClick={() => changePlan(c.plan, planBranches + 1)}>+</Btn>
            </div>
          )}
          <div style={{ border: `1.5px dashed ${A.border}`, borderRadius: 10, padding: '11px 14px' }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: A.text }}>{ENTERPRISE_LABEL} <span style={{ fontSize: 11.5, fontWeight: 600, color: A.text3 }}>— أكثر من {PLAN_CAPS.advanced.maxBranches} فروع، بسعر متفق عليه</span></div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6, marginTop: 8 }}>
              {([['branches', 'فروع'], ['staff', 'موظفين'], ['suppliers', 'موردين'], ['price', '⃁ شهرياً']] as const).map(([k, l]) => (
                <input key={k} inputMode="numeric" placeholder={l} value={ent[k]} onChange={e => setEnt(v => ({ ...v, [k]: e.target.value.replace(/[^0-9]/g, '') }))}
                  style={{ padding: '7px 8px', borderRadius: 8, border: `1px solid ${A.border}`, fontSize: 12.5, fontFamily: 'inherit', textAlign: 'center' }} />
              ))}
            </div>
            <button onClick={setEnterprise} disabled={!!busy} style={{ marginTop: 8, width: '100%', padding: '8px', borderRadius: 8, border: 'none', background: A.primary, color: 'white', fontSize: 12.5, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>تفعيل باقة {ENTERPRISE_LABEL}</button>
          </div>
        </div>
      </Card>

      {staffUsage && staffUsage.active > staffUsage.limit && staffUsage.limit < 999 && (
        <div style={{ padding: '12px 14px', borderRadius: 10, background:'#fef3c7', border:'1px solid #fcd34d', fontSize: 12.5, color:'#92400e', lineHeight: 1.8 }}>
          <b>الموظفون فوق حد الباقة:</b> عنده {staffUsage.active} موظف نشط والحد {staffUsage.limit}.
          فعّل له «موظف إضافي» × {staffUsage.active - staffUsage.limit}، أو رقّ باقته — أو لو ألغيت/قلّلت إضافة يتوقف الأحدث تلقائياً.
        </div>
      )}

      {/* الإضافات */}
      <Card title="الإضافات" subtitle="تنتهي وتتجدد مع الباقة، والدفع بالتناسب">
        {loadingAddons ? <div style={{ fontSize: 12.5, color: A.text3 }}>جارٍ التحميل...</div>
          : addons.length === 0 ? <div style={{ fontSize: 12.5, color: A.text3 }}>لا توجد إضافات متاحة</div>
          : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {addons.map(a => {
                const on = !!a.subscription?.isValid
                const isQty = QTY_SLUGS.includes(a.slug)
                const q = qty[a.id] || (on ? a.subscription?.quantity || 1 : 1)
                const canEditQty = isQty
                const curQty = on ? (a.subscription?.quantity || 1) : 0
                // فروع الإضافة (لكل فرع): المختارة الحين، أو فروع الاشتراك، أو كلها
                const subBranches: string[] = a.subscription?.branch_ids || branches.map(b => b.id)
                const chosen: string[] = pick[a.id] || subBranches
                const branchesChanged = on && a.per_branch && (chosen.length !== subBranches.length || chosen.some(id => !subBranches.includes(id)))
                return (
                  <div key={a.id} style={{ padding: '10px 12px', borderRadius: 10, border: `1px solid ${on ? A.primary + '55' : A.border}`, background: on ? A.primarySoft : A.surface }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{a.name}</div>
                      <div style={{ fontSize: 11.5, color: A.text3, marginTop: 2 }}>
                        {on ? `مفعّلة${isQty ? ` (${a.subscription?.quantity || 1})` : a.per_branch ? ` لـ ${a.subscription?.quantity || 1} ${(a.subscription?.quantity || 1) === 1 ? 'فرع' : 'فروع'}` : ''} حتى ${fmtDate(a.subscription.expires_at)}` : `${a.monthly_price} ⃁${isQty ? ' للوحدة' : a.per_branch ? ' لكل فرع' : ''} / شهر`}
                      </div>
                    </div>
                    {canEditQty && (
                      <NumberInput min={1} max={20} value={q} aria-label="الكمية"
                        onChange={e => setQty(p => ({ ...p, [a.id]: Math.max(1, Math.min(20, Number(e.target.value) || 1)) }))}
                        style={{ ...inputStyle, width: 58, padding: '6px', textAlign: 'center' }} />
                    )}
                    {on && isQty && q !== curQty && <Btn small kind="primary" disabled={!!busy} onClick={() => setAddon(a, true, q)}>حفظ الكمية</Btn>}
                    {branchesChanged && <Btn small kind="primary" disabled={!!busy} onClick={() => setAddon(a, true)}>حفظ الفروع</Btn>}
                    <Btn small kind={on ? 'danger' : 'primary'} loading={busy === 'addon:' + a.id} disabled={!!busy && busy !== 'addon:' + a.id} onClick={() => setAddon(a, !on, q)}>
                      {on ? 'إلغاء' : 'تفعيل'}
                    </Btn>
                  </div>
                  {a.per_branch && branches.length > 1 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                      {branches.map(b => {
                        const sel = chosen.includes(b.id)
                        return (
                          <button key={b.id} type="button" disabled={!!busy}
                            onClick={() => setPick(p => ({ ...p, [a.id]: sel ? chosen.filter(x => x !== b.id) : [...chosen, b.id] }))}
                            style={{ padding: '4px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer',
                              border: `1px solid ${sel ? A.primary : A.border}`, background: sel ? A.primary : A.surface, color: sel ? 'white' : A.text2 }}>
                            {b.name}
                          </button>
                        )
                      })}
                    </div>
                  )}
                  </div>
                )
              })}
            </div>
          )}
      </Card>

      {/* الخصم */}
      <Card title="الخصم" subtitle="خصم خاص لهذا العميل، ويظهر سطراً في فاتورته وفي صفحتي الإضافات والإعدادات لديه">
        {curDiscount && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, background: A.primarySoft, border: `1px solid ${A.primary}55`, marginBottom: 10, fontSize: 13 }}>
            <div style={{ flex: 1 }}>
              <b>{curDiscount.type === 'percent' ? `${curDiscount.value}%` : `${curDiscount.value} ⃁ شهرياً`}</b>
              {curDiscount.note && ` — ${curDiscount.note}`}
              <div style={{ fontSize: 11.5, color: A.text3, marginTop: 2 }}>{curDiscount.until ? `حتى ${fmtDate(curDiscount.until)}` : 'بدون تاريخ انتهاء'}</div>
            </div>
            <Btn small kind="danger" loading={busy === 'discount'} disabled={!!busy && busy !== 'discount'} onClick={() => saveDiscount(true)}>إلغاء الخصم</Btn>
          </div>
        )}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <select value={disc.type} onChange={e => setDisc(d => ({ ...d, type: e.target.value as any }))} style={{ ...inputStyle, width: 110 }}>
            <option value="percent">نسبة %</option>
            <option value="amount">مبلغ ⃁ شهرياً</option>
          </select>
          <input inputMode="decimal" placeholder={disc.type === 'percent' ? 'مثال: 20' : 'مثال: 50'} value={disc.value}
            onChange={e => setDisc(d => ({ ...d, value: e.target.value.replace(/[٠-٩]/g, x => String('٠١٢٣٤٥٦٧٨٩'.indexOf(x))).replace(/[^0-9.]/g, '') }))}
            style={{ ...inputStyle, width: 90, textAlign: 'center' }} />
          <input placeholder="سبب الخصم (يظهر في الفاتورة)" value={disc.note} maxLength={60} onChange={e => setDisc(d => ({ ...d, note: e.target.value }))} style={{ ...inputStyle, flex: 1, minWidth: 140 }} />
          <input type="date" value={disc.until} onChange={e => setDisc(d => ({ ...d, until: e.target.value }))} title="ينتهي في (اختياري)" style={{ ...inputStyle, width: 150 }} />
        </div>
        <div style={{ fontSize: 11.5, color: A.text3, marginTop: 6 }}>النسبة من إجمالي الفاتورة (الباقة والإضافات)، والمبلغ شهري (×12 في الاشتراك السنوي)، وتاريخ الانتهاء اختياري.</div>
        <div style={{ marginTop: 10 }}>
          <Btn kind="primary" full loading={busy === 'discount'} disabled={!!busy && busy !== 'discount'} onClick={() => saveDiscount()}>{curDiscount ? 'تغيير الخصم' : 'حفظ الخصم'}</Btn>
        </div>
      </Card>

      </>}
      {tab === 'contact' && <>
      {/* النشاط */}
      {c.org_id && <ActivityCard orgId={c.org_id} />}

      {/* مراسلة بالإيميل */}
      {c.org_id && <CustomerEmailCard orgId={c.org_id} orgName={c.org_name} />}

      </>}
      {tab === 'account' && <>
      {/* منطقة الخطر */}
      <Card title="إجراءات الحساب">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {c.status === 'active' && <Btn loading={busy === 'suspend'} disabled={!!busy} onClick={suspend}><PauseCircle size={15} /> إيقاف الحساب</Btn>}
          {c.status === 'suspended' && <Btn kind="primary" loading={busy === 'resume'} disabled={!!busy && busy !== 'resume'} onClick={resume}><PlayCircle size={15} /> استئناف الاشتراك</Btn>}
          <Btn loading={busy === 'device-code'} disabled={!!busy} onClick={issueDeviceCode}><KeyRound size={15} /> رمز دخول مؤقت</Btn>
          <Btn kind="danger" loading={busy === 'delete'} disabled={!!busy} onClick={remove}><Trash2 size={15} /> حذف نهائي</Btn>
        </div>
        {c.status === 'suspended' && (
          <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 10, background: A.muted, fontSize: 12.5, color: A.text2, lineHeight: 1.8 }}>
            {resumeInfo.expired
              ? <>انتهى اشتراكه أثناء الإيقاف ({fmtDate(resumeInfo.endsAt)}). بعد الاستئناف جدّد له من تبويب «الاشتراك والدفع».</>
              : <>الاستئناف يكمل اشتراكه نفسه حتى <b style={{ color: A.text }}>{fmtDate(resumeInfo.endsAt)}</b> (متبقٍ {resumeInfo.daysLeft} يوم) — بدون مدة جديدة.</>}
          </div>
        )}
        {deviceCode && (
          <div style={{ marginTop: 12, padding: '12px 14px', borderRadius: 10, background: A.primarySoft, fontSize: 13, color: A.text }}>
            رمز الدخول: <b dir="ltr" style={{ fontSize: 20, letterSpacing: 4, color: A.primary }}>{deviceCode}</b>
            <div style={{ fontSize: 12, color: A.text2, marginTop: 4 }}>صالح لمدة 10 دقائق ولمرة واحدة، ويُدخله العميل في صفحة «تحقق من جهازك».</div>
          </div>
        )}
      </Card>
      </>}
    </Drawer>
  )
}
