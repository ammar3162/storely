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

    const msg = `🟢 *Storely*

مرحباً ${name} 👋

تم إنشاء حسابك بنجاح
لديك *7 أيام تجربة مجانية*

ابدأ الآن بإضافة مخزونك`

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
