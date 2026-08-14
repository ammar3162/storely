import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyOrgAccess } from '@/lib/verifyOrgAccess'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const org_id = searchParams.get('org_id')
    if (!org_id) return NextResponse.json({ error: 'org_id مطلوب' }, { status: 400 })

    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })

    const supabase = sb()
    const { data, error } = await supabase.from('late_penalty_rules').select('*').eq('org_id', org_id).order('min_minutes')
    if (error) return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
    return NextResponse.json({ success: true, rules: data || [] })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { org_id, min_minutes, max_minutes, penalty_amount } = await req.json()
    if (!org_id || min_minutes === undefined || penalty_amount === undefined) {
      return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
    }

    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })
    if (access.role !== 'owner') return NextResponse.json({ error: 'هذي الصلاحية للمالك فقط' }, { status: 403 })

    const supabase = sb()
    const { data, error } = await supabase.from('late_penalty_rules').insert({
      org_id, min_minutes: Number(min_minutes),
      max_minutes: max_minutes !== undefined && max_minutes !== null && max_minutes !== '' ? Number(max_minutes) : null,
      penalty_amount: Number(penalty_amount),
    } as any).select().single()

    if (error) return NextResponse.json({ error: 'حدث خطأ أثناء الإضافة' }, { status: 500 })
    return NextResponse.json({ success: true, rule: data })
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
    const { data: existing } = await supabase.from('late_penalty_rules').select('org_id').eq('id', id).single()
    if (!existing) return NextResponse.json({ error: 'غير موجود' }, { status: 404 })

    const access = await verifyOrgAccess((existing as any).org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })
    if (access.role !== 'owner') return NextResponse.json({ error: 'هذي الصلاحية للمالك فقط' }, { status: 403 })

    const { error } = await supabase.from('late_penalty_rules').delete().eq('id', id)
    if (error) return NextResponse.json({ error: 'حدث خطأ أثناء الحذف' }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
