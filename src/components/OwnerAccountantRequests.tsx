'use client'
import { useEffect, useState } from 'react'
import { MessageSquareText } from 'lucide-react'
import { api } from '@/lib/api-client'
import { colors, radius, font, inp, btnPrimary } from '@/lib/ds'
import { toast } from '@/components/toast'
import { REQUEST_KINDS, type RequestKind } from '@/lib/accountantRequests'
import { normalizeVat, isValidVat } from '@/lib/taxInvoice'

// طلبات المحاسب (جهة المالك): يرد، ويكمّل رقم الفاتورة والرقم الضريبي مباشرة
const fmt = (n: number) => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const BADGE: Record<string, [string, string, string]> = { open: ['بانتظار ردك', '#fffbeb', '#b45309'], answered: ['تم الرد', '#eff6ff', '#1d4ed8'], resolved: ['انحل', '#ecfdf5', '#047857'] }

function RequestCard({ r, orgId, onDone }: { r: any; orgId: string; onDone: () => void }) {
  const [reply, setReply] = useState('')
  const [invNo, setInvNo] = useState(r.invoice?.invoice_number || '')
  const [vat, setVat] = useState(r.invoice?.supplier_vat_number || '')
  const [busy, setBusy] = useState(false)
  const canFix = !!r.invoice && (r.kind === 'missing_vat' || !r.invoice.invoice_number || !r.invoice.supplier_vat_number)
  const vatBad = !!vat.trim() && !isValidVat(normalizeVat(vat))
  async function send() {
    if (vatBad) { toast('الرقم الضريبي غير صحيح — ١٥ رقم يبدأ وينتهي بـ 3', 'warning'); return }
    setBusy(true)
    const j = await api.patch('/api/accountant-requests', { org_id: orgId, id: r.id, reply,
      ...(canFix && invNo.trim() !== (r.invoice?.invoice_number || '') ? { invoice_number: invNo } : {}),
      ...(canFix && vat.trim() !== (r.invoice?.supplier_vat_number || '') ? { supplier_vat_number: vat } : {}) })
    setBusy(false)
    if (!j.success) { toast(j.error || 'تعذر الإرسال', 'error'); return }
    toast('✅ وصل ردك للمحاسب'); setReply(''); onDone()
  }
  const [label, bg, c] = BADGE[r.status]
  return (
    <div style={{ border: `1px solid ${r.status === 'open' ? '#fde68a' : colors.border}`, borderRadius: 12, padding: 12, marginBottom: 8, background: r.status === 'open' ? '#fffdf5' : colors.surface }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' as const }}>
        <span style={{ fontSize: 11.5, fontWeight: 700, padding: '2px 9px', borderRadius: 99, background: bg, color: c }}>{label}</span>
        <b style={{ fontSize: 13.5 }}>{REQUEST_KINDS[r.kind as RequestKind]}</b>
        <span style={{ fontSize: 11.5, color: colors.text4, marginInlineStart: 'auto' }}>{r.accountant_users?.name || r.accountant_users?.email} · <span dir="ltr">{r.created_at.slice(0, 10)}</span></span>
      </div>
      {r.invoice && <div style={{ fontSize: 12.5, color: colors.text3, marginTop: 5 }}>
        فاتورة {r.invoice.supplier || '—'} · {r.invoice.date} · <span dir="ltr">{fmt(r.invoice.total)}</span>
        {r.invoice.invoice_image && /^https:\/\//.test(r.invoice.invoice_image) && <> · <a href={r.invoice.invoice_image} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', fontWeight: 700 }}>صورة الفاتورة</a></>}
      </div>}
      {r.message && <div style={{ fontSize: 13.5, marginTop: 5 }}>«{r.message}»</div>}
      {r.owner_reply && <div style={{ fontSize: 12.5, marginTop: 6, color: colors.text3, whiteSpace: 'pre-line' as const }}>ردك: {r.owner_reply}</div>}
      {r.status !== 'resolved' && <div style={{ marginTop: 8 }}>
        {canFix && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 6, marginBottom: 6 }}>
          <input value={invNo} onChange={e => setInvNo(e.target.value)} placeholder="رقم الفاتورة" dir="ltr" maxLength={50} style={inp()} />
          <input value={vat} onChange={e => setVat(e.target.value)} placeholder="الرقم الضريبي للمورد 3xxxxxxxxxxxxx3" dir="ltr" inputMode="numeric" maxLength={20} style={{ ...inp(), ...(vatBad ? { borderColor: colors.danger } : {}) }} />
        </div>}
        <div style={{ display: 'flex', gap: 6 }}>
          <input value={reply} onChange={e => setReply(e.target.value)} maxLength={500} placeholder={canFix ? 'ردك (اختياري لو كمّلت البيانات)' : 'اكتب ردك للمحاسب'} style={{ ...inp(), flex: 1 }} />
          <button onClick={send} disabled={busy} style={{ ...btnPrimary, padding: '9px 16px', opacity: busy ? .6 : 1 }}>{busy ? '...' : 'إرسال'}</button>
        </div>
      </div>}
    </div>
  )
}

export default function OwnerAccountantRequests({ orgId }: { orgId: string }) {
  const [list, setList] = useState<any[]>([])
  const [showDone, setShowDone] = useState(false)
  const load = () => api.get('/api/accountant-requests', { org_id: orgId }).then(j => { if (j.success) setList(j.requests || []) })
  useEffect(() => { if (orgId) load() }, [orgId])
  if (!list.length) return null
  const active = list.filter(r => r.status !== 'resolved'), done = list.filter(r => r.status === 'resolved')
  return (
    <div style={{ background: colors.surface, border: `1.5px solid ${active.some(r => r.status === 'open') ? '#fcd34d' : colors.border}`, borderRadius: radius.lg, padding: 16, marginBottom: 12, fontFamily: font.family }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <MessageSquareText size={19} color="#b45309" />
        <div style={{ fontSize: 15, fontWeight: 800 }}>طلبات المحاسب {active.length ? <span style={{ color: '#b45309' }}>({active.length})</span> : null}</div>
      </div>
      {active.map(r => <RequestCard key={r.id} r={r} orgId={orgId} onDone={load} />)}
      {!active.length && <div style={{ fontSize: 12.5, color: colors.text4, marginBottom: 6 }}>ما فيه طلبات مفتوحة 👌</div>}
      {done.length > 0 && <button onClick={() => setShowDone(s => !s)} style={{ fontSize: 12.5, color: colors.text3, background: 'none', border: 'none', cursor: 'pointer', fontFamily: font.family, padding: 0 }}>
        {showDone ? 'إخفاء' : 'عرض'} الطلبات المنحلة ({done.length})</button>}
      {showDone && done.map(r => <RequestCard key={r.id} r={r} orgId={orgId} onDone={load} />)}
    </div>
  )
}
