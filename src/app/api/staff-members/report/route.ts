import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyOrgAccess } from '@/lib/verifyOrgAccess'
import { loadOwnedStaff } from '@/lib/staffAccess'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// سجل الموظف: الكاشير = آخر إقفالاته، الموظف العادي = آخر عمليات صرفه
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const org_id = searchParams.get('org_id')
    const staff_id = searchParams.get('staff_id')
    if (!org_id || !staff_id) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })

    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })

    const db = sb()
    const staff = await loadOwnedStaff(db, access, org_id, staff_id)
    if (!staff) return NextResponse.json({ error: 'الموظف غير موجود' }, { status: 404 })

    if (staff.role === 'cashier') {
      const { data, error } = await db.from('cashier_closings')
        .select('id,status,closing_date,total_sales,network_amount,difference')
        .eq('org_id', org_id).eq('staff_id', staff_id)
        .order('closing_date', { ascending: false }).order('created_at', { ascending: false }).limit(50)
      if (error) return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
      return NextResponse.json({ success: true, closings: data || [] })
    }

    // صرف الموظف يتسجّل بملاحظة "صرف بواسطة الموظف: <الاسم>" (نفس منطق الواجهة السابق)
    const safeName = String(staff.name).replace(/[%_\\]/g, '\\$&')
    const { data, error } = await db.from('stock_movements')
      .select('id,qty_change,created_at,note,products!inner(name,unit,org_id)')
      .eq('products.org_id', org_id)
      .ilike('note', `%صرف بواسطة الموظف: ${safeName}%`)
      .eq('type', 'out')
      .order('created_at', { ascending: false }).limit(50)
    if (error) return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
    return NextResponse.json({ success: true, movements: data || [] })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
