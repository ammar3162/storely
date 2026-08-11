import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { sendPushToOrg } from '@/lib/push'

export async function POST(req: Request) {
  try {
    const { quote_request_id, rep_name, rep_phone, delivery_date, supplier_business_name, org_id } = await req.json()
    if (!quote_request_id || !rep_name || !delivery_date || !org_id) {
      return NextResponse.json({ success: false, error: 'بيانات ناقصة' }, { status: 400 })
    }

    // تحقق من هوية المورد المتصل عبر جلسته الموثوقة (كوكيز) — لا نثق بأي معرف قادم من body
    const authClient = await createServerClient()
    const { data: { user: authedSupplier } } = await authClient.auth.getUser()
    if (!authedSupplier) {
      return NextResponse.json({ success: false, error: 'غير مصرح — سجّل الدخول أولاً' }, { status: 401 })
    }

    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // تأكد إن طلب العرض ده فعلاً يخص المورد المتصل نفسه
    const { data: quoteRequest } = await db.from('quote_requests').select('id,supplier_id').eq('id', quote_request_id).maybeSingle()
    if (!quoteRequest || (quoteRequest as any).supplier_id !== authedSupplier.id) {
      return NextResponse.json({ success: false, error: 'هذا الطلب لا يخصك' }, { status: 403 })
    }

    const { error: updateErr } = await db.from('quote_requests')
      .update({ status: 'confirmed', delivery_date, rep_name, rep_phone })
      .eq('id', quote_request_id)
    if (updateErr) return NextResponse.json({ success: false, error: updateErr.message }, { status: 500 })

    const notifTitle = 'مورد وافق على التوريد'
    const notifMsg = `${supplier_business_name || 'المورد'} وافق على توريد طلبك — المندوب: ${rep_name} (${rep_phone || ''}) — موعد التوريد: ${delivery_date}`
    const { error: notifErr } = await db.from('notifications').insert({
      org_id,
      title: notifTitle,
      message: notifMsg,
      type: 'success',
    })
    if (notifErr) console.error('notif insert failed:', notifErr.message)

    sendPushToOrg(org_id, notifTitle, notifMsg, '/marketplace').catch(()=>{})

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
