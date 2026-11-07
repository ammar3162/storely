// سياق المساعد الذكي: التعليمات + الاشتراك (للمالك) + دليل الاستخدام + الأدوات المسموحة (lib/assistantTools).
// البيانات ما تنرسل كلها — المساعد يطلب اللي يحتاجه بالأدوات، وكل أداة مربوطة بميزتها وصلاحية المدير.
// تحليل البيانات مع ميزة الذكاء الاصطناعي؛ أسئلة الاشتراك وطريقة الاستخدام مجانية للكل.
import type { SupabaseClient } from '@supabase/supabase-js'
import { orgFeatures, FEATURE_LABEL, type Features } from '@/lib/planFeatures'
import { billLines, planLabel, planKeyOf, activeDiscount, staffBase, supplierBase, PLAN_CAPS, PLAN_PRICING, isNewPlan, addonsForPlan } from '@/lib/planPricing'
import { getBranchLimit } from '@/lib/branchLimit'
import { assistantGuide } from '@/lib/assistantGuide'
import { allowedTools, ASSISTANT_TOOLS, type ToolCtx } from '@/lib/assistantTools'

type Access = { role?: string | null; permissions?: Record<string, unknown> | null }
const DAY = 864e5
const saudiDay = (d: Date | string) => new Date(new Date(d).getTime() + 3 * 3600e3).toISOString().slice(0, 10)
const n = (v: unknown) => Math.round((Number(v) || 0) * 100) / 100

const TOOL_AR: Record<string, string> = {
  purchases: 'المشتريات والفواتير', supplier_prices: 'مقارنة أسعار الموردين', dispense: 'الصرف حسب الموظف أو الصنف',
  inventory: 'المخزون والتوقعات', vat: 'الضريبة', cashier_closings: 'إقفالات الكاشير', attendance: 'الحضور والغياب والتأخير',
}

export type AssistantContext = {
  prompt: string
  sections: { key: string; label: string; on: boolean }[]
  tools: { name: string; description: string; input_schema: Record<string, unknown> }[]
  features: Features
  toolCtx: ToolCtx
}

export async function buildAssistantContext(db: SupabaseClient, orgId: string, branchId: string | null, access: Access): Promise<AssistantContext> {
  const { data: org } = await db.from('organizations')
    .select('name,plan,max_branches,max_staff,max_suppliers,staff_included,billing_cycle,locked_plan_monthly,discount_type,discount_value,discount_note,discount_until,currency,vat_registered,business_type')
    .eq('id', orgId).single()
  const o = (org || {}) as any
  const features = await orgFeatures(db, orgId, o.plan || 'basic')
  const isManager = access.role === 'manager'
  const tools = allowedTools(features, access)
  const on = new Set(tools.map(t => t.name))

  const sections = [
    { key: 'subscription', label: 'الاشتراك والباقة', on: !isManager },
    ...ASSISTANT_TOOLS.map(t => ({ key: t.name, label: TOOL_AR[t.name] || t.name, on: on.has(t.name) })),
  ]
  // ليش القسم مقفل: الميزة غير مفعّلة، أو المدير ما عنده صلاحيته
  const lockedWhy = (name: string) => {
    if (!features.ai) return `يحتاج إضافة «${FEATURE_LABEL.ai}» (أو باقة فيها الذكاء)`
    if (name === 'cashier_closings' && !features.cashier) return `يحتاج إضافة «${FEATURE_LABEL.cashier}»`
    if (name === 'attendance' && !features.hr) return `يحتاج إضافة «${FEATURE_LABEL.hr}»`
    return 'ما عندك صلاحيته — يفعّلها لك مالك المنشأة'
  }
  const locked = ASSISTANT_TOOLS.filter(t => !on.has(t.name)).map(t => `• ${TOOL_AR[t.name] || t.name}: ${lockedWhy(t.name)}`)

  const parts: string[] = []
  if (!isManager) parts.push(await subscriptionSection(db, orgId, o, features))
  parts.push(await assistantGuide(db))

  const prompt = `أنت المساعد الذكي في نظام Storely لمنشأة «${o.name || ''}». تجاوب بالعربي (لهجة سعودية بسيطة)، مختصر وعملي، وبأرقام محددة.

قواعد:
- تجاوب بس عن المنشأة وبياناتها وطريقة استخدام النظام والاشتراك. أي سؤال ثاني (عام، شخصي، معلومات خارجية) اعتذر بجملة وحدة وقل إنك مساعد المنشأة بس.
- بيانات المنشأة (مشتريات، موردين، صرف، مخزون، ضريبة، كاشير، حضور) تجيبها بالأدوات بس — لا تخمّن ولا تخترع أرقام. لو الأداة ما رجعت بيانات قل ذلك.
- اختر الأداة والفترة المناسبة للسؤال (أمس، هالشهر، شهر معيّن…) وجاوب على طول. معاني النظام: «الصرف/صرف/صرفنا» = صرف المخزون (أداة الصرف)، «اشترينا/المشتريات/الفواتير/دفعنا للمورد» = المشتريات. «أكثر موظف صرف» = الصرف حسب الموظف.
- اسأل للتوضيح بس لو مستحيل تفهم السؤال، وبجملة وحدة بدون قوائم خيارات. وكمّل المحادثة: لو المستخدم رد على سؤالك السابق (رقم أو كلمة)، افهمه من المحادثة.
- اليوم بتوقيت السعودية: ${saudiDay(new Date())}.${isManager ? '\n- المستخدم مدير فرع: بياناته لفرعه بس، وأسئلة الاشتراك والفواتير يجاوب عليها مالك المنشأة.' : ''}
${tools.length ? `\nالأدوات المتاحة: ${tools.map(t => TOOL_AR[t.name] || t.name).join('، ')}` : `\nهالمنشأة ما عندها تحليل البيانات: دورك تعلّمها كيف تستخدم النظام (خطوات من الدليل ورابط فيديو الشرح)، وتجاوب عن اشتراكها وباقتها، وتشرح وش تسوي كل ميزة.
لو سأل عن بياناته (مثل آخر فاتورة، أكثر موظف صرف، ضريبته): لا تجاوب بأرقام — قل له وين يلقاها بنفسه في النظام (اسم الصفحة والخطوة)، وإن المساعد يجاوبه عليها مباشرة مع إضافة «${FEATURE_LABEL.ai}» (أو باقة فيها الذكاء).`}
${locked.length ? `\n═══ بيانات مقفلة (لو سأل عنها قل إنها تحتاج تفعيل، بدون أرقام) ═══\n${locked.join('\n')}\n` : ''}
${parts.join('\n\n')}`
  return {
    prompt, sections,
    tools: tools.map(t => ({ name: t.name, description: t.description, input_schema: t.input_schema })),
    features,
    toolCtx: { db, orgId, branchId, vatRegistered: !!o.vat_registered, businessType: o.business_type || null },
  }
}

