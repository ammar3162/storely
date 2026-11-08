'use client'
import type { SuppliersPageState } from './useSuppliersPage'

// شريط أرقام مختصر: رقم + عنوان صغير (بدون نص شرح) — نفس حجم الإحصائية السابقة
export default function SupplierStats({ m, unlinkedProducts }: { m: SuppliersPageState; unlinkedProducts: any[] }) {
  const { suppliers, failedRecentMap } = m
  const failed = Object.values(failedRecentMap).reduce((a: number, b: number) => a + b, 0)
  const items = [
    { label: 'إجمالي الموردين', value: suppliers.length, color: 'var(--storely-text)' },
    { label: 'منتجات بدون مورد', value: unlinkedProducts.length, color: unlinkedProducts.length ? '#B45309' : 'var(--storely-text)' },
    ...(failed > 0 ? [{ label: 'رسائل تعذّر إرسالها (24 ساعة)', value: failed, color: '#B91C1C' }] : []),
  ]
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${items.length},minmax(0,1fr))`, gap: 1, marginBottom: 16, background: 'var(--storely-border)', border: '1px solid var(--storely-border)', borderRadius: 12, overflow: 'hidden' }}>
      {items.map(it => (
        <div key={it.label} style={{ background: 'var(--storely-surface)', padding: '10px 12px', textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: it.color, fontVariantNumeric: 'tabular-nums', lineHeight: 1.3 }}>{it.value}</div>
          <div style={{ fontSize: 11, color: 'var(--storely-muted)', fontWeight: 600, marginTop: 2 }}>{it.label}</div>
        </div>
      ))}
    </div>
  )
}
