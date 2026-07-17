import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { formatPhone, sendWhatsAppMessage, delay } from '@/lib/whatsapp'

export async function POST(req: Request) {
  try {
    const cronSecret = req.headers.get('x-cron-secret')
    if (cronSecret !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ success:false, error: 'unauthorized' }, { status: 401 })
    }
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) return NextResponse.json({ success:false, error:'missing env' }, { status:500 })
    const sb = createClient(url, key)
    const { data: pending } = await sb.from('whatsapp_logs').select('*').eq('status','pending').limit(20)
    if (!pending || pending.length === 0) return NextResponse.json({ success:true, sent:0 })
    let sent = 0
    for (const log of pending) {
      const phone = formatPhone(log.phone || '')
      const result = await sendWhatsAppMessage(phone, log.message)
      await sb.from('whatsapp_logs').update({
        status: result.ok ? 'sent' : 'failed',
        sent_at: new Date().toISOString(),
      }).eq('id', log.id)
      if (result.ok) sent++
      await delay(600) // فاصل زمني يحمي من تجاوز حدود إرسال Wasender API
    }
    return NextResponse.json({ success:true, sent })
  } catch (err:any) {
    return NextResponse.json({ success:false, error:err.message }, { status:500 })
  }
}

export async function GET(req: Request) { return POST(req) }
