import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyOrgAccess, getCurrentProfile } from '@/lib/verifyOrgAccess'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// بيانات الإعداد الأولي: حالة المنشأة + أول فرع نشط
export async function GET() {
  try {
    const profile = await getCurrentProfile()
    if (!profile) return NextResponse.json({ error: 'غير مسجل دخول', reason: 'unauthenticated' }, { status: 401 })
    if (!profile.orgId) return NextResponse.json({ error: 'لا توجد مؤسسة', reason: 'no_org' }, { status: 404 })

    const db = sb()
    const [{ data: org }, { data: branch }] = await Promise.all([
      db.from('organizations').select('onboarding_done,name,whatsapp_number,business_type').eq('id', profile.orgId).single(),
      db.from('branches').select('id').eq('org_id', profile.orgId).eq('is_active', true).order('created_at').limit(1).maybeSingle(),
    ])
    return NextResponse.json({ success: true, org_id: profile.orgId, org: org || null, branch_id: (branch as any)?.id || null })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

// حفظ بيانات المنشأة ({ name, whatsapp_number, business_type }) أو إنهاء الإعداد ({ onboarding_done: true })
export async function PATCH(req: Request) {
  try {
    const body = await req.json()
    const { org_id } = body
    if (!org_id) return NextResponse.json({ error: 'org_id مطلوب' }, { status: 400 })

    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })
    if (access.role !== 'owner') return NextResponse.json({ error: 'هذي الصلاحية للمالك فقط' }, { status: 403 })

    const update: Record<string, unknown> = {}
    if ('name' in body) {
      const name = String(body.name || '').trim()
      if (!name) return NextResponse.json({ error: 'أدخل اسم المنشأة' }, { status: 400 })
      update.name = name
    }
    if ('whatsapp_number' in body) update.whatsapp_number = String(body.whatsapp_number || '').trim()
    if ('business_type' in body) update.business_type = body.business_type || null
    if (body.onboarding_done === true) update.onboarding_done = true
    if (!Object.keys(update).length) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })

    const { error } = await sb().from('organizations').update(update as any).eq('id', org_id)
    if (error) return NextResponse.json({ error: 'حدث خطأ أثناء الحفظ' }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

// إضافة أصناف القالب الأولية — الكمية الابتدائية تُسجّل كحركة "in" (الـ trigger يحدّث qty)
export async function POST(req: Request) {
  try {
    const { org_id, branch_id, products } = await req.json()
    if (!org_id || !Array.isArray(products)) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })

    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })
    if (access.role !== 'owner') return NextResponse.json({ error: 'هذي الصلاحية للمالك فقط' }, { status: 403 })

    const db = sb()
    if (branch_id) {
      const { data: b } = await db.from('branches').select('id').eq('id', branch_id).eq('org_id', org_id).maybeSingle()
      if (!b) return NextResponse.json({ error: 'الفرع غير موجود' }, { status: 404 })
    }

    let failed = 0
    for (const p of products.slice(0, 500)) {
      const qty = Math.max(0, Number(p.qty) || 0)
      const { data: np, error } = await db.from('products').insert({
        org_id, branch_id: branch_id || null, name: String(p.name || '').trim(), unit: p.unit,
        qty, reorder_point: Number(p.reorder) || 0, category: p.category, is_active: true,
      } as any).select('id').single()
      if (error || !np) { failed++; continue }
      if (qty > 0) {
        const { error: moveErr } = await db.from('stock_movements').insert({
          product_id: (np as any).id, org_id, profile_id: access.userId, type: 'in', qty_change: qty, note: 'إضافة أولية عند الإعداد',
        } as any)
        if (moveErr) failed++
      }
    }
    return NextResponse.json({ success: true, failed })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
