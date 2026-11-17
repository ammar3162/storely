// طلب فرع إضافي — العميل يطلبه من صفحة الفروع، والأدمن يوافق عليه من «طلبات الإضافات».
// الطلب لين حد باقته (lib/planPricing PLAN_CAPS.maxBranches)، وسعره حسب باقته (يتثبّت وقت الموافقة — lib/addonActivation).
// «باقتك المخصصة»: الفرع نفسه بدون رسوم — العميل يكتب اسم الفرع ويختار خدماته بنفس الطلب، والموافقة تنشئ الفرع
// وتفعّل خدماته مرة وحدة (lib/branchRequestApproval).
import type { SupabaseClient } from '@supabase/supabase-js'
import { PLAN_CAPS, branchPriceFor, maxSelfServeBranches, nextPlanOf, isNewPlan, isCustomPlan, planKeyOf, YEARLY_FACTOR, addonPeriodEnd } from '@/lib/planPricing'
import { getBranchLimit, EXTRA_BRANCH_SLUG } from '@/lib/branchLimit'
import { PER_BRANCH_SERVICES, branchServices, chosenServices, branchMonthly, cleanBranchName, cleanBranchLocation, type BranchService } from '@/lib/branchServices'

export type BranchOffer = {
  plan: string
  total: number          // الفروع المسموحة الحين (الباقة + المشتراة)
  active: number         // الفروع الشغّالة الحين (لو أقل من total يقدر يضيف فرع بدون طلب)
  maxTotal: number       // أقصى فروع يوصلها بنفسه
  canAdd: boolean
  pending: number        // فروع مطلوبة تنتظر موافقة الأدمن
  price: number          // سعر الفرع الشهري (الباقة المخصصة: 0 — التكلفة من خدماته)
  yearly: boolean        // باقته سنوية (الفرع ينحسب بخصم السنوي)
  staff: number          // موظفين يجون مع الفرع
  suppliers: number      // موردين يجون مع الفرع
  nextPlan: string | null // الباقة الأعلى لو وصل الحد
  custom: boolean        // «باقتك المخصصة»: الطلب فيه اسم الفرع وخدماته
  services: BranchService[] // الخدمات اللي تنحسب لكل فرع وسعر كل وحدة للفرع الجديد (الباقة المخصصة بس)
  periodEnd: string      // نهاية اشتراكه — المستحق الحين بالتناسب لين هالتاريخ
}

/** خدمات الفرع الجديد بأسعارها، من اشتراكات المنشأة الحالية */
export async function orgBranchServices(db: SupabaseClient, orgId: string): Promise<BranchService[]> {
  const [{ data: addons }, { data: subs }] = await Promise.all([
    db.from('marketplace_addons').select('id,slug,name').in('slug', PER_BRANCH_SERVICES),
    db.from('org_addon_subscriptions').select('addon_id,status,expires_at,quantity,branch_ids,locked_price').eq('org_id', orgId),
  ])
  const now = Date.now()
  const rows = (addons || []) as any[]
  const list = ((subs || []) as any[]).map(s => ({
    slug: rows.find(a => a.id === s.addon_id)?.slug || '',
    active: s.status === 'active' && (!s.expires_at || new Date(s.expires_at).getTime() > now),
    quantity: s.quantity, branch_ids: s.branch_ids, locked_price: s.locked_price,
  })).filter(s => s.slug)
  return branchServices(list, Object.fromEntries(rows.map(a => [a.slug, a.name])))
}

export async function branchOffer(db: SupabaseClient, orgId: string): Promise<BranchOffer> {
  const [{ data: org }, limit, { data: owner }, { count: active }] = await Promise.all([
    db.from('organizations').select('plan,max_branches,billing_cycle').eq('id', orgId).single(),
    getBranchLimit(db, orgId),
    db.from('profiles').select('subscription_ends_at').eq('org_id', orgId).eq('role', 'owner').maybeSingle(),
    db.from('branches').select('id', { count: 'exact', head: true }).eq('org_id', orgId).eq('is_active', true),
  ])
  const plan = planKeyOf((org as any)?.plan, (org as any)?.max_branches)
  const caps = PLAN_CAPS[plan]
  const maxTotal = maxSelfServeBranches(plan, limit.base)
  const pending = await pendingBranchCount(db, orgId)
  const custom = isCustomPlan(plan)
  return {
    plan, total: limit.total, active: active || 0, maxTotal, pending, canAdd: limit.total + pending < maxTotal,
    price: branchPriceFor(plan), yearly: (org as any)?.billing_cycle === 'yearly',
    staff: caps.branchStaff, suppliers: caps.branchSuppliers,
    // الجديدة كلها توصل 10 فروع — فوقها «المؤسسات» بالتواصل، فما فيه باقة أعلى نقترحها هنا
    nextPlan: isNewPlan(plan) ? null : nextPlanOf(plan),
    custom, services: custom ? await orgBranchServices(db, orgId) : [],
    periodEnd: addonPeriodEnd((owner as any)?.subscription_ends_at).toISOString(),
  }
}