/** الباقة والاشتراك والإضافات والفاتورة — للمالك دايماً */
async function subscriptionSection(db: SupabaseClient, orgId: string, o: any, features: Features) {
  const [{ data: owner }, { data: addons }, { data: subs }, limit, { count: staffCount }, { count: supCount }] = await Promise.all([
    db.from('profiles').select('subscription_type,subscription_ends_at').eq('org_id', orgId).eq('role', 'owner').maybeSingle(),
    db.from('marketplace_addons').select('id,name,slug,monthly_price,is_active'),
    db.from('org_addon_subscriptions').select('addon_id,status,expires_at,quantity,locked_price').eq('org_id', orgId).eq('status', 'active'),
    getBranchLimit(db, orgId),
    db.from('staff_members').select('id', { count: 'exact', head: true }).eq('org_id', orgId).eq('is_active', true),
    db.from('suppliers').select('id', { count: 'exact', head: true }).eq('org_id', orgId).eq('is_active', true),
  ])
  const now = Date.now()
  const rows = ((addons || []) as any[]).map(a => ({ ...a, subscriptions: ((subs || []) as any[]).filter(s => s.addon_id === a.id).map(s => ({ ...s, isValid: new Date(s.expires_at).getTime() > now })) }))
  const plan = planKeyOf(o.plan, o.max_branches)
  const cycle = o.billing_cycle === 'yearly' ? 'yearly' : 'monthly'
  const bill = billLines(plan, cycle, rows, o.locked_plan_monthly, o, o.max_branches, o.staff_included)
  const ow = (owner || {}) as any
  const ends = ow.subscription_ends_at ? new Date(ow.subscription_ends_at) : null
  const daysLeft = ends ? Math.ceil((ends.getTime() - now) / DAY) : null
  const extraStaff = rows.filter(a => a.slug === 'extra_staff').flatMap(a => a.subscriptions).filter((s: any) => s.isValid).reduce((t: number, s: any) => t + (Number(s.quantity) || 0), 0)
  const extraSup = rows.filter(a => a.slug === 'extra_suppliers').flatMap(a => a.subscriptions).filter((s: any) => s.isValid).reduce((t: number, s: any) => t + (Number(s.quantity) || 0), 0)
  const active = rows.filter(a => a.subscriptions.some((s: any) => s.isValid)).map(a => {
    const s = a.subscriptions.find((x: any) => x.isValid)
    return `${a.name}${Number(s.quantity) > 1 ? ` × ${s.quantity}` : ''} (لين ${saudiDay(s.expires_at)})`
  })
  const forSale = rows.filter(a => a.is_active).map(a => `${a.name} ${n(a.monthly_price)} ريال`)
  const disc = activeDiscount(o)
  return `═══ الاشتراك والباقة ═══
الباقة: ${planLabel(o.plan, o.max_branches)} (${cycle === 'yearly' ? 'سنوي' : 'شهري'})
نوع الاشتراك: ${ow.subscription_type === 'trial' ? 'تجربة مجانية (كل المميزات مفتوحة طول التجربة)' : 'مدفوع'}
ينتهي: ${ends ? `${saudiDay(ends)} (${daysLeft! >= 0 ? `باقي ${daysLeft} يوم` : `منتهي من ${-daysLeft!} يوم`})` : 'غير محدد'}
الفروع: ${limit.total} مسموح (${limit.base} من الباقة + ${limit.extra} إضافي)
الموظفين النشطين: ${staffCount || 0} من ${staffBase(o.plan, o.max_staff, limit.extra, limit.base, o.staff_included) + extraStaff}
الموردين النشطين: ${supCount || 0} من ${supplierBase(o.plan, o.max_suppliers, limit.extra, limit.base) + extraSup}
الإضافات المفعّلة: ${active.length ? active.join('، ') : 'لا يوجد'}
الميزات المفتوحة: ${(Object.keys(features) as (keyof Features)[]).filter(k => features[k]).map(k => FEATURE_LABEL[k]).join('، ') || 'الأساسية فقط'}
${disc ? `خصم خاص: ${disc.type === 'percent' ? `${disc.value}%` : `${disc.value} ريال شهرياً`}${disc.note ? ` (${disc.note})` : ''}${disc.until ? ` لين ${disc.until}` : ''}\n` : ''}الفاتورة ${cycle === 'yearly' ? 'السنوية' : 'الشهرية'}:
${bill.lines.map(l => `• ${l.label}: ${l.amount} ريال`).join('\n')}
• الإجمالي: ${bill.total} ريال

${isNewPlan(o.plan) ? `الباقات المتاحة (السعر لكل فرع شهرياً):
• الأساسية ${PLAN_PRICING.essential.monthly} ريال (+${PLAN_CAPS.essential.branchPrice} لكل فرع إضافي): المخزون والموردين والمشتريات والفواتير
• التشغيل ${PLAN_PRICING.ops.monthly} ريال (+${PLAN_CAPS.ops.branchPrice}): كل الأساسية + إقفال الكاشير
• الكاملة ${PLAN_PRICING.full.monthly} ريال (+${PLAN_CAPS.full.branchPrice}): كل المميزات مع الحضور والرواتب والذكاء
• كل فرع فيه ${PLAN_CAPS.essential.staff} موظفين وحتى ${PLAN_CAPS.essential.suppliers} مورد
• المؤسسات: أكثر من 10 فروع بسعر خاص (تواصل معنا)
• الدفع السنوي بخصم 20%
الإضافات (تقدر تحدد الفروع لكل إضافة): ${addonsForPlan(o.plan, rows.filter(a => a.is_active)).map(a => `${a.name} ${n(Number(a.monthly_price))} ريال${a.per_branch ? ' لكل فرع' : ''}`).join('، ')}` : `الباقات المتاحة:
• الأساسية ${PLAN_PRICING.basic.monthly} ريال: فرع واحد (يوصل ${PLAN_CAPS.basic.maxBranches})، ${PLAN_CAPS.basic.staff} موظفين، ${PLAN_CAPS.basic.suppliers} موردين، والمميزات بالإضافات
• الشاملة ${PLAN_PRICING.pro.monthly} ريال: كل المميزات، ${PLAN_CAPS.pro.branches} فروع (يوصل ${PLAN_CAPS.pro.maxBranches})، ${PLAN_CAPS.pro.staff} موظف، ${PLAN_CAPS.pro.suppliers} مورد
• المتقدمة ${PLAN_PRICING.advanced.monthly} ريال: كل المميزات، ${PLAN_CAPS.advanced.branches} فروع (يوصل ${PLAN_CAPS.advanced.maxBranches})، ${PLAN_CAPS.advanced.staff} موظف، ${PLAN_CAPS.advanced.suppliers} مورد
• المؤسسات: أكثر من ${PLAN_CAPS.advanced.maxBranches} فروع بسعر خاص (تواصل معنا)
• الدفع السنوي بخصم 20%
الإضافات للأساسية: ${forSale.join('، ')}`}
الترقية: من الإعدادات ← الاشتراك ← «اطلب الترقية». الإضافات: من صفحة الإضافات. فرع إضافي: من صفحة الفروع.`
}
