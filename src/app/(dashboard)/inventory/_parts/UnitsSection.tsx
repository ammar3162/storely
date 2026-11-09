'use client'
// «الوحدات والوصفات» في شاشة الصنف: قسم واحد مطوي (أغلب الأصناف ما تحتاجه — والفاتورة تسأل وقت الحاجة)
//   الشراء: كم وحدة مخزون في الكرتون/الشدة (للفواتير) — الوصفات: كم غرام في الوحدة (للوصفات)
import { useState } from 'react'
import { ChevronDown, ArrowLeftRight, Ruler } from 'lucide-react'
import NumberInput from '@/components/NumberInput'
import PurchaseUnitsBox from './PurchaseUnitsBox'
import { C } from './constants'

type Form = { unit: string; recipe_unit: string; recipe_unit_factor: string | number }

export default function UnitsSection({ productId, form, setForm, inp, lbl, onChange }: {
  productId: string | null; form: Form & Record<string, any>; setForm: (f: any) => void
  inp: () => React.CSSProperties; lbl: React.CSSProperties; onChange?: () => void
}) {
  const [open, setOpen] = useState(false)
  const [units, setUnits] = useState<{ unit: string; factor: number }[]>([])
  const hasRecipe = !!form.recipe_unit && Number(form.recipe_unit_factor) > 0
  const parts = [
    ...units.map(u => `1 ${u.unit} = ${u.factor} ${form.unit}`),
    ...(hasRecipe ? [`1 ${form.unit} = ${form.recipe_unit_factor} ${form.recipe_unit}`] : []),
  ]
  return (
    <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10 }}>
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: 12, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'start' }}>
        <ArrowLeftRight size={14} strokeWidth={2.25} color={C.text2} />
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.text }}>الوحدات والوصفات <span style={{ fontWeight: 400, color: C.text3 }}>(اختياري)</span></span>
          <span style={{ display: 'block', fontSize: 12, color: parts.length ? C.text2 : C.text3, marginTop: 2, lineHeight: 1.6 }}>
            {parts.length ? parts.join(' · ') : 'تستخدمه في وصفات؟ أضف كم غراماً فيه'}
          </span>
        </span>
        <ChevronDown size={16} color={C.text3} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s', flexShrink: 0 }} />
      </button>

      {/* يبقى محمّل وهو مطوي عشان الملخص يطلع */}
      <div style={{ display: open ? 'block' : 'none', padding: '0 12px 12px' }}>
        {/* «يُشترى بـ» يطلع بس لو فيه وحدات شراء (تنحفظ من صفحة المشتريات) — للعرض والتصحيح */}
        <div style={units.length ? { borderTop: `1px solid ${C.border}`, paddingTop: 12, marginBottom: 12 } : { display: 'none' }}>
          <PurchaseUnitsBox productId={productId} stockUnit={form.unit} inp={inp} onChange={onChange} onUnits={setUnits} />
        </div>
        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <Ruler size={13} strokeWidth={2.25} />
            <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>الوحدة الدقيقة للوصفات</div>
          </div>
          <div style={{ fontSize: 12, color: C.text3, marginBottom: 8, lineHeight: 1.6 }}>إذا تستخدم هذا الصنف في وصفات: كم غراماً (أو مل) في {form.unit || 'الوحدة'} الواحدة؟</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <label style={lbl}>الوحدة الدقيقة</label>
              <input value={form.recipe_unit} onChange={e => setForm({ ...form, recipe_unit: e.target.value })} style={inp()} placeholder="مثال: غرام" />
            </div>
            <div>
              <label style={lbl}>كم منها في {form.unit || 'الوحدة'}؟</label>
              <NumberInput min="0" step="any" value={form.recipe_unit_factor} onChange={e => setForm({ ...form, recipe_unit_factor: e.target.value })} style={inp()} placeholder="مثال: 250" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
