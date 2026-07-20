import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyOrgAccess } from '@/lib/verifyOrgAccess'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

/**
 * يجمّع سجل تواصل كامل لمورد معيّن من 3 مصادر:
 * - supplier_orders (طلبات مرسلة، مؤكدة، مصعّدة)
 * - purchases (مشتريات مسجّلة يدوياً بنفس اسم المورد)
 * - supplier_performance_log (أحداث الأداء)
 * ويرتّبهم زمنياً (الأحدث أولاً).
 */
export async function POST(req: Request) {
  try {
    const { org_id, supplier_id, supplier_name } = await req.json()
    if (!org_id || !supplier_id) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })

    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })

    const db = sb()
    const since180 = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString()

    const [{ data: orders }, { data: purchases }] = await Promise.all([
      (db as any).from('supplier_orders').select('id,status,items,created_at,confirmed_at,escalated_at')
        .eq('org_id', org_id).eq('supplier_id', supplier_id).gte('created_at', since180).order('created_at', { ascending: false }),
      supplier_name
        ? db.from('purchases').select('name,qty,unit,total_amount,created_at').eq('org_id', org_id).ilike('supplier', supplier_name.trim()).gte('created_at', since180).order('created_at', { ascending: false })
        : Promise.resolve({ data: [] as any[] }),
    ])

    const events: any[] = []

    for (const o of (orders || [])) {
      const itemsText = (o.items || []).map((i: any) => i.name).join('، ')
      events.push({ type: 'order_sent', at: o.created_at, title: 'طلب توريد أُرسل', detail: itemsText })
      if (o.status === 'confirmed' && o.confirmed_at) {
        events.push({ type: 'order_confirmed', at: o.confirmed_at, title: 'المورد أكّد الطلب', detail: itemsText })
      }
      if (o.status === 'escalated' && o.escalated_at) {
        events.push({ type: 'order_escalated', at: o.escalated_at, title: 'انتهت المهلة بدون رد — تم التصعيد', detail: itemsText })
      }
    }

    for (const p of (purchases || [])) {
      events.push({
        type: 'purchase',
        at: p.created_at,
        title: `مشترية مسجّلة: ${p.name}`,
        detail: `${p.qty || ''} ${p.unit || ''} — ${p.total_amount || 0} ر.س`,
      })
    }

    events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())

    return NextResponse.json({ success: true, events: events.slice(0, 50) })
  } catch (err: any) {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
