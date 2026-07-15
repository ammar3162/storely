import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { createClient } from '@supabase/supabase-js'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const { org_id, branch_id, name, phone, pin, permissions, role, send_closing_whatsapp } = await req.json()
    if (!org_id || !name || !phone || !pin) {
      return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
    }

    const supabase = sb()

    // تحقق من حد الباقة server-side
    const { data: org } = await supabase
      .from('organizations')
      .select('max_staff,plan')
      .eq('id', org_id)
      .single()

    const maxStaff = (org as any)?.max_staff || 1
    const orgPlan = (org as any)?.plan || 'basic'

    if (role === 'cashier' && orgPlan === 'basic') {
      return NextResponse.json({
        error: 'ميزة الكاشير تتطلب الباقة المتوسطة فأعلى — يرجى ترقية الباقة'
      }, { status: 403 })
    }

    const { count } = await supabase
      .from('staff_members')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', org_id)
      .eq('is_active', true)

    if ((count || 0) >= maxStaff) {
      return NextResponse.json({
        error: `وصلت للحد الأقصى (${maxStaff} موظف) — يرجى ترقية الباقة`
      }, { status: 403 })
    }

    // تحقق من عدم تكرار رقم الجوال
    const { data: existing } = await supabase
      .from('staff_members')
      .select('id')
      .eq('org_id', org_id)
      .eq('phone', phone)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'رقم الجوال مسجل مسبقاً' }, { status: 409 })
    }

    const { data: newStaff, error } = await supabase
      .from('staff_members')
      .insert({ org_id, branch_id: branch_id || null, name, phone, pin, is_active: true, permissions: permissions || {dispense:false,inventory:false,purchases:false,reports:false}, role: role === 'cashier' ? 'cashier' : 'staff', send_closing_whatsapp: send_closing_whatsapp !== false })
      .select()
      .single()

    if (error) return NextResponse.json({ error: 'حدث خطأ أثناء الإضافة' }, { status: 500 })

    return NextResponse.json({ success: true, staff: newStaff })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
