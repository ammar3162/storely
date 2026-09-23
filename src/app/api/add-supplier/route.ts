import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyOrgAccess, enforcedBranchId } from '@/lib/verifyOrgAccess'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// نفس مبدأ الموظفين -- حد الباقة الأساسي صارم لكل فرع لحاله، وإضافة "مورد إضافي" رصيد مشترك يُستخدم بأي فرع
const PLAN_BASE_SUPPLIERS: Record<string, number> = { basic: 3, pro: 5, advanced: 999 }

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { org_id } = body
    if (!org_id) return NextResponse.json({ error: 'org_id مطلوب' }, { status: 400 })
    const name = String(body.name || '').trim()
    const phone = String(body.phone || '').trim()
    if (!name || !phone) return NextResponse.json({ error: 'أدخل اسم المورد ورقمه' }, { status: 400 })

    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })
    // مدير الفرع يضيف موردين لفرعه فقط
    const branch_id = enforcedBranchId(access, body.branch_id)

    const supabase = sb()

    const { data: org } = await supabase.from('organizations').select('plan').eq('id', org_id).single()
    const orgPlan = (org as any)?.plan || 'basic'
    const baseLimit = PLAN_BASE_SUPPLIERS[orgPlan] ?? 3

    let branchCountQ = supabase.from('suppliers').select('id', { count: 'exact', head: true }).eq('org_id', org_id).eq('is_active', true)
    branchCountQ = branch_id ? branchCountQ.eq('branch_id', branch_id) : branchCountQ.is('branch_id', null)
    const { count: branchCount } = await branchCountQ

    let addonSubscriptionId: string | null = null

    if ((branchCount || 0) >= baseLimit) {
      const { data: extraSupSub } = await supabase
        .from('org_addon_subscriptions')
        .select('id,quantity,marketplace_addons!inner(slug)')
        .eq('org_id', org_id)
        .eq('status', 'active')
        .eq('marketplace_addons.slug', 'extra_suppliers')
        .maybeSingle()

      if (!extraSupSub) {
        return NextResponse.json({
          error: `هذا الفرع وصل حده الأساسي (${baseLimit} مورد) — يرجى ترقية الباقة أو شراء إضافة "مورد إضافي"`
        }, { status: 403 })
      }

      const addonQty = (extraSupSub as any).quantity || 0
      const { count: usedAddonSlots } = await supabase
        .from('suppliers')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', org_id)
        .eq('is_active', true)
        .eq('addon_subscription_id', (extraSupSub as any).id)

      if ((usedAddonSlots || 0) >= addonQty) {
        return NextResponse.json({
          error: `هذا الفرع وصل حده الأساسي (${baseLimit} مورد)، ورصيد إضافة "مورد إضافي" (${addonQty}) مستهلك بالكامل — زوّد الكمية من صفحة الإضافات`
        }, { status: 403 })
      }

      addonSubscriptionId = (extraSupSub as any).id
    }

    const { data: newSup, error } = await supabase
      .from('suppliers')
      // حقول محددة فقط (كان ينكتب كل اللي يرسله الطلب مباشرة بالجدول)
      .insert({
        org_id, branch_id: branch_id || null, name, phone,
        notes: body.notes ? String(body.notes).trim() : null,
        whatsapp_consent: body.whatsapp_consent === true,
        is_active: true, addon_subscription_id: addonSubscriptionId,
      } as any)
      .select()
      .single()

    if (error) { console.error('SUPPLIER INSERT ERROR:', error); return NextResponse.json({ error: error.message }, { status: 500 }) }

    return NextResponse.json({ success: true, supplier: newSup })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
