import { NextResponse } from 'next/server'
import { verifyOrgAccess } from '@/lib/verifyOrgAccess'
import { isCronRequest } from '@/lib/cronAuth'
import { createClient } from '@supabase/supabase-js'
import { isSubscriptionActive } from '@/lib/subscription'
import { formatPhone, sendWhatsAppMessage, delay } from '@/lib/whatsapp'
import { orgFeatures } from '@/lib/planFeatures'
import { managerMay } from '@/lib/managerPerms'
import { buildBranchReports, branchBlock, reportMessage, fullView } from '@/lib/morningReport'

// التقرير الصباحي (lib/morningReport): المالك يوصله كل الفروع برسالة وحدة، ورقم كل فرع ومدير الفرع يوصلهم تقرير فرعهم
async function sendForOrg(supabase: any, org: any) {
  const subActive = await isSubscriptionActive(supabase, org.id)
  if (!subActive) return { sent: 0, message: 'الاشتراك منتهي — لا يتم إرسال إشعارات' }

  const [{ data: owner }, { data: branches }, { data: managers }] = await Promise.all([
    supabase.from('profiles').select('whatsapp_consent').eq('org_id', org.id).eq('role', 'owner').maybeSingle(),
    supabase.from('branches').select('id,name,whatsapp_number').eq('org_id', org.id).eq('is_active', true).order('created_at'),
    supabase.from('profiles').select('branch_id,report_whatsapp,whatsapp_consent,permissions,status').eq('org_id', org.id).eq('role', 'manager').not('report_whatsapp', 'is', null),
  ])
  if (!(branches || []).length) return { sent: 0, message: 'ما فيه فروع' }

  const features = await orgFeatures(supabase, org.id)
  const reports = await buildBranchReports(supabase, org.id, branches as any[], features)
  const full = fullView(features)
  const multi = (branches || []).length > 1

  // المستلمين — رقم واحد ما يوصله أكثر من رسالة
  const outbox = new Map<string, string>()
  const add = (rawPhone: string | null | undefined, msg: string | null) => {
    if (!rawPhone || !msg) return
    const phone = formatPhone(rawPhone)
    if (/^\d{10,15}$/.test(phone) && !outbox.has(phone)) outbox.set(phone, msg)
  }

  // ١) المالك: كل الفروع (واتساب بس لو وافق على الرسائل — وموافقته تشمل أرقام فروعه)
  const ownerOk = (owner as any)?.whatsapp_consent === true
  if (ownerOk) {
    const blocks = reports.map(r => ({ name: r.branchName, text: branchBlock(r, full) })).filter(b => b.text) as { name: string; text: string }[]
    add(org.whatsapp_number, reportMessage(org.name, blocks, multi))
  }
  for (const r of reports) {
    const branch = (branches as any[]).find(b => b.id === r.branchId)
    // ٢) رقم الفرع (يحدده المالك): تقرير الفرع كامل
    const text = branchBlock(r, full)
    if (ownerOk) add(branch?.whatsapp_number, text ? reportMessage(org.name, [{ name: r.branchName, text }], multi) : null)
    // ٣) مدير الفرع: تقرير فرعه حسب صلاحياته (وافق على الرسائل وحسابه شغال)
    for (const m of ((managers || []) as any[]).filter(m => m.branch_id === r.branchId && m.whatsapp_consent === true && m.status !== 'suspended')) {
      const v = { ...full, sales: full.sales && managerMay({ role: 'manager', permissions: m.permissions }, 'reports'), staff: full.staff && managerMay({ role: 'manager', permissions: m.permissions }, 'staff', 'attendance', 'hr') }
      const mt = branchBlock(r, v)
      add(m.report_whatsapp, mt ? reportMessage(org.name, [{ name: r.branchName, text: mt }], multi) : null)
    }
  }
  if (!outbox.size) return { sent: 0, message: 'ما فيه شي يستاهل يتبلّغ اليوم' }

  let totalSent = 0
  const details: any[] = []
  for (const [phone, msg] of outbox) {
    const result = await sendWhatsAppMessage(phone, msg)
    try { await supabase.from('whatsapp_logs').insert({ org_id: org.id, phone, message: msg, status: result.ok ? 'sent' : 'failed' }) } catch {}
    if (result.ok) totalSent++
    details.push({ phone: phone.slice(-4), sent: result.ok })
    await delay(600)
  }
  if (totalSent > 0) {
    try { await supabase.from('organizations').update({ last_notified_at: new Date().toISOString() } as any).eq('id', org.id) } catch {}
  }
  return { sent: totalSent, message: `تم إرسال ${totalSent} تقرير`, details }
}

