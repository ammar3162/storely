// طلب فرع إضافي — العميل يطلبه من صفحة الفروع، والأدمن يوافق عليه من «طلبات الإضافات».
// الطلب لين حد باقته (lib/planPricing PLAN_CAPS.maxBranches)، وسعره حسب باقته (يتثبّت وقت الموافقة — lib/addonActivation).
import type { SupabaseClient } from '@supabase/supabase-js'
import { PLAN_CAPS, branchPriceFor, maxSelfServeBranches, planKeyOf, YEARLY_FACTOR } from '@/lib/planPricing'
import { getBranchLimit, EXTRA_BRANCH_SLUG } from '@/lib/branchLimit'

export type BranchOffer = {
  plan: string
  total: number          // الفروع المسموحة الحين (الباقة + المشتراة)
  maxTotal: number       // أقصى فروع يوصلها بنفسه
  canAdd: boolean
  pending: number        // فروع مطلوبة تنتظر موافقة الأدمن
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
  const pending = (await pendingBranchRequest(db, orgId))?.quantity || 0
  return {
    plan, total: limit.total, maxTotal, pending, canAdd: limit.total + pending < maxTotal,
    price: branchPriceFor(plan), yearly: (org as any)?.billing_cycle === 'yearly',
    staff: caps.branchStaff, suppliers: caps.branchSuppliers,
    nextPlan: plan === 'basic' ? 'pro' : plan === 'pro' ? 'advanced' : null,
  }
}

async function pendingBranchRequest(db: SupabaseClient, orgId: string): Promise<{ id: string; quantity: number } | null> {
  const { data } = await db.from('addon_requests').select('id,quantity,marketplace_addons!inner(slug)')
    .eq('org_id', orgId).eq('status', 'pending').eq('marketplace_addons.slug', EXTRA_BRANCH_SLUG).maybeSingle()
  return data ? { id: (data as any).id, quantity: Math.max(1, Number((data as any).quantity) || 1) } : null
}

/** طلب فرع إضافي (ينتظر موافقة الأدمن) — طلب معلّق موجود يزيد عدده بدل ما يتكرر */
export async function requestExtraBranch(db: SupabaseClient, orgId: string, userId: string | null):
  Promise<{ ok: true; pending: number } | { ok: false; status: number; error: string; code?: string }> {
  const offer = await branchOffer(db, orgId)
  if (!offer.canAdd) return { ok: false, status: 403, code: 'plan_max', error: `وصلت أقصى عدد فروع لباقتك (${offer.maxTotal})${offer.pending ? ' مع الطلبات المعلّقة' : ''} — رقّ باقتك عشان تضيف فروع أكثر` }

  const { data: addon } = await db.from('marketplace_addons').select('id').eq('slug', EXTRA_BRANCH_SLUG).maybeSingle()
  if (!addon) return { ok: false, status: 500, error: 'إضافة الفرع غير متاحة' }
  const note = `فرع إضافي بـ${offer.price} ⃁ شهرياً${offer.yearly ? ' (باقة سنوية بخصم ' + Math.round((1 - YEARLY_FACTOR) * 100) + '%)' : ''} — معه ${offer.staff} موظفين و${offer.suppliers} موردين`
  const pending = await pendingBranchRequest(db, orgId)
  const { error } = pending
    ? await db.from('addon_requests').update({ quantity: pending.quantity + 1, note, created_at: new Date().toISOString() } as any).eq('id', pending.id)
    : await db.from('addon_requests').insert({ org_id: orgId, addon_id: (addon as any).id, quantity: 1, status: 'pending', requested_by: userId, note } as any)
  if (error) return { ok: false, status: 500, error: 'فشل إرسال الطلب' }
  return { ok: true, pending: (pending?.quantity || 0) + 1 }
}
