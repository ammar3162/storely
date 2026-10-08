'use client'
import { useEffect, useMemo, useState } from 'react'
import NumberInput from '@/components/NumberInput'
import { bestMatch } from '@/lib/productMatch'

// أصناف الفاتورة المقروءة من الصورة: لكل صنف الكمية والسعر و«ينضاف إلى» (صنف موجود تزيد كميته أو صنف جديد)
export type OcrItem = { name: string; qty?: number | null; unit?: string | null; total?: number | null }
export type PickedItem = { name: string; qty: number; unit: string; total: number; product_id: string }   // product_id: 'new' = صنف جديد
type Row = { on: boolean; qty: string; price: string; target: string }

const T = {
  ar: { found: (n: number) => `${n === 2 ? 'صنفين' : n <= 10 ? `${n} أصناف` : `${n} صنف`} بالفاتورة — راجعها واحفظ`, qty: 'الكمية', price: 'السعر شامل الضريبة',
    to: 'ينضاف إلى', newItem: '➕ صنف جديد', matched: 'موجود بالمخزون', sum: 'مجموع المحدد', inv: 'إجمالي الفاتورة', save: 'حفظ الفاتورة', saving: 'جاري الحفظ...' },
  en: { found: (n: number) => `${n} items on the invoice — review and save`, qty: 'Qty', price: 'Price incl. VAT',
    to: 'Add to', newItem: '➕ New item', matched: 'In stock', sum: 'Selected total', inv: 'Invoice total', save: 'Save invoice', saving: 'Saving...' },
}

export default function InvoiceItemsPicker({ items, products, invoiceTotal, lang = 'ar', saving, onSave, color = '#0f766e', error }: {
  items: OcrItem[]; products: { id: string; name: string; unit?: string | null }[]; invoiceTotal?: number | null
  lang?: 'ar' | 'en'; saving?: boolean; onSave: (rows: PickedItem[]) => void; color?: string; error?: string
}) {
  const t = T[lang]
  const [rows, setRows] = useState<Row[]>([])
  // أول ما توصل الأصناف: نعبّي الكمية والسعر، ونختار الصنف الأقرب بالمخزون
  useEffect(() => {
    setRows(items.map(it => ({ on: true, qty: it.qty ? String(it.qty) : '', price: it.total ? String(it.total) : '',
      target: bestMatch(it.name, products)?.id || 'new' })))
  }, [items, products])
  const set = (i: number, p: Partial<Row>) => setRows(r => r.map((x, j) => j === i ? { ...x, ...p } : x))
  const sum = useMemo(() => rows.reduce((s, r) => s + (r.on ? Number(r.price) || 0 : 0), 0), [rows])
  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const inp: React.CSSProperties = { width: '100%', minWidth: 0, padding: '7px 8px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, fontFamily: 'inherit', background: 'white', boxSizing: 'border-box' as const }
  const picked = rows.filter(r => r.on).length

  return (
    <div style={{ background: 'white', border: `1.5px solid ${color}`, borderRadius: 14, padding: 14, marginBottom: 14 }}>
      <div style={{ fontSize: 13, fontWeight: 800, color, marginBottom: 10 }}>📋 {t.found(items.length)}</div>
      {items.map((it, i) => {
        const r = rows[i]; if (!r) return null
        const isNew = r.target === 'new'
        return (
          <div key={i} style={{ padding: '9px 0', borderBottom: '1px solid #f1f5f9', opacity: r.on ? 1 : .5 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={r.on} onChange={e => set(i, { on: e.target.checked })} style={{ width: 17, height: 17 }} />
              <span style={{ flex: 1, fontSize: 13.5, fontWeight: 700, color: '#0f172a' }}>{it.name}</span>
            </label>
            {r.on && <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 6, paddingInlineStart: 25 }}>
              <label style={{ fontSize: 11, color: '#64748b', fontWeight: 700 }}>{t.qty}{it.unit ? ` (${it.unit})` : ''}
                <NumberInput min="0" step="any" inputMode="decimal" value={r.qty} onChange={e => set(i, { qty: e.target.value })} placeholder="0" style={{ ...inp, marginTop: 3 }} /></label>
              <label style={{ fontSize: 11, color: '#64748b', fontWeight: 700 }}>{t.price}
                <NumberInput min="0" step="0.01" inputMode="decimal" value={r.price} onChange={e => set(i, { price: e.target.value })} placeholder="0.00" style={{ ...inp, marginTop: 3 }} /></label>
              <select value={r.target} onChange={e => set(i, { target: e.target.value })} style={{ ...inp, gridColumn: '1 / -1', borderColor: isNew ? '#e2e8f0' : color, color: isNew ? '#334155' : color, fontWeight: 700 }}>
                <option value="new">{t.newItem}</option>
                {products.map(p => <option key={p.id} value={p.id}>{t.to}: {p.name}</option>)}
              </select>
            </div>}
          </div>
        )
      })}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginTop: 10, color: '#475569' }}>
        <span>{t.sum}: <b dir="ltr">{fmt(sum)}</b></span>
        {invoiceTotal ? <span style={{ color: Math.abs(sum - invoiceTotal) > 0.5 ? '#b45309' : '#059669' }}>{t.inv}: <b dir="ltr">{fmt(invoiceTotal)}</b></span> : null}
      </div>
      {error && <div role="alert" style={{ marginTop: 10, padding: '9px 12px', borderRadius: 10, background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', fontSize: 13, fontWeight: 700 }}>⚠️ {error}</div>}
      <button type="button" disabled={saving || !picked}
        onClick={() => onSave(rows.map((r, i) => ({ r, it: items[i] })).filter(x => x.r.on).map(({ r, it }) => ({
          name: it.name, qty: Number(r.qty) || 0, unit: it.unit || 'قطعة', total: Number(r.price) || 0, product_id: r.target })))}
        style={{ width: '100%', marginTop: 10, padding: 12, borderRadius: 10, border: 'none', background: saving || !picked ? '#9ca3af' : color, color: 'white', fontSize: 14, fontWeight: 800, cursor: saving ? 'wait' : 'pointer', fontFamily: 'inherit' }}>
        {saving ? t.saving : `${t.save} (${picked})`}
      </button>
    </div>
  )
}
