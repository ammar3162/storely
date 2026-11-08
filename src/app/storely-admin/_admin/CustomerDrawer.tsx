'use client'
import { useEffect, useState } from 'react'
import NumberInput from '@/components/NumberInput'
import { MessageCircle, Send, Trash2, PauseCircle, PlayCircle, KeyRound } from 'lucide-react'
import { confirmDialog } from '@/components/ConfirmDialog'
import { toast } from '@/components/toast'
import { billLines, activeDiscount, PLAN_CAPS, ENTERPRISE_LABEL, addonPeriodEnd, proratedCharge, planPriceFor, unitPrice, isNewPlan, type PlanKey } from '@/lib/planPricing'
import { A, Badge, Btn, Card, Drawer, adminFetch, daysLeft, fmtDate, inputStyle } from './kit'
import { type Customer, STATUS, PLAN_KEYS, PLAN_LIMITS, planLabel } from './customers'
import ActivityCard from './ActivityCard'

const QTY_SLUGS = ['extra_staff', 'extra_suppliers', 'extra_branch']
const DURATIONS = [{ d: 7, l: '7 أيام' }, { d: 30, l: 'شهر' }, { d: 90, l: '3 أشهر' }, { d: 365, l: 'سنة' }]

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

  const c = customer
  useEffect(() => {
    setAddons([]); setQty({}); setDays(30); setBranches([])
    if (c?.org_id) loadAddons(c.org_id)
  }, [c?.org_id])

  async function loadAddons(orgId: string) {
    setLoadingAddons(true)
    const j = await adminFetch(`/api/admin/addon-subscriptions?org_id=${orgId}`)
    if (j.success) { setAddons(j.addons || []); setBranches(j.branches || []); setStaffUsage(j.staff_usage || null); setPick({}) }
    setLoadingAddons(false)
  }

  if (!c) return null
  const st = STATUS[c.status] || STATUS.pending
  const dl = daysLeft(c.subscription_ends_at)
  const bill = billLines(c.plan, c.billing_cycle, addons, c.locked_plan_monthly, c.discount, c.max_branches, c.staff_included)
  const newPlan = isNewPlan(c.plan)
  // الجديدة: فروع الباقة الحالية (1–10) — القديمة تنتقل بنفس عدد فروعها
  const planBranches = Math.max(1, Math.min(10, c.max_branches || 1))
  const curDiscount = activeDiscount(c.discount)
  const hasPhone = !!c.phone

  async function activate(type: 'trial' | 'paid', d: number) {
    const label = type === 'paid' ? 'تفعيل مدفوع' : 'تفعيل تجربة'
    // أول اشتراك مدفوع بعد التجربة (على الشاملة): ذكّر الأدمن يحوّله للباقة اللي اختارها — مكافأة السفير والفاتورة تنحسب على باقته الحالية
    const wanted = c!.requested_plan as PlanKey | undefined
    const planNote = type === 'paid' && c!.subscription_type === 'trial' && wanted && wanted !== c!.plan && (PLAN_KEYS as string[]).includes(wanted)
      ? `\n\nتنبيه: باقته الحالية «${planLabel(c!.plan)}» (التجربة)، والباقة التي اختارها عند التسجيل «${planLabel(wanted)}». غيّر الباقة أولاً إن كان سيشترك فيها، لأن الفاتورة ومكافأة السفير تُحتسبان على الباقة الحالية.`
      : ''
    if (!(await confirmDialog({ title: label, message: `${label} لـ"${c!.org_name}" لمدة ${DURATIONS.find(x => x.d === d)?.l || d + ' يوم'}؟\n\nتتجدد الإضافات المفعّلة حتى التاريخ نفسه.${planNote}`, type: planNote ? 'warning' : undefined }))) return
    setBusy('activate')
    const ends = new Date(Date.now() + d * 86400000).toISOString()
    const j = await adminFetch('/api/admin/activate-user', { method: 'POST', body: { userId: c!.id, type, ends } })
    if (!j.success) { setBusy(null); toast(j.error || 'تعذّر التفعيل', 'error'); return }
    await adminFetch('/api/notify-activation', { method: 'POST', body: { userId: c!.id, subscriptionType: type, subscriptionEndsAt: ends } })
    setBusy(null)
    toast('تم التفعيل', 'success')
    onChanged({ status: 'active', subscription_type: type, subscription_ends_at: ends })
    loadAddons(c!.org_id)
  }

  async function suspend() {
    if (!(await confirmDialog({ title: 'إيقاف الحساب', message: `إيقاف «${c!.org_name}»؟ يشمل ذلك جميع مديري الفروع التابعين له.` }))) return
    setBusy('suspend')
    const j = await adminFetch('/api/admin/suspend-user', { method: 'POST', body: { userId: c!.id } })
    setBusy(null)
    if (!j.success) { toast(j.error || 'تعذّر الإيقاف', 'error'); return }
    toast('تم إيقاف الحساب', 'success')
    onChanged({ status: 'suspended' })
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

  async function sendInvoice(items = bill.lines, title = 'إرسال الفاتورة') {
    const total = items.reduce((s, it) => s + it.amount, 0)
    const lines = items.map(it => `${it.label}: ${it.amount} ر.س`).join('\n')
    if (!(await confirmDialog({ title, message: `${lines}\n\nالإجمالي: ${total} ر.س\nتُرسل عبر واتساب إلى ${c!.phone}` }))) return
    setBusy('invoice')
    const j = await adminFetch('/api/admin/send-invoice', { method: 'POST', body: { orgId: c!.org_id, orgName: c!.org_name, phone: c!.phone, items } })
    setBusy(null)
    toast(j.success ? `تم إرسال الفاتورة #${j.invoiceNumber}` : (j.error || 'تعذّر الإرسال'), j.success ? 'success' : 'error')
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
    if (!(await confirmDialog({ title: 'رمز دخول مؤقت', message: `إصدار رمز دخول لـ«${c!.full_name || c!.org_name}»؟ سلّمه للعميل بعد التأكد من أنه صاحب الحساب.` }))) return
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
            ['فروع الباقة', `${c.max_branches}`],
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

      {/* النشاط */}
      {c.org_id && <ActivityCard orgId={c.org_id} />}

      {/* الاشتراك */}
      <Card title="الاشتراك" subtitle="تفعيل أو تجديد لمدة تبدأ من اليوم">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6, marginBottom: 12 }}>
          {DURATIONS.map(x => (
            <button key={x.d} onClick={() => setDays(x.d)} className="adm-btn"
              style={{ padding: '8px 4px', borderRadius: 8, fontSize: 12.5, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer',
                border: `1px solid ${days === x.d ? A.primary : A.borderStrong}`, background: days === x.d ? A.primarySoft : A.surface, color: days === x.d ? A.primary : A.text2 }}>
              {x.l}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn kind="primary" full loading={busy === 'activate'} onClick={() => activate('paid', days)}>تفعيل مدفوع</Btn>
          <Btn full disabled={!!busy} onClick={() => activate('trial', days)}>تجربة مجانية</Btn>
        </div>
      </Card>

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
          {/* الباقات القديمة تنعرض بس لعميل عليها (المشتركين قبل 2026-11) — الجديد ما يرجع لها */}
          {PLAN_KEYS.filter(k => isNewPlan(k) || !newPlan).map(k => {
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
                  <div style={{ fontSize: 11.5, color: A.text3, marginTop: 2 }}>{PLAN_LIMITS[k].desc}</div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: on ? A.primary : A.text2, whiteSpace: 'nowrap' }}>{price}</div>
              </button>
            )
          })}
          {c.plan === 'custom' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderRadius: 10, border: `1px solid ${A.border}` }}>
              <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>عدد الموظفين <span style={{ fontSize: 11.5, fontWeight: 600, color: A.text3 }}>({6 * planBranches} مشمولين، يُخصم 10 ⃁ عن كل موظف أقل، والحد الأدنى {3 * planBranches})</span></span>
              <Btn small disabled={!!busy || (c.staff_included ?? 6 * planBranches) <= 3 * planBranches} onClick={() => setStaffIncluded((c.staff_included ?? 6 * planBranches) - 1)}>−</Btn>
              <b style={{ minWidth: 24, textAlign: 'center' }}>{c.staff_included ?? 6 * planBranches}</b>
              <Btn small disabled={!!busy} onClick={() => setStaffIncluded((c.staff_included ?? 6 * planBranches) + 1)}>+</Btn>
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
        <div style={{ padding: '12px 14px', borderRadius: 10, background: '#fef3c7', border: '1px solid #fcd34d', fontSize: 12.5, color: '#92400e', lineHeight: 1.8 }}>
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

      {/* منطقة الخطر */}
      <Card title="إجراءات الحساب">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {c.status === 'active' && <Btn loading={busy === 'suspend'} disabled={!!busy} onClick={suspend}><PauseCircle size={15} /> إيقاف الحساب</Btn>}
          {c.status === 'suspended' && <Btn kind="primary" disabled={!!busy} onClick={() => activate(c.subscription_type === 'paid' ? 'paid' : 'trial', 30)}><PlayCircle size={15} /> إعادة تفعيل (شهر)</Btn>}
          <Btn loading={busy === 'device-code'} disabled={!!busy} onClick={issueDeviceCode}><KeyRound size={15} /> رمز دخول مؤقت</Btn>
          <Btn kind="danger" loading={busy === 'delete'} disabled={!!busy} onClick={remove}><Trash2 size={15} /> حذف نهائي</Btn>
        </div>
        {deviceCode && (
          <div style={{ marginTop: 12, padding: '12px 14px', borderRadius: 10, background: A.primarySoft, fontSize: 13, color: A.text }}>
            رمز الدخول: <b dir="ltr" style={{ fontSize: 20, letterSpacing: 4, color: A.primary }}>{deviceCode}</b>
            <div style={{ fontSize: 12, color: A.text2, marginTop: 4 }}>صالح لمدة 10 دقائق ولمرة واحدة، ويُدخله العميل في صفحة «تحقق من جهازك».</div>
          </div>
        )}
      </Card>
    </Drawer>
  )
}
