import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST() {
  try {
    const url  = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key  = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) return NextResponse.json({ success:false, error:'missing env' }, { status:500 })

    const sb = createClient(url, key)

    const { data: pending } = await sb
      .from('whatsapp_logs').select('*').eq('status','pending').limit(20)

    if (!pending || pending.length === 0)
      return NextResponse.json({ success:true, sent:0 })

    let sent = 0
    for (const log of pending) {
      const raw   = log.phone?.replace(/\s/g,'') || ''
      const phone = raw.startsWith('+') ? raw : raw.startsWith('05') ? '+966'+raw.slice(1) : '+'+raw
      const sid   = process.env.TWILIO_ACCOUNT_SID!
      const auth  = process.env.TWILIO_AUTH_TOKEN!
      const from  = process.env.TWILIO_WHATSAPP_FROM!

      const res = await fetch(
        'https://api.twilio.com/2010-04-01/Accounts/'+sid+'/Messages.json',
        {
          method:'POST',
          headers:{
            'Authorization':'Basic '+Buffer.from(sid+':'+auth).toString('base64'),
            'Content-Type':'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({ From:from, To:'whatsapp:'+phone, Body:log.message }).toString(),
        }
      )

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
