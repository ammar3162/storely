import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function formatPhone(raw: string): string {
  const clean = (raw || '').replace(/\s/g, '')
  if (clean.startsWith('+')) return clean.slice(1)
  if (clean.startsWith('00')) return clean.slice(2)
  if (clean.startsWith('966')) return clean
  if (clean.startsWith('05')) return '966' + clean.slice(1)
  if (clean.startsWith('5')) return '966' + clean
  return clean
}

export async function POST() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) return NextResponse.json({ success:false, error:'missing env' }, { status:500 })
    const sb = createClient(url, key)
    const { data: pending } = await sb.from('whatsapp_logs').select('*').eq('status','pending').limit(20)
    if (!pending || pending.length === 0) return NextResponse.json({ success:true, sent:0 })
    const apiKey = process.env.WASENDER_API_KEY!
    const sessionId = process.env.WASENDER_SESSION_ID!
    let sent = 0
    for (const log of pending) {
      const phone = formatPhone(log.phone || '')
      const res = await fetch('https://www.wasenderapi.com/api/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'X-Session-Id': sessionId,
        },
        body: JSON.stringify({ to: phone, text: log.message }),
      })
      await sb.from('whatsapp_logs').update({
        status: res.ok ? 'sent' : 'failed',
        sent_at: new Date().toISOString(),
      }).eq('id', log.id)
      if (res.ok) sent++
    }
    return NextResponse.json({ success:true, sent })
  } catch (err:any) {
    return NextResponse.json({ success:false, error:err.message }, { status:500 })
  }
}

export async function GET() { return POST() }
