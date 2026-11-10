// تجديد الاشتراك بدون بوابة دفع (الآن): المالك يضغط «تجديد الاشتراك» → طلب «بانتظار الدفع»، وحسابه يشتغل
//  - لو الاشتراك منتهي: يوم سماح واحد من الآن (يكفي لين تتواصل الإدارة)
//  - لو لسا شغال: ما نمدد شي — بس الطلب
//  - طلب معلّق واحد لكل منشأة (فهرس فريد في القاعدة) → ما ينفع يمدد يوم كل يوم بدون دفع
// بوابة الدفع لاحقاً: تنشئ نفس الطلب، وبعد الدفع تنادي markRenewalPaid(..., 'gateway', ref) وتمدد الاشتراك
import type { SupabaseClient } from '@supabase/supabase-js'

export const GRACE_MS = 24 * 3600e3

export type RenewalResult =
  | { ok: true; created: boolean; extended: boolean; endsAt: string | null; renewalId: string }
  | { ok: false; error: string; status: number }

/** يوم السماح: من الآن لو منتهي، وإلا ما نغيّر شي */
export function graceEnd(currentEnd: string | null, now = Date.now()): string | null {
  const end = currentEnd ? Date.parse(currentEnd) : NaN
  if (Number.isFinite(end) && end > now) return null
  return new Date(now + GRACE_MS).toISOString()
}

export async function requestRenewal(db: SupabaseClient, orgId: string, userId: string, now = Date.now()): Promise<RenewalResult> {
  const { data: owner } = await db.from('profiles').select('subscription_ends_at').eq('org_id', orgId).eq('role', 'owner').maybeSingle()
  const currentEnd = (owner as any)?.subscription_ends_at || null
  // طلب معلّق موجود؟ نرجعه بدون تمديد ثاني
  const { data: pending } = await db.from('subscription_renewals').select('id').eq('org_id', orgId).eq('status', 'pending_payment').maybeSingle()
  if (pending) return { ok: true, created: false, extended: false, endsAt: currentEnd, renewalId: (pending as any).id }

  const grace = graceEnd(currentEnd, now)
  const { data: row, error } = await db.from('subscription_renewals').insert({
    org_id: orgId, requested_by: userId, previous_ends_at: currentEnd, grace_until: grace, payment_method: 'manual',
  } as any).select('id').single()
  if (error || !row) {
    // سباق ضغطتين: الفهرس الفريد يرفض الثانية
    if ((error as any)?.code === '23505') {
      const { data: p } = await db.from('subscription_renewals').select('id').eq('org_id', orgId).eq('status', 'pending_payment').maybeSingle()
      if (p) return { ok: true, created: false, extended: false, endsAt: currentEnd, renewalId: (p as any).id }
    }
    return { ok: false, error: 'تعذر إرسال طلب التجديد، حاول مرة أخرى', status: 500 }
  }
  if (grace) {
    // نفس طريقة التفعيل من الأدمن: كل حسابات المنشأة (المالك والمديرين) تتبع نفس التاريخ
    const { error: upErr } = await db.from('profiles').update({ subscription_ends_at: grace } as any).eq('org_id', orgId)
    if (upErr) {
      await db.from('subscription_renewals').delete().eq('id', (row as any).id)
      return { ok: false, error: 'تعذر تجديد الاشتراك، حاول مرة أخرى', status: 500 }
    }
  }
  return { ok: true, created: true, extended: !!grace, endsAt: grace || currentEnd, renewalId: (row as any).id }
}

/** بعد الدفع (يدوي من الأدمن الآن، أو بوابة لاحقاً): كل طلبات المنشأة المعلّقة تصير «مدفوع» */
export async function markRenewalPaid(db: SupabaseClient, orgId: string, by: string, method: 'manual' | 'gateway' = 'manual', ref?: string | null, amount?: number | null) {
  await db.from('subscription_renewals').update({
    status: 'paid', decided_at: new Date().toISOString(), decided_by_name: by, payment_method: method,
    ...(ref ? { payment_ref: ref } : {}), ...(amount != null ? { amount } : {}),
  } as any).eq('org_id', orgId).eq('status', 'pending_payment')
}
