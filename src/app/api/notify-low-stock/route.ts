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

async function sendForOrg(supabase: any, org: any) {
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

  const phone   = formatPhone(org.whatsapp_number)
  const apiKey  = process.env.WASENDER_API_KEY!
  const session = process.env.WASENDER_SESSION_ID!

  const res = await fetch('https://www.wasenderapi.com/api/send-message', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'X-Session-Id': session,
    },
    body: JSON.stringify({ to: phone, text: msg }),
  })

  const resData = await res.json().catch(()=>({}))

  try {
    await supabase.from('whatsapp_logs').insert({
      org_id: org.id, phone, message: msg,
      status: res.ok ? 'sent' : 'failed',
    })
    if (res.ok) {
      await supabase.from('organizations')
        .update({ last_notified_at: new Date().toISOString() } as any)
        .eq('id', org.id)
    }
  } catch {}

  return { sent: res.ok ? 1 : 0, low_count: low.length, message: res.ok ? `تم إرسال تنبيه لـ ${low.length} صنف` : 'فشل الإرسال: ' + JSON.stringify(resData) }
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
