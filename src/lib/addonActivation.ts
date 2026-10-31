// تفعيل إضافة لمنشأة — مكان واحد يستخدمه الأدمن من ملف العميل ومن الموافقة على طلبات الإضافات
import type { SupabaseClient } from '@supabase/supabase-js'
import { syncBranchesToLimit } from '@/lib/branchLimit'
import { addonPeriodEnd, branchPriceFor, planKeyOf, proratedCharge, unitPrice, YEARLY_FACTOR } from '@/lib/planPricing'

export type ActivateResult =
  | { ok: true; expiresAt: string; quantity: number; proratedAmount: number; proratedDays: number; branchIds: string[] | null; slug: string; name: string }
  | { ok: false; status: number; error: string }

/**
 * quantity = الكمية الكلية بعد التفعيل.
 * unitPrice = سعر الوحدة للاشتراك الجديد لو يختلف عن سعر الإضافة (الفرع الإضافي سعره حسب الباقة) — يتثبّت بـ locked_price.
 * yearly = باقة سنوية: المستحق بالتناسب للفرع الإضافي بخصم السنوي.
 */
export async function activateAddon(db: SupabaseClient, input: { orgId: string; addonId: string; quantity?: number; branchIds?: string[] | null; unitPrice?: number; yearly?: boolean }): Promise<ActivateResult> {
  const { orgId, addonId } = input
  const { data: addonRow } = await db.from('marketplace_addons').select('slug,name,monthly_price').eq('id', addonId).maybeSingle()
  if (!addonRow) return { ok: false, status: 404, error: 'الإضافة غير موجودة' }
  const slug = (addonRow as any).slug as string

  // الفرع الإضافي: سعره وخصم السنوي حسب باقة المنشأة — حتى لو فعّله الأدمن
  if (slug === 'extra_branch' && !(Number(input.unitPrice) > 0)) {
    const { data: org } = await db.from('organizations').select('plan,max_branches,billing_cycle').eq('id', orgId).maybeSingle()
    input = { ...input, unitPrice: branchPriceFor(planKeyOf((org as any)?.plan, (org as any)?.max_branches)), yearly: (org as any)?.billing_cycle === 'yearly' }
  }

  // الإضافة تنتهي مع الباقة — المستحق الحين بالتناسب عن الأيام الباقية
  const { data: owner } = await db.from('profiles').select('subscription_ends_at').eq('org_id', orgId).eq('role', 'owner').maybeSingle()
  const periodEnd = addonPeriodEnd((owner as any)?.subscription_ends_at)
  const expiresAt = periodEnd.toISOString()
  const qty = Math.max(1, Math.min(20, Number(input.quantity) || 1))

  const { data: existingRow } = await db.from('org_addon_subscriptions').select('id,quantity,status,expires_at,locked_price').eq('org_id', orgId).eq('addon_id', addonId).maybeSingle()
  // سارية فعلاً = active وما انتهت — المنتهية تنحسب كاشتراك جديد بالكامل
  const wasActive = (existingRow as any)?.status === 'active' && (!(existingRow as any)?.expires_at || new Date((existingRow as any).expires_at) > new Date())
  const oldQty = wasActive ? ((existingRow as any)?.quantity || 0) : 0
  const qtyDelta = qty - oldQty

  const { error } = await db.from('org_addon_subscriptions').upsert({
    org_id: orgId, addon_id: addonId, status: 'active', activated_at: new Date().toISOString(), expires_at: expiresAt, cancelled_at: null, quantity: qty,
    // اشتراك جديد أو بعد انتهاء = السعر الحالي (أو سعر الباقة للفرع الإضافي)؛ الساري يحتفظ بسعره المثبّت
    ...(wasActive ? {} : { locked_price: Number(input.unitPrice) > 0 ? Number(input.unitPrice) : null }),
  } as any, { onConflict: 'org_id,addon_id' })
  if (error) return { ok: false, status: 500, error: 'فشل التفعيل' }

  // نطبّق الفرق بس على حدود المنشأة
  if (slug === 'extra_branch') {
    await syncBranchesToLimit(db, orgId)
  } else if (slug === 'extra_staff' && qtyDelta !== 0) {
    const { data: org } = await db.from('organizations').select('max_staff').eq('id', orgId).single()
    await db.from('organizations').update({ max_staff: Math.max(0, ((org as any)?.max_staff || 0) + qtyDelta) } as any).eq('id', orgId)
  } else if (slug === 'extra_suppliers' && qtyDelta !== 0) {
    const { data: org } = await db.from('organizations').select('max_suppliers').eq('id', orgId).single()
    await db.from('organizations').update({ max_suppliers: Math.max(0, ((org as any)?.max_suppliers || 0) + qtyDelta) } as any).eq('id', orgId)
  }

  // المستحق الحين: الوحدات الجديدة فقط × الأيام الباقية لين التجديد
  const chargedQty = wasActive ? Math.max(0, qtyDelta) : qty
  const unit = wasActive ? unitPrice((addonRow as any).monthly_price, existingRow as any) : (Number(input.unitPrice) > 0 ? Number(input.unitPrice) : Number((addonRow as any).monthly_price) || 0)
  const prorated = proratedCharge(input.yearly && slug === 'extra_branch' ? unit * YEARLY_FACTOR : unit, chargedQty, periodEnd)
  return { ok: true, expiresAt, quantity: qty, proratedAmount: prorated.amount, proratedDays: prorated.days, branchIds: null, slug, name: (addonRow as any).name }
}