export async function POST(req: Request) {
  try {
    const bodyCheck = await req.clone().json().catch(()=>({}))
    const isFromDashboard = !!bodyCheck.org_id
    if (isFromDashboard) {
      // زر "أرسل الآن" بالإعدادات — لازم المستخدم يكون فعلاً من هذي المنشأة
      // (كان مفتوح لأي أحد يعرف org_id: يرسل واتساب للمنشأة ويرجع قائمة أصنافها الناقصة)
      const access = await verifyOrgAccess(bodyCheck.org_id)
      if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })
    } else if (!isCronRequest(req)) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    let body: any = {}
    try { body = await req.json() } catch {}

    if (body.org_id) {
      const { data: org } = await supabase.from('organizations').select('id,name,whatsapp_number').eq('id', body.org_id).single()
      if (!org) return NextResponse.json({ success:false, message:'المؤسسة غير موجودة' })
      const result = await sendForOrg(supabase, org)
      return NextResponse.json({ success:true, ...result })
    }

    const { data: allOrgs } = await supabase.from('organizations').select('id,name,whatsapp_number,notify_schedule,notify_days,notify_time,last_notified_at')
    if (!allOrgs || allOrgs.length === 0) return NextResponse.json({ success:true, message:'لا توجد مؤسسات', sent:0 })

    // نفلتر حسب جدولة كل مؤسسة لحالها (نوع الجدولة، اليوم، الساعة) — بدل ما نرسل للجميع دفعة وحدة بغض النظر عن تفضيلهم
    const nowRiyadh = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Riyadh' }))
    const currentHour = nowRiyadh.getHours()
    const currentDay = String(nowRiyadh.getDay()) // 0=أحد ... 6=سبت، نفس ترميز DAYS بالإعدادات

    const orgs = allOrgs.filter((org: any) => {
      if (org.notify_schedule === 'manual') return false // يدوي بس — ما يرسل تلقائياً إطلاقاً
      if (org.notify_schedule === 'weekly' && !(org.notify_days || []).includes(currentDay)) return false
      const orgHour = Number((org.notify_time || '08:00').slice(0, 2))
      if (orgHour !== currentHour) return false
      // حماية من التكرار: نتأكد ما أُرسل شي "بنفس الساعة التقويمية" اليوم (مو عداد زمني بسيط)
      // — هذا يسمح بالإرسال فوراً لو العميل غيّر وقته المفضّل لساعة جديدة، حتى لو أُرسل له قبل شوي بساعة مختلفة
      if (org.last_notified_at) {
        const lastRiyadh = new Date(new Date(org.last_notified_at).toLocaleString('en-US', { timeZone: 'Asia/Riyadh' }))
        const sameCalendarHour = lastRiyadh.toDateString() === nowRiyadh.toDateString() && lastRiyadh.getHours() === currentHour
        if (sameCalendarHour) return false
      }
      return true
    })

    if (orgs.length === 0) return NextResponse.json({ success:true, message:'لا توجد مؤسسات بموعد الإرسال حالياً', sent:0 })

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

export async function GET(req: Request) {
  // الجدولة (كل ساعة — كل منشأة ترسل بساعتها المفضلة من الإعدادات)
  if (!isCronRequest(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  return POST(new Request('http://localhost', { method: 'POST', body: '{}', headers: req.headers }))
}
