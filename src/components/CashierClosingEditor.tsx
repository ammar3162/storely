'use client'
import { useEffect, useMemo, useState } from 'react'
import { X, Plus, Trash2, Lock, Pencil } from 'lucide-react'
import { api } from '@/lib/api-client'
import { colors, font, inp } from '@/lib/ds'
import { toast } from '@/components/toast'
import NumberInput from '@/components/NumberInput'
import { computeClosing } from '@/lib/cashierClosingCalc'

// كلمة مرور حساب المالك (نفس كلمة الدخول) — يتحقق منها الخادم قبل التعديل أو الحذف
export function PasswordBox({ value, onChange, onEnter }: { value: string; onChange: (v: string) => void; onEnter?: () => void }) {
  return (
    <div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5, fontWeight: 700, color: colors.text2, marginBottom: 6 }}><Lock size={13} /> كلمة مرور حسابك</label>
      <input value={value} onChange={e => onChange(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && value) onEnter?.() }}
        type="password" autoComplete="current-password" placeholder="كلمة المرور" style={{ ...inp(), width: '100%', boxSizing: 'border-box' }} />
    </div>
  )
}

// تعديل إقفال الكاشير: التاريخ والمبالغ والمسحوبات — والفرق يتحسب من جديد قدامك
export default function CashierClosingEditor({ orgId, closing, curr, onClose, onSaved }: { orgId: string; closing: any; curr: string; onClose: () => void; onSaved: (c: any) => void }) {
  const [f, setF] = useState(() => ({
    closing_date: closing.closing_date as string,
    total_sales: String(closing.total_sales ?? ''), mada_amount: String(closing.mada_amount ?? 0), visa_amount: String(closing.visa_amount ?? 0),
    mastercard_amount: String(closing.mastercard_amount ?? 0), cash_amount: String(closing.cash_amount ?? ''),
    purchases: ((closing.purchases || []) as any[]).map(p => ({ amount: String(p.amount ?? ''), reason: String(p.reason ?? '') })),
    deficit_reason: String(closing.deficit_reason ?? ''),
  }))
  // إقفالات قديمة بدون تفصيل الشبكة: نحط الإجمالي في «مدى» عشان ما يضيع
  useEffect(() => {
    if (!Number(closing.mada_amount) && !Number(closing.visa_amount) && !Number(closing.mastercard_amount) && Number(closing.network_amount))
      setF(x => ({ ...x, mada_amount: String(closing.network_amount) }))
  }, [])
  const [password, setPassword] = useState(''), [busy, setBusy] = useState(false), [err, setErr] = useState('')
  const calc = useMemo(() => computeClosing({ ...f, purchases: f.purchases }), [f])
  const today = new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 10)
  const set = (k: string, v: any) => setF(x => ({ ...x, [k]: v }))
  const lbl: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 700, color: colors.text3, marginBottom: 5 }

  async function save() {
    setErr('')
    if (!calc) return setErr('تأكد من المبالغ')
    if (calc.status === 'deficit' && f.deficit_reason.trim().length < 3) return setErr('فيه عجز — اكتب سببه')
    if (!password) return setErr('اكتب كلمة مرور حسابك')
    setBusy(true)
    const j = await api.patch('/api/cashier-closing', { org_id: orgId, id: closing.id, password, ...f, purchases: f.purchases.filter(p => Number(p.amount) > 0) })
    setBusy(false)
    if (!j.success) return setErr(j.error || 'تعذر حفظ التعديل')
    toast('✅ تم تعديل الإقفال — التقارير والأرباح وتقرير المحاسب تحدّثت')
    onSaved(j.closing)
  }

  const stColor = calc?.status === 'deficit' ? colors.danger : calc?.status === 'surplus' ? colors.info : colors.primary
  const stLabel = calc?.status === 'deficit' ? 'عجز' : calc?.status === 'surplus' ? 'زيادة' : 'مطابق'
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, fontFamily: font.family }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,.45)', backdropFilter: 'blur(6px)' }} onClick={() => !busy && onClose()} />
      <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 560, maxHeight: '92vh', overflowY: 'auto', position: 'relative', boxShadow: '0 24px 60px rgba(0,0,0,.25)' }}>
        <div style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 1, display: 'flex', alignItems: 'center', gap: 10, padding: '16px 20px', borderBottom: `1px solid ${colors.border}` }}>
          <span style={{ width: 36, height: 36, borderRadius: 10, background: colors.primaryLight, color: colors.primary, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Pencil size={17} /></span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 800 }}>تعديل إقفال الكاشير</div>
            <div style={{ fontSize: 12, color: colors.text3 }}>{closing.staff_name} · التعديل يتسجل في سجل التعديلات</div>
          </div>
          <button onClick={() => !busy && onClose()} aria-label="إغلاق" style={{ background: colors.bg, border: 'none', borderRadius: 9, padding: 7, cursor: 'pointer', display: 'inline-flex' }}><X size={18} /></button>
        </div>

        <div style={{ padding: 20, display: 'grid', gap: 14 }}>
          <div>
            <label style={lbl}>تاريخ الإقفال</label>
            <input type="date" value={f.closing_date} max={today} onChange={e => set('closing_date', e.target.value)} style={inp()} />
          </div>
          <div>
            <label style={lbl}>إجمالي المبيعات</label>
            <NumberInput value={f.total_sales} onChange={e => set('total_sales', e.target.value)} style={inp()} />
          </div>
          <div>
            <label style={lbl}>الشبكة</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 8 }}>
              {([['mada_amount', 'مدى'], ['visa_amount', 'فيزا'], ['mastercard_amount', 'ماستركارد']] as const).map(([k, l]) => (
                <div key={k}><div style={{ fontSize: 11, color: colors.text4, marginBottom: 3 }}>{l}</div><NumberInput value={(f as any)[k]} onChange={e => set(k, e.target.value)} style={inp()} /></div>
              ))}
            </div>
          </div>
          <div>
            <label style={lbl}>الكاش الفعلي بالدرج</label>
            <NumberInput value={f.cash_amount} onChange={e => set('cash_amount', e.target.value)} style={inp()} />
          </div>
          <div>
            <label style={lbl}>المسحوبات من الدرج</label>
            {f.purchases.map((p, i) => (
              <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                <NumberInput value={p.amount} placeholder="المبلغ" onChange={e => { const v = e.target.value; set('purchases', f.purchases.map((x, j) => j === i ? { ...x, amount: v } : x)) }} style={{ ...inp(), width: 110, flexShrink: 0 }} />
                <input value={p.reason} placeholder="السبب" maxLength={200} onChange={e => { const v = e.target.value; set('purchases', f.purchases.map((x, j) => j === i ? { ...x, reason: v } : x)) }} style={{ ...inp(), flex: 1, minWidth: 0 }} />
                <button onClick={() => set('purchases', f.purchases.filter((_, j) => j !== i))} aria-label="حذف" style={{ background: colors.dangerLight, color: colors.danger, border: 'none', borderRadius: 9, padding: '0 10px', cursor: 'pointer' }}><Trash2 size={15} /></button>
              </div>
            ))}
            <button onClick={() => set('purchases', [...f.purchases, { amount: '', reason: '' }])} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'none', border: `1px dashed ${colors.border2}`, borderRadius: 9, padding: '7px 12px', fontSize: 12.5, fontWeight: 700, color: colors.text2, cursor: 'pointer', fontFamily: font.family }}><Plus size={14} /> مسحوب</button>
          </div>

          {calc && (
            <div style={{ background: colors.bg, borderRadius: 12, padding: 12, display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 8, textAlign: 'center' }}>
              <div><div style={{ fontSize: 11, color: colors.text4 }}>الشبكة</div><div style={{ fontSize: 15, fontWeight: 800 }}>{calc.network_amount.toFixed(2)}</div></div>
              <div><div style={{ fontSize: 11, color: colors.text4 }}>المتوقع بالدرج</div><div style={{ fontSize: 15, fontWeight: 800 }}>{calc.expected_cash.toFixed(2)}</div></div>
              <div><div style={{ fontSize: 11, color: colors.text4 }}>النتيجة</div><div style={{ fontSize: 15, fontWeight: 800, color: stColor }}>{stLabel}{calc.status !== 'balanced' ? ` ${Math.abs(calc.difference).toFixed(2)}` : ''}</div></div>
            </div>
          )}
          {calc?.status === 'deficit' && (
            <div>
              <label style={lbl}>سبب العجز</label>
              <input value={f.deficit_reason} onChange={e => set('deficit_reason', e.target.value)} maxLength={500} style={inp()} />
              {closing.deficit_decision === 'approved' && <div style={{ fontSize: 11.5, color: colors.text3, marginTop: 4 }}>الخصم المعتمد من راتب الكاشير بيتعدّل على المبلغ الجديد.</div>}
            </div>
          )}
          {calc && calc.status !== 'deficit' && closing.status === 'deficit' && closing.deficit_decision === 'approved' && (
            <div style={{ fontSize: 12, color: colors.info, background: colors.infoLight, borderRadius: 10, padding: '8px 10px' }}>العجز راح — الخصم اللي انخصم من راتب الكاشير بينشال.</div>
          )}

          <PasswordBox value={password} onChange={setPassword} onEnter={save} />
          {err && <div style={{ fontSize: 13, color: colors.danger, fontWeight: 600 }}>{err}</div>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => !busy && onClose()} style={{ flex: 1, padding: 12, background: colors.bg, color: colors.text3, border: 'none', borderRadius: 11, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: font.family }}>إلغاء</button>
            <button onClick={save} disabled={busy || !password} style={{ flex: 2, padding: 12, background: busy || !password ? colors.border2 : colors.primary, color: '#fff', border: 'none', borderRadius: 11, fontSize: 14, fontWeight: 800, cursor: busy || !password ? 'default' : 'pointer', fontFamily: font.family }}>{busy ? 'جاري الحفظ...' : 'حفظ التعديل'}</button>
          </div>
          <div style={{ fontSize: 11, color: colors.text4, textAlign: 'center' }}>{curr} · الإقفالات في شهر مقفل من المحاسب أو في الأرباح ما تتعدّل</div>
        </div>
      </div>
    </div>
  )
}
