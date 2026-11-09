'use client'
// «الوحدة الدقيقة للوصفات» في شاشة الصنف — قسم مطوي (أغلب الأصناف ما تحتاجه).
// تحويل الشراء (الكرتون فيه كم) ما يُدار هنا: العميل يكتب «كم يدخل المخزون» وقت الفاتورة، والنظام يتذكره.
import { useState } from 'react'
import { ChevronDown, Ruler } from 'lucide-react'
import NumberInput from '@/components/NumberInput'
import { C } from './constants'

type Form = { unit: string; recipe_unit: string; recipe_unit_factor: string | number }

export default function UnitsSection({ form, setForm, inp, lbl }: {
  form: Form & Record<string, any>; setForm: (f: any) => void; inp: () => React.CSSProperties; lbl: React.CSSProperties
}) {
  const [open, setOpen] = useState(false)
  const has = !!form.recipe_unit && Number(form.recipe_unit_factor) > 0
  return (
    <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10 }}>
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: 12, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'start' }}>
        <Ruler size={14} strokeWidth={2.25} color={C.text2} />
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.text }}>الوحدة الدقيقة للوصفات <span style={{ fontWeight: 400, color: C.text3 }}>(اختياري)</span></span>
          <span style={{ display: 'block', fontSize: 12, color: has ? C.text2 : C.text3, marginTop: 2 }}>
            {has ? `1 ${form.unit} = ${form.recipe_unit_factor} ${form.recipe_unit}` : 'تستخدمه في وصفات؟ أضف كم غراماً فيه'}
          </span>
        </span>
        <ChevronDown size={16} color={C.text3} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s', flexShrink: 0 }} />
      </button>
      {open && (
        <div style={{ padding: '0 12px 12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
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
      )}
    </div>
  )
}
