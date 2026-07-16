import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isSubscriptionActive } from '@/lib/subscription'
import { formatPhone, sendWhatsAppMessage, delay } from '@/lib/whatsapp'
import { WHATSAPP_PAUSED } from '@/lib/whatsappPause'

async function sendForOrg(supabase: any, org: any) {
  const subActive = await isSubscriptionActive(supabase, org.id)
  if (!subActive) return { sent: 0, message: 'الاشتراك منتهي — لا يتم إرسال إشعارات' }

  const { data: branches } = await supabase
    .from('branches').select('id,name,whatsapp_number')
    .eq('org_id', org.id).eq('is_active', true)

  const { data: products } = await supabase
    .from('products').select('name,qty,unit,reorder_point,branch_id')
    .eq('org_id', org.id).eq('is_active', true)

  const low = (products||[]).filter((p:any) => p.qty <= p.reorder_point)
  if (low.length === 0) return { sent:0, message:'لا توجد منتجات ناقصة' }

  const byBranch: Record<string, { name: string; phone: string|null; items: any[] }> = {}
  for (const p of low) {
    const branch = (branches||[]).find((b:any) => b.id === (p as any).branch_id)
    const key = (p as any).branch_id || 'none'
    if (!byBranch[key]) {
      byBranch[key] = {
        name: branch?.name || org.name,
        phone: branch?.whatsapp_number || org.whatsapp_number || null,
        items: [],
      }
    }
    byBranch[key].items.push(p)
  }
  const multiBranch = (branches||[]).length > 1

  const now = new Date().toLocaleString('ar-SA',{timeZone:'Asia/Riyadh',hour:'2-digit',minute:'2-digit',hour12:true,weekday:'long'})
  let totalSent = 0
  const details: any[] = []

  for (const key of Object.keys(byBranch)) {
    const group = byBranch[key]
    if (!group.phone) { details.push({ branch: group.name, sent: false }); continue }
    const outStock = group.items.filter((p:any)=>p.qty===0)
    const lowStock = group.items.filter((p:any)=>p.qty>0)
  let body = ''
  if(outStock.length>0) {
    body += '🔴 *نفد المخزون*\n'
    body += outStock.map((p:any)=>'▸ ' + p.name + ' | 0/' + p.reorder_point + ' ' + p.unit).join('\n')
    body += '\n\n'
  }
  if(lowStock.length>0) {
    body += '🟡 *مخزون منخفض*\n'
    body += lowStock.map((p:any)=>'▸ ' + p.name + ' | ' + p.qty + '/' + p.reorder_point + ' ' + p.unit).join('\n')
    body += '\n\n'
  }
  const msg =
    '╬══════════════════════╬\n' +
    '   📦 Storely Alert\n' +
    '╚══════════════════════╝\n\n' +
    '🏢 *' + org.name + '*  |  🕐 ' + now + '\n' +
    (multiBranch ? ('🏪 *الفرع: ' + group.name + '*\n\n') : '\n') +
    '━━━━━━━━━━━━━━━━━━━━━\n' +
    '⚠️ *تنبيه نقص مخزون*\n' +
    '━━━━━━━━━━━━━━━━━━━━━\n\n' +
    body +
    '━━━━━━━━━━━━━━━━━━━━━\n' +
    '📊 الملخص: ' + outStock.length + ' نفد | ' + lowStock.length + ' منخفض\n' +
    '━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '_Storely — نظام إدارة المخزون_'

    const phone = formatPhone(group.phone)
    const result = await sendWhatsAppMessage(phone, msg)

    try {
      await supabase.from('whatsapp_logs').insert({
        org_id: org.id, phone, message: msg,
        status: result.ok ? 'sent' : 'failed',
      })
    } catch {}

    if (result.ok) totalSent++
    details.push({ branch: group.name, sent: result.ok })
    await delay(600)
  }

  if (totalSent > 0) {
    try {
      await supabase.from('organizations')
        .update({ last_notified_at: new Date().toISOString() } as any)
        .eq('id', org.id)
    } catch {}
  }

  return { sent: totalSent, low_count: low.length, message: `تم إرسال ${totalSent} إشعار`, details }
}

export async function POST(req: Request) {
  const secret = req.headers.get('x-cron-secret')
  const validSecret = process.env.ADMIN_PASSWORD
  
  try {
    const bodyCheck = await req.clone().json().catch(()=>({}))
    const isFromDashboard = !!bodyCheck.org_id
    if (!isFromDashboard && secret !== validSecret) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    let body: any = {}
    try { body = await req.json() } catch {}

    if (body.org_id) {
      const { data: org } = await supabase.from('organizations').select('*').eq('id', body.org_id).single()
      if (!org) return NextResponse.json({ success:false, message:'المؤسسة غير موجودة' })
      const result = await sendForOrg(supabase, org)
      return NextResponse.json({ success:true, ...result })
    }

    const { data: orgs } = await supabase.from('organizations').select('*')
    if (!orgs || orgs.length === 0) return NextResponse.json({ success:true, message:'لا توجد مؤسسات', sent:0 })
    let sent = 0
    const results = []
    for (const org of orgs) {
      const result = await sendForOrg(supabase, org)
      sent += result.sent
      results.push({ org: org.name, ...result })
      await delay(600) // فاصل زمني يحمي من تجاوز حدود إرسال Wasender API
    }
    return NextResponse.json({ success:true, sent, results })
  } catch (err:any) {
    return NextResponse.json({ success:false, error:err.message }, { status:500 })
  }
}

export async function GET() {
  if (WHATSAPP_PAUSED) return NextResponse.json({ success: true, skipped: 'paused' })

  return POST(new Request('http://localhost', { 
    method:'POST', 
    body:'{}',
    headers: { 'x-cron-secret': process.env.ADMIN_PASSWORD || '' }
  })) 
}
