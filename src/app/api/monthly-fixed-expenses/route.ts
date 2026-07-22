import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyOrgAccess } from '@/lib/verifyOrgAccess'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function ensureGenerated(supabase: any, org_id: string, month: string) {
  const { data: templates } = await supabase
    .from('fixed_expenses')
    .select('id,name,amount')
    .eq('org_id', org_id)
    .eq('is_active', true)

  const { data: existing } = await supabase
    .from('monthly_fixed_expenses')
    .select('fixed_expense_id')
    .eq('org_id', org_id)
    .eq('month', month)

  const existingIds = new Set((existing || []).map((e: any) => e.fixed_expense_id))
  const missing = (templates || []).filter((t: any) => !existingIds.has(t.id))

  if (missing.length > 0) {
    await supabase.from('monthly_fixed_expenses').insert(
      missing.map((t: any) => ({
        org_id, month, fixed_expense_id: t.id, name: t.name, amount: t.amount,
      }))
    )
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const org_id = searchParams.get('org_id')
    const month = searchParams.get('month') // format YYYY-MM-01
    if (!org_id || !month) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })

    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })

    const supabase = sb()
    await ensureGenerated(supabase, org_id, month)

    const { data, error } = await supabase
      .from('monthly_fixed_expenses')
      .select('id,org_id,month,fixed_expense_id,name,amount,created_at,updated_at')
      .eq('org_id', org_id)
      .eq('month', month)
      .order('created_at', { ascending: true })

    if (error) return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
    return NextResponse.json({ success: true, expenses: data || [] })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { org_id, month, name, amount } = await req.json()
    if (!org_id || !month || !name || amount === undefined) {
      return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
    }
    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })

    const supabase = sb()
    const { data, error } = await supabase
      .from('monthly_fixed_expenses')
      .insert({ org_id, month, fixed_expense_id: null, name, amount: Number(amount) })
      .select()
      .single()

    if (error) return NextResponse.json({ error: 'حدث خطأ أثناء الإضافة' }, { status: 500 })
    return NextResponse.json({ success: true, expense: data })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const { id, amount, name } = await req.json()
    if (!id) return NextResponse.json({ error: 'id مطلوب' }, { status: 400 })
    const supabase = sb()
    const { data: existingRow } = await supabase.from('monthly_fixed_expenses').select('org_id').eq('id', id).single()
    if (!existingRow) return NextResponse.json({ error: 'غير موجود' }, { status: 404 })
    const access = await verifyOrgAccess((existingRow as any).org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })
    const update: any = { updated_at: new Date().toISOString() }
    if (amount !== undefined) update.amount = Number(amount)
    if (name !== undefined) update.name = name
    const { error } = await supabase.from('monthly_fixed_expenses').update(update).eq('id', id)
    if (error) return NextResponse.json({ error: 'حدث خطأ أثناء التعديل' }, { status: 500 })
    return NextResponse.json({ success: true })
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
    const { data: existingRow } = await supabase.from('monthly_fixed_expenses').select('org_id').eq('id', id).single()
    if (!existingRow) return NextResponse.json({ error: 'غير موجود' }, { status: 404 })
    const access = await verifyOrgAccess((existingRow as any).org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })
    const { error } = await supabase.from('monthly_fixed_expenses').delete().eq('id', id)
    if (error) return NextResponse.json({ error: 'حدث خطأ أثناء الحذف' }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
