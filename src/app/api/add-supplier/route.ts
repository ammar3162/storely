import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkSupplierCapacity } from '@/lib/supplierCapacity'
import { verifyOrgAccess, enforcedBranchId } from '@/lib/verifyOrgAccess'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// حد الموردين للمنشأة كلها، وإضافة "مورد إضافي" رصيد فوقه يُستخدم بأي فرع

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

    // حد الموردين للمنشأة كلها (lib/supplierCapacity)
    const capacity = await checkSupplierCapacity(supabase, org_id)
    if (!capacity.ok) return NextResponse.json({ error: capacity.error }, { status: 403 })
    const addonSubscriptionId = capacity.addonSubscriptionId

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
