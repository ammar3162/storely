import { notifyInsert } from '@/lib/notify'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const { quote_request_id, rep_name, rep_phone, delivery_date } = await req.json()
    if (!quote_request_id || !rep_name || !delivery_date) {
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
    // المنشأة واسم المورد من الطلب نفسه وملف المورد — مو من الطلب المرسل (كان يقدر يرسل إشعار لأي منشأة)
    const { data: quoteRequest } = await db.from('quote_requests').select('id,supplier_id,org_id').eq('id', quote_request_id).maybeSingle()
    if (!quoteRequest || (quoteRequest as any).supplier_id !== authedSupplier.id) {
      return NextResponse.json({ success: false, error: 'هذا الطلب لا يخصك' }, { status: 403 })
    }
    const org_id = (quoteRequest as any).org_id as string
    const { data: supplierProfile } = await db.from('supplier_profiles').select('business_name').eq('id', authedSupplier.id).maybeSingle()
    const supplier_business_name = String((supplierProfile as any)?.business_name || '').slice(0, 80)
    const clean = (v: unknown, n: number) => String(v ?? '').replace(/[\r\n]+/g, ' ').trim().slice(0, n)

    const { error: updateErr } = await db.from('quote_requests')
      .update({ status: 'confirmed', delivery_date, rep_name, rep_phone })
      .eq('id', quote_request_id)
    if (updateErr) return NextResponse.json({ success: false, error: updateErr.message }, { status: 500 })

    const notifTitle = 'مورد وافق على التوريد'
    const notifMsg = `${supplier_business_name || 'المورد'} وافق على توريد طلبك — المندوب: ${clean(rep_name, 60)} (${clean(rep_phone, 20)}) — موعد التوريد: ${clean(delivery_date, 20)}`
    const { error: notifErr } = await notifyInsert(db, {
      org_id,
      title: notifTitle,
      message: notifMsg,
      type: 'success',
    })
    if (notifErr) console.error('notif insert failed:', notifErr.message)


    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
