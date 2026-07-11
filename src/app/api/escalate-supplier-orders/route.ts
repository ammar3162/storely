import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { escalateOrder } from '@/lib/escalateSupplierOrder'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

/**
 * مهمة يومية: تفحص طلبات التوريد المعلّقة (pending) اللي مرّ عليها أكثر من 24 ساعة
 * بدون أي رد من المورد (لا تأكيد ولا "غير متوفر")، وتحوّلها تلقائياً للمورد البديل.
 */
export async function POST() {
  try {
    const db = sb()
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const { data: staleOrders, error } = await db
      .from('supplier_orders')
      .select('*')
      .eq('status', 'pending')
      .lt('created_at', cutoff)

    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    if (!staleOrders?.length) return NextResponse.json({ success: true, escalated: 0, message: 'لا توجد طلبات متأخرة' })

    let escalatedCount = 0
    for (const order of staleOrders) {
      const result = await escalateOrder(order, 'timeout')
      if (result.escalated) escalatedCount++
    }

    return NextResponse.json({ success: true, escalated: escalatedCount, checked: staleOrders.length })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function GET() { return POST() }
