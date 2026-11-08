'use client'
import { StorelyMetricStrip, type StorelyMetric } from '@/components/ui'
import type { SuppliersPageState } from './useSuppliersPage'

export default function SupplierStats({ m, unlinkedProducts }: { m: SuppliersPageState; unlinkedProducts: any[] }) {
  const { suppliers, failedRecentMap } = m
  const failed = Object.values(failedRecentMap).reduce((a: number, b: number) => a + b, 0)
  const metrics: StorelyMetric[] = [
    { label: 'إجمالي الموردين', value: suppliers.length.toLocaleString('en-US') },
    { label: 'منتجات بدون مورد', value: unlinkedProducts.length.toLocaleString('en-US'), tone: unlinkedProducts.length ? 'warning' : 'neutral', helper: unlinkedProducts.length ? 'اربطها بمورد لتصل طلبات التوريد تلقائياً' : 'كل المنتجات مرتبطة' },
    ...(failed > 0 ? [{ label: 'رسائل تعذّر إرسالها (24 ساعة)', value: failed.toLocaleString('en-US'), tone: 'danger' as const }] : []),
  ]
  return <StorelyMetricStrip className="mb-5" metrics={metrics} />
}
