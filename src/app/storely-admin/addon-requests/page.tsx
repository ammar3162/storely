'use client'
import { adminPlanLabel } from '@/lib/planPricing'
import { useEffect, useState } from 'react'
import { Check, X, Phone, ArrowUpCircle, Trash2, PackagePlus, RefreshCw, Hourglass, CircleCheck, ArrowLeft } from 'lucide-react'
import { confirmDialog } from '@/components/ConfirmDialog'
import { A, Avatar, Badge, Btn, Card, Empty, Loading, Notice, PageHeader, Stack, Stat, StatGrid, Tabs, adminKey, fmtDate, inputStyle, type Tone } from '../_admin/kit'

const ST: Record<string, [string, Tone]> = {
  pending: ['قيد المراجعة', 'warning'], approved: ['تمت الموافقة', 'primary'], rejected: ['مرفوض', 'danger'], cancelled: ['ألغاه العميل', 'neutral'],
}
// أسماء الباقات من نفس المصدر (الجديدة + القديمة بعلامة «قديمة» + «ابنِ باقتك»)
const PLAN_AR: Record<string, string> = Object.fromEntries(['essential', 'ops', 'full', 'custom', 'basic', 'pro', 'advanced'].map(k => [k, adminPlanLabel(k)]))

type View = 'pending' | 'all'

