'use client'
import { useState } from 'react'
import { X, Pencil } from 'lucide-react'
import { colors, font, inp } from '@/lib/ds'
import NumberInput from '@/components/NumberInput'

// المحاسب يعدّل فاتورة مشتريات: «invoice» = بيانات الفاتورة كلها (رقمها والرقم الضريبي)، «line» = سطر واحد (المبلغ والضريبة) مع بيانات الفاتورة
export type PurchaseEditTarget = { id: string; mode: 'invoice' | 'line'; label: string; amount?: number; hasVat?: boolean; invoiceNumber?: string | null; supplierVat?: string | null }

export default function PurchaseEditDialog({ target, onClose, submit }: { target: PurchaseEditTarget; onClose: () => void
  submit: (payload: Record<string, unknown>) => Promise<{ success?: boolean; error?: string }> }) {
  const [f, setF] = useState({ amount: String(target.amount ?? ''), has_vat: target.hasVat !== false, invoice_number: target.invoiceNumber || '', supplier_vat_number: target.supplierVat || '' })
  const [busy, setBusy] = useState(false), [err, setErr] = useState('')
  const lbl: React.CSSProperties = { display: 'block', fontSize: 12.5, fontWeight: 700, color: colors.text2, marginBottom: 5 }
  const vatOk = !f.supplier_vat_number || /^3\d{13}3$/.test(f.supplier_vat_number.replace(/\s/g, ''))

  async function save() {
    setErr('')
    if (!vatOk) return setErr('الرقم الضريبي ١٥ رقم يبدأ وينتهي بـ 3')
    const payload: Record<string, unknown> = { invoice_number: f.invoice_number, supplier_vat_number: f.supplier_vat_number.replace(/\s/g, '') }
    if (target.mode === 'line') {
      if (f.amount === '' || !(Number(f.amount) >= 0)) return setErr('اكتب المبلغ')
      payload.amount = Number(f.amount); payload.has_vat = f.has_vat
    }
    setBusy(true)
    const j = await submit(payload)
    setBusy(false)
    if (!j.success) return setErr(j.error || 'تعذر حفظ التعديل')
    onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, fontFamily: font.family }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,.45)', backdropFilter: 'blur(6px)' }} onClick={() => !busy && onClose()} />
      <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 460, maxHeight: '92vh', overflowY: 'auto', position: 'relative', boxShadow: '0 24px 60px rgba(0,0,0,.25)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 20px', borderBottom: `1px solid ${colors.border}` }}>
          <span style={{ width: 36, height: 36, borderRadius: 10, background: colors.primaryLight, color: colors.primary, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Pencil size={17} /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 800 }}>{target.mode === 'invoice' ? 'تعديل بيانات الفاتورة' : 'تعديل سطر المشتريات'}</div>
            <div style={{ fontSize: 12, color: colors.text3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{target.label} · يوصل المنشأة إشعار بالتعديل</div>
          </div>
          <button onClick={() => !busy && onClose()} aria-label="إغلاق" style={{ background: colors.bg, border: 'none', borderRadius: 9, padding: 7, cursor: 'pointer', display: 'inline-flex' }}><X size={18} /></button>
        </div>
        <div style={{ padding: 20, display: 'grid', gap: 14 }}>
          {target.mode === 'line' && <>
            <div>
              <label style={lbl}>المبلغ قبل الضريبة</label>
              <NumberInput value={f.amount} onChange={e => setF(x => ({ ...x, amount: e.target.value }))} style={{ ...inp(), fontSize: 16 }} />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, fontWeight: 700, color: colors.text, cursor: 'pointer' }}>
              <input type="checkbox" checked={f.has_vat} onChange={e => setF(x => ({ ...x, has_vat: e.target.checked }))} style={{ width: 17, height: 17, accentColor: colors.primary }} />
              عليها ضريبة قيمة مضافة ١٥٪
            </label>
          </>}
          <div>
            <label style={lbl}>رقم الفاتورة</label>
            <input value={f.invoice_number} onChange={e => setF(x => ({ ...x, invoice_number: e.target.value }))} maxLength={60} dir="ltr" style={{ ...inp(), fontSize: 16, textAlign: 'right' }} />
          </div>
          <div>
            <label style={lbl}>الرقم الضريبي للمورد</label>
            <input value={f.supplier_vat_number} onChange={e => setF(x => ({ ...x, supplier_vat_number: e.target.value }))} maxLength={20} inputMode="numeric" dir="ltr" placeholder="3XXXXXXXXXXXXX3"
              style={{ ...inp(), fontSize: 16, textAlign: 'right', borderColor: vatOk ? undefined : colors.danger }} />
          </div>
          <div style={{ fontSize: 11.5, color: colors.text3 }}>رقم الفاتورة والرقم الضريبي يتعدّلون لكل أصناف نفس الفاتورة.</div>
          {err && <div style={{ fontSize: 13, color: colors.danger, fontWeight: 600 }}>{err}</div>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => !busy && onClose()} style={{ flex: 1, padding: 12, background: colors.bg, color: colors.text3, border: 'none', borderRadius: 11, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: font.family }}>إلغاء</button>
            <button onClick={save} disabled={busy} style={{ flex: 2, padding: 12, background: busy ? colors.border2 : colors.primary, color: '#fff', border: 'none', borderRadius: 11, fontSize: 14, fontWeight: 800, cursor: busy ? 'default' : 'pointer', fontFamily: font.family }}>{busy ? 'جاري الحفظ...' : 'حفظ التعديل'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}
