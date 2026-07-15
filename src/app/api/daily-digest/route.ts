import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function send(to: string, text: string) {
  try {
    await fetch('https://www.wasenderapi.com/api/send-message', {
      method: 'POST',
      headers: { 'Content-Type':'application/json', 'Authorization':`Bearer ${process.env.WASENDER_API_KEY}`, 'X-Session-Id':process.env.WASENDER_SESSION_ID! },
      body: JSON.stringify({ to, text }),
    })
  } catch {}
}

function formatPhone(num: string) {
  return num.replace(/^\+/, '').replace(/^0/, '966')
}

// يُستدعى يومياً عبر Vercel Cron — يرسل ملخص واحد لكل مؤسسة مفعّلة "وضع الملخص اليومي"
export async function GET() {
  const supabase = sb()
  const results: string[] = []

  const { data: orgs } = await supabase
    .from('organizations')
    .select('id,name,whatsapp_number,digest_time')
    .eq('digest_mode', true)
    .not('whatsapp_number', 'is', null)

  // الساعة الحالية بتوقيت الرياض (الكرون يشتغل كل ساعة، ونفلتر هنا حسب تفضيل كل مؤسسة)
  const currentRiyadhHour = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Riyadh', hour: '2-digit', hour12: false }).format(new Date())

  const today = new Date(); today.setHours(0,0,0,0)
  const todayIso = today.toISOString().slice(0,10)

  for (const org of (orgs || [])) {
    try {
      const whatsappNumber = (org as any).whatsapp_number
      if (!whatsappNumber) continue
      const preferredHour = ((org as any).digest_time || '21:00').slice(0,2)
      if (preferredHour !== currentRiyadhHour) continue

      // إقفالات الكاشير اليوم
      const { data: closings } = await supabase
        .from('cashier_closings')
        .select('staff_name,total_sales,status,difference')
        .eq('org_id', org.id)
        .eq('closing_date', todayIso)

      // المخزون الناقص حالياً
      const { data: products } = await supabase
        .from('products')
        .select('name,qty,reorder_point')
        .eq('org_id', org.id)
        .eq('is_active', true)
      const lowStock = (products || []).filter((p: any) => p.qty <= p.reorder_point)

      // مشتريات اليوم
      const { data: purchases } = await supabase
        .from('purchases')
        .select('amount')
        .eq('org_id', org.id)
        .gte('created_at', today.toISOString())

      if (!closings?.length && !lowStock.length && !purchases?.length) continue // ما فيه شي يستاهل رسالة

      let msg = `📋 *Storely — ملخص اليوم*\n${org.name}\n\n`

      if (closings?.length) {
        const totalSales = closings.reduce((s: number, c: any) => s + Number(c.total_sales || 0), 0)
        const deficits = closings.filter((c: any) => c.status === 'deficit')
        msg += `🏪 *الإقفالات (${closings.length})*\n`
        msg += `💰 إجمالي المبيعات: ${totalSales.toFixed(2)} ر.س\n`
        if (deficits.length) {
          msg += `⚠️ عجز بـ ${deficits.length} إقفال:\n`
          deficits.forEach((d: any) => { msg += `  • ${d.staff_name}: ${Math.abs(d.difference).toFixed(2)} ر.س\n` })
        }
        msg += '\n'
      }

      if (lowStock.length) {
        msg += `📦 *مخزون ناقص (${lowStock.length})*\n`
        lowStock.slice(0, 10).forEach((p: any) => { msg += `  🔴 ${p.name}: ${p.qty}/${p.reorder_point}\n` })
        if (lowStock.length > 10) msg += `  ...و${lowStock.length - 10} أخرى\n`
        msg += '\n'
      }

      if (purchases?.length) {
        const total = purchases.reduce((s: number, p: any) => s + Number(p.amount || 0), 0)
        msg += `🛒 مشتريات اليوم: ${purchases.length} فاتورة — ${total.toFixed(2)} ر.س`
      }

      await send(formatPhone(whatsappNumber), msg.trim())
      results.push(org.id)
    } catch (e) {
      console.error('daily-digest error for org', org.id, e)
    }
  }

  return NextResponse.json({ success: true, sent: results.length })
}
