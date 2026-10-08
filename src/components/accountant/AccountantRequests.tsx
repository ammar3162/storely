'use client'
import { useEffect, useState } from 'react'
import { MessageSquarePlus, CheckCircle2, RotateCcw, X } from 'lucide-react'
import { colors, font, radius } from '@/lib/ds'
import { REQUEST_KINDS, type RequestKind } from '@/lib/accountantRequests'

// طلبات المحاسب على منشأة: إنشاء طلب (على فاتورة أو عام) + متابعة الردود
export type RequestTarget = { invoice_group?: string | null; purchase_id?: string | null; label?: string }
const STATUS: Record<string, { t: string; bg: string; c: string }> = {
  open: { t: '🟡 بانتظار الرد', bg: '#fffbeb', c: '#b45309' }, answered: { t: '💬 ردّت المنشأة', bg: '#eff6ff', c: '#1d4ed8' }, resolved: { t: '✅ انحل', bg: '#ecfdf5', c: '#047857' },
}
const fmt = (n: number) => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function RequestDialog({ orgId, target, onClose, onSent }: { orgId: string; target: RequestTarget | null; onClose: () => void; onSent: () => void }) {
  const kinds = (Object.keys(REQUEST_KINDS) as RequestKind[]).filter(k => target?.label ? k !== 'document' : ['document', 'explain', 'other'].includes(k))
  const [kind, setKind] = useState<RequestKind>(kinds[0])
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  async function send() {
    setBusy(true); setErr('')
    const j = await fetch('/api/accountant-portal/requests', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ org_id: orgId, kind, message: msg, invoice_group: target?.invoice_group || null, purchase_id: target?.invoice_group ? null : target?.purchase_id || null }) })
      .then(r => r.json()).catch(() => ({ error: 'تأكد من الإنترنت' }))
    setBusy(false)
    if (j.error) { setErr(j.error); return }
    onSent(); onClose()
  }
  const chip = (on: boolean): React.CSSProperties => ({ padding: '7px 12px', borderRadius: 99, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: font.family,
    border: `1.5px solid ${on ? colors.primary : colors.border}`, background: on ? colors.primaryLight : '#fff', color: on ? colors.primary : colors.text3 })
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} dir="rtl" style={{ background: '#fff', borderRadius: radius.xl, padding: 20, width: '100%', maxWidth: 440, fontFamily: font.family }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
          <div style={{ flex: 1, fontSize: 16, fontWeight: 800 }}>{target?.label ? 'طلب على فاتورة' : 'طلب للمنشأة'}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.text3 }}><X size={18} /></button>
        </div>
        {target?.label && <div style={{ fontSize: 12.5, color: colors.text3, marginBottom: 10 }}>{target.label}</div>}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const, marginBottom: 10 }}>
          {kinds.map(k => <button key={k} onClick={() => setKind(k)} style={chip(kind === k)}>{REQUEST_KINDS[k]}</button>)}
        </div>
        <textarea value={msg} onChange={e => setMsg(e.target.value)} maxLength={500} placeholder={kind === 'document' ? 'مثلاً: كشف حساب البنك لشهر سبتمبر' : 'ملاحظتك (اختياري)'}
          style={{ width: '100%', minHeight: 80, padding: 10, borderRadius: 10, border: `1px solid ${colors.border}`, fontFamily: font.family, fontSize: 13.5, boxSizing: 'border-box' as const, resize: 'vertical' as const }} />
        {err && <div style={{ color: colors.danger, fontSize: 12.5, marginTop: 6 }}>{err}</div>}
        <button onClick={send} disabled={busy} style={{ width: '100%', marginTop: 10, padding: 12, borderRadius: 10, border: 'none', background: colors.primary, color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: font.family, opacity: busy ? .6 : 1 }}>
          {busy ? 'جاري الإرسال...' : 'أرسل للمنشأة'}</button>
        <div style={{ fontSize: 11.5, color: colors.text4, marginTop: 8 }}>يوصل المالك إشعار، ولما يرد يوصلك إيميل.</div>
      </div>
    </div>
  )
}

