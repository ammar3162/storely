'use client'
import { StorelyMetricStrip } from '@/components/ui'
import type { PurchasesState } from './usePurchases'

export default function PurchaseStats({ m }: { m: PurchasesState }) {
  const { curr, filteredHistory, totalSpent, totalVat, totalNet } = m
  const money = (v: number) => Number(v || 0).toLocaleString('en-US', { maximumFractionDigits: 0 }) + ' ' + curr
  return (
    <StorelyMetricStrip className="mb-4" metrics={[
      { label: 'الفواتير', value: filteredHistory.length.toLocaleString('en-US'), helper: 'ضمن الفلاتر الحالية' },
      { label: 'قبل الضريبة', value: money(totalNet) },
      { label: 'ضريبة القيمة المضافة', value: money(totalVat), tone: totalVat > 0 ? 'warning' : 'neutral' },
      { label: 'الإجمالي', value: money(totalSpent), tone: 'info' },
    ]} />
  )
}
