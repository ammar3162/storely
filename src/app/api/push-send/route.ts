export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

// نضبط VAPID داخل الـ handler مش خارجه

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    webpush.setVapidDetails(
      process.env.VAPID_EMAIL || 'mailto:support@storely.dev',
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!
    )
    const { org_id, title, body, url } = await req.json()
    
    // جيب كل subscriptions للمنشأة
    const { data: subs } = await sb().from('push_subscriptions')
      .select('*').eq('org_id', org_id)
    
    if (!subs || subs.length === 0) return NextResponse.json({ success: true, sent: 0 })
    
    const payload = JSON.stringify({ title, body, url: url || '/dashboard' })
    
    const results = await Promise.allSettled(
      subs.map((s: any) => webpush.sendNotification(s.subscription, payload))
    )
    
    // احذف الـ subscriptions المنتهية
    const failed = results
      .map((r, i) => r.status === 'rejected' ? subs[i].id : null)
      .filter(Boolean)
    
    if (failed.length > 0) {
      await sb().from('push_subscriptions').delete().in('id', failed)
    }
    
    return NextResponse.json({ success: true, sent: results.filter(r => r.status === 'fulfilled').length })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// دالة مساعدة لإرسال Push لمنشأة معينة
export async function sendPushToOrg(org_id: string, title: string, body: string, url?: string) {
  try {
    await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/push-send`, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ org_id, title, body, url })
    })
  } catch {}
}
