import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyOrgAccess } from '@/lib/verifyOrgAccess'
import { formatPhone } from '@/lib/whatsapp'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function hasActiveWaAddon(supabase: any, orgId: string) {
  // إشعارات واتساب مدموجة بنفس اشتراك نظام الحجوزات — ما فيه إضافة منفصلة
  const { data: addon } = await supabase.from('marketplace_addons').select('id').eq('slug', 'table_reservations').maybeSingle()
  if (!addon) return false
  const { data: sub } = await supabase.from('org_addon_subscriptions').select('status,expires_at').eq('org_id', orgId).eq('addon_id', addon.id).eq('status', 'active').maybeSingle()
  return !!sub && new Date(sub.expires_at) > new Date()
}

export async function POST(req: Request) {
  try {
    const { org_id } = await req.json()
    if (!org_id) return NextResponse.json({ error: 'org_id مطلوب' }, { status: 400 })

    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })

    const supabase = sb()
    if (!(await hasActiveWaAddon(supabase, org_id))) {
      return NextResponse.json({ error: 'هذي الميزة غير مفعّلة — اشترك بها أول من سوق الإضافات' }, { status: 403 })
    }

    const token = process.env.WASENDER_PERSONAL_ACCESS_TOKEN
    if (!token) return NextResponse.json({ error: 'إعدادات الخادم ناقصة' }, { status: 500 })

    const { data: org } = await supabase.from('organizations').select('name,res_wa_session_id').eq('id', org_id).maybeSingle()
    if (!org) return NextResponse.json({ error: 'المنشأة غير موجودة' }, { status: 404 })

    let sessionId = (org as any).res_wa_session_id

    // ننشئ جلسة جديدة بس أول مرة — لو موجودة نعيد استخدامها
    if (!sessionId) {
      // فحص السقف — يمنع تجاوز عدد الجلسات المتاحة فعلياً بباقة WasenderAPI
      const { data: settings } = await supabase.from('platform_settings').select('wa_session_capacity').eq('id', 1).single()
      const capacity = (settings as any)?.wa_session_capacity ?? 3
      const { count } = await supabase.from('organizations').select('id', { count: 'exact', head: true }).not('res_wa_session_id', 'is', null)
      if ((count || 0) >= capacity) {
        return NextResponse.json({ error: 'الخدمة ممتلئة حالياً — تواصل معنا وراح نفعّلها لك بأقرب وقت' }, { status: 409 })
      }

      const { data: owner } = await supabase.from('profiles').select('phone').eq('org_id', org_id).eq('role', 'owner').maybeSingle()
      const phone = '+' + formatPhone((owner as any)?.phone || '966500000000')

      const createRes = await fetch('https://www.wasenderapi.com/api/whatsapp-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          name: `${(org as any).name} - حجوزات`,
          phone_number: phone,
          account_protection: true,
          log_messages: false,
        }),
      })
      const createJson = await createRes.json()
      if (!createRes.ok || !createJson?.success) {
        return NextResponse.json({ error: createJson?.message || 'فشل إنشاء الجلسة — تأكد من توفّر مساحة بباقة WasenderAPI' }, { status: 500 })
      }

      sessionId = createJson.data.id
      await supabase.from('organizations').update({
        res_wa_session_id: sessionId,
        res_wa_api_key: createJson.data.api_key,
        res_wa_status: 'connecting',
      } as any).eq('id', org_id)
    }

    // نبدأ عملية الاتصال (تفعّل رمز QR)
    const connectRes = await fetch(`https://www.wasenderapi.com/api/whatsapp-sessions/${sessionId}/connect`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
    })
    if (!connectRes.ok) {
      const j = await connectRes.json().catch(() => ({}))
      return NextResponse.json({ error: j?.message || 'فشل بدء الاتصال' }, { status: 500 })
    }

    return NextResponse.json({ success: true, sessionId })
  } catch (err: any) {
    console.error('WA_CONNECT_FAILED:', err?.message || err)
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
