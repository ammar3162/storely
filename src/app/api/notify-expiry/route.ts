import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isSubscriptionActive } from '@/lib/subscription'
import { formatPhone, sendWhatsAppMessage, delay } from '@/lib/whatsapp'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// تنبيه يومي تلقائي لأي منتج قرب انتهاء صلاحيته (خلال 7 أيام أو أقل)
export async function POST(req: Request) {
  const secret = req.headers.get('x-cron-secret')
  if (secret !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const supabase = sb()
  const now = new Date()
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  const todayStr = now.toISOString().slice(0, 10)
  const in7DaysStr = in7Days.toISOString().slice(0, 10)

  const { data: orgs } = await supabase.from('organizations').select('id,name,whatsapp_number')
  if (!orgs || orgs.length === 0) return NextResponse.json({ success: true, message: 'لا توجد مؤسسات', sent: 0 })

  let totalSent = 0
  const results: any[] = []

  for (const org of orgs as any[]) {
    const subActive = await isSubscriptionActive(supabase, org.id)
    if (!subActive) continue

    const { data: products } = await supabase
      .from('products')
      .select('name,unit,qty,expiry_date,branch_id')
      .eq('org_id', org.id).eq('is_active', true)
      .not('expiry_date', 'is', null)
      .gte('expiry_date', todayStr)
      .lte('expiry_date', in7DaysStr)

    if (!products || products.length === 0) continue

    const { data: branches } = await supabase
      .from('branches').select('id,name,whatsapp_number')
      .eq('org_id', org.id).eq('is_active', true)

    const byBranch: Record<string, { name: string; phone: string | null; items: any[] }> = {}
    for (const p of products as any[]) {
      const branch = (branches || []).find((b: any) => b.id === p.branch_id)
      const key = p.branch_id || 'none'
      if (!byBranch[key]) {
        byBranch[key] = { name: branch?.name || org.name, phone: branch?.whatsapp_number || org.whatsapp_number || null, items: [] }
      }
      byBranch[key].items.push(p)
    }

    for (const key of Object.keys(byBranch)) {
      const group = byBranch[key]
      if (!group.phone) continue

      const sorted = [...group.items].sort((a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime())
      const lines = sorted.map((p: any) => {
        const days = Math.ceil((new Date(p.expiry_date).getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
        const daysLabel = days <= 0 ? 'انتهت اليوم!' : `باقي ${days} ${days === 1 ? 'يوم' : 'أيام'}`
        return `▸ ${p.name} — ${p.qty} ${p.unit} (${daysLabel})`
      }).join('\n')

      const msg =
        `⏰ *تنبيه انتهاء صلاحية — Storely*\n\n` +
        `🏢 *${org.name}*\n\n` +
        `المنتجات التالية قرب انتهاء صلاحيتها:\n\n${lines}\n\n` +
        `_راجع صفحة المخزون لاتخاذ الإجراء المناسب._`

      const phone = formatPhone(group.phone)
      const result = await sendWhatsAppMessage(phone, msg)
      if (result.ok) totalSent++
      results.push({ org: org.name, branch: group.name, count: sorted.length, sent: result.ok })
      await delay(600)
    }
  }

  return NextResponse.json({ success: true, sent: totalSent, results })
}

export async function GET() {
  return POST(new Request('http://localhost', {
    method: 'POST',
    headers: { 'x-cron-secret': process.env.ADMIN_PASSWORD || '' },
  }))
}