async function pendingBranchRows(db: SupabaseClient, orgId: string): Promise<{ id: string; quantity: number; details: any }[]> {
  const { data } = await db.from('addon_requests').select('id,quantity,details,created_at,marketplace_addons!inner(slug)')
    .eq('org_id', orgId).eq('status', 'pending').eq('marketplace_addons.slug', EXTRA_BRANCH_SLUG).order('created_at', { ascending: true })
  return ((data || []) as any[]).map(r => ({ id: r.id, quantity: Math.max(1, Number(r.quantity) || 1), details: r.details || null }))
}

/** كم فرع مطلوب ينتظر الأدمن (طلب مجمّع للباقات العادية، وطلب لكل فرع بالباقة المخصصة) */
async function pendingBranchCount(db: SupabaseClient, orgId: string) {
  return (await pendingBranchRows(db, orgId)).reduce((t, r) => t + r.quantity, 0)
}

export type BranchRequestInput = { branch_name?: unknown; location?: unknown; services?: unknown }

/**
 * طلب فرع إضافي (ينتظر موافقة الأدمن).
 * الباقات العادية: طلب معلّق موجود يزيد عدده بدل ما يتكرر.
 * الباقة المخصصة: طلب لكل فرع فيه اسمه وموقعه وخدماته (details) — الموافقة تنشئه جاهز.
 */
export async function requestExtraBranch(db: SupabaseClient, orgId: string, userId: string | null, input: BranchRequestInput = {}):
  Promise<{ ok: true; pending: number; monthly?: number } | { ok: false; status: number; error: string; code?: string }> {
  const offer = await branchOffer(db, orgId)
  if (!offer.canAdd) return { ok: false, status: 403, code: 'plan_max', error: `وصلت إلى الحد الأقصى لعدد فروع باقتك (${offer.maxTotal})${offer.pending ? ' مع الطلبات المعلّقة' : ''} — ${isNewPlan(offer.plan) ? 'تواصل معنا لباقة المؤسسات' : 'رقِّ باقتك لإضافة المزيد من الفروع'}` }

  const { data: addon } = await db.from('marketplace_addons').select('id').eq('slug', EXTRA_BRANCH_SLUG).maybeSingle()
  if (!addon) return { ok: false, status: 500, error: 'إضافة الفرع غير متاحة' }

  if (offer.custom) {
    const name = cleanBranchName(input.branch_name)
    if (name.length < 2) return { ok: false, status: 400, code: 'name', error: 'اكتب اسم الفرع الجديد' }
    const [{ data: same }, waiting] = await Promise.all([
      db.from('branches').select('id').eq('org_id', orgId).ilike('name', name.replace(/[%_\\]/g, m => '\\' + m)).limit(1),
      pendingBranchRows(db, orgId),
    ])
    if ((same || []).length || waiting.some(r => cleanBranchName(r.details?.branch_name) === name))
      return { ok: false, status: 409, code: 'name', error: `يوجد فرع بالاسم «${name}» — اختر اسماً آخر` }
    const services = chosenServices(offer.services, input.services)
    const monthly = branchMonthly(offer.services, services)
    const names = offer.services.filter(s => services.includes(s.slug)).map(s => s.name)
    const note = `فرع «${name}»${names.length ? ` مع: ${names.join('، ')}` : ' بدون خدمات'} — ${monthly} ⃁ شهرياً`
    const { error } = await db.from('addon_requests').insert({ org_id: orgId, addon_id: (addon as any).id, quantity: 1, status: 'pending', requested_by: userId, note,
      details: { branch_name: name, location: cleanBranchLocation(input.location), services } } as any)
    if (error) return { ok: false, status: 500, error: 'فشل إرسال الطلب' }
    return { ok: true, pending: offer.pending + 1, monthly }
  }

  const note = `فرع إضافي بـ${offer.price} ⃁ شهرياً${offer.yearly ? ' (باقة سنوية بخصم ' + Math.round((1 - YEARLY_FACTOR) * 100) + '%)' : ''} — معه ${offer.staff} موظفين و${offer.suppliers} موردين`
  const pending = (await pendingBranchRows(db, orgId)).find(r => !r.details)
  const { error } = pending
    ? await db.from('addon_requests').update({ quantity: pending.quantity + 1, note, created_at: new Date().toISOString() } as any).eq('id', pending.id)
    : await db.from('addon_requests').insert({ org_id: orgId, addon_id: (addon as any).id, quantity: 1, status: 'pending', requested_by: userId, note } as any)
  if (error) return { ok: false, status: 500, error: 'فشل إرسال الطلب' }
  return { ok: true, pending: offer.pending + 1 }
}
