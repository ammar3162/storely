import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyOrgAccess } from '@/lib/verifyOrgAccess'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

/**
 * "توقيت الطلب الذكي" — يحسب لكل منتج:
 * 1. معدل الاستهلاك اليومي الفعلي (آخر 30 يوم من عمليات الصرف)
 * 2. مدة التوريد الحقيقية المتعلّمة من التاريخ (الفرق الفعلي بين لحظة وصول
 *    المخزون للحد الأدنى ولحظة وصول الكمية الجديدة فعلياً بمشتريات سابقة)
 * 3. تاريخ الطلب المقترح = اليوم + الأيام المتبقية للوصول للحد الأدنى − مدة التوريد المتعلّمة
 */
export async function POST(req: Request) {
  try {
    const { org_id, branch_id } = await req.json()
    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })

    const db = sb()
    const since90 = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
    const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    let prodQ = db.from('products').select('id,name,unit,qty,reorder_point').eq('org_id', org_id).eq('is_active', true)
    if (branch_id) prodQ = prodQ.eq('branch_id', branch_id)

    let movQ = db.from('stock_movements')
      .select('product_id,type,qty_change,created_at,products!inner(org_id,branch_id)')
      .eq('products.org_id', org_id)
      .gte('created_at', since90)
      .order('created_at', { ascending: false })
    if (branch_id) movQ = movQ.eq('products.branch_id', branch_id)

    const [{ data: products }, { data: movements }] = await Promise.all([prodQ, movQ])

    // تجميع الحركات لكل منتج (من الأحدث للأقدم — نحتاجها لإعادة بناء الرصيد التاريخي)
    const movByProduct: Record<string, any[]> = {}
    for (const m of (movements || [])) {
      const pid = (m as any).product_id
      if (!movByProduct[pid]) movByProduct[pid] = []
      movByProduct[pid].push(m)
    }

    const suggestions: any[] = []

    for (const p of (products || [])) {
      const movs = movByProduct[p.id] || []
      if (movs.length === 0) continue

      // معدل الاستهلاك اليومي (آخر 30 يوم)
      const dispensed30 = movs
        .filter((m: any) => m.type === 'out' && m.created_at >= since30)
        .reduce((s: number, m: any) => s + Math.abs(m.qty_change), 0)
      const dailyRate = dispensed30 / 30
      if (dailyRate <= 0) continue // ما فيه استهلاك ملحوظ، نتجاهله

      // إعادة بناء الرصيد التاريخي (من الأحدث للأقدم) لاكتشاف لحظات الوصول للحد الأدنى
      let runningQty = p.qty
      const timeline: { at: string; qtyAfter: number; qtyBefore: number; type: string }[] = []
      for (const m of movs) { // movs مرتبة من الأحدث للأقدم أصلاً
        const qtyAfter = runningQty
        const qtyBefore = runningQty - m.qty_change
        timeline.push({ at: m.created_at, qtyAfter, qtyBefore, type: m.type })
        runningQty = qtyBefore
      }
      // نعكس الترتيب ليصير من الأقدم للأحدث (أسهل لاكتشاف نقاط العبور بالترتيب الزمني)
      timeline.reverse()

      // اكتشاف كل لحظة "عبور" تحت الحد الأدنى، ثم أول تجديد مخزون بعدها
      const leadTimes: number[] = []
      let waitingForRestock = false
      let lowAt: Date | null = null
      for (const t of timeline) {
        if (!waitingForRestock && t.qtyBefore > p.reorder_point && t.qtyAfter <= p.reorder_point) {
          waitingForRestock = true
          lowAt = new Date(t.at)
        } else if (waitingForRestock && t.type === 'in' && lowAt) {
          const restockAt = new Date(t.at)
          const days = (restockAt.getTime() - lowAt.getTime()) / 86400000
          if (days > 0 && days < 30) leadTimes.push(days) // نتجاهل قيم غير منطقية
          waitingForRestock = false
          lowAt = null
        }
      }

      const avgLeadTimeDays = leadTimes.length > 0
        ? leadTimes.reduce((s, d) => s + d, 0) / leadTimes.length
        : 3 // افتراضي لو ما فيه بيانات كافية بعد

      const daysUntilReorderPoint = dailyRate > 0 ? (p.qty - p.reorder_point) / dailyRate : 999
      const suggestedOrderInDays = Math.round((daysUntilReorderPoint - avgLeadTimeDays) * 10) / 10

      // نقترح بس المنتجات اللي قربت فعلاً (خلال 3 أيام أو أقل، أو وصلت أصلاً)
      if (suggestedOrderInDays <= 3) {
        suggestions.push({
          id: p.id,
          name: p.name,
          unit: p.unit,
          currentQty: p.qty,
          reorderPoint: p.reorder_point,
          dailyRate: Math.round(dailyRate * 10) / 10,
          avgLeadTimeDays: Math.round(avgLeadTimeDays * 10) / 10,
          leadTimeSamples: leadTimes.length,
          daysUntilReorderPoint: Math.round(daysUntilReorderPoint * 10) / 10,
          suggestedOrderInDays,
          urgency: suggestedOrderInDays <= 0 ? 'now' : 'soon',
        })
      }
    }

    suggestions.sort((a, b) => a.suggestedOrderInDays - b.suggestedOrderInDays)

    return NextResponse.json({ success: true, suggestions })
  } catch (err: any) {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
