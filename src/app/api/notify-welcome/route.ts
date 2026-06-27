import { NextResponse } from 'next/server'

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
    const { name, phone } = await req.json()
    if (!phone) return NextResponse.json({ success: false })

    const msg = `🎉 *أهلاً بك في Storely!*\n\nمرحباً ${name}،\n\nتم إنشاء حسابك بنجاح 🎊\n\nلديك *7 أيام تجربة مجانية* كاملة لاستكشاف جميع المميزات:\n\n📦 تتبع المخزون لحظة بلحظة\n📲 تنبيهات واتساب تلقائية\n👥 إدارة الموظفين والفروع\n📊 تقارير احترافية\n\n🔗 ابدأ الآن: https://www.storely.dev/dashboard\n\nنحن هنا لمساعدتك في أي وقت 💚\n_فريق Storely_`

    const res = await fetch('https://www.wasenderapi.com/api/send-message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.WASENDER_API_KEY}`,
        'X-Session-Id': process.env.WASENDER_SESSION_ID!,
      },
      body: JSON.stringify({ to: formatPhone(phone), text: msg }),
    })

    return NextResponse.json({ success: res.ok })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message })
  }
}
