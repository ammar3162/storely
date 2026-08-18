import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'
import { sendWhatsAppMessageWithKey } from '@/lib/whatsapp'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function hasActiveReservationAddon(supabase: any, orgId: string) {
  const { data: addon } = await supabase.from('marketplace_addons').select('id').eq('slug', 'table_reservations').maybeSingle()
  if (!addon) return false
  const { data: sub } = await supabase.from('org_addon_subscriptions').select('status,expires_at').eq('org_id', orgId).eq('addon_id', addon.id).eq('status', 'active').maybeSingle()
  return !!sub && new Date(sub.expires_at) > new Date()
}

// إنشاء حجز — عام، بدون تسجيل دخول (العميل النهائي)
export async function POST(req: Request) {
  try {
    const { slug, name, phone, guests, booking_date, booking_time, notes } = await req.json()
    if (!slug || !name || !phone || !booking_date || !booking_time) {
      return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
    }

    const supabase = sb()
    const { data: org } = await supabase.from('organizations').select('id,name,res_enabled,res_display_name,res_wa_status,res_wa_api_key').eq('res_slug', slug).maybeSingle()
    if (!org || !(org as any).res_enabled) return NextResponse.json({ error: 'الحجز غير متاح حالياً' }, { status: 404 })

    if (!(await hasActiveReservationAddon(supabase, (org as any).id))) {
      return NextResponse.json({ error: 'الحجز غير متاح حالياً' }, { status: 404 })
    }

    const bookingDateTime = new Date(`${booking_date}T${booking_time}:00`)
    if (bookingDateTime <= new Date()) return NextResponse.json({ error: 'يرجى اختيار وقت في المستقبل' }, { status: 400 })

    const id = 'RES-' + Date.now().toString(36).toUpperCase() + randomBytes(2).toString('hex').toUpperCase()

    const { data, error } = await supabase.from('reservations').insert({
      id, org_id: (org as any).id, customer_name: name.trim(), phone: phone.trim(),
      guests: Number(guests) || 2, booking_date, booking_time, notes: notes?.trim() || null,
    } as any).select().single()

    if (error) return NextResponse.json({ error: 'فشل إنشاء الحجز' }, { status: 500 })

    // إشعار واتساب تلقائي — بس لو المنشأة ربطت رقمها
    if ((org as any).res_wa_status === 'connected' && (org as any).res_wa_api_key) {
      const orgName = (org as any).res_display_name || (org as any).name
      const text = `مرحباً ${name} 👋

تم تأكيد استلام حجزك بـ${orgName}

📅 ${booking_date}
🕐 ${booking_time}
👥 ${guests || 2} أشخاص

رقم الحجز: #${id}`
      sendWhatsAppMessageWithKey((org as any).res_wa_api_key, phone.trim(), text).catch(() => {})
    }

    return NextResponse.json({ success: true, reservation: data })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

// تتبّع حجوزات العميل حسب رقمه — عام
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const slug = searchParams.get('slug')
    const phone = searchParams.get('phone')
    if (!slug || !phone) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })

    const supabase = sb()
    const { data: org } = await supabase.from('organizations').select('id').eq('res_slug', slug).maybeSingle()
    if (!org) return NextResponse.json({ error: 'غير موجود' }, { status: 404 })

    const { data } = await supabase.from('reservations').select('*')
      .eq('org_id', (org as any).id).eq('phone', phone.trim())
      .order('created_at', { ascending: false }).limit(5)

    return NextResponse.json({ success: true, reservations: data || [] })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
