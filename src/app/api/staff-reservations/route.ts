import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyStaffToken, extractStaffToken } from '@/lib/staffAuth'
import { sendWhatsAppMessageWithKey } from '@/lib/whatsapp'

const STATUS_AR: Record<string,string> = { confirmed: 'تم تأكيد حجزك ✅', ready: 'طاولتك جاهزة الآن 🎉', completed: 'شكراً لزيارتك 🙏', cancelled: 'تم إلغاء حجزك 🚫' }

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: Request) {
  const auth = verifyStaffToken(extractStaffToken(req))
  if (!auth.valid) return NextResponse.json({ error: auth.error }, { status: 401 })
  const { org_id: orgId } = auth.data!

  const supabase = sb()
  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date')

  let q = supabase.from('reservations').select('*').eq('org_id', orgId)
  if (date) q = q.eq('booking_date', date)
  const { data } = await q.order('booking_time')

  return NextResponse.json({ success: true, reservations: data || [] })
}

export async function PATCH(req: Request) {
  const auth = verifyStaffToken(extractStaffToken(req))
  if (!auth.valid) return NextResponse.json({ error: auth.error }, { status: 401 })
  const { org_id: orgId } = auth.data!

  const { reservation_id, status } = await req.json()
  if (!reservation_id || !status) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
  if (!['pending','confirmed','ready','completed','cancelled'].includes(status)) {
    return NextResponse.json({ error: 'حالة غير صحيحة' }, { status: 400 })
  }

  const supabase = sb()
  const { data: existing } = await supabase.from('reservations').select('org_id,customer_name,phone').eq('id', reservation_id).maybeSingle()
  if (!existing || (existing as any).org_id !== orgId) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })

  const { error } = await supabase.from('reservations').update({ status } as any).eq('id', reservation_id)
  if (error) return NextResponse.json({ error: 'فشل التحديث' }, { status: 500 })

  // إشعار واتساب تلقائي بتغيّر الحالة — بس لو المنشأة ربطت رقمها
  if (STATUS_AR[status]) {
    const { data: org } = await supabase.from('organizations').select('res_display_name,name,res_wa_status,res_wa_api_key').eq('id', orgId).maybeSingle()
    if ((org as any)?.res_wa_status === 'connected' && (org as any)?.res_wa_api_key) {
      const orgName = (org as any).res_display_name || (org as any).name
      const text = `${STATUS_AR[status]}

${orgName} — حجز #${reservation_id}`
      sendWhatsAppMessageWithKey((org as any).res_wa_api_key, (existing as any).phone, text).catch(() => {})
    }
  }

  return NextResponse.json({ success: true })
}