export default function AccountantRequestsPanel({ orgId, refreshKey, onNew }: { orgId: string; refreshKey: number; onNew: () => void }) {
  const [list, setList] = useState<any[] | null>(null)
  const load = () => fetch(`/api/accountant-portal/requests?org_id=${orgId}`).then(r => r.json()).then(j => setList(j.requests || [])).catch(() => setList([]))
  useEffect(() => { load() }, [orgId, refreshKey])
  async function setStatus(id: string, status: 'resolved' | 'open') {
    await fetch('/api/accountant-portal/requests', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ org_id: orgId, id, status }) }).catch(() => {})
    load()
  }
  const open = (list || []).filter(r => r.status !== 'resolved').length
  return (
    <section style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: 16, marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <h2 style={{ flex: 1, fontSize: 15, fontWeight: 800, color: colors.primary, margin: 0 }}>طلباتي للمنشأة {open ? <span style={{ color: '#b45309' }}>({open} مفتوحة)</span> : null}</h2>
        <button onClick={onNew} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 9, border: `1px solid ${colors.primaryBorder}`, background: colors.primaryLight, color: colors.primary, fontSize: 12.5, fontWeight: 800, cursor: 'pointer', fontFamily: font.family }}>
          <MessageSquarePlus size={14} /> طلب عام</button>
      </div>
      {!list ? <div style={{ fontSize: 12.5, color: colors.text4 }}>جاري التحميل...</div>
        : !list.length ? <div style={{ fontSize: 12.5, color: colors.text4 }}>ما فيه طلبات. تقدر تطلب من جنب أي فاتورة ضريبية تحت، أو طلب عام.</div>
        : list.map(r => (
          <div key={r.id} style={{ borderTop: `1px solid ${colors.border}`, padding: '10px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' as const }}>
              <span style={{ fontSize: 11.5, fontWeight: 700, padding: '2px 9px', borderRadius: 99, background: STATUS[r.status].bg, color: STATUS[r.status].c }}>{STATUS[r.status].t}</span>
              <b style={{ fontSize: 13.5 }}>{REQUEST_KINDS[r.kind as RequestKind]}</b>
              <span style={{ fontSize: 11.5, color: colors.text4, marginInlineStart: 'auto' }} dir="ltr">{r.created_at.slice(0, 10)}</span>
            </div>
            {r.invoice && <div style={{ fontSize: 12, color: colors.text3, marginTop: 4 }}>فاتورة {r.invoice.supplier || '—'} · {r.invoice.date} · <span dir="ltr">{fmt(r.invoice.total)}</span>{r.invoice.invoice_number ? ` · ${r.invoice.invoice_number}` : ''}</div>}
            {r.message && <div style={{ fontSize: 13, marginTop: 4 }}>{r.message}</div>}
            {r.owner_reply && <div style={{ fontSize: 13, marginTop: 6, background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 9, padding: '7px 10px', whiteSpace: 'pre-line' as const }}><b>رد المنشأة:</b> {r.owner_reply}</div>}
            <div style={{ marginTop: 6 }}>
              {r.status !== 'resolved'
                ? <button onClick={() => setStatus(r.id, 'resolved')} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700, color: '#047857', background: 'none', border: 'none', cursor: 'pointer', fontFamily: font.family, padding: 0 }}><CheckCircle2 size={14} /> انحل — اقفل الطلب</button>
                : <button onClick={() => setStatus(r.id, 'open')} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700, color: colors.text3, background: 'none', border: 'none', cursor: 'pointer', fontFamily: font.family, padding: 0 }}><RotateCcw size={13} /> افتحه مرة ثانية</button>}
            </div>
          </div>
        ))}
    </section>
  )
}
