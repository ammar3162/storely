'use client'
import { useEffect, useState } from 'react'
import { MessageCircle, Send, Trash2, PauseCircle, PlayCircle } from 'lucide-react'
import { confirmDialog } from '@/components/ConfirmDialog'
import { toast } from '@/components/toast'
import { billLines, PLAN_PRICING, addonPeriodEnd, proratedCharge } from '@/lib/planPricing'
import { A, Badge, Btn, Card, Drawer, adminFetch, daysLeft, fmtDate, inputStyle } from './kit'
import { type Customer, STATUS, PLAN_KEYS, PLAN_LIMITS, planLabel } from './customers'

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
  const [days, setDays] = useState(30)
  const [qty, setQty] = useState<Record<string, number>>({})

  const c = customer
  useEffect(() => {
    setAddons([]); setQty({}); setDays(30)
    if (c?.org_id) loadAddons(c.org_id)
  }, [c?.org_id])

  async function loadAddons(orgId: string) {
    setLoadingAddons(true)
    const j = await adminFetch(`/api/admin/addon-subscriptions?org_id=${orgId}`)
    if (j.success) setAddons(j.addons || [])
    setLoadingAddons(false)
  }

  if (!c) return null
  const st = STATUS[c.status] || STATUS.pending
  const dl = daysLeft(c.subscription_ends_at)
  const bill = billLines(c.plan, c.billing_cycle, addons)
  const hasPhone = !!c.phone

  async function activate(type: 'trial' | 'paid', d: number) {
    const label = type === 'paid' ? 'تفعيل مدفوع' : 'تفعيل تجربة'
    if (!(await confirmDialog({ title: label, message: `${label} لـ"${c!.org_name}" لمدة ${DURATIONS.find(x => x.d === d)?.l || d + ' يوم'}؟\n\nالإضافات المفعّلة تتجدد لنفس التاريخ.` }))) return
    setBusy('activate')
    const ends = new Date(Date.now() + d * 86400000).toISOString()
    const j = await adminFetch('/api/admin/activate-user', { method: 'POST', body: { userId: c!.id, type, ends } })
    if (!j.success) { setBusy(null); toast(j.error || 'فشل التفعيل', 'error'); return }
    await adminFetch('/api/notify-activation', { method: 'POST', body: { userId: c!.id, subscriptionType: type, subscriptionEndsAt: ends } })
    setBusy(null)
    toast('تم التفعيل', 'success')
    onChanged({ status: 'active', subscription_type: type, subscription_ends_at: ends })
    loadAddons(c!.org_id)
  }

  async function suspend() {
    if (!(await confirmDialog({ title: 'إيقاف الحساب', message: `إيقاف "${c!.org_name}"؟ يشمل كل مديري الفروع التابعين له.` }))) return
    setBusy('suspend')
    const j = await adminFetch('/api/admin/suspend-user', { method: 'POST', body: { userId: c!.id } })
    setBusy(null)
    if (!j.success) { toast(j.error || 'فشل الإيقاف', 'error'); return }
    toast('تم إيقاف الحساب', 'success')
    onChanged({ status: 'suspended' })
  }

  async function changePlan(k: typeof PLAN_KEYS[number]) {
    if (k === c!.plan) return
    const lim = PLAN_LIMITS[k]
    if (!(await confirmDialog({ title: 'تغيير الباقة', message: `تغيير الباقة إلى "${planLabel(k)}"؟\n\nلو فروعه أكثر من ${lim.branches} (+ الفروع المشتراة)، الأحدث تتوقف مؤقتاً مع موظفينها — بياناتها تبقى وترجع لو رقّى.` }))) return
    setBusy('plan')
    const j = await adminFetch('/api/admin/update-plan', { method: 'POST', body: { orgId: c!.org_id, maxBranches: lim.branches, maxStaff: lim.staff, maxSuppliers: lim.suppliers, planName: k, orgName: c!.org_name, billingCycle: c!.billing_cycle } })
    setBusy(null)
    if (!j.success) { toast(j.error || 'فشل تغيير الباقة', 'error'); return }
    toast(j.locked ? `تم — توقف ${j.locked} فرع زايد عن الحد` : j.restored ? `تم — رجع ${j.restored} فرع` : 'تم تغيير الباقة', 'success')
    onChanged({ plan: k, max_branches: lim.branches })
  }

  async function changeCycle(cycle: 'monthly' | 'yearly') {
    if (cycle === c!.billing_cycle) return
    const lim = PLAN_LIMITS[c!.plan]
    setBusy('cycle')
    const j = await adminFetch('/api/admin/update-plan', { method: 'POST', body: { orgId: c!.org_id, maxBranches: c!.max_branches, maxStaff: lim.staff, maxSuppliers: lim.suppliers, planName: c!.plan, orgName: c!.org_name, billingCycle: cycle } })
    setBusy(null)
    if (!j.success) { toast(j.error || 'فشل التغيير', 'error'); return }
    onChanged({ billing_cycle: cycle })
  }

  async function sendInvoice(items = bill.lines, title = 'إرسال الفاتورة') {
    const total = items.reduce((s, it) => s + it.amount, 0)
    const lines = items.map(it => `${it.label}: ${it.amount} ر.س`).join('\n')
    if (!(await confirmDialog({ title, message: `${lines}\n\nالإجمالي: ${total} ر.س\nترسل عبر واتساب إلى ${c!.phone}` }))) return
    setBusy('invoice')
    const j = await adminFetch('/api/admin/send-invoice', { method: 'POST', body: { orgId: c!.org_id, orgName: c!.org_name, phone: c!.phone, items } })
    setBusy(null)
    toast(j.success ? `تم إرسال الفاتورة #${j.invoiceNumber}` : (j.error || 'فشل الإرسال'), j.success ? 'success' : 'error')
  }

  async function setAddon(a: any, on: boolean, quantity?: number) {
    const q = quantity || qty[a.id] || (a.subscription?.quantity || 1)
    if (on) {
      const wasActive = !!a.subscription?.isValid
      const charged = wasActive ? Math.max(0, q - (a.subscription?.quantity || 1)) : q
      const end = addonPeriodEnd(c!.subscription_ends_at)
      const pr = proratedCharge(Number(a.monthly_price) || 0, charged, end)
      if (!(await confirmDialog({ title: `${wasActive ? 'تحديث' : 'تفعيل'} "${a.name}"${q > 1 ? ` × ${q}` : ''}`, message:
        `تنتهي مع الباقة بتاريخ ${fmtDate(end.toISOString())}.\n\nالمستحق الحين: ${pr.amount} ر.س (${pr.days} يوم)\nومن التجديد: ${q * (Number(a.monthly_price) || 0)} ر.س شهرياً` }))) return
    } else if (!(await confirmDialog({ title: `إلغاء "${a.name}"`, message: 'تتوقف الإضافة فوراً، وأي فروع أو موظفين زايدين عن الحد يتوقفون مؤقتاً.' }))) return
    setBusy('addon:' + a.id)
    const j = await adminFetch('/api/admin/addon-subscriptions', { method: on ? 'POST' : 'DELETE', body: { org_id: c!.org_id, addon_id: a.id, org_name: c!.org_name, addon_name: a.name, quantity: q } })
    setBusy(null)
    if (!j.success) { toast(j.error || 'فشل', 'error'); return }
    await loadAddons(c!.org_id)
    if (on && j.proratedAmount > 0 && hasPhone) {
      await sendInvoice([{ label: `إضافة "${a.name}"${q > 1 ? ` × ${q}` : ''} — ${j.proratedDays} يوم لين تجديد الباقة`, amount: j.proratedAmount }], 'إرسال فاتورة الإضافة؟')
    }
  }

  async function remove() {
    if (!(await confirmDialog({ title: 'حذف نهائي', message: `حذف "${c!.org_name}" وكل بياناتها نهائياً (المنتجات، المخزون، المشتريات، الموظفين، الحساب)؟ ما يمكن التراجع.` }))) return
    setBusy('delete')
    const j = await adminFetch('/api/admin/delete-user', { method: 'POST', body: { userId: c!.id, orgId: c!.org_id || null } })
    setBusy(null)
    if (!j.success) { toast('فشل الحذف: ' + (j.details ? j.details.join('، ') : j.error || ''), 'error'); return }
    toast('تم الحذف', 'success')
    onClose(); onChanged()
  }

  const waLink = hasPhone ? `https://wa.me/${c.phone.replace(/\D/g, '')}` : ''

  return (
    <Drawer open onClose={onClose} width={560}
      title={c.org_name}
      subtitle={<span>{c.full_name}{hasPhone && <> · <span dir="ltr">{c.phone}</span></>}</span>}>

      {/* الملخص */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <Badge tone={st.tone}>{st.label}</Badge>
        <Badge tone={c.subscription_type === 'paid' ? 'info' : 'violet'}>{c.subscription_type === 'paid' ? 'مدفوع' : 'تجربة'}</Badge>
        <Badge tone="neutral">{planLabel(c.plan)} · {c.billing_cycle === 'yearly' ? 'سنوي' : 'شهري'}</Badge>
        {dl !== null && <Badge tone={dl <= 0 ? 'danger' : dl <= 7 ? 'warning' : 'neutral'}>{dl <= 0 ? 'الاشتراك منتهي' : `باقي ${dl} يوم`}</Badge>}
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
              <div style={{ fontSize: 13.5, fontWeight: 700, marginTop: 3 }}>{v}</div>
            </div>
          ))}
        </div>
        {hasPhone && (
          <a href={waLink} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 14, fontSize: 13, fontWeight: 700, color: A.primary, textDecoration: 'none' }}>
            <MessageCircle size={15} /> مراسلة على واتساب
          </a>
        )}
      </Card>

      {/* الاشتراك */}
      <Card title="الاشتراك" subtitle="تفعيل أو تجديد لمدة تبدأ من اليوم">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6, marginBottom: 12 }}>
          {DURATIONS.map(x => (
            <button key={x.d} onClick={() => setDays(x.d)} className="adm-btn"
              style={{ padding: '8px 4px', borderRadius: 8, fontSize: 12.5, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer',
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
              style={{ padding: '5px 12px', border: 'none', fontSize: 12, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', background: c.billing_cycle === cy ? A.primary : A.surface, color: c.billing_cycle === cy ? 'white' : A.text2 }}>
              {cy === 'monthly' ? 'شهري' : 'سنوي'}
            </button>
          ))}
        </div>
      }>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {PLAN_KEYS.map(k => {
            const on = c.plan === k
            const price = c.billing_cycle === 'yearly' ? `${PLAN_PRICING[k].yearly} ر.س/سنة` : `${PLAN_PRICING[k].monthly} ر.س/شهر`
            return (
              <button key={k} onClick={() => changePlan(k)} disabled={!!busy} className="adm-hover"
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 10, textAlign: 'right', fontFamily: 'inherit', cursor: on ? 'default' : 'pointer',
                  border: `1.5px solid ${on ? A.primary : A.border}`, background: on ? A.primarySoft : A.surface }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 800, color: on ? A.primary : A.text }}>{planLabel(k)} {on && '· الحالية'}</div>
                  <div style={{ fontSize: 11.5, color: A.text3, marginTop: 2 }}>{PLAN_LIMITS[k].desc}</div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 800, color: on ? A.primary : A.text2, whiteSpace: 'nowrap' }}>{price}</div>
              </button>
            )
          })}
        </div>
      </Card>

      {/* الإضافات */}
      <Card title="الإضافات" subtitle="تنتهي وتتجدد مع الباقة، والدفع بالتناسب">
        {loadingAddons ? <div style={{ fontSize: 12.5, color: A.text3 }}>جاري التحميل...</div>
          : addons.length === 0 ? <div style={{ fontSize: 12.5, color: A.text3 }}>ما فيه إضافات متاحة</div>
          : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {addons.map(a => {
                const on = !!a.subscription?.isValid
                const isQty = QTY_SLUGS.includes(a.slug)
                const q = qty[a.id] || (on ? a.subscription?.quantity || 1 : 1)
                const canEditQty = isQty && (!on || a.slug === 'extra_branch')
                return (
                  <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, border: `1px solid ${on ? A.primary + '55' : A.border}`, background: on ? A.primarySoft : A.surface }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{a.name}</div>
                      <div style={{ fontSize: 11.5, color: A.text3, marginTop: 2 }}>
                        {on ? `مفعّلة${isQty ? ` (${a.subscription?.quantity || 1})` : ''} حتى ${fmtDate(a.subscription.expires_at)}` : `${a.monthly_price} ر.س${isQty ? ' للوحدة' : ''} / شهر`}
                      </div>
                    </div>
                    {canEditQty && (
                      <input type="number" min={1} max={20} value={q} aria-label="الكمية"
                        onChange={e => setQty(p => ({ ...p, [a.id]: Math.max(1, Math.min(20, Number(e.target.value) || 1)) }))}
                        style={{ ...inputStyle, width: 58, padding: '6px', textAlign: 'center' }} />
                    )}
                    {on && a.slug === 'extra_branch' && <Btn small disabled={!!busy} onClick={() => setAddon(a, true, q)}>تحديث</Btn>}
                    <Btn small kind={on ? 'danger' : 'primary'} loading={busy === 'addon:' + a.id} disabled={!!busy && busy !== 'addon:' + a.id} onClick={() => setAddon(a, !on, q)}>
                      {on ? 'إلغاء' : 'تفعيل'}
                    </Btn>
                  </div>
                )
              })}
            </div>
          )}
      </Card>

      {/* الفاتورة */}
      <Card title="الفاتورة الدورية" subtitle="الباقة + الإضافات المفعّلة">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {bill.lines.map((l, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13, color: A.text2 }}>
              <span>{l.label}</span><span style={{ fontWeight: 700, color: A.text, whiteSpace: 'nowrap' }}>{l.amount} ر.س</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: `1px solid ${A.border}`, paddingTop: 8, marginTop: 4, fontSize: 14, fontWeight: 800 }}>
            <span>الإجمالي</span><span>{bill.total} ر.س</span>
          </div>
        </div>
        <div style={{ marginTop: 14 }}>
          <Btn full loading={busy === 'invoice'} disabled={!hasPhone || (!!busy && busy !== 'invoice')} onClick={() => sendInvoice()}>
            <Send size={14} /> إرسال الفاتورة عبر واتساب
          </Btn>
          {!hasPhone && <div style={{ fontSize: 12, color: A.danger, marginTop: 6 }}>ما فيه رقم جوال مسجّل لهذا العميل</div>}
        </div>
      </Card>

      {/* منطقة الخطر */}
      <Card title="إجراءات الحساب">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {c.status === 'active' && <Btn loading={busy === 'suspend'} disabled={!!busy} onClick={suspend}><PauseCircle size={15} /> إيقاف الحساب</Btn>}
          {c.status === 'suspended' && <Btn kind="primary" disabled={!!busy} onClick={() => activate(c.subscription_type === 'paid' ? 'paid' : 'trial', 30)}><PlayCircle size={15} /> إعادة تفعيل (شهر)</Btn>}
          <Btn kind="danger" loading={busy === 'delete'} disabled={!!busy} onClick={remove}><Trash2 size={15} /> حذف نهائي</Btn>
        </div>
      </Card>
    </Drawer>
  )
}
