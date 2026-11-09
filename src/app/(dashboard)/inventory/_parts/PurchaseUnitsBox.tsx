'use client'
// وحدات الشراء للصنف — عرض وتصحيح فقط. الإضافة تصير من صفحة المشتريات (الفاتورة تسأل «كم قطعة في الكرتون؟»)
import { useEffect, useState } from 'react'
import { Package, Trash2, Pencil, Check, X } from 'lucide-react'
import { api } from '@/lib/api-client'
import { getOrgId } from '@/lib/session'
import { toast } from '@/components/toast'
import NumberInput from '@/components/NumberInput'
import { C } from './constants'

type U = { unit: string; factor: number }

export default function PurchaseUnitsBox({ productId, stockUnit, inp, onChange, onUnits }: {
  productId: string | null; stockUnit: string; inp: () => React.CSSProperties; onChange?: () => void; onUnits?: (u: U[]) => void
}) {
  const [units, setUnits] = useState<U[]>([])
  const [editing, setEditing] = useState<string | null>(null)
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => { onUnits?.(units) }, [units])

  useEffect(() => {
    if (!productId) return
    let off = false
    ;(async () => {
      const r = await api.get<{ units: U[] }>('/api/product-units', { org_id: await getOrgId(), product_id: productId })
      if (!off && r.success) setUnits(r.units || [])
    })()
    return () => { off = true }
  }, [productId])

  async function save(u: string) {
    const f = Number(value)
    if (!productId || !(f > 0)) return
    setBusy(true)
    const r = await api.post('/api/product-units', { org_id: await getOrgId(), product_id: productId, unit: u, factor: f })
    setBusy(false)
    if (!r.success) { toast(r.error || 'تعذر الحفظ', 'error'); return }
    setUnits(list => list.map(x => x.unit === u ? { ...x, factor: f } : x)); setEditing(null); onChange?.()
  }
  async function remove(u: string) {
    setBusy(true)
    const r = await api.del('/api/product-units', undefined, { org_id: await getOrgId(), product_id: productId, unit: u })
    setBusy(false)
    if (r.success) { setUnits(list => list.filter(x => x.unit !== u)); onChange?.() }
  }

  if (!units.length) return null
  const iconBtn = (danger?: boolean): React.CSSProperties => ({ width: 30, height: 30, borderRadius: 8, border: `1px solid ${C.border2}`, background: 'white', color: danger ? C.danger : C.text2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 })
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <Package size={13} strokeWidth={2.25} />
        <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>يُشترى بـ</div>
      </div>
      {units.map(u => (
        <div key={u.unit} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0' }}>
          {editing === u.unit ? (
            <>
              <span style={{ fontSize: 13, color: C.text }}>1 {u.unit} =</span>
              <NumberInput min="0" step="any" value={value} onChange={e => setValue(e.target.value)} style={{ ...inp(), width: 90 }} autoFocus />
              <span style={{ flex: 1, fontSize: 13, color: C.text }}>{stockUnit}</span>
              <button type="button" onClick={() => save(u.unit)} disabled={busy || !(Number(value) > 0)} aria-label="حفظ" style={iconBtn()}><Check size={14} /></button>
              <button type="button" onClick={() => setEditing(null)} aria-label="إلغاء" style={iconBtn()}><X size={14} /></button>
            </>
          ) : (
            <>
              <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: C.text }}>1 {u.unit} = {u.factor} {stockUnit}</span>
              <button type="button" onClick={() => { setEditing(u.unit); setValue(String(u.factor)) }} disabled={busy} aria-label={`تعديل ${u.unit}`} style={iconBtn()}><Pencil size={13} /></button>
              <button type="button" onClick={() => remove(u.unit)} disabled={busy} aria-label={`حذف ${u.unit}`} style={iconBtn(true)}><Trash2 size={13} /></button>
            </>
          )}
        </div>
      ))}
      <div style={{ fontSize: 11.5, color: C.text3, marginTop: 2 }}>يُحفظ من صفحة المشتريات عند تسجيل فاتورة بهذه الوحدة.</div>
    </div>
  )
}