export default function AddonRequestsPage() {
  const [rows, setRows] = useState<any[]>([])
  const [planReqs, setPlanReqs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ t: string; bad?: boolean } | null>(null)
  const [view, setView] = useState<View>('pending')
  const [rejecting, setRejecting] = useState<{ id: string; reason: string } | null>(null)

  async function load() {
    setLoading(true)
    const [r, pr] = await Promise.all([
      fetch('/api/admin/addon-requests', { headers: { 'x-admin-key': adminKey() } }).then(x => x.json()).catch(() => ({})),
      fetch('/api/admin/plan-requests', { headers: { 'x-admin-key': adminKey() } }).then(x => x.json()).catch(() => ({})),
    ])
    setRows(r.requests || []); setPlanReqs(pr.requests || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function call(url: string, init: RequestInit) {
    const res = await fetch(url, { ...init, headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey() } })
    const j = await res.json().catch(() => ({}))
    return { ok: res.ok, ...j }
  }

  async function remove(r: any, kind: 'addon' | 'plan') {
    const name = kind === 'addon' ? `طلب «${r.marketplace_addons?.name}» للمنشأة ${r.organizations?.name}` : `طلب ترقية «${r.organizations?.name}»`
    const note = r.status === 'pending'
      ? 'الطلب ما زال قيد المراجعة؛ الحذف لا يعني رفضه ولن يصل العميل أي إشعار.'
      : kind === 'addon' ? 'لن تتأثر الإضافة المفعّلة، وسيُحذف الطلب من القائمة فقط.' : 'لن تتأثر باقة العميل الحالية، وسيُحذف الطلب من القائمة فقط.'
    if (!(await confirmDialog({ title: 'حذف الطلب', message: `حذف ${name}؟\n\n${note}` }))) return
    setBusy(r.id); setMsg(null)
    const j = await call(`/api/admin/${kind === 'addon' ? 'addon' : 'plan'}-requests?id=${r.id}`, { method: 'DELETE' })
    setBusy(null)
    if (!j.ok) { setMsg({ t: j.error || 'تعذّر الحذف', bad: true }); return }
    if (kind === 'addon') setRows(prev => prev.filter(x => x.id !== r.id)); else setPlanReqs(prev => prev.filter(x => x.id !== r.id))
    setMsg({ t: 'تم حذف الطلب' })
  }

  async function approve(r: any, kind: 'addon' | 'plan') {
    const ok = await confirmDialog(kind === 'addon'
      ? { title: 'الموافقة على الإضافة', message: `تفعيل «${r.marketplace_addons?.name}» للمنشأة ${r.organizations?.name}؟ سيصل العميل إشعار بالتفعيل.`, confirmText: 'موافقة وتفعيل', type: 'success' }
      : { title: 'الموافقة على الترقية', message: `ترقية «${r.organizations?.name}» إلى ${PLAN_AR[r.target_plan]}؟ تُلغى الإضافات المضمّنة في الباقة الجديدة تلقائياً.`, confirmText: 'موافقة وترقية', type: 'success' })
    if (!ok) return
    await decide(r, kind, 'approve', '')
  }

  async function decide(r: any, kind: 'addon' | 'plan', action: 'approve' | 'reject', reason: string) {
    setBusy(r.id); setMsg(null)
    const j = await call(`/api/admin/${kind === 'addon' ? 'addon' : 'plan'}-requests`, { method: 'POST', body: JSON.stringify({ id: r.id, action, reason }) })
    setBusy(null)
    if (!j.ok) { setMsg({ t: j.error || 'تعذّر تنفيذ الإجراء', bad: true }); return }
    setRejecting(null)
    setMsg({ t: action === 'reject' ? 'تم رفض الطلب وإشعار العميل'
      : kind === 'plan' ? `تمت الترقية إلى ${PLAN_AR[r.target_plan]} وإشعار العميل`
      : `تم التفعيل وإشعار العميل${j.proratedAmount > 0 ? `، والمبلغ المستحق ${j.proratedAmount} ⃁` : ''}` })
    load()
  }

  const pendingAddons = rows.filter(r => r.status === 'pending')
  const pendingPlans = planReqs.filter(r => r.status === 'pending')
  const approved = [...rows, ...planReqs].filter(r => r.status === 'approved').length
  const shownPlans = view === 'pending' ? pendingPlans : planReqs
  const shownAddons = view === 'pending' ? pendingAddons : rows
  const addonQty = (r: any) => (r.branch_names?.length && r.marketplace_addons?.slug !== 'extra_staff' ? r.branch_names.length : r.quantity)

  const actions = (r: any, kind: 'addon' | 'plan') => r.status === 'pending' && (
    rejecting?.id === r.id ? (
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: 16, paddingTop: 16, borderTop: `1px solid ${A.border}` }}>
        <input autoFocus value={rejecting?.reason ?? ""} onChange={e => setRejecting({ id: r.id, reason: e.target.value })} maxLength={300}
          placeholder="سبب الرفض (اختياري، ويصل إلى العميل)" style={{ ...inputStyle, flex: '1 1 260px' }} />
        <Btn kind="danger" loading={busy === r.id} onClick={() => decide(r, kind, "reject", (rejecting?.reason ?? "").trim())}><X size={15} /> تأكيد الرفض</Btn>
        <Btn kind="ghost" onClick={() => setRejecting(null)}>تراجع</Btn>
      </div>
    ) : (
      <div style={{ display: 'flex', gap: 8, marginTop: 16, paddingTop: 16, borderTop: `1px solid ${A.border}`, flexWrap: 'wrap' }}>
        <Btn kind="primary" loading={busy === r.id} onClick={() => approve(r, kind)}><Check size={15} /> {kind === 'plan' ? 'موافقة وترقية' : 'موافقة وتفعيل'}</Btn>
        <Btn kind="danger" disabled={busy === r.id} onClick={() => setRejecting({ id: r.id, reason: '' })}><X size={15} /> رفض</Btn>
      </div>
    )
  )

  const head = (r: any, title: React.ReactNode, sub: React.ReactNode, kind: 'addon' | 'plan') => {
    const [label, tone] = ST[r.status] || [r.status, 'neutral' as Tone]
    return (
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <Avatar name={r.organizations?.name} size={40} />
        <div style={{ flex: '1 1 240px', minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: A.text }}>{title}</div>
          <div style={{ fontSize: 12.5, color: A.text3, marginTop: 3 }}>{sub}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Badge tone={tone}>{label}</Badge>
          <Btn small kind="ghost" disabled={busy === r.id} onClick={() => remove(r, kind)} title="حذف الطلب"><Trash2 size={14} /></Btn>
        </div>
      </div>
    )
  }

  return (
    <>
      <PageHeader title="طلبات الإضافات والترقية"
        subtitle="يطلب العملاء الإضافات والترقية من داخل النظام، وعند موافقتك تُفعَّل مباشرة ويصلهم إشعار"
        actions={<Btn onClick={load} loading={loading}><RefreshCw size={14} /> تحديث</Btn>} />

      <Stack>
        <StatGrid>
          <Stat icon={Hourglass} label="قيد المراجعة" value={pendingAddons.length + pendingPlans.length} tone={pendingAddons.length + pendingPlans.length ? 'warning' : 'default'} />
          <Stat icon={PackagePlus} label="طلبات الإضافات" value={rows.length} hint={`${pendingAddons.length} قيد المراجعة`} />
          <Stat icon={ArrowUpCircle} label="طلبات الترقية" value={planReqs.length} hint={`${pendingPlans.length} قيد المراجعة`} />
          <Stat icon={CircleCheck} label="تمت الموافقة عليها" value={approved} tone="primary" />
        </StatGrid>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <Tabs items={[{ k: 'pending' as View, l: 'قيد المراجعة', n: pendingAddons.length + pendingPlans.length }, { k: 'all' as View, l: 'كل الطلبات', n: rows.length + planReqs.length }]} value={view} onChange={setView} />
        </div>

        {msg && <Notice tone={msg.bad ? 'danger' : 'primary'}>{msg.t}</Notice>}

        {loading ? <Loading /> : shownPlans.length + shownAddons.length === 0 ? (
          <Card><Empty icon={CircleCheck} title={view === 'pending' ? 'لا توجد طلبات قيد المراجعة' : 'لا توجد طلبات بعد'} hint={view === 'pending' ? 'تظهر هنا الطلبات الجديدة فور وصولها، ويظهر عددها في القائمة الجانبية' : undefined} /></Card>
        ) : (<>
          {shownPlans.length > 0 && (
            <Section icon={ArrowUpCircle} title="طلبات الترقية" n={shownPlans.length}>
              {shownPlans.map(r => (
                <Card key={r.id} style={r.status === 'pending' ? { borderColor: '#fedf89' } : undefined}>
                  {head(r, r.organizations?.name,
                    <>{fmtDate(r.created_at, true)}{r.bill_at_request != null ? ` · فاتورته وقت الطلب ${r.bill_at_request} ⃁ شهرياً` : ''}</>, 'plan')}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, flexWrap: 'wrap', fontSize: 13.5 }}>
                    <Badge tone="neutral">{PLAN_AR[r.current_plan] || '—'}</Badge>
                    <ArrowLeft size={15} color={A.text3} />
                    <Badge tone="primary">{PLAN_AR[r.target_plan]}</Badge>
                  </div>
                  {r.reason && <div style={{ fontSize: 13, color: A.text2, marginTop: 10 }}>سبب الرفض: {r.reason}</div>}
                  {actions(r, 'plan')}
                </Card>
              ))}
            </Section>
          )}

          {shownAddons.length > 0 && (
            <Section icon={PackagePlus} title="طلبات الإضافات" n={shownAddons.length}>
              {shownAddons.map(r => (
                <Card key={r.id} style={r.status === 'pending' ? { borderColor: '#fedf89' } : undefined}>
                  {head(r, <>{r.marketplace_addons?.name} <span style={{ color: A.text2, fontWeight: 500, fontSize: 13.5 }}>· {r.organizations?.name}</span></>, fmtDate(r.created_at, true), 'addon')}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(220px,100%),1fr))', gap: 10, marginTop: 14 }}>
                    <Info label="المطلوب">{r.branch_names?.length && r.marketplace_addons?.slug !== 'extra_staff' ? `${r.branch_names.length} فرع` : `${r.quantity} وحدة`} <span style={{ color: A.text3, fontWeight: 400 }}>({addonQty(r) * (r.marketplace_addons?.monthly_price || 0)} ⃁ شهرياً)</span></Info>
                    {r.branch_names?.length > 0 && <Info label="الفروع">{r.branch_names.join('، ')}</Info>}
                    <Info label="الاشتراك الحالي">{r.current ? (r.current.branch_names?.length ? r.current.branch_names.join('، ') : `${r.current.quantity} وحدة`) : 'غير مشترك'}</Info>
                    {r.owner_name && <Info label="المالك"><span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Phone size={13} color={A.text3} />{r.owner_name} <span dir="ltr">{r.owner_phone}</span></span></Info>}
                    {r.status === 'approved' && r.prorated_amount > 0 && <Info label="المبلغ المستحق">{r.prorated_amount} ⃁</Info>}
                    {r.decided_by_name && <Info label="بواسطة">{r.decided_by_name}</Info>}
                  </div>
                  {r.note && <div style={{ fontSize: 13, color: A.text2, marginTop: 12, padding: '10px 12px', background: A.muted, borderRadius: 10 }}>ملاحظة العميل: {r.note}</div>}
                  {r.reason && <div style={{ fontSize: 13, color: A.text2, marginTop: 10 }}>سبب الرفض: {r.reason}</div>}
                  {actions(r, 'addon')}
                </Card>
              ))}
            </Section>
          )}
        </>)}
      </Stack>
    </>
  )
}

function Section({ icon: Icon, title, n, children }: { icon: React.ComponentType<{ size?: number }>; title: string; n: number; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 600, color: A.text, marginBottom: 12 }}>
        <span style={{ color: A.text3, display: 'flex' }}><Icon size={17} /></span>{title}<span style={{ fontSize: 12.5, color: A.text3, fontWeight: 500 }}>({n})</span>
      </div>
      <Stack gap={12}>{children}</Stack>
    </div>
  )
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 12, color: A.text3, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13.5, color: A.text, fontWeight: 500 }}>{children}</div>
    </div>
  )
}
