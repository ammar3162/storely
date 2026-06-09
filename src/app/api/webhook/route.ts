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
  '1': `🏷️ *الاشتراكات والباقات*\n\n🌱 *الباقة الأساسية*\n• فرع واحد\n• 99 ر.س / شهر\n• 990 ر.س / سنة (شهرين مجاناً)\n\n🏪 *الباقة المتوسطة*\n• 2-3 فروع\n• 199 ر.س / شهر\n• 1,990 ر.س / سنة\n\n🚀 *الباقة المتقدمة*\n• 4+ فروع\n• 349 ر.س / شهر\n• 3,490 ر.س / سنة\n\n✅ جميع الباقات تشمل:\n• مخزون غير محدود\n• تنبيهات واتساب تلقائية\n• نسخ احتياطي أسبوعي\n• دعم فني\n\nللاشتراك تواصل معنا 👇\nاكتب 0 للقائمة الرئيسية`,

  '2': `📱 *طريقة الاستخدام*\n\n✅ سجّل حسابك على الرابط\n✅ أضف منتجاتك للمخزون\n✅ سجّل المشتريات والصرف\n✅ استقبل تنبيهات المخزون الناقص تلقائياً\n✅ تقارير يومية وأسبوعية\n\n🔗 *جرّب الآن:*\nstorely-hm1u.vercel.app\n\nاكتب 0 للقائمة الرئيسية`,

  '3': `🛠️ *الدعم الفني*\n\nنحن هنا لمساعدتك!\n\n⏰ أوقات الدعم:\nالسبت - الخميس: 9ص - 10م\n\nللتواصل المباشر اكتب 4\n\nاكتب 0 للقائمة الرئيسية`,

  '4': `👋 *التواصل مع الفريق*\n\n📱 واتساب: +966594351667\n⏰ السبت - الخميس 9ص - 10م\n\nhttps://wa.me/966594351667\n\nاكتب 0 للقائمة الرئيسية`,

  '0': '',
  'مرحبا': '',
  'هلا': '',
  'hi': '',
  'hello': '',
  'اشتراك': `للاشتراك تواصل معنا:\n\n📱 +966594351667\n\nأو سجّل مجاناً:\nstorely-hm1u.vercel.app`,
}

// set MENU for 0 and greeting keys
REPLIES['0'] = MENU
REPLIES['مرحبا'] = MENU
REPLIES['هلا'] = MENU
REPLIES['hi'] = MENU
REPLIES['hello'] = MENU

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const msg = body?.data?.messages
    if (!msg) return NextResponse.json({ ok: true })
    const from = msg.key?.remoteJid || ''
    const text = (msg.messageBody || '').trim()
    if (msg.key?.fromMe) return NextResponse.json({ ok: true })
    if (!from || !text) return NextResponse.json({ ok: true })
    const to = from.replace('@s.whatsapp.net', '').replace('@c.us', '')
    const reply = REPLIES[text] || REPLIES[text.toLowerCase()] || MENU
    await send(to, reply)
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ ok: true })
  }
}

export async function GET() {
  return NextResponse.json({ status: 'Storely WhatsApp Bot ✅' })
}
