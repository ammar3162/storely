import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function currentMonthStart() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const org_id = searchParams.get('org_id')
    if (!org_id) return NextResponse.json({ error: 'org_id مطلوب' }, { status: 400 })

    const supabase = sb()
    const { data, error } = await supabase
      .from('fixed_expenses')
      .select('*')
      .eq('org_id', org_id)
      .eq('is_active', true)
      .order('created_at', { ascending: true })

    if (error) return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
    return NextResponse.json({ success: true, expenses: data || [] })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { org_id, name, amount, month } = await req.json()
    if (!org_id || !name || amount === undefined) {
      return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
    }
    const supabase = sb()
    const { data, error } = await supabase
      .from('fixed_expenses')
      .insert({ org_id, name, amount: Number(amount), is_active: true })
      .select()
      .single()

    if (error) return NextResponse.json({ error: 'حدث خطأ أثناء الإضافة' }, { status: 500 })

    // أضفه أيضاً للشهر المعروض حالياً مباشرة لو ما كان موجود
    const targetMonth = month || currentMonthStart()
    await supabase.from('monthly_fixed_expenses').upsert({
      org_id, month: targetMonth, fixed_expense_id: (data as any).id,
      name: (data as any).name, amount: (data as any).amount,
    }, { onConflict: 'org_id,month,fixed_expense_id' })

    return NextResponse.json({ success: true, expense: data })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const { id, name, amount } = await req.json()
    if (!id) return NextResponse.json({ error: 'id مطلوب' }, { status: 400 })
    const supabase = sb()
    const update: any = { updated_at: new Date().toISOString() }
    if (name !== undefined) update.name = name
    if (amount !== undefined) update.amount = Number(amount)
    const { error } = await supabase.from('fixed_expenses').update(update).eq('id', id)
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
    const { error } = await supabase.from('fixed_expenses').update({ is_active: false }).eq('id', id)
    if (error) return NextResponse.json({ error: 'حدث خطأ أثناء الحذف' }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
