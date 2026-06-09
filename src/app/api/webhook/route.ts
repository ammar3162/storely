import { NextResponse } from 'next/server'

const MENU = `🏪 *Storely - نظام إدارة المتجر*
━━━━━━━━━━━━━━━

مرحباً! كيف أساعدك؟

1️⃣ *حالة المخزون*
2️⃣ *المنتجات المنخفضة*
3️⃣ *آخر الطلبات*
4️⃣ *إحصائيات اليوم*
5️⃣ *تواصل مع الدعم*

💡 *اكتب رقم الخيار أو اسمه*

───────────────
_Storely © 2026_`

const REPLIES: Record<string, string> = {
  '1': '📦 *حالة المخزون*\n\nجاري جلب البيانات...',
  '2': '⚠️ *المنتجات المنخفضة*\n\nجاري التحقق...',
  '3': '🛒 *آخر الطلبات*\n\nجاري التحميل...',
  '4': '📊 *إحصائيات اليوم*\n\nجاري التحضير...',
  '5': '📞 *تواصل مع الدعم*\n\nواتساب: +966594351667',
  
  'حالة المخزون': '📦 *حالة المخزون*\n\nجاري جلب البيانات...',
  'منتجات منخفضة': '⚠️ *المنتجات المنخفضة*\n\nجاري التحقق...',
  'طلبات': '🛒 *آخر الطلبات*\n\nجاري التحميل...',
  'إحصائيات': '📊 *إحصائيات اليوم*\n\nجاري التحضير...',
  'دعم': '📞 *تواصل مع الدعم*\n\nواتساب: +966594351667',
}

async function send(to: string, text: string) {
  const apiKey = process.env.WASENDER_API_KEY!
  const sessionId = process.env.WASENDER_SESSION_ID!
  
  try {
    const res = await fetch(`https://www.wasenderapi.com/api/send-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'X-Session-Id': sessionId,
      },
      body: JSON.stringify({ to, text }),
    })
    console.log('WhatsApp send result:', await res.json())
  } catch (err) {
    console.error('Send error:', err)
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    
    // Log للتشخيص
    console.log('WEBHOOK BODY:', JSON.stringify(body, null, 2))
    
    // تجاهل test events
    if (body?.data?.test === true) return NextResponse.json({ ok: true })
    
    // استخراج الرسائل من Payload الجديد (WasenderAPI format)
    const messages = body?.data?.messages
    
    // messages يمكن يكون array أو object واحد
    const msgArray = Array.isArray(messages) ? messages : (messages ? [messages] : [])
    
    if (msgArray.length === 0) return NextResponse.json({ ok: true })
    
    for (const msg of msgArray) {
      // تجاهل الرسائل المرسلة من البوت نفسه
      if (msg?.key?.fromMe === true) continue
      
      // استخراج رقم المرسل
      let to = msg?.key?.cleanedSenderPn || 
               msg?.key?.remoteJid?.replace('@s.whatsapp.net', '')?.replace('@c.us', '')?.replace('@lid', '') || ''
      
      // استخراج نص الرسالة
      const text = (msg?.messageBody || 
                   msg?.message?.conversation || 
                   '').trim().toLowerCase()
      
      if (!to || !text) continue
      
      console.log(`Processing message from ${to}: ${text}`)
      
      // تحديد الرد
      const reply = REPLIES[text] || REPLIES[text.toLowerCase()] || MENU
      
      // إرسال الرد
      await send(to, reply)
    }
    
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('Webhook error:', err?.message)
    return NextResponse.json({ ok: true })
  }
}

export async function GET() {
  return NextResponse.json({ status: 'Storely WhatsApp Bot ✅' })
}
