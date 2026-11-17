// تفاصيل عرض السعر من بيانات المنشأة نفسها (الخادم فقط): المالك، الباقة، الفروع، وسطور فاتورتها
// تُستخدم في إرسال العرض ومعاينته وفاتورة الدفع بعد التفعيل — فالأرقام واحدة من ملف العميل ومن «طلبات التجديد»
import type { SupabaseClient } from '@supabase/supabase-js'
import { orgBillLines, type Org, type AddonRow, type SubRow } from '@/lib/orgBill'
import { planLabel, isNewPlan } from '@/lib/planPricing'
import { renewalStart, addMonths } from '@/lib/subscriptionLifecycle'
import { buildQuoteDetails, type QuoteContext, type QuoteDetails } from '@/lib/offerQuote'

const ORG_COLS = 'id,name,plan,max_branches,locked_plan_monthly,billing_cycle,staff_included,discount_type,discount_value,discount_note,discount_until'

export async function orgQuoteContext(db: SupabaseClient, orgId: string): Promise<(QuoteContext & { orgName: string | null; sub: { type: string | null; endsAt: string | null } }) | null> {
  const [{ data: org }, { data: owner }, { data: branches }, { data: addons }, { data: subs }] = await Promise.all([
    db.from('organizations').select(ORG_COLS).eq('id', orgId).maybeSingle(),
    db.from('profiles').select('full_name,subscription_type,subscription_ends_at').eq('org_id', orgId).eq('role', 'owner').maybeSingle(),
    db.from('branches').select('name,is_active,plan_locked_at,created_at').eq('org_id', orgId).order('created_at', { ascending: true }),
    db.from('marketplace_addons').select('id,name,slug,monthly_price'),
    db.from('org_addon_subscriptions').select('org_id,addon_id,status,expires_at,quantity,locked_price').eq('org_id', orgId).eq('status', 'active'),
  ])
  if (!org) return null
  const o = org as any
  const bill = orgBillLines(o as Org, (addons || []) as AddonRow[], (subs || []) as SubRow[])
  // الفروع الشغّالة: مفعّلة وما توقفت بسبب حد الباقة
  const working = ((branches || []) as any[]).filter(b => b.is_active !== false && !b.plan_locked_at)
  return {
    orgName: o.name || null,
    ownerName: (owner as any)?.full_name || null,
    sub: { type: (owner as any)?.subscription_type ?? null, endsAt: (owner as any)?.subscription_ends_at ?? null },
    planLabel: planLabel(o.plan, o.max_branches),
    // الباقات الجديدة تنحسب على فروع الباقة، والقديمة على فروعه الشغّالة
    branches: isNewPlan(o.plan) ? Math.max(1, Number(o.max_branches) || 1) : Math.max(1, working.length),
    branchNames: working.map(b => String(b.name || '').trim()).filter(Boolean),
    cycle: bill.cycle,
    lines: bill.lines.map(l => ({ label: l.label, amount: l.amount })),
    total: bill.total,
  }
}

/** تاريخ من المتصفح (بداية/نهاية المدة) — يُقبل لو صحيح وقريب (خلال 3 سنوات) */
function nearDate(v: unknown): Date | null {
  if (typeof v !== 'string') return null
  const t = Date.parse(v)
  return Number.isFinite(t) && Math.abs(t - Date.now()) < 3 * 365 * 86400000 ? new Date(t) : null
}

/**
 * offer = { months, kind, note, starts_at?, ends_at? } — البداية والنهاية من المتصفح لو موجودة (فاتورة الدفع تأخذها
 * من رد التفعيل)، وإلا نفس قاعدة التفعيل: من نهاية الاشتراك الساري أو من اليوم
 */
export async function offerQuoteDetails(db: SupabaseClient, orgId: string, offer: any, amount: number): Promise<{ orgName: string | null; details: QuoteDetails } | null> {
  const months = Math.round(Number(offer?.months))
  if (!(months >= 1 && months <= 24) || !(amount > 0)) return null
  const ctx = await orgQuoteContext(db, orgId)
  if (!ctx) return null
  const start = nearDate(offer?.starts_at) || renewalStart({ type: ctx.sub.type, endsAt: ctx.sub.endsAt }, 'paid')
  const end = nearDate(offer?.ends_at) || addMonths(start, months)
  return {
    orgName: ctx.orgName,
    details: buildQuoteDetails(ctx, { months, amount, kind: offer?.kind, note: typeof offer?.note === 'string' ? offer.note : null, start, end }),
  }
}
