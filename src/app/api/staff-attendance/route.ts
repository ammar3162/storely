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

    // تأكد الموظف فعلاً تابع لهذا الفرع/المنشأة
    const { data: staff } = await supabase.from('staff_members').select('id,name,branch_id').eq('id', staff_id).eq('org_id', org_id).maybeSingle()
    if (!staff) return NextResponse.json({ error: 'الموظف غير موجود' }, { status: 404 })

    const { data: branch } = await supabase.from('branches').select('latitude,longitude,attendance_radius_m,name').eq('id', branch_id).maybeSingle()
    if (!branch) return NextResponse.json({ error: 'الفرع غير موجود' }, { status: 404 })

    if (branch.latitude == null || branch.longitude == null) {
      return NextResponse.json({ error: 'موقع الفرع غير محدّد بعد — يرجى إبلاغ المالك لضبط موقع الفرع من صفحة إدارة الفروع' }, { status: 400 })
    }

    const dist = distanceMeters(Number(latitude), Number(longitude), Number(branch.latitude), Number(branch.longitude))
    const withinRange = dist <= (branch.attendance_radius_m || 150)

    if (!withinRange) {
      return NextResponse.json({
        error: `أنت بعيد عن الفرع بمسافة ${Math.round(dist)} متر — يجب أن تكون داخل نطاق ${branch.attendance_radius_m || 150} متر لتسجيل ${type==='check_in'?'الحضور':'الانصراف'}`,
      }, { status: 403 })
    }

    const { error: insErr } = await supabase.from('staff_attendance').insert({
      org_id, branch_id, staff_id, type,
      latitude, longitude, distance_m: Math.round(dist), within_range: true,
    } as any)
    if (insErr) return NextResponse.json({ error: 'فشل تسجيل الحضور — حاول مرة أخرى' }, { status: 500 })

    return NextResponse.json({ success: true, distance: Math.round(dist) })
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

    return NextResponse.json({ success: true, today: data || [] })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
