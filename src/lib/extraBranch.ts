// إضافة فرع بنفس العميل (بدون موافقة الأدمن) — لين حد باقته (lib/planPricing PLAN_CAPS.maxBranches).
// تنضاف وحدة على إضافة «فرع إضافي» بسعر باقته، وينسجّل طلب «موافَق تلقائياً» عشان يبان بلوحة الأدمن.
import type { SupabaseClient } from '@supabase/supabase-js'
import { PLAN_CAPS, branchPriceFor, maxSelfServeBranches, planKeyOf, YEARLY_FACTOR } from '@/lib/planPricing'
import { getBranchLimit, EXTRA_BRANCH_SLUG } from '@/lib/branchLimit'
import { activateAddon } from '@/lib/addonActivation'

export type BranchOffer = {
  plan: string
  total: number          // الفروع المسموحة الحين (الباقة + المشتراة)
  maxTotal: number       // أقصى فروع يوصلها بنفسه
  canAdd: boolean
  price: number          // سعر الفرع الشهري
  yearly: boolean        // باقته سنوية (الفرع ينحسب بخصم السنوي)
  staff: number          // موظفين يجون مع الفرع
  suppliers: number      // موردين يجون مع الفرع
  nextPlan: string | null // الباقة الأعلى لو وصل الحد
}

export async function branchOffer(db: SupabaseClient, orgId: string): Promise<BranchOffer> {
  const [{ data: org }, limit] = await Promise.all([
    db.from('organizations').select('plan,max_branches,billing_cycle').eq('id', orgId).single(),
    getBranchLimit(db, orgId),
  ])
  const plan = planKeyOf((org as any)?.plan, (org as any)?.max_branches)
  const caps = PLAN_CAPS[plan]
  const maxTotal = maxSelfServeBranches(plan, limit.base)
  return {
    plan, total: limit.total, maxTotal, canAdd: limit.total < maxTotal,
    price: branchPriceFor(plan), yearly: (org as any)?.billing_cycle === 'yearly',
    staff: caps.branchStaff, suppliers: caps.branchSuppliers,
    nextPlan: plan === 'basic' ? 'pro' : plan === 'pro' ? 'advanced' : null,
  }
}

/** يضيف وحدة «فرع إضافي» — يرجّع المستحق عن الأيام الباقية لين التجديد */
export async function addExtraBranch(db: SupabaseClient, orgId: string, userId: string | null):
  Promise<{ ok: true; proratedAmount: number; total: number } | { ok: false; status: number; error: string; code?: string }> {
  const offer = await branchOffer(db, orgId)
  if (!offer.canAdd) return { ok: false, status: 403, code: 'plan_max', error: `وصلت أقصى عدد فروع لباقتك (${offer.maxTotal}) — رقّ باقتك عشان تضيف فروع أكثر` }

  const { data: addon } = await db.from('marketplace_addons').select('id').eq('slug', EXTRA_BRANCH_SLUG).maybeSingle()
  if (!addon) return { ok: false, status: 500, error: 'إضافة الفرع غير متاحة' }
  const { extra } = await getBranchLimit(db, orgId)

  const res = await activateAddon(db, { orgId, addonId: (addon as any).id, quantity: extra + 1, unitPrice: offer.price, yearly: offer.yearly })
  if (!res.ok) return { ok: false, status: res.status, error: res.error }

  // يبان بلوحة الأدمن مع الطلبات (موافَق تلقائياً) + إشعار للمالك
  try {
    await db.from('addon_requests').insert({
      org_id: orgId, addon_id: (addon as any).id, quantity: 1, status: 'approved', requested_by: userId,
      decided_at: new Date().toISOString(), decided_by_name: 'تلقائي (أضافه العميل بنفسه)', prorated_amount: res.proratedAmount,
      note: `فرع إضافي بـ${offer.price} ⃁ شهرياً${offer.yearly ? ' (باقة سنوية بخصم ' + Math.round((1 - YEARLY_FACTOR) * 100) + '%)' : ''}`,
    } as any)
    await db.from('notifications').insert({
      org_id: orgId, title: 'تمت إضافة فرع لباقتك', type: 'success', read: false,
      message: res.proratedAmount > 0 ? `انضاف فرع لباقتك — المستحق ${res.proratedAmount} ⃁ عن الأيام الباقية لين تجديد اشتراكك، وبعدها ${offer.price} ⃁ شهرياً` : `انضاف فرع لباقتك بـ${offer.price} ⃁ شهرياً`,
    } as any)
  } catch {}
  return { ok: true, proratedAmount: res.proratedAmount, total: offer.total + 1 }
}
