import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyOrgAccess, enforcedBranchId } from '@/lib/verifyOrgAccess'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// ملخص لوحة التحكم الرئيسية: أرقام المخزون + آخر الحركات + تواريخ مشتريات آخر أسبوع + الإشعارات غير المقروءة
// (التجميع حسب اليوم يصير بالمتصفح عشان يعتمد على توقيت المستخدم المحلي)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const org_id = searchParams.get('org_id')
    const branch_id = searchParams.get('branch_id')
    if (!org_id) return NextResponse.json({ error: 'org_id مطلوب' }, { status: 400 })

    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })
    const bid = enforcedBranchId(access, branch_id)
    if (bid && !UUID_RE.test(bid)) return NextResponse.json({ error: 'branch_id غير صالح' }, { status: 400 })

    const db = sb()
    // 8 أيام بدل 7 عشان نغطي فرق التوقيت بين الخادم والمستخدم
    const since = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString()

    let productsQ = db.from('products').select('id,name,qty,reorder_point,unit').eq('org_id', org_id).eq('is_active', true)
    let purchasesQ = db.from('purchases').select('created_at').eq('org_id', org_id).gte('created_at', since)
    let movementsQ = db.from('stock_movements')
      .select('qty_change,type,created_at,products!inner(name,unit,org_id,branch_id)')
      .eq('products.org_id', org_id).order('created_at', { ascending: false }).limit(50)
    const notifsQ = db.from('notifications').select('id,title,message,type').eq('org_id', org_id).eq('read', false)
      .or(bid ? `branch_id.is.null,branch_id.eq.${bid}` : 'branch_id.is.null,branch_id.not.is.null')
      .order('created_at', { ascending: false }).limit(5)
    if (bid) {
      productsQ = productsQ.eq('branch_id', bid)
      purchasesQ = purchasesQ.eq('branch_id', bid)
      movementsQ = movementsQ.eq('products.branch_id', bid)
    }

    const [products, purchases, movements, notifs] = await Promise.all([productsQ, purchasesQ, movementsQ, notifsQ])
    if (products.error || purchases.error || movements.error) return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })

    const prods = products.data || []
    const low = prods.filter((p: any) => p.qty <= p.reorder_point)
    return NextResponse.json({
      success: true,
      products_count: prods.length,
      low_count: low.length,
      out_count: prods.filter((p: any) => p.qty === 0).length,
      low_items: low.slice(0, 5),
      purchase_dates: (purchases.data || []).map((p: any) => p.created_at),
      movements: movements.data || [],
      notifications: notifs.data || [],
    })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
