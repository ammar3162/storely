import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isSubscriptionActive } from '@/lib/subscription'
import { formatPhone, sendWhatsAppMessage, delay } from '@/lib/whatsapp'

async function sendForOrg(supabase: any, org: any) {
  const subActive = await isSubscriptionActive(supabase, org.id)
  if (!subActive) return { sent: 0, message: 'الاشتراك منتهي — لا يتم إرسال إشعارات' }

  const { data: products } = await supabase
    .from('products').select('name,qty,unit,reorder_point')
    .eq('org_id', org.id).eq('is_active', true)

  console.log('products count:', (products||[]).length, 'org:', org.id)
  const low = (products||[]).filter((p:any) => p.qty <= p.reorder_point)
  console.log('low count:', low.length)
  if (low.length === 0) return { sent:0, message:'لا توجد منتجات ناقصة - total:' + (products||[]).length }

  const now = new Date().toLocaleString('ar-SA',{timeZone:'Asia/Riyadh',hour:'2-digit',minute:'2-digit',hour12:true,weekday:'long'})
  const outStock = low.filter((p:any)=>p.qty===0)
  const lowStock = low.filter((p:any)=>p.qty>0)
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
    '🏢 *' + org.name + '*  |  🕐 ' + now + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━\n' +
    '⚠️ *تنبيه نقص مخزون*\n' +
    '━━━━━━━━━━━━━━━━━━━━━\n\n' +
    body +
    '━━━━━━━━━━━━━━━━━━━━━\n' +
    '📊 الملخص: ' + outStock.length + ' نفد | ' + lowStock.length + ' منخفض\n' +
    '━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '_Storely — نظام إدارة المخزون_'

  if (!org.whatsapp_number) return { sent:0, message:'لا يوجد رقم واتساب' }

  const phone = formatPhone(org.whatsapp_number)
  const result = await sendWhatsAppMessage(phone, msg)

  try {
    await supabase.from('whatsapp_logs').insert({
      org_id: org.id, phone, message: msg,
      status: result.ok ? 'sent' : 'failed',
    })
    if (result.ok) {
      await supabase.from('organizations')
        .update({ last_notified_at: new Date().toISOString() } as any)
        .eq('id', org.id)
    }
  } catch {}

  return { sent: result.ok ? 1 : 0, low_count: low.length, message: result.ok ? `تم إرسال تنبيه لـ ${low.length} صنف` : 'فشل الإرسال: ' + JSON.stringify(result.data) }
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
  return POST(new Request('http://localhost', { 
    method:'POST', 
    body:'{}',
    headers: { 'x-cron-secret': process.env.ADMIN_PASSWORD || '' }
  })) 
}
