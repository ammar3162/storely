'use client'
// وحدات الشراء للصنف: «كرتون = 12 كيس» — الفاتورة بالكرتون تتحول للمخزون بالكيس تلقائياً
import { useEffect, useState } from 'react'
import { Package, Trash2, Plus } from 'lucide-react'
import { api } from '@/lib/api-client'
import { getOrgId } from '@/lib/session'
import { toast } from '@/components/toast'
import NumberInput from '@/components/NumberInput'
import SelectOrOther from '@/components/SelectOrOther'
import { normalizeUnit, sameUnit } from '@/lib/productUnits'
import { C } from './constants'

const PURCHASE_UNITS = ['كرتون', 'كيس', 'شدة', 'صندوق', 'علبة', 'باكيت', 'درزن', 'جالون', 'ربطة']

export default function PurchaseUnitsBox({ productId, stockUnit, inp, lbl }: { productId: string | null; stockUnit: string; inp: () => React.CSSProperties; lbl: React.CSSProperties }) {
  const [units, setUnits] = useState<{ unit: string; factor: number }[]>([])
  const [unit, setUnit] = useState('كرتون')
  const [factor, setFactor] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!productId) return
    let off = false
    ;(async () => {
      const org_id = await getOrgId()
      const r = await api.get<{ units: { unit: string; factor: number }[] }>('/api/product-units', { org_id, product_id: productId })
      if (!off && r.success) setUnits(r.units || [])
    })()
    return () => { off = true }
  }, [productId])

  async function add() {
    const u = normalizeUnit(unit), f = Number(factor)
    if (!productId || !u || !(f > 0)) return
    if (sameUnit(u, stockUnit)) { toast('وحدة الشراء هي نفس وحدة المخزون', 'warning'); return }
    setBusy(true)
    const r = await api.post('/api/product-units', { org_id: await getOrgId(), product_id: productId, unit: u, factor: f })
    setBusy(false)
    if (!r.success) { toast(r.error || 'تعذر الحفظ', 'error'); return }
    setUnits(list => [...list.filter(x => x.unit !== u), { unit: u, factor: f }].sort((a, b) => a.factor - b.factor))
    setFactor('')
    toast(`حُفظ: 1 ${u} = ${f} ${stockUnit}`)
  }
  async function remove(u: string) {
    setBusy(true)
    const r = await api.del('/api/product-units', undefined, { org_id: await getOrgId(), product_id: productId, unit: u })
    setBusy(false)
    if (r.success) setUnits(list => list.filter(x => x.unit !== u))
  }

  return (
    <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
        <Package size={13} strokeWidth={2.25} />
        <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>وحدات الشراء (اختياري)</div>
      </div>
      <div style={{ fontSize: 12, color: C.text3, marginBottom: 8, lineHeight: 1.6 }}>
        تشتري هذا الصنف بالكرتون أو الشدة؟ حدّد كم {stockUnit || 'وحدة'} فيها، وتُحوَّل الفاتورة إلى المخزون تلقائياً.
      </div>
      {!productId ? (
        <div style={{ fontSize: 12, color: C.text2 }}>تُضاف بعد حفظ المنتج.</div>
      ) : (
        <>
          {units.map(u => (
            <div key={u.unit} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: `1px solid ${C.border}` }}>
              <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: C.text }}>1 {u.unit} = {u.factor} {stockUnit}</span>
              <button type="button" onClick={() => remove(u.unit)} disabled={busy} aria-label={`حذف ${u.unit}`}
                style={{ width: 28, height: 28, borderRadius: 8, border: `1px solid ${C.border2}`, background: 'white', color: C.danger, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Trash2 size={13} />
              </button>
            </div>
          ))}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8, alignItems: 'end', marginTop: units.length ? 8 : 0 }}>
            <div>
              <label style={lbl}>وحدة الشراء</label>
              <SelectOrOther value={unit} onChange={setUnit} options={PURCHASE_UNITS.filter(u => !sameUnit(u, stockUnit))} placeholder="اكتب اسم الوحدة" style={inp()} />
            </div>
            <div>
              <label style={lbl}>كم {stockUnit || 'وحدة'} فيها؟</label>
              <NumberInput min="0" step="any" value={factor} onChange={e => setFactor(e.target.value)} style={inp()} placeholder="مثال: 12" />
            </div>
            <button type="button" onClick={add} disabled={busy || !(Number(factor) > 0)}
              style={{ height: 40, padding: '0 12px', borderRadius: 8, border: 'none', background: C.primary, color: 'white', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4, opacity: busy || !(Number(factor) > 0) ? .6 : 1 }}>
              <Plus size={14} /> إضافة
            </button>
          </div>
        </>
      )}
    </div>
  )
}
