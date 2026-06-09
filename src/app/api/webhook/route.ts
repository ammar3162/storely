import { NextResponse } from 'next/server'

const API_KEY = process.env.WASENDER_API_KEY!
const SESSION_ID = process.env.WASENDER_SESSION_ID!

async function send(to: string, text: string) {
  await fetch('https://www.wasenderapi.com/api/send-message', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
      'X-Session-Id': SESSION_ID,
    },
    body: JSON.stringify({ to, text }),
  })
}

const MENU = `مرحباً بك في *Storely* 🏪

نظام إدارة المخزون الذكي

اختر من القائمة:

1️⃣ الاشتراكات والباقات
2️⃣ طريقة الاستخدام
3️⃣ الدعم الفني
4️⃣ التواصل مع الفريق

👇 أرسل رقم الخيار`

const REPLIES: Record<string, string> = {
  '1': `🏷️ *الاشتراكات والباقات*\n\n🌱 *الباقة الأساسية*\n• فرع واحد\n• 99 ر.س / شهر\n• 990 ر.س / سنة\n\n🏪 *الباقة المتوسطة*\n• 2-3 فروع\n• 199 ر.س / شهر\n\n🚀 *الباقة المتقدمة*\n• 4+ فروع\n• 349 ر.س / شهر\n\n✅ جميع الباقات تشمل:\n• مخزون غير محدود\n• تنبيهات واتساب تلقائية\n• نسخ احتياطي أسبوعي\n\nللاشتراك اكتب 4\nاكتب 0 للقائمة الرئيسية`,
  '2': `📱 *طريقة الاستخدام*\n\n✅ سجّل حسابك\n✅ أضف منتجاتك للمخزون\n✅ سجّل المشتريات والصرف\n✅ استقبل تنبيهات المخزون تلقائياً\n\n🔗 جرّب الآن:\nstorely-hm1u.vercel.app\n\nاكتب 0 للقائمة الرئيسية`,
  '3': `🛠️ *الدعم الفني*\n\nنحن هنا لمساعدتك!\n⏰ السبت - الخميس: 9ص - 10م\n\nللتواصل المباشر اكتب 4\nاكتب 0 للقائمة الرئيسية`,
  '4': `👋 *التواصل مع الفريق*\n\n📱 واتساب: +966594351667\n⏰ السبت - الخميس 9ص - 10م\n\nhttps://wa.me/966594351667\n\nاكتب 0 للقائمة الرئيسية`,
  'اشتراك': `للاشتراك تواصل معنا:\n📱 +966594351667\n\nأو سجّل مجاناً:\nstorely-hm1u.vercel.app`,
}

export async function POST(req: Request) {
  try {
    const body = await req.json()

    // تجاهل test events
    if (body?.data?.test === true) return NextResponse.json({ ok: true })

    // WasenderAPI payload formats
    const event = body?.event || ''
    if (!event.includes('message')) return NextResponse.json({ ok: true })

    // استخراج بيانات الرسالة
    const data = body?.data || {}
    const messages = data?.messages || data?.message || data

    // محاولة استخراج الرسالة من formats مختلفة
    const fromMe = messages?.key?.fromMe || data?.key?.fromMe || false
    if (fromMe) return NextResponse.json({ ok: true })

    const remoteJid = messages?.key?.remoteJid || data?.key?.remoteJid || data?.from || ''
    const text = (
      messages?.messageBody ||
      messages?.body ||
      data?.messageBody ||
      data?.body ||
      data?.text ||
      ''
    ).trim()

    if (!remoteJid || !text) return NextResponse.json({ ok: true })

    // تنظيف رقم الهاتف
    const to = remoteJid
      .replace('@s.whatsapp.net', '')
      .replace('@c.us', '')
      .replace('@lid', '')

    if (!to) return NextResponse.json({ ok: true })

    // تحديد الرد
    const reply = REPLIES[text] || REPLIES[text.toLowerCase()] || MENU
    await send(to, reply)

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('Webhook error:', err?.message)
    return NextResponse.json({ ok: true })
  }
}

export async function GET() {
  return NextResponse.json({ status: 'Storely WhatsApp Bot ✅' })
}
