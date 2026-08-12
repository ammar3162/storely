import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyOrgAccess, enforcedBranchId } from '@/lib/verifyOrgAccess'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const org_id = searchParams.get('org_id')
    const month = searchParams.get('month') // format YYYY-MM-01
    const branch_id = searchParams.get('branch_id')
    if (!org_id || !month) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })

    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })
    const effectiveBranchId = enforcedBranchId(access, branch_id)

    const supabase = sb()
    let q = supabase
      .from('delivery_income')
      .select('id,org_id,branch_id,month,platform,amount,created_at')
      .eq('org_id', org_id)
      .eq('month', month)
      .order('created_at', { ascending: true })
    if (effectiveBranchId) q = q.eq('branch_id', effectiveBranchId)
    const { data, error } = await q

    if (error) return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
    return NextResponse.json({ success: true, entries: data || [] })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { org_id, month, platform, amount, branch_id } = await req.json()
    if (!org_id || !month || !platform || amount === undefined) {
      return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
    }
    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })
    const effectiveBranchId = enforcedBranchId(access, branch_id)
    if (!effectiveBranchId) return NextResponse.json({ error: 'يلزم تحديد الفرع' }, { status: 400 })

    const supabase = sb()
    const { data, error } = await supabase
      .from('delivery_income')
      .insert({ org_id, branch_id: effectiveBranchId, month, platform, amount: Number(amount) })
      .select()
      .single()

    if (error) return NextResponse.json({ error: 'حدث خطأ أثناء الإضافة' }, { status: 500 })
    return NextResponse.json({ success: true, entry: data })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id مطلوب' }, { status: 400 })
    const supabase = sb()
    const { data: existingRow } = await supabase.from('delivery_income').select('org_id,branch_id').eq('id', id).single()
    if (!existingRow) return NextResponse.json({ error: 'غير موجود' }, { status: 404 })
    const access = await verifyOrgAccess((existingRow as any).org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })
    if (access.role === 'manager' && access.branchId !== (existingRow as any).branch_id) {
      return NextResponse.json({ error: 'غير مصرح لك بحذف بيانات فرع آخر' }, { status: 403 })
    }
    const { error } = await supabase.from('delivery_income').delete().eq('id', id)
    if (error) return NextResponse.json({ error: 'حدث خطأ أثناء الحذف' }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
