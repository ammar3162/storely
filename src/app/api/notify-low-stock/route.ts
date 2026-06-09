import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function formatPhone(raw: string): string {
  const clean = raw?.replace(/\s/g, '').replace(/^\+/, '') || ''
  if (clean.startsWith('966')) return clean
  if (clean.startsWith('05')) return '966' + clean.slice(1)
  if (clean.startsWith('5')) return '966' + clean
  return '966' + clean
}

async function sendForOrg(supabase: any, org: any) {
  console.log('📦 معالجة المؤسسة:', org.name)
  console.log('📱 رقم الواتساب:', org.whatsapp_number)

  // جلب المنتجات
  const { data: products, error } = await supabase
    .from('products')
    .select('name,qty,unit,reorder_point,min_stock,quantity')
    .eq('org_id', org.id)
    .eq('is_active', true)

  console.log('📊 عدد المنتجات:', products?.length || 0)
  console.log('📋 عينة منتجات:', JSON.stringify(products?.slice(0, 3), null, 2))

  // تصفية المنتجات المنخفضة (جرب كل الاحتمالات)
  const low = (products || []).filter((p: any) => {
    const qty = p.qty ?? p.quantity ?? 0
    const min = p.reorder_point ?? p.min_stock ?? Infinity
    return qty <= min
  })

  console.log('⚠️ المنتجات المنخفضة:', low.length)
  
  if (low.length === 0) {
    console.log('❌ لا توجد منتجات ناقصة لهذه المؤسسة')
    return { sent: 0, message: 'لا توجد منتجات ناقصة' }
  }

  // تجهيز الرسالة
  const list = low.map((p: any) => {
    const qty = p.qty ?? p.quantity
    const unit = p.unit || 'قطعة'
    const min = p.reorder_point ?? p.min_stock
    return `• ${p.name}: ${qty} ${unit} (الحد الأدنى: ${min})`
  }).join('\n')

  const msg =
    '🔔 *تنبيه مخزون — ' + org.name + '*\n\n' +
    'الأصناف التالية وصلت للحد الأدنى:\n\n' +
    list + '\n\n' +
    '⚡ يرجى إعادة الطلب في أقرب وقت\n\n' +
    '_Storely — نظام إدارة المخزون_'

  // تنسيق رقم الهاتف
  const phone = formatPhone(org.whatsapp_number)
  console.log('📞 الرقم بعد التنسيق:', phone)

  if (!phone || phone === '966') {
    console.log('❌ رقم الواتساب فارغ أو غير صحيح!')
    return { sent: 0, message: 'رقم الواتساب غير موجود' }
  }

  // إرسال عبر WasenderAPI
  const apiKey = process.env.WASENDER_API_KEY!
  const sessionId = process.env.WASENDER_SESSION_ID!

  console.log('🚀 جاري الإرسال إلى:', phone)

  try {
    const res = await fetch(`https://www.wasenderapi.com/api/send-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'X-Session-Id': sessionId,
      },
      body: JSON.stringify({ to: phone, text: msg }),
    })

    const result = await res.json()
    console.log('✅ نتيجة الإرسال:', JSON.stringify(result))

    // تسجيل في الـ logs
    await supabase.from('whatsapp_logs').insert({
      org_id: org.id,
      phone,
      message: msg,
      status: res.ok ? 'sent' : 'failed',
    }).catch(() => {})

    return { sent: res.ok ? 1 : 0, result }
  } catch (err: any) {
    console.error('❌ خطأ في الإرسال:', err.message)
    return { sent: 0, error: err.message }
  }
}

export async function POST(req: Request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    let body: any = {}
    try {
      body = await req.json()
    } catch {}

    console.log('🎯 بدء التنبيه - Body:', JSON.stringify(body))

    if (body.org_id) {
      console.log('🔍 البحث عن مؤسسة محددة:', body.org_id)
      const { data: org, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', body.org_id)
        .single()

      if (!org) {
        console.log('❌ المؤسسة غير موجودة')
        return NextResponse.json({ success: false, message: 'المؤسسة غير موجودة' })
      }

      console.log('✅ تم العثور على المؤسسة:', org.name)
      const result = await sendForOrg(supabase, org)
      return NextResponse.json({ success: true, ...result })
    }

    // جميع المؤسسات
    const { data: orgs } = await supabase.from('organizations').select('*')
    console.log('📋 عدد المؤسسات:', orgs?.length || 0)

    if (!orgs || orgs.length === 0) {
      return NextResponse.json({ success: true, message: 'لا توجد مؤسسات' })
    }

    let sent = 0
    for (const org of orgs) {
      const result = await sendForOrg(supabase, org)
      sent += result.sent
    }

    return NextResponse.json({ success: true, sent })
  } catch (err: any) {
    console.error('💥 خطأ عام:', err.message)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function GET() {
  return POST(new Request('http://localhost'))
}
