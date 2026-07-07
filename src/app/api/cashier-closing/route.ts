import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function computeBusinessDate(openTime: string|null, closeTime: string|null): string {
  const now = new Date()
  const riyadhDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Riyadh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
  const riyadhHour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Riyadh', hour: '2-digit', hour12: false }).format(now))

  if (!openTime || !closeTime) return riyadhDateStr

  const openHour = Number(openTime.slice(0, 2))
  const closeHour = Number(closeTime.slice(0, 2))

  // محل يعمل حتى بعد منتصف الليل (وقت الإغلاق أصغر من وقت الفتح رقمياً)
  const isOvernight = closeHour < openHour
  if (isOvernight && riyadhHour < closeHour) {
    const [y, m, d] = riyadhDateStr.split('-').map(Number)
    const yesterday = new Date(Date.UTC(y, m - 1, d))
    yesterday.setUTCDate(yesterday.getUTCDate() - 1)
    return yesterday.toISOString().slice(0, 10)
  }
  return riyadhDateStr
}

function formatPhone(raw: string): string {
  const clean = (raw || '').replace(/\s/g, '')
  if (clean.startsWith('+')) return clean.slice(1)
  if (clean.startsWith('00')) return clean.slice(2)
  if (clean.startsWith('966')) return clean
  if (clean.startsWith('05')) return '966' + clean.slice(1)
  if (clean.startsWith('5')) return '966' + clean
  return clean
}

export async function POST(req: Request) {
  try {
    const {
      org_id, branch_id, staff_id, staff_name, total_sales,
      network_amount, mada_amount, visa_amount, mastercard_amount,
      cash_amount, purchases, network_image, sales_image,
      closing_date, closing_time,
    } = await req.json()

    if (!org_id || !staff_id || !staff_name) {
      return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
    }

    const sales = Number(total_sales) || 0
    const mada = Number(mada_amount) || 0
    const visa = Number(visa_amount) || 0
    const mastercard = Number(mastercard_amount) || 0
    const network = Number(network_amount) || (mada + visa + mastercard)
    const cash = Number(cash_amount) || 0
    const purchasesList = Array.isArray(purchases) ? purchases.filter((p: any) => p && Number(p.amount) > 0) : []
    const totalPurchases = purchasesList.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0)

    const expectedCash = sales - network
    const cashAfterWithdrawal = cash - totalPurchases
    const difference = cashAfterWithdrawal - expectedCash
    const status = Math.abs(difference) < 0.01 ? 'balanced' : (difference < 0 ? 'deficit' : 'surplus')

    const supabase = sb()
    const { data: orgHours } = await supabase.from('organizations').select('shop_open_time,shop_close_time').eq('id', org_id).single()
    const businessDate = closing_date || computeBusinessDate((orgHours as any)?.shop_open_time || null, (orgHours as any)?.shop_close_time || null)
    const { data, error } = await supabase
      .from('cashier_closings')
      .insert({
        org_id,
        branch_id: branch_id || null,
        staff_id,
        staff_name,
        closing_date: businessDate,
        closing_time: closing_time || null,
        total_sales: sales,
        network_amount: network,
        mada_amount: mada,
        visa_amount: visa,
        mastercard_amount: mastercard,
        cash_amount: cash,
        purchases: purchasesList,
        total_purchases: totalPurchases,
        expected_cash: expectedCash,
        difference,
        status,
        network_image: network_image || null,
        sales_image: sales_image || null,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'حدث خطأ أثناء حفظ التقرير' }, { status: 500 })
    }

    // إرسال إشعار واتساب فوري للمالك
    try {
      const { data: org } = await supabase.from('organizations').select('name,whatsapp_number').eq('id', org_id).single()
      const whatsappNumber = (org as any)?.whatsapp_number
      if (whatsappNumber) {
        const now = new Date()
        const effectiveDate = closing_date ? new Date(`${closing_date}T${closing_time||'00:00'}:00+03:00`) : now
        const timeStr = effectiveDate.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Riyadh' })
        const dateStr = effectiveDate.toLocaleDateString('ar-SA', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Riyadh' })

        const statusLine = status === 'balanced'
          ? '✅ *مطابق تماماً*'
          : status === 'deficit'
            ? `⚠️ *يوجد عجز: ${Math.abs(difference).toFixed(2)} ر.س*`
            : `📈 *يوجد زيادة: ${Math.abs(difference).toFixed(2)} ر.س*`

        let networkLines = ''
        if (mada > 0) networkLines += `  • مدى: ${mada.toFixed(2)} ر.س\n`
        if (visa > 0) networkLines += `  • فيزا: ${visa.toFixed(2)} ر.س\n`
        if (mastercard > 0) networkLines += `  • ماستركارد: ${mastercard.toFixed(2)} ر.س\n`

        let purchasesLine = ''
        if (totalPurchases > 0) purchasesLine = `\n🧾 مسحوبات: *${totalPurchases.toFixed(2)} ر.س*`

        const msg = `🟢 *Storely — إقفال كاشير*\n\n` +
          `👤 الموظف: *${staff_name}*\n` +
          `🕐 ${timeStr} · ${dateStr}\n\n` +
          `📊 إجمالي المبيعات: *${sales.toFixed(2)} ر.س*\n\n` +
          `💳 الشبكة:\n${networkLines}  إجمالي: *${network.toFixed(2)} ر.س*\n\n` +
          `💵 الكاش الفعلي: *${cash.toFixed(2)} ر.س*` +
          purchasesLine +
          `\n\n${statusLine}`

        await fetch('https://www.wasenderapi.com/api/send-message', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.WASENDER_API_KEY}`,
            'X-Session-Id': process.env.WASENDER_SESSION_ID!,
          },
          body: JSON.stringify({ to: formatPhone(whatsappNumber), text: msg }),
        })
      }
    } catch {}

    return NextResponse.json({ success: true, closing: data })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const org_id = searchParams.get('org_id')
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    if (!org_id) {
      return NextResponse.json({ error: 'org_id مطلوب' }, { status: 400 })
    }

    const supabase = sb()
    let query = supabase
      .from('cashier_closings')
      .select('*')
      .eq('org_id', org_id)
      .order('closing_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (from) query = query.gte('closing_date', from)
    if (to) query = query.lte('closing_date', to)

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: 'حدث خطأ أثناء جلب التقارير' }, { status: 500 })
    }

    return NextResponse.json({ success: true, closings: data || [] })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
