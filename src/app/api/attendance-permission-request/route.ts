import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'
import { sendWhatsAppMessage } from '@/lib/whatsapp'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const { org_id, branch_id, staff_id, staff_name, reason } = await req.json()
    if (!org_id || !branch_id || !staff_id) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })

    const supabase = sb()

    // ما نسمح بأكثر من طلب معلّق بنفس الوقت لنفس الموظف
    const { data: pending } = await supabase.from('attendance_permission_requests')
      .select('id').eq('staff_id', staff_id).eq('status', 'pending').maybeSingle()
    if (pending) return NextResponse.json({ error: 'عندك طلب استئذان قيد الانتظار بالفعل' }, { status: 400 })

    const token = randomBytes(16).toString('hex')
    const { data: inserted, error } = await supabase.from('attendance_permission_requests').insert({
      org_id, branch_id, staff_id, staff_name: staff_name || null, reason: reason?.trim() || null, token,
    } as any).select('id').single()
    if (error) return NextResponse.json({ error: 'فشل إرسال الطلب' }, { status: 500 })

    // نجيب رقم واتساب المالك ونرسله رابط الموافقة
    const { data: owner } = await supabase.from('profiles').select('phone').eq('org_id', org_id).eq('role', 'owner').maybeSingle()
    if ((owner as any)?.phone) {
      const origin = new URL(req.url).origin
      const link = `${origin}/permission/${token}`
      const text = `🙋 طلب استئذان\n\n${staff_name || 'موظف'} يطلب الانصراف قبل نهاية شفته${reason ? `\nالسبب: ${reason}` : ''}\n\nللموافقة أو الرفض:\n${link}`
      await sendWhatsAppMessage((owner as any).phone, text)
    }

    return NextResponse.json({ success: true, id: (inserted as any)?.id })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const { token, action } = await req.json()
    if (!token || !['approve', 'reject'].includes(action)) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })

    const supabase = sb()
    const { data: reqRow } = await supabase.from('attendance_permission_requests').select('id,status').eq('token', token).maybeSingle()
    if (!reqRow) return NextResponse.json({ error: 'الطلب غير موجود' }, { status: 404 })
    if ((reqRow as any).status !== 'pending') return NextResponse.json({ error: 'تم الرد على هذا الطلب مسبقاً' }, { status: 400 })

    const { error } = await supabase.from('attendance_permission_requests').update({
      status: action === 'approve' ? 'approved' : 'rejected', resolved_at: new Date().toISOString(),
    } as any).eq('token', token)
    if (error) return NextResponse.json({ error: 'فشل التحديث' }, { status: 500 })

    return NextResponse.json({ success: true, status: action === 'approve' ? 'approved' : 'rejected' })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const staff_id = searchParams.get('staff_id')
    const token = searchParams.get('token')
    const supabase = sb()

    if (token) {
      const { data } = await supabase.from('attendance_permission_requests')
        .select('staff_name,reason,status,requested_at').eq('token', token).maybeSingle()
      if (!data) return NextResponse.json({ error: 'الطلب غير موجود' }, { status: 404 })
      return NextResponse.json({ success: true, request: data })
    }

    if (!staff_id) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
    const { data } = await supabase.from('attendance_permission_requests')
      .select('id,status,reason,requested_at')
      .eq('staff_id', staff_id).gte('requested_at', todayStart.toISOString())
      .order('requested_at', { ascending: false }).limit(1).maybeSingle()

    return NextResponse.json({ success: true, request: data || null })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
