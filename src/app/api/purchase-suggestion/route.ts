import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function formatPhone(phone: string): string {
  let p = phone.replace(/\D/g, '')
  if (p.startsWith('00')) p = p.slice(2)
  if (p.startsWith('0')) p = '966' + p.slice(1)
  if (!p.startsWith('9') && !p.startsWith('1') && !p.startsWith('2')) p = '966' + p
  return p
}

async function sendWhatsApp(phone: string, message: string) {
  const sessionId = process.env.WASENDER_SESSION_ID
  const apiKey = process.env.WASENDER_API_KEY
  if (!sessionId || !apiKey) return false
  const res = await fetch(`https://api.wasender.app/api/send-message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
    body: JSON.stringify({ session_id: sessionId, to: formatPhone(phone) + '@c.us', message })
  }).catch(() => null)
  return res?.ok || false
}

export async function POST(req: NextRequest) {
  const { org_id, send_to_suppliers = false } = await req.json()
  if (!org_id) return NextResponse.json({ error: 'missing' }, { status: 400 })

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  )

  const since30 = new Date(Date.now() - 30*24*60*60*1000).toISOString()
  const since90 = new Date(Date.now() - 90*24*60*60*1000).toISOString()

  // جلب المنتجات والموردين
  const [{ data: products }, { data: suppliers }, { data: movements }] = await Promise.all([
    db.from('products').select('id,name,qty,reorder_point,unit,category').eq('org_id', org_id).eq('is_active', true),
    db.from('suppliers').select('id,name,phone,categories').eq('org_id', org_id).eq('is_active', true),
    db.from('stock_movements')
      .select('qty_change,created_at,products!inner(id,name,unit,org_id)')
      .eq('products.org_id', org_id)
      .eq('type', 'out')
      .gte('created_at', since90)
      .limit(1000)
  ])

  // حساب معدل الصرف لكل منتج
  const rateMap: Record<string, { total90: number; total30: number }> = {}
  const since30Date = new Date(since30)

  for (const m of (movements||[])) {
    const p = m.products as any
    if (!p) continue
    if (!rateMap[p.name]) rateMap[p.name] = { total90: 0, total30: 0 }
    rateMap[p.name].total90 += Math.abs(m.qty_change)
    if (new Date(m.created_at) >= since30Date)
      rateMap[p.name].total30 += Math.abs(m.qty_change)
  }

  // بناء قائمة الشراء المقترحة
  const suggestions = (products||[])
    .filter((p: any) => p.qty <= p.reorder_point * 2)
    .map((p: any) => {
      const rate = rateMap[p.name]
      const daily = rate ? rate.total90 / 90 : 0
      const monthly = rate ? rate.total30 : p.reorder_point * 2
      // الكمية المقترحة = شهر كامل + 20% احتياطي - الكمية الحالية
      const suggested = Math.max(
        Math.ceil(monthly * 1.2) - p.qty,
        p.reorder_point
      )
      return { ...p, daily: Math.round(daily*10)/10, monthly: Math.round(monthly), suggested }
    })
    .filter((p: any) => p.suggested > 0)
    .sort((a: any, b: any) => a.qty - b.qty)

  if (!suggestions.length) {
    return NextResponse.json({ suggestions: [], message: 'المخزون بحالة جيدة — لا يوجد شراء مطلوب حالياً' })
  }

  // تجميع المنتجات حسب المورد
  const supplierGroups: Record<string, { supplier: any; items: any[] }> = {}
  const unassigned: any[] = []

  for (const item of suggestions) {
    let assigned = false
    for (const sup of (suppliers||[])) {
      const cats = sup.categories as string[] | null
      if (!cats?.length || cats.includes(item.category)) {
        if (!supplierGroups[sup.id]) supplierGroups[sup.id] = { supplier: sup, items: [] }
        supplierGroups[sup.id].items.push(item)
        assigned = true
        break
      }
    }
    if (!assigned) unassigned.push(item)
  }

  // إرسال لكل مورد
  const results: any[] = []

  if (send_to_suppliers) {
    for (const group of Object.values(supplierGroups)) {
      if (!group.supplier.phone || !group.items.length) continue

      const org = await db.from('organizations').select('name').eq('id', org_id).single()
      const orgName = (org.data as any)?.name || 'العميل'
      const date = new Date().toLocaleDateString('ar-SA', { weekday:'long', day:'numeric', month:'long' })

      let msg = `🛒 *طلب شراء جديد*\n`
      msg += `🏪 من: ${orgName}\n`
      msg += `📅 ${date}\n`
      msg += `${'─'.repeat(25)}\n\n`
      msg += `*قائمة الطلب:*\n`

      group.items.forEach((item, i) => {
        msg += `${i+1}. ${item.name}\n`
        msg += `   الكمية المطلوبة: *${item.suggested} ${item.unit}*\n`
        msg += `   المتوفر حالياً: ${item.qty} ${item.unit}\n\n`
      })

      msg += `${'─'.repeat(25)}\n`
      msg += `إجمالي الأصناف: ${group.items.length}\n`
      msg += `_يرجى التأكيد والإخبار بتاريخ التوصيل_\n`
      msg += `🔗 Storely — نظام إدارة المخزون`

      const sent = await sendWhatsApp(group.supplier.phone, msg)
      results.push({ supplier: group.supplier.name, items: group.items.length, sent })
    }
  }

  return NextResponse.json({
    suggestions,
    supplierGroups: Object.values(supplierGroups).map(g => ({
      supplier: g.supplier.name,
      phone: g.supplier.phone,
      items: g.items
    })),
    unassigned,
    results,
    summary: {
      totalItems: suggestions.length,
      suppliersToNotify: Object.keys(supplierGroups).length,
    }
  })
}
