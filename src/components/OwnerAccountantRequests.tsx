'use client'
import { useEffect, useState } from 'react'
import { MessageSquareText, ChevronDown } from 'lucide-react'
import { api } from '@/lib/api-client'
import { colors, radius, font, inp, btnPrimary } from '@/lib/ds'
import { toast } from '@/components/toast'
import { REQUEST_KINDS, type RequestKind } from '@/lib/accountantRequests'
import { normalizeVat, isValidVat } from '@/lib/taxInvoice'
import { fileLink } from '@/lib/invoiceUrl'

// طلبات المحاسب (جهة المالك): يرد، ويكمّل رقم الفاتورة والرقم الضريبي مباشرة
const fmt = (n: number) => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const BADGE: Record<string, [string, string, string]> = { open: ['بانتظار ردك', '#FFFBEB', '#B45309'], answered: ['تم الرد', '#F3F5F6', '#4F6678'], resolved: ['تم الحل', '#ECFDF5', '#047857'] }
const dateAr = (iso: string) => new Date(iso).toLocaleDateString('ar-SA-u-ca-gregory-nu-latn', { day: 'numeric', month: 'short' })

function RequestCard({ r, orgId, onDone }: { r: any; orgId: string; onDone: () => void }) {
  const [reply, setReply] = useState('')
  const [invNo, setInvNo] = useState(r.invoice?.invoice_number || '')
  const [vat, setVat] = useState(r.invoice?.supplier_vat_number || '')
  const [busy, setBusy] = useState(false)
  const [open, setOpen] = useState(false)
  const canFix = !!r.invoice && (r.kind === 'missing_vat' || !r.invoice.invoice_number || !r.invoice.supplier_vat_number)
  const vatBad = !!vat.trim() && !isValidVat(normalizeVat(vat))
  async function send() {
    if (vatBad) { toast('الرقم الضريبي غير صحيح — يتكون من 15 رقماً ويبدأ وينتهي بالرقم 3', 'warning'); return }
    setBusy(true)
    const j = await api.patch('/api/accountant-requests', { org_id: orgId, id: r.id, reply,
      ...(canFix && invNo.trim() !== (r.invoice?.invoice_number || '') ? { invoice_number: invNo } : {}),
      ...(canFix && vat.trim() !== (r.invoice?.supplier_vat_number || '') ? { supplier_vat_number: vat } : {}) })
    setBusy(false)
    if (!j.success) { toast(j.error || 'تعذر الإرسال', 'error'); return }
    toast('وصل ردك إلى المحاسب'); setReply(''); onDone()
  }
  const [label, bg, c] = BADGE[r.status]
  return (
    <div style={{ border: `1px solid ${r.status === 'open' ? '#FDE68A' : colors.border}`, borderRadius: 12, marginBottom: 8, background: colors.surface, overflow: 'hidden' }}>
      {/* زر مطوي: الحالة والنوع والمحاسب، والضغط يفتح التفاصيل والرد */}
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: 12, background: 'none', border: 'none', cursor: 'pointer', fontFamily: font.family, textAlign: 'right' as const }}>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' as const }}>
            <b style={{ fontSize: 13.5, color: colors.text }}>{REQUEST_KINDS[r.kind as RequestKind]}</b>
            <span style={{ fontSize: 11.5, fontWeight: 700, padding: '2px 9px', borderRadius: 99, background: bg, color: c, whiteSpace: 'nowrap' as const }}>{label}</span>
          </span>
          <span style={{ display: 'block', fontSize: 12, color: colors.text4, marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
            {r.accountant_users?.name || r.accountant_users?.email} · {dateAr(r.created_at)}{r.invoice ? ` · فاتورة ${r.invoice.supplier || '—'}` : ''}
          </span>
        </span>
        <ChevronDown size={18} color={colors.text3} style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
      </button>
      {open && <div style={{ padding: '0 12px 12px', borderTop: `1px solid ${colors.border}` }}>
      {r.invoice && <div style={{ fontSize: 12.5, color: colors.text3, marginTop: 10 }}>
        فاتورة {r.invoice.supplier || '—'} · {r.invoice.date} · <span dir="ltr">{fmt(r.invoice.total)}</span>
        {r.invoice.invoice_image && /^https:\/\//.test(r.invoice.invoice_image) && <> · <a href={fileLink(r.invoice.invoice_image)} target="_blank" rel="noopener noreferrer" style={{ color: colors.primary, fontWeight: 700, textDecoration: 'underline' }}>صورة الفاتورة</a></>}
      </div>}
      {r.message && <div style={{ fontSize: 13.5, marginTop: 8, padding: '8px 10px', background: colors.bg, borderRadius: 8, lineHeight: 1.7 }}>«{r.message}»</div>}
      {r.owner_reply && <div style={{ fontSize: 12.5, marginTop: 6, color: colors.text3, whiteSpace: 'pre-line' as const }}>ردك: {r.owner_reply}</div>}
      {r.status !== 'resolved' && <div style={{ marginTop: 8 }}>
        {canFix && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 6, marginBottom: 6 }}>
          <input value={invNo} onChange={e => setInvNo(e.target.value)} placeholder="رقم الفاتورة" maxLength={50} style={inp()} />
          <input value={vat} onChange={e => setVat(e.target.value)} placeholder="الرقم الضريبي للمورد" inputMode="numeric" maxLength={20} style={{ ...inp(), ...(vatBad ? { borderColor: colors.danger } : {}) }} />
        </div>}
        <div style={{ display: 'flex', gap: 6 }}>
          <input value={reply} onChange={e => setReply(e.target.value)} maxLength={500} placeholder={canFix ? 'ردك (اختياري)' : 'اكتب ردك للمحاسب'} style={{ ...inp(), flex: 1 }} />
          <button onClick={send} disabled={busy} style={{ ...btnPrimary, padding: '9px 16px', opacity: busy ? .6 : 1 }}>{busy ? '...' : 'إرسال'}</button>
        </div>
      </div>}
      </div>}
    </div>
  )
}

