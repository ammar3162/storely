'use client'
// الجرد الفعلي: يكتب كم عدّ من كل صنف، والنظام يسوّي الفرق ويحفظه لحساب الاستهلاك الحقيقي
import { useMemo, useState } from 'react'
import { ClipboardCheck, Search, X } from 'lucide-react'
import NumberInput from '@/components/NumberInput'
import { api } from '@/lib/api-client'
import { toast } from '@/components/toast'
import { colors } from '@/lib/ds'

type P = { id: string; name: string; unit: string; qty: number; category?: string | null }

export default function StockCountSheet({ orgId, products, lastCounts, onClose, onSaved }: {
  orgId: string; products: P[]; lastCounts: Record<string, { counted_at: string }>; onClose: () => void; onSaved: () => void
}) {
  const [vals, setVals] = useState<Record<string, string>>({})
  const [q, setQ] = useState('')
  const [saving, setSaving] = useState(false)
  const list = useMemo(() => products.filter(p => !q || p.name.includes(q)), [products, q])
  const entered = Object.entries(vals).filter(([, v]) => v !== '')
  const diffs = entered.filter(([id, v]) => Number(v) !== (products.find(p => p.id === id)?.qty ?? 0)).length

  async function save() {
    if (!entered.length) return
    if (entered.some(([, v]) => !Number.isInteger(Number(v)) || Number(v) < 0)) { toast('اكتب أرقام صحيحة بدون كسور', 'error'); return }
    setSaving(true)
    const j = await api.post('/api/stock-counts', { org_id: orgId, counts: entered.map(([product_id, v]) => ({ product_id, counted_qty: Number(v) })) })
    setSaving(false)
    if (!j.success) { toast(j.error || 'فشل حفظ الجرد', 'error'); return }
    toast(j.adjusted ? `انحفظ جرد ${j.counted} صنف وتعدّل رصيد ${j.adjusted}` : `انحفظ جرد ${j.counted} صنف — كله مطابق`)
    onSaved()
  }

  const fmt = (iso: string) => new Date(iso).toLocaleDateString('ar-SA', { numberingSystem: 'latn', day: 'numeric', month: 'short' })
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()} dir="rtl" style={{ background: colors.surface || 'white', borderRadius: 16, width: '100%', maxWidth: 560, maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px 18px', borderBottom: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
          <ClipboardCheck size={20} color={colors.primary} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 800 }}>جرد المخزون</div>
            <div style={{ fontSize: 11, color: colors.text3 }}>اكتب الكمية اللي عددتها فعلاً — اللي تتركه فاضي ما ينجرد</div>
          </div>
          <button onClick={onClose} aria-label="إغلاق" style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.text3 }}><X size={18} /></button>
        </div>
        <div style={{ padding: '10px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: `1px solid ${colors.border}`, borderRadius: 10, padding: '8px 10px' }}>
            <Search size={15} color={colors.text3} />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="ابحث عن صنف" style={{ border: 'none', outline: 'none', flex: 1, fontSize: 13, fontFamily: 'inherit', background: 'transparent' }} />
          </div>
        </div>
        <div style={{ overflowY: 'auto', padding: '0 18px', flex: 1 }}>
          {list.map(p => {
            const v = vals[p.id] ?? ''
            const diff = v === '' ? null : Number(v) - p.qty
            return (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: `1px solid ${colors.border}` }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: colors.text3 }}>
                    بالنظام {p.qty} {p.unit}{lastCounts[p.id] ? ` · آخر جرد ${fmt(lastCounts[p.id].counted_at)}` : ' · ما انجرد قبل'}
                  </div>
                </div>
                {diff !== null && diff !== 0 && <span style={{ fontSize: 11, fontWeight: 800, color: diff < 0 ? colors.danger : colors.primary }} dir="ltr">{diff > 0 ? '+' : ''}{diff}</span>}
                <NumberInput min="0" step="1" value={v} onChange={(e: any) => setVals(s => ({ ...s, [p.id]: e.target.value }))} placeholder="العدد"
                  style={{ width: 84, padding: '8px', border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 14, textAlign: 'center' }} />
              </div>
            )
          })}
        </div>
        <div style={{ padding: '12px 18px', borderTop: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, fontSize: 12, color: colors.text3 }}>{entered.length} صنف · {diffs} فيه فرق</div>
          <button onClick={save} disabled={!entered.length || saving}
            style={{ padding: '10px 20px', background: colors.primary, color: 'white', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', opacity: !entered.length || saving ? .6 : 1 }}>
            {saving ? 'جاري الحفظ...' : 'حفظ الجرد'}
          </button>
        </div>
      </div>
    </div>
  )
}
