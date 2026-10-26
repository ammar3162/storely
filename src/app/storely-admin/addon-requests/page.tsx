'use client'
import { useEffect, useState } from 'react'
import { Check, X, Phone } from 'lucide-react'
import { LEGACY_C, adminKey } from '../_admin/kit'

const C = LEGACY_C
const ST: Record<string, [string, string]> = {
  pending: ['قيد المراجعة', C.amber], approved: ['تمت الموافقة', C.green], rejected: ['مرفوض', C.red], cancelled: ['ألغاه العميل', C.text3],
}

export default function AddonRequestsPage() {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState('')

  async function load() {
    setLoading(true)
    const r = await fetch('/api/admin/addon-requests', { headers: { 'x-admin-key': adminKey() } })
    const j = await r.json().catch(() => ({}))
    setRows(j.requests || []); setLoading(false)
  }
  useEffect(() => { load() }, [])

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

  const pending = rows.filter(r => r.status === 'pending').length
  return (
    <div style={{ direction: 'rtl', maxWidth: 1000, margin: '0 auto' }}>
      <h1 style={{ color: C.text, fontSize: 24, fontWeight: 800, marginBottom: 8 }}>طلبات الإضافات</h1>
      <p style={{ color: C.text3, fontSize: 13, marginBottom: 20 }}>العملاء يطلبون الإضافات من صفحة الإضافات — توافق هنا وتتفعّل مباشرة ويوصلهم إشعار ({pending} معلّق)</p>
      {msg && <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12, marginBottom: 14, color: C.text, fontSize: 13 }}>{msg}</div>}
      {loading ? <div style={{ color: C.text3 }}>جاري التحميل...</div> : rows.length === 0 ? (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24, color: C.text3, fontSize: 13 }}>لا توجد طلبات بعد</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {rows.map(r => {
            const [label, color] = ST[r.status] || [r.status, C.text3]
            return (
              <div key={r.id} style={{ background: C.card, border: `1px solid ${r.status === 'pending' ? C.amber : C.border}`, borderRadius: 12, padding: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ color: C.text, fontSize: 16, fontWeight: 800 }}>{r.marketplace_addons?.name} <span style={{ color: C.text3, fontWeight: 600, fontSize: 13 }}>— {r.organizations?.name}</span></div>
                    <div style={{ color: C.text3, fontSize: 12, marginTop: 3 }}>{new Date(r.created_at).toLocaleString('ar-SA', { numberingSystem: 'latn' })}</div>
                  </div>
                  <span style={{ color, fontSize: 12, fontWeight: 800, border: `1px solid ${color}`, borderRadius: 8, padding: '4px 10px', height: 'fit-content' }}>{label}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 8, fontSize: 13, color: C.text2, marginTop: 12 }}>
                  <div>المطلوب: <b style={{ color: C.text }}>{r.branch_names?.length && r.marketplace_addons?.slug !== 'extra_staff' ? `${r.branch_names.length} فرع` : `${r.quantity} وحدة`}</b> ({(r.branch_names?.length && r.marketplace_addons?.slug !== 'extra_staff' ? r.branch_names.length : r.quantity) * (r.marketplace_addons?.monthly_price || 0)} ⃁/شهر)</div>
                  {r.branch_names?.length > 0 && <div>الفروع: <b style={{ color: C.text }}>{r.branch_names.join('، ')}</b></div>}
                  <div>الحالي: <b style={{ color: C.text }}>{r.current ? (r.current.branch_names?.length ? r.current.branch_names.join('، ') : `${r.current.quantity} وحدة`) : 'غير مشترك'}</b></div>
                  {r.owner_name && <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Phone size={13} /> {r.owner_name} <span dir="ltr">{r.owner_phone}</span></div>}
                  {r.note && <div>ملاحظة: {r.note}</div>}
                  {r.reason && <div>سبب الرفض: {r.reason}</div>}
                  {r.status === 'approved' && r.prorated_amount > 0 && <div>المستحق: <b style={{ color: C.text }}>{r.prorated_amount} ⃁</b></div>}
                  {r.decided_by_name && <div>بواسطة: {r.decided_by_name}</div>}
                </div>
                {r.status === 'pending' && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                    <button disabled={busy === r.id} onClick={() => decide(r, 'approve')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: C.green, color: 'white', border: 'none', borderRadius: 8, padding: '9px 16px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}><Check size={15} /> موافقة وتفعيل</button>
                    <button disabled={busy === r.id} onClick={() => decide(r, 'reject')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', color: C.red, border: `1px solid ${C.red}`, borderRadius: 8, padding: '9px 16px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}><X size={15} /> رفض</button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