export default function OwnerAccountantRequests({ orgId, showEmpty = false, onChange }: { orgId: string; showEmpty?: boolean; onChange?: () => void }) {
  const [list, setList] = useState<any[]>([])
  const [showDone, setShowDone] = useState(false)
  const load = () => api.get('/api/accountant-requests', { org_id: orgId }).then(j => { if (j.success) { setList(j.requests || []); onChange?.() } })
  useEffect(() => { if (orgId) load() }, [orgId])
  if (!list.length) return showEmpty ? <Empty icon={<MessageSquareText size={22} color={colors.text4} />} title="لا توجد طلبات من المحاسب" text="عندما يحتاج محاسبك شيئاً — رقماً ضريبياً ناقصاً أو مستنداً — يصلك هنا وترد عليه بضغطة واحدة." /> : null
  const active = list.filter(r => r.status !== 'resolved'), done = list.filter(r => r.status === 'resolved')
  return (
    <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: 16, marginBottom: 12, fontFamily: font.family }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <MessageSquareText size={19} color={colors.text} />
        <div style={{ fontSize: 15, fontWeight: 800 }}>طلبات المحاسب {active.length ? <span style={{ color: '#B45309' }}>({active.length})</span> : null}</div>
      </div>
      {active.map(r => <RequestCard key={r.id} r={r} orgId={orgId} onDone={load} />)}
      {!active.length && <div style={{ fontSize: 12.5, color: colors.text4, marginBottom: 6 }}>لا توجد طلبات مفتوحة</div>}
      {done.length > 0 && <button onClick={() => setShowDone(s => !s)} aria-expanded={showDone}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', marginTop: 4, fontSize: 13, fontWeight: 700, color: colors.text3, background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 10, cursor: 'pointer', fontFamily: font.family }}>
        <span style={{ flex: 1, textAlign: 'right' as const }}>الطلبات المكتملة ({done.length})</span>
        <ChevronDown size={16} style={{ transform: showDone ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
      </button>}
      {showDone && <div style={{ marginTop: 8 }} />}
      {showDone && done.map(r => <RequestCard key={r.id} r={r} orgId={orgId} onDone={load} />)}
    </div>
  )
}

export function Empty({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div style={{ textAlign: 'center' as const, padding: '36px 20px', border: `1.5px dashed ${colors.border}`, borderRadius: radius.lg, fontFamily: font.family }}>
      <div style={{ width: 46, height: 46, borderRadius: 14, background: colors.bg, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>{icon}</div>
      <div style={{ fontSize: 14.5, fontWeight: 800, color: colors.text }}>{title}</div>
      <div style={{ fontSize: 12.5, color: colors.text3, marginTop: 4, lineHeight: 1.7, maxWidth: 420, marginInline: 'auto' }}>{text}</div>
    </div>
  )
}
