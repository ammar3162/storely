import { NextResponse } from 'next/server'
import { planPriceFor, planKeyOf, PRICE_UPDATE_ON_RENEWAL, isNewPlan } from '@/lib/planPricing'
import { createClient } from '@supabase/supabase-js'
import { requirePermission, logAdminAction } from '@/lib/adminAuth'
import { markRenewalPaid } from '@/lib/renewal'
import { syncBranchesToLimit } from '@/lib/branchLimit'
import { awardAgentCommission } from '@/lib/agentReferral'
import { applyPricingSwitch } from '@/lib/pricingSwitch'
import { renewalEnd, type SubType } from '@/lib/subscriptionLifecycle'
import { forgetOrgSubState } from '@/lib/subscription'

export async function POST(req: Request) {
  const adminKey = req.headers.get('x-admin-key')
  const admin = await requirePermission(adminKey, 'manage_users')
  if (!admin) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const body = await req.json()
  const { userId } = body
  const type: SubType = body.type === 'trial' ? 'trial' : 'paid'

  const { data: profile } = await supabase.from('profiles').select('org_id,full_name,organizations(name,max_branches,plan,locked_plan_monthly)').eq('id', userId).maybeSingle()
  if (!profile) return NextResponse.json({ error: 'الحساب غير موجود' }, { status: 404 })

  // تاريخ الانتهاء من الخادم (قاعدة واحدة — lib/subscriptionLifecycle):
  // مدة بالأيام أو الأشهر → تبدأ من نهاية الاشتراك الحالي لو نفس النوع ولسا ساري، وإلا من اليوم.
  // (ends الصريح مقبول للتوافق فقط)
  let ends: string | null = typeof body.ends === 'string' ? body.ends : null
  let startsAt: string | null = null
  const days = Number(body.days), months = Number(body.months)
  const orgIdForSub = (profile as any)?.org_id
  const { data: owner } = orgIdForSub
    ? await supabase.from('profiles').select('subscription_type,subscription_ends_at,status').eq('org_id', orgIdForSub).eq('role', 'owner').maybeSingle()
    : await supabase.from('profiles').select('subscription_type,subscription_ends_at,status').eq('id', userId).maybeSingle()
  // كان مدفوع قبل؟ → «جدّد» في سجل الأحداث (الإحصائيات)، وإلا «اشترك» لأول مرة
  const wasPaid = (owner as any)?.subscription_type === 'paid'
  if (days > 0 || months > 0) {
    const { data: pendingRenewal } = orgIdForSub
      ? await supabase.from('subscription_renewals').select('grace_until').eq('org_id', orgIdForSub).eq('status', 'pending_payment').maybeSingle()
      : { data: null }
    const r = renewalEnd(
      { type: (owner as any)?.subscription_type, endsAt: (owner as any)?.subscription_ends_at, status: (owner as any)?.status },
      type, months > 0 ? { months } : { days }, Date.now(), (pendingRenewal as any)?.grace_until || null,
    )
    ends = r.end.toISOString(); startsAt = r.start.toISOString()
  }
  if (!ends || !Number.isFinite(Date.parse(ends))) return NextResponse.json({ error: 'مدة التفعيل غير صحيحة' }, { status: 400 })

  const orgIdForUpdate = (profile as any)?.org_id
  const updateQuery = supabase
    .from('profiles')
    .update({ status: 'active', subscription_type: type, subscription_ends_at: ends, trial_reminder_sent: false, expiry_notice_sent: false } as any)
  const { error } = orgIdForUpdate
    ? await updateQuery.eq('org_id', orgIdForUpdate)
    : await updateQuery.eq('id', userId)
  // طلب تجديد معلّق (زر «تجديد الاشتراك») → يصير «مدفوع» مع التفعيل
  if (!error && orgIdForUpdate && type === 'paid') await markRenewalPaid(supabase as any, orgIdForUpdate, admin.full_name, 'manual').catch(() => {})

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  // اختيار المزايا بالأسعار الجديدة (المشتركين الحاليين): يُطبَّق مع هذا التجديد — قبل تجديد الإضافات عشان تتمدّد معها
  let pricingSwitch: Awaited<ReturnType<typeof applyPricingSwitch>> | null = null
  if (orgIdForUpdate && ends && type === 'paid') {
    try { pricingSwitch = await applyPricingSwitch(supabase, orgIdForUpdate, ends) } catch (e) { console.error('PRICING_SWITCH_APPLY_FAILED', e) }
  }

  // تجديد الباقة يجدد كل الإضافات المفعّلة لنفس التاريخ — تاريخ تجديد وفاتورة وحدة
  let addonsRenewed = 0
  if (orgIdForUpdate && ends) {
    const { data: renewed } = await supabase.from('org_addon_subscriptions')
      .update({ expires_at: ends } as any)
      .eq('org_id', orgIdForUpdate).eq('status', 'active').select('id')
    addonsRenewed = renewed?.length || 0
    // إضافات تغيّر سعرها: من التجديد تنحسب بالسعر الجديد (يفك السعر المثبّت القديم)
    const { data: repriced } = await supabase.from('marketplace_addons').select('id').in('slug', PRICE_UPDATE_ON_RENEWAL)
    const repricedIds = ((repriced || []) as any[]).map(a => a.id)
    // للباقات القديمة بس — الجديدة أسعارها من جدولها (lib/planPricing)
    const { data: orgPlanRow } = await supabase.from('organizations').select('plan').eq('id', orgIdForUpdate).maybeSingle()
    if (repricedIds.length && !isNewPlan((orgPlanRow as any)?.plan)) await supabase.from('org_addon_subscriptions').update({ locked_price: null } as any)
      .eq('org_id', orgIdForUpdate).eq('status', 'active').in('addon_id', repricedIds)
    await syncBranchesToLimit(supabase, orgIdForUpdate)
    // ما نوقف موظفين وقت التجديد — لو المنشأة فوق حدها يبان للأدمن تنبيه بملف العميل ويقرر
  }

  await logAdminAction(admin, 'activate_user', (profile as any)?.org_id, (profile as any)?.organizations?.name, { userId, type, ends })

  // سجل حدث اشتراك — يُستخدم لاحقاً لحساب MRR وChurn بدقة عبر الزمن
  try {
    const orgId = (profile as any)?.org_id
    const maxBranches = (profile as any)?.organizations?.max_branches || 1
    const planName = planKeyOf((profile as any)?.organizations?.plan, maxBranches)
    const amount = planPriceFor(planName, (profile as any)?.organizations?.locked_plan_monthly, maxBranches).monthly
    if (orgId) {
      await (supabase as any).from('subscription_events').insert({
        org_id: orgId,
        event_type: type === 'paid' ? (wasPaid ? 'renewed' : 'activated') : 'trial_started',
        plan: planName,
        amount: type === 'paid' ? amount : 0,
      })
    }
  } catch {}

  // مكافأة السفير على أول اشتراك مدفوع (مرة وحدة لكل منشأة)
  let agentReward: number | null = null
  if (type === 'paid' && orgIdForUpdate) {
    try { agentReward = await awardAgentCommission(supabase, orgIdForUpdate) } catch (e) { console.error('AGENT_COMMISSION_FAILED', e) }
  }

  if (orgIdForUpdate) forgetOrgSubState(orgIdForUpdate)
  return NextResponse.json({ success: true, ends, startsAt, addonsRenewed, agentReward, pricingSwitch })
}
