import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// المسافة بالمتر بين نقطتين (صيغة Haversine)
function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

export async function POST(req: Request) {
  try {
    const { staff_id, org_id, branch_id, type, latitude, longitude } = await req.json()
    if (!staff_id || !org_id || !branch_id || !type) {
      return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
    }
    if (!['check_in','check_out'].includes(type)) {
      return NextResponse.json({ error: 'نوع غير صحيح' }, { status: 400 })
    }
    if (latitude === undefined || longitude === undefined) {
      return NextResponse.json({ error: 'يلزم تفعيل الموقع الجغرافي (GPS) لتسجيل الحضور' }, { status: 400 })
    }

    const supabase = sb()

    const { data: orgCheck } = await supabase.from('organizations').select('plan').eq('id', org_id).single()
    if ((orgCheck as any)?.plan === 'basic') {
      return NextResponse.json({ error: 'ميزة الحضور والانصراف متاحة فقط بالباقة المتوسطة أو المتقدمة — يرجى إبلاغ صاحب المنشأة' }, { status: 403 })
    }

    // تأكد الموظف فعلاً تابع لهذا الفرع/المنشأة
    const { data: staff } = await supabase.from('staff_members').select('id,name,branch_id,shift_id').eq('id', staff_id).eq('org_id', org_id).maybeSingle()
    if (!staff) return NextResponse.json({ error: 'الموظف غير موجود' }, { status: 404 })

    const { data: branch } = await supabase.from('branches').select('latitude,longitude,attendance_radius_m,name').eq('id', branch_id).maybeSingle()
    if (!branch) return NextResponse.json({ error: 'الفرع غير موجود' }, { status: 404 })

    if (branch.latitude == null || branch.longitude == null) {
      return NextResponse.json({ error: 'موقع الفرع غير محدّد بعد — يرجى إبلاغ المالك لضبط موقع الفرع من صفحة إدارة الفروع' }, { status: 400 })
    }

    const dist = distanceMeters(Number(latitude), Number(longitude), Number(branch.latitude), Number(branch.longitude))
    const withinRange = dist <= (branch.attendance_radius_m || 50)

    if (!withinRange) {
      return NextResponse.json({
        error: `أنت بعيد عن الفرع بمسافة ${Math.round(dist)} متر — يجب أن تكون داخل نطاق ${branch.attendance_radius_m || 50} متر لتسجيل ${type==='check_in'?'الحضور':'الانصراف'}`,
      }, { status: 403 })
    }

    // يمنع تسجيل الانصراف قبل الوقت المحدد بشفت الموظف (تحقق من السيرفر — لا يعتمد فقط على الواجهة)
    if (type === 'check_out' && (staff as any).shift_id) {
      const { data: shiftRow } = await supabase.from('shifts').select('end_time,is_24h').eq('id', (staff as any).shift_id).maybeSingle()
      if (shiftRow && !(shiftRow as any).is_24h && (shiftRow as any).end_time) {
        const now = new Date()
        const saudiMinutes = ((now.getUTCHours()+3)%24)*60 + now.getUTCMinutes()
        const [eh, em] = String((shiftRow as any).end_time).slice(0,5).split(':').map(Number)
        const endMinutes = eh*60 + em
        if (saudiMinutes < endMinutes) {
          return NextResponse.json({ error: `ما يصير تسجّل انصراف قبل الساعة ${String((shiftRow as any).end_time).slice(0,5)} (نهاية شفتك)` }, { status: 403 })
        }
      }
    }

    let lateMinutes: number | null = null
    let penaltyAmount: number | null = null

    // حساب التأخير — بس عند تسجيل الحضور، ولو الموظف مرتبط بشفت له وقت بداية محدد
    if (type === 'check_in') {
      const { data: staffShift } = await supabase.from('staff_members').select('shift_id').eq('id', staff_id).single()
      const shiftId = (staffShift as any)?.shift_id
      if (shiftId) {
        const { data: shift } = await supabase.from('shifts').select('start_time,is_24h').eq('id', shiftId).maybeSingle()
        if (shift && !(shift as any).is_24h) {
          const now = new Date()
          const nowMinutes = ((now.getUTCHours() + 3) % 24) * 60 + now.getUTCMinutes()
          const [sh, sm] = String((shift as any).start_time).split(':').map(Number)
          const shiftStartMinutes = sh * 60 + sm
          const diff = nowMinutes - shiftStartMinutes
          lateMinutes = diff > 0 ? diff : 0

          if (lateMinutes > 0) {
            const { data: rules } = await supabase.from('late_penalty_rules').select('*').eq('org_id', org_id).order('min_minutes')
            const match = (rules || []).find((r: any) => lateMinutes! >= r.min_minutes && (r.max_minutes === null || lateMinutes! <= r.max_minutes))
            if (match) penaltyAmount = Number((match as any).penalty_amount)
          }
        }
      }
    }

    const { error: insErr } = await supabase.from('staff_attendance').insert({
      org_id, branch_id, staff_id, type,
      latitude, longitude, distance_m: Math.round(dist), within_range: true,
      late_minutes: lateMinutes, penalty_amount: penaltyAmount,
    } as any)
    if (insErr) return NextResponse.json({ error: 'فشل تسجيل الحضور — حاول مرة أخرى' }, { status: 500 })

    // إشعارات المالك — عند الحضور فقط
    if (type === 'check_in') {
      if (lateMinutes && lateMinutes > 0) {
        const hrs = Math.floor(lateMinutes / 60)
        const mins = lateMinutes % 60
        const durationText = hrs > 0 ? `${hrs} ساعة${mins > 0 ? ` و${mins} دقيقة` : ''}` : `${mins} دقيقة`
        const penaltyText = penaltyAmount ? ` — الغرامة المقترحة: ${penaltyAmount} ر.س` : ''
        await supabase.from('notifications').insert({
          org_id, branch_id, type: 'warning',
          title: 'تأخير موظف',
          message: `${(staff as any).name} سجّل حضوره متأخراً بـ${durationText}${penaltyText}`,
        } as any)
      } else {
        await supabase.from('notifications').insert({
          org_id, branch_id, type: 'success',
          title: 'حضور موظف',
          message: `${(staff as any).name} سجّل حضوره الآن`,
        } as any)
      }
    }

    return NextResponse.json({ success: true, distance: Math.round(dist), late_minutes: lateMinutes, penalty_amount: penaltyAmount })
  } catch (err: any) {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const staff_id = searchParams.get('staff_id')
    const org_id = searchParams.get('org_id')
    if (!staff_id || !org_id) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })

    const supabase = sb()
    const todayStart = new Date(); todayStart.setHours(0,0,0,0)
    const { data } = await supabase
      .from('staff_attendance')
      .select('id,type,recorded_at')
      .eq('staff_id', staff_id).eq('org_id', org_id)
      .gte('recorded_at', todayStart.toISOString())
      .order('recorded_at', { ascending: false })

    // نجيب شفت الموظف عشان نعرف الوقت المحدد للانصراف (يمنع الانصراف المبكر)
    let shift: any = null
    const { data: staffRow } = await supabase.from('staff_members').select('shift_id').eq('id', staff_id).maybeSingle()
    if ((staffRow as any)?.shift_id) {
      const { data: shiftRow } = await supabase.from('shifts').select('end_time,is_24h').eq('id', (staffRow as any).shift_id).maybeSingle()
      shift = shiftRow
    }

    return NextResponse.json({ success: true, today: data || [], shift })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
