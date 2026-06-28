import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

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
  if (!sessionId || !apiKey) return
  await fetch(`https://api.wasender.app/api/send-message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
    body: JSON.stringify({ session_id: sessionId, to: formatPhone(phone) + '@c.us', message })
  }).catch(() => {})
}

export async function GET() {
  const db = sb()

  const { data: orgs } = await db.from('organizations')
    .select('id,name,whatsapp_number,plan')
    .in('plan', ['basic','pro','advanced'])

  if (!orgs?.length) return NextResponse.json({ sent: 0 })

  const since30 = new Date(Date.now() - 30*24*60*60*1000).toISOString()
  const since7  = new Date(Date.now() - 7*24*60*60*1000).toISOString()
  let sent = 0

  for (const org of orgs) {
    if (!org.whatsapp_number) continue
    try {
      const { data: products } = await db.from('products')
        .select('id,name,qty,reorder_point,unit,category')
        .eq('org_id', org.id).eq('is_active', true)
      if (!products?.length) continue

      const { data: movements } = await db.from('stock_movements')
        .select('qty_change,created_at,products!inner(id,name,unit,org_id)')
        .eq('products.org_id', org.id)
        .eq('type', 'out')
        .gte('created_at', since30)
        .limit(500)

      const rateMap: Record<string, { name:string; unit:string; total30:number; total7:number }> = {}
      for (const m of (movements||[])) {
        const p = m.products as any
        if (!p) continue
        const key = p.id||p.name
        if (!rateMap[key]) rateMap[key] = { name:p.name, unit:p.unit, total30:0, total7:0 }
        rateMap[key].total30 += Math.abs(m.qty_change)
        if (new Date(m.created_at) >= new Date(since7))
          rateMap[key].total7 += Math.abs(m.qty_change)
      }

      const low = products.filter(p => p.qty <= p.reorder_point)
      const out = products.filter(p => p.qty === 0)

      const topWeek = Object.values(rateMap)
        .sort((a,b) => b.total7 - a.total7).slice(0, 3)

      const urgentList = products
        .filter(p => p.qty > 0 && p.qty <= p.reorder_point)
        .map(p => {
          const stats = Object.values(rateMap).find(r => r.name === p.name)
          const dailyRate = stats ? stats.total30 / 30 : 0
          const daysLeft = dailyRate > 0 ? Math.round(p.qty / dailyRate) : null
          return { ...p, daysLeft }
        })
        .filter(p => p.daysLeft !== null && p.daysLeft <= 7)
        .sort((a,b) => (a.daysLeft||99) - (b.daysLeft||99))

      const day = new Date().toLocaleDateString('ar-SA', { weekday:'long', day:'numeric', month:'long' })

      let report = `📊 *التقرير الأسبوعي الذكي*\n`
      report += `🏪 ${org.name}\n`
      report += `📅 ${day}\n`
      report += `${'─'.repeat(28)}\n\n`

      report += `📦 *ملخص المخزون*\n`
      report += `• إجمالي الأصناف: ${products.length}\n`
      report += `• أصناف ناقصة: ${low.length}\n`
      report += `• نفدت تماماً: ${out.length}\n\n`

      if (urgentList.length > 0) {
        report += `⚡ *تنبيه عاجل — ستنفد خلال أسبوع:*\n`
        urgentList.slice(0,5).forEach(p => { report += `• ${p.name}: باقي ${p.daysLeft} يوم\n` })
        report += '\n'
      }

      if (out.length > 0) {
        report += `🔴 *نفدت تماماً:*\n`
        out.slice(0,5).forEach(p => { report += `• ${p.name}\n` })
        if (out.length > 5) report += `• و${out.length-5} أصناف أخرى\n`
        report += '\n'
      }

      if (topWeek.length > 0) {
        report += `📈 *الأكثر صرفاً هذا الأسبوع:*\n`
        topWeek.forEach((p,i) => { report += `${i+1}. ${p.name}: ${p.total7} ${p.unit}\n` })
        report += '\n'
      }

      const toBuy = products
        .filter(p => p.qty <= p.reorder_point)
        .map(p => {
          const stats = Object.values(rateMap).find(r => r.name === p.name)
          const monthlyNeed = stats ? Math.ceil(stats.total30 * 1.1) : p.reorder_point * 2
          const toOrder = Math.max(monthlyNeed - p.qty, p.reorder_point)
          return { ...p, toOrder }
        }).slice(0, 5)

      if (toBuy.length > 0) {
        report += `🛒 *قائمة الشراء المقترحة:*\n`
        toBuy.forEach(p => { report += `• ${p.name}: اطلب ${p.toOrder} ${p.unit}\n` })
        report += '\n'
      }

      report += `${'─'.repeat(28)}\n`
      report += `💡 _تقرير ذكي بناءً على بيانات مخزونك_\n`
      report += `🔗 storely.dev/dashboard`

      await sendWhatsApp(org.whatsapp_number, report)
      sent++
      await new Promise(r => setTimeout(r, 1000))
    } catch (err) {
      console.error(`Error for org ${org.id}:`, err)
    }
  }

  return NextResponse.json({ sent, total: orgs.length })
}
