'use client'
import { useEffect, useState } from 'react'
import { X, History, Undo2 } from 'lucide-react'
import { api } from '@/lib/api-client'
import { colors, font } from '@/lib/ds'
import { toast } from '@/components/toast'
import { confirmDialog } from '@/components/ConfirmDialog'
import { ListSkeleton } from '@/components/PageSkeleton'

// سجل تعديلات إقفال أو فاتورة: مين عدّل (المنشأة/المحاسب)، وش تغيّر من وإلى، والمالك يرجّع آخر تعديل ما انرجع
const LABEL: Record<string, string> = {
  closing_date: 'التاريخ', total_sales: 'المبيعات', mada_amount: 'مدى', visa_amount: 'فيزا', mastercard_amount: 'ماستركارد', network_amount: 'الشبكة',
  cash_amount: 'الكاش', delivery_amount: 'التوصيل', total_purchases: 'المسحوبات', difference: 'الفرق', deficit_reason: 'سبب العجز',
  amount: 'المبلغ قبل الضريبة', has_vat: 'عليها ضريبة', invoice_number: 'رقم الفاتورة', supplier_vat_number: 'الرقم الضريبي للمورد',
}
const show = (v: unknown) => v === true ? 'نعم' : v === false ? 'لا' : v == null || v === '' ? '—' : typeof v === 'number' ? v.toFixed(2) : String(v)
function changes(before: any, after: any) {
  return Object.keys(LABEL).filter(k => after && JSON.stringify(before?.[k] ?? null) !== JSON.stringify(after?.[k] ?? null))
    .map(k => ({ k, from: show(before?.[k]), to: show(after?.[k]) }))
}

export default function EditHistoryDialog({ orgId, kind, id, title, onClose, onReverted }: { orgId: string; kind: 'closing' | 'purchase'; id: string; title: string; onClose: () => void; onReverted?: () => void }) {
  const [edits, setEdits] = useState<any[] | null>(null)
  const [busy, setBusy] = useState(false)
  const load = () => api.get('/api/data-edits', { org_id: orgId, kind, id }).then(j => setEdits(j.success ? (j.edits || []).filter((e: any) => !e.action || e.action === 'edit') : []))
  useEffect(() => { load() }, [orgId, kind, id])
  // اللي ينرجع: أحدث تعديل ما انرجع
  const latest = (edits || []).find(e => !e.reverted_at)

  async function revert(e: any) {
    if (!(await confirmDialog({ title: 'التراجع عن التعديل', message: 'هل تريد إعادة القيم إلى ما كانت عليه قبل هذا التعديل؟ ستُعاد معها الحسابات (العجز، والضريبة، وخصم الراتب).', confirmText: 'تراجع', type: 'warning' }))) return
    setBusy(true)
    const j = await api.post('/api/data-edits', { org_id: orgId, kind, id: kind === 'purchase' ? e.batch_id : e.id })
    setBusy(false)
    if (!j.success) { toast(j.error || 'تعذر الترجيع', 'error'); return }
    toast('تم التراجع عن التعديل')
    load(); onReverted?.()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, fontFamily: font.family }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,.45)', backdropFilter: 'blur(6px)' }} onClick={() => !busy && onClose()} />
      <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 520, maxHeight: '88vh', overflowY: 'auto', position: 'relative', boxShadow: '0 24px 60px rgba(0,0,0,.25)' }}>
        <div style={{ position: 'sticky', top: 0, background: '#fff', display: 'flex', alignItems: 'center', gap: 10, padding: '16px 20px', borderBottom: `1px solid ${colors.border}` }}>
          <span style={{ width: 36, height: 36, borderRadius: 10, background: colors.primaryLight, color: colors.primary, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><History size={17} /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 800 }}>سجل التعديلات</div>
            <div style={{ fontSize: 12, color: colors.text3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
          </div>
          <button onClick={() => !busy && onClose()} aria-label="إغلاق" style={{ background: colors.bg, border: 'none', borderRadius: 9, padding: 7, cursor: 'pointer', display: 'inline-flex' }}><X size={18} /></button>
        </div>
        <div style={{ padding: 16, display: 'grid', gap: 10 }}>
          {edits === null ? <ListSkeleton/>
            : !edits.length ? <div style={{ fontSize: 13, color: colors.text4, textAlign: 'center', padding: 20 }}>لا توجد تعديلات مسجّلة</div>
            : edits.map(e => {
              const acc = e.source === 'accountant'
              const list = changes(e.before, e.after)
              return (
                <div key={e.id} style={{ border: `1px solid ${colors.border}`, borderRadius: 12, padding: 12, opacity: e.reverted_at ? .6 : 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, borderRadius: 999, padding: '2px 8px', color: acc ? '#7c3aed' : colors.warning, background: acc ? '#f5f3ff' : colors.warningLight }}>{acc ? 'المحاسب' : 'المنشأة'}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: colors.text }}>{e.edited_by || '—'}</span>
                    <span style={{ fontSize: 11.5, color: colors.text4 }}>{new Date(e.created_at).toLocaleString('ar-SA-u-ca-gregory', { numberingSystem: 'latn', timeZone: 'Asia/Riyadh', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                    {e.reverted_at && <span style={{ fontSize: 11, fontWeight: 700, color: colors.text3 }}>· انرجع</span>}
                  </div>
                  {list.length ? list.map(c => (
                    <div key={c.k} style={{ fontSize: 12.5, color: colors.text2, padding: '2px 0' }}>
                      {LABEL[c.k]}: <span dir="ltr" style={{ color: colors.text4, textDecoration: 'line-through' }}>{c.from}</span> ← <span dir="ltr" style={{ fontWeight: 800, color: colors.text }}>{c.to}</span>
                    </div>
                  )) : <div style={{ fontSize: 12.5, color: colors.text4 }}>تعديل بدون تغيير بالأرقام</div>}
                  {latest?.id === e.id && (
                    <button onClick={() => revert(e)} disabled={busy}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 8, padding: '6px 12px', borderRadius: 9, border: `1px solid ${colors.border2}`, background: '#fff', color: colors.danger, fontSize: 12.5, fontWeight: 800, cursor: busy ? 'default' : 'pointer', fontFamily: font.family }}>
                      <Undo2 size={14} /> التراجع عن هذا التعديل
                    </button>
                  )}
                </div>
              )
            })}
        </div>
      </div>
    </div>
  )
}
