'use client'
import { adminPlanLabel } from '@/lib/planPricing'
import { useEffect, useState } from 'react'
import { Check, X, Phone, ArrowUpCircle, Trash2 } from 'lucide-react'
import { A, Badge, Btn, Card, Empty, Loading, Notice, PageHeader, adminKey, fmtDate, type Tone } from '../_admin/kit'

const ST: Record<string, [string, Tone]> = {
  pending: ['قيد المراجعة', 'warning'], approved: ['تمت الموافقة', 'primary'], rejected: ['مرفوض', 'danger'], cancelled: ['ألغاه العميل', 'neutral'],
}

export default function AddonRequestsPage() {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState('')
  const [planReqs, setPlanReqs] = useState<any[]>([])
  // أسماء الباقات من نفس المصدر (الجديدة + القديمة بعلامة «قديمة» + «ابنِ باقتك»)
  const PLAN_AR: Record<string, string> = Object.fromEntries(['essential','ops','full','custom','basic','pro','advanced'].map(k => [k, adminPlanLabel(k)]))

  async function load() {
    setLoading(true)
    const r = await fetch('/api/admin/addon-requests', { headers: { 'x-admin-key': adminKey() } })
    const j = await r.json().catch(() => ({}))
    setRows(j.requests || []); setLoading(false)
    const pr = await fetch('/api/admin/plan-requests', { headers: { 'x-admin-key': adminKey() } })
    const pj = await pr.json().catch(() => ({}))
    setPlanReqs(pj.requests || [])
  }
  useEffect(() => { load() }, [])

  async function remove(r: any) {
    const warn = r.status === 'pending' ? '\n\nالطلب لسا معلّق — الحذف ما يرفضه ولا يوصل العميل إشعار.' : '\n\nالإضافة المفعّلة ما تتأثر — ينحذف الطلب من القائمة بس.'
    if (!confirm(`حذف طلب «${r.marketplace_addons?.name}» لـ ${r.organizations?.name}؟${warn}`)) return
    setBusy(r.id); setMsg('')
    const res = await fetch(`/api/admin/addon-requests?id=${r.id}`, { method: 'DELETE', headers: { 'x-admin-key': adminKey() } })
    const j = await res.json().catch(() => ({}))
    setBusy(null)
    if (!res.ok) { setMsg(j.error || 'فشل الحذف'); return }
    setRows(prev => prev.filter(x => x.id !== r.id)); setMsg('تم حذف الطلب')
  }

  async function removePlan(r: any) {
    if (!confirm(`حذف طلب ترقية «${r.organizations?.name}»؟${r.status === 'pending' ? '\n\nالطلب لسا معلّق — الحذف ما يرفضه ولا يوصل العميل إشعار.' : '\n\nباقة العميل الحالية ما تتأثر — ينحذف الطلب من القائمة بس.'}`)) return
    setBusy(r.id); setMsg('')
    const res = await fetch(`/api/admin/plan-requests?id=${r.id}`, { method: 'DELETE', headers: { 'x-admin-key': adminKey() } })
    const j = await res.json().catch(() => ({}))
    setBusy(null)
    if (!res.ok) { setMsg(j.error || 'فشل الحذف'); return }
    setPlanReqs(prev => prev.filter(x => x.id !== r.id)); setMsg('تم حذف الطلب')
  }

  async function decide(r: any, action: 'approve' | 'reject') {
    let reason = ''
    if (action === 'reject') { const v = prompt('سبب الرفض (اختياري — يوصل للعميل)'); if (v === null) return; reason = v }
    else if (!confirm(`تفعيل «${r.marketplace_addons?.name}» لـ ${r.organizations?.name}؟`)) return
    setBusy(r.id); setMsg('')
    const res = await fetch('/api/admin/addon-requests', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey() }, body: JSON.stringify({ id: r.id, action, reason }) })
    const j = await res.json().catch(() => ({}))
    setBusy(null)
    if (!res.ok) { setMsg(j.error || 'فشل'); return }
    setMsg(action === 'approve' ? `تم التفعيل${j.proratedAmount > 0 ? ` — المستحق ${j.proratedAmount} ⃁` : ''}، ووصل العميل إشعار` : 'تم الرفض ووصل العميل إشعار')
    load()
  }

  async function decidePlan(r: any, action: 'approve' | 'reject') {
    let reason = ''
    if (action === 'reject') { const v = prompt('سبب الرفض (اختياري — يوصل للعميل)'); if (v === null) return; reason = v }
    else if (!confirm(`ترقية «${r.organizations?.name}» إلى ${PLAN_AR[r.target_plan]}؟ الإضافات المضمّنة بالباقة (الكاشير، الموظفين، الذكاء، الربحية) تنلغى عنه.`)) return
    setBusy(r.id); setMsg('')
    const res = await fetch('/api/admin/plan-requests', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey() }, body: JSON.stringify({ id: r.id, action, reason }) })
    const j = await res.json().catch(() => ({}))
    setBusy(null)
    if (!res.ok) { setMsg(j.error || 'فشل'); return }
    setMsg(action === 'approve' ? `تمت الترقية إلى ${PLAN_AR[r.target_plan]} ووصل العميل إشعار` : 'تم الرفض ووصل العميل إشعار')
    load()
  }

  const pending = rows.filter(r => r.status === 'pending').length
  const pendingPlans = planReqs.filter(r => r.status === 'pending').length
  const addonQty = (r: any) => (r.branch_names?.length && r.marketplace_addons?.slug !== 'extra_staff' ? r.branch_names.length : r.quantity)
  const pendingStyle = (r: any) => (r.status === 'pending' ? { borderColor: '#fedf89' } : undefined)

  return (
    <>
      <PageHeader title="طلبات الإضافات والترقية"
        subtitle={`العملاء يطلبون الإضافات والترقية من النظام — توافق هنا وتتفعّل مباشرة ويوصلهم إشعار · ${pending + pendingPlans} معلّق`} />

      {msg && <div style={{ marginBottom: 16 }}><Notice tone="info">{msg}</Notice></div>}

      {planReqs.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 15, fontWeight: 700, color: A.text, marginBottom: 10 }}><ArrowUpCircle size={17} /> طلبات الترقية</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {planReqs.map(r => {
              const [label, tone] = ST[r.status] || [r.status, 'neutral' as Tone]
              return (
                <Card key={r.id} style={pendingStyle(r)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: A.text }}>{r.organizations?.name} <span style={{ color: A.text2, fontWeight: 600, fontSize: 13 }}>· من {PLAN_AR[r.current_plan] || '—'} إلى {PLAN_AR[r.target_plan]}</span></div>
                      <div style={{ fontSize: 12, color: A.text3, marginTop: 3 }}>{fmtDate(r.created_at, true)}{r.bill_at_request != null ? ` · فاتورته وقت الطلب ${r.bill_at_request} ⃁/شهر` : ''}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 'fit-content' }}>
                      <Badge tone={tone}>{label}</Badge>
                      <Btn small kind="danger" disabled={busy === r.id} onClick={() => removePlan(r)} title="حذف الطلب"><Trash2 size={13} /> حذف</Btn>
                    </div>
                  </div>
                  {r.reason && <div style={{ fontSize: 13, color: A.text2, marginTop: 8 }}>سبب الرفض: {r.reason}</div>}
                  {r.status === 'pending' && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                      <Btn kind="primary" loading={busy === r.id} onClick={() => decidePlan(r, 'approve')}><Check size={15} /> موافقة وترقية</Btn>
                      <Btn kind="danger" disabled={busy === r.id} onClick={() => decidePlan(r, 'reject')}><X size={15} /> رفض</Btn>
                    </div>
                  )}
                </Card>
              )
            })}
          </div>
        </div>
      )}

      <div style={{ fontSize: 15, fontWeight: 700, color: A.text, marginBottom: 10 }}>طلبات الإضافات</div>
      {loading ? <Loading /> : rows.length === 0 ? <Card><Empty title="لا توجد طلبات إضافات بعد" /></Card> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {rows.map(r => {
            const [label, tone] = ST[r.status] || [r.status, 'neutral' as Tone]
            return (
              <Card key={r.id} style={pendingStyle(r)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: A.text }}>{r.marketplace_addons?.name} <span style={{ color: A.text2, fontWeight: 600, fontSize: 13 }}>· {r.organizations?.name}</span></div>
                    <div style={{ fontSize: 12, color: A.text3, marginTop: 3 }}>{fmtDate(r.created_at, true)}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 'fit-content' }}>
                    <Badge tone={tone}>{label}</Badge>
                    <Btn small kind="danger" disabled={busy === r.id} onClick={() => remove(r)} title="حذف الطلب"><Trash2 size={13} /> حذف</Btn>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 8, fontSize: 13, color: A.text2, marginTop: 12 }}>
                  <div>المطلوب: <b style={{ color: A.text }}>{r.branch_names?.length && r.marketplace_addons?.slug !== 'extra_staff' ? `${r.branch_names.length} فرع` : `${r.quantity} وحدة`}</b> ({addonQty(r) * (r.marketplace_addons?.monthly_price || 0)} ⃁/شهر)</div>
                  {r.branch_names?.length > 0 && <div>الفروع: <b style={{ color: A.text }}>{r.branch_names.join('، ')}</b></div>}
                  <div>الحالي: <b style={{ color: A.text }}>{r.current ? (r.current.branch_names?.length ? r.current.branch_names.join('، ') : `${r.current.quantity} وحدة`) : 'غير مشترك'}</b></div>
                  {r.owner_name && <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Phone size={13} /> {r.owner_name} <span dir="ltr">{r.owner_phone}</span></div>}
                  {r.note && <div>ملاحظة: {r.note}</div>}
                  {r.reason && <div>سبب الرفض: {r.reason}</div>}
                  {r.status === 'approved' && r.prorated_amount > 0 && <div>المستحق: <b style={{ color: A.text }}>{r.prorated_amount} ⃁</b></div>}
                  {r.decided_by_name && <div>بواسطة: {r.decided_by_name}</div>}
                </div>
                {r.status === 'pending' && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
                    <Btn kind="primary" loading={busy === r.id} onClick={() => decide(r, 'approve')}><Check size={15} /> موافقة وتفعيل</Btn>
                    <Btn kind="danger" disabled={busy === r.id} onClick={() => decide(r, 'reject')}><X size={15} /> رفض</Btn>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </>
  )
}
