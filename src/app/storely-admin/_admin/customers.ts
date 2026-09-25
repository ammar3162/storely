import { PLAN_PRICING, planKeyOf, type PlanKey } from '@/lib/planPricing'
import type { Tone } from './kit'

export type Customer = {
  id: string; full_name: string; phone: string; role: string
  status: string; created_at: string; org_id: string; org_name: string
  subscription_type: string; subscription_ends_at: string | null; billing_cycle: 'monthly' | 'yearly'
  max_branches: number; plan: PlanKey; requested_plan: string
}

export const STATUS: Record<string, { label: string; tone: Tone }> = {
  pending: { label: 'بانتظار التفعيل', tone: 'warning' },
  active: { label: 'مفعّل', tone: 'primary' },
  suspended: { label: 'موقوف', tone: 'danger' },
  deleted: { label: 'محذوف', tone: 'neutral' },
}

// حدود كل باقة (فروع الباقة الأساسية — الفروع الإضافية تنحسب من الإضافات)
export const PLAN_LIMITS: Record<PlanKey, { branches: number; staff: number; suppliers: number; desc: string }> = {
  basic: { branches: 1, staff: 3, suppliers: 3, desc: 'فرع · 3 موظفين · 3 موردين · بدون حضور/انصراف أو إقفال كاشير' },
  pro: { branches: 3, staff: 10, suppliers: 10, desc: '3 فروع · 10 موظفين · 10 موردين · كل المميزات' },
  advanced: { branches: 10, staff: 999, suppliers: 999, desc: '10 فروع · موظفين وموردين بلا حد' },
}

export const PLAN_KEYS: PlanKey[] = ['basic', 'pro', 'advanced']
export const planLabel = (k: PlanKey) => PLAN_PRICING[k].label
export const PLAN_TONE: Record<PlanKey, Tone> = { basic: 'primary', pro: 'info', advanced: 'violet' }

export function mapCustomer(p: any): Customer {
  const maxB = p.organizations?.max_branches || 1
  return {
    id: p.id, full_name: p.full_name || '—', phone: p.phone || '',
    role: p.role, status: p.status || 'pending', created_at: p.created_at,
    org_id: p.org_id, org_name: p.organizations?.name || '—',
    subscription_type: p.subscription_type || 'trial',
    subscription_ends_at: p.subscription_ends_at || null,
    billing_cycle: p.organizations?.billing_cycle === 'yearly' ? 'yearly' : 'monthly',
    max_branches: maxB,
    plan: planKeyOf(p.organizations?.plan, maxB),
    requested_plan: p.organizations?.requested_plan || '',
  }
}

/** الإيراد الشهري المتوقع من المشتركين المدفوعين النشطين (السنوي يُقسم على 12) */
export function monthlyRevenue(list: Customer[]) {
  return list
    .filter(u => u.subscription_type === 'paid' && u.status === 'active')
    .reduce((s, u) => s + (u.billing_cycle === 'yearly' ? PLAN_PRICING[u.plan].yearly / 12 : PLAN_PRICING[u.plan].monthly), 0)
}
