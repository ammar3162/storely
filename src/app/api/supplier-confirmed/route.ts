import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { logConfirmation } from '@/lib/escalateSupplierOrder'
import { notifyOwnerSupplierConfirmed } from '@/lib/supplierConfirmation'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get('token')
    if (!token) return NextResponse.json({ error: 'رابط غير صالح' }, { status: 400 })

    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: order } = await (db as any)
      .from('supplier_orders')
      .select('status,supplier_name,items,org_id')
      .eq('token', token)
      .single()
    if (!order) return NextResponse.json({ error: 'رابط غير صالح' }, { status: 404 })

    const { data: org } = await db.from('organizations').select('name').eq('id', order.org_id).single()

    return NextResponse.json({
      success: true,
      status: order.status,
      supplier_name: order.supplier_name,
      items: order.items,
      org_name: (org as any)?.name || null,
    })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { token } = await req.json()
    if (!token) return NextResponse.json({ success: false })

    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: order } = await (db as any).from('supplier_orders').select('id,org_id,branch_id,supplier_id,supplier_name,items,created_at,status').eq('token', token).single()
    if (!order) return NextResponse.json({ success: false })

    if (order.status !== 'confirmed') {
      await (db as any).from('supplier_orders').update({ status: 'confirmed', confirmed_at: new Date().toISOString() }).eq('token', token)
    }

    await logConfirmation(order).catch(()=>{})

    const result = await notifyOwnerSupplierConfirmed(db as any, order)
    if (!result.ok) return NextResponse.json({ success: false })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message })
  }
}
