import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * يرسل إشعار Push فوري لكل الأجهزة المشتركة لمنشأة معينة.
 * فشله لا يوقف العملية الأساسية أبداً (استدعِها دايماً جوّه try/catch أو بدونه بأمان).
 */
export async function sendPushToOrg(org_id: string, title: string, body: string, url?: string) {
  try {
    webpush.setVapidDetails(
      process.env.VAPID_EMAIL || 'mailto:support@storely.dev',
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!
    )
    const { data: subs } = await sb().from('push_subscriptions').select('id,subscription').eq('org_id', org_id)
    if (!subs || subs.length === 0) return { sent: 0 }

    const payload = JSON.stringify({ title, body, url: url || '/dashboard' })
    const results = await Promise.allSettled(
      subs.map((s: any) => webpush.sendNotification(s.subscription, payload))
    )

    const failed = results
      .map((r, i) => (r.status === 'rejected' ? subs[i].id : null))
      .filter(Boolean)
    if (failed.length > 0) {
      await sb().from('push_subscriptions').delete().in('id', failed)
    }

    return { sent: results.filter(r => r.status === 'fulfilled').length }
  } catch (err) {
    console.error('sendPushToOrg error:', err)
    return { sent: 0 }
  }
}
