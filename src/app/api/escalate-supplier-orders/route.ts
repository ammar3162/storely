import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { escalateOrder } from '@/lib/escalateSupplierOrder'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

/**
 * مهمة يومية: تفحص طلبات التوريد المعلّقة (pending) اللي تجاوزت مهلة الرد
 * الخاصة بكل مورد (response_timeout_hours، افتراضي 24 ساعة)، بدون أي رد،
 * وتحوّلها تلقائياً للمورد التالي بالأولوية.
 */
export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    const db = sb()

    const { data: pendingOrders, error } = await db
      .from('supplier_orders')
      .select('*')
      .eq('status', 'pending')

    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    if (!pendingOrders?.length) return NextResponse.json({ success: true, escalated: 0, message: 'لا توجد طلبات معلقة' })

    const supplierIds = [...new Set(pendingOrders.map((o: any) => o.supplier_id).filter(Boolean))]
    const { data: suppliersData } = await db.from('suppliers').select('id,response_timeout_hours').in('id', supplierIds)
    const timeoutMap: Record<string, number> = {}
    for (const s of suppliersData || []) timeoutMap[(s as any).id] = (s as any).response_timeout_hours || 24

    const now = Date.now()
    const staleOrders = pendingOrders.filter((o: any) => {
      const timeoutHours = timeoutMap[o.supplier_id] || 24
      const ageHours = (now - new Date(o.created_at).getTime()) / (1000 * 60 * 60)
      return ageHours >= timeoutHours
    })

    if (!staleOrders.length) return NextResponse.json({ success: true, escalated: 0, checked: pendingOrders.length, message: 'لا توجد طلبات تجاوزت المهلة' })

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

export async function GET(req: Request) { return POST(req) }
