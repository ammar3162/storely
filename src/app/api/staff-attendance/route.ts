import { NextResponse } from 'next/server'
import { notifyStaffDeduction } from '@/lib/staffDeductionNotice'
import { createClient } from '@supabase/supabase-js'
import { verifyStaffToken, extractStaffToken } from '@/lib/staffAuth'
import { attendanceState, lateMinutesAt, activeShift, canCheckOutAt, type AttEvent } from '@/lib/attendanceState'
import { overtimeMinutes, loadOvertimeSettings, type Shift } from '@/lib/payroll'
import { applyLateRules } from '@/lib/latePenalty'
import { workDateFor, offReason, isMonthlyExtraDay, type OffReason, type OffConfig } from '@/lib/daysOff'

// يوم إجازة؟ (أسبوعية من المالك أو إجازة معتمدة) — لتاريخ دوام الموظف الحالي
type StaffOff = OffConfig & { id: string; monthly_off_days?: number | null }

// يوم إجازة؟ ثابت (أسبوعي، إجازة معتمدة، يوم بديل) أو — لرصيد الشهر المرن — خلّص أيام دوامه المطلوبة
async function dayOffFor(supabase: any, staff: StaffOff, org_id: string, shift: Shift): Promise<OffReason | null> {
  const date = workDateFor(Date.now(), shift)
  const monthly = staff.days_off_mode === 'monthly'
  const [{ data: leaves }, { data: comp }] = await Promise.all([
    supabase.from('staff_leave_requests').select('start_date,end_date')
      .eq('staff_id', staff.id).eq('org_id', org_id).eq('status', 'approved').lte('start_date', date).gte('end_date', date).limit(1),
    supabase.from('staff_extra_days').select('comp_date').eq('staff_id', staff.id).eq('org_id', org_id).eq('status', 'comp').eq('comp_date', date).limit(1),
  ])
  const fixed = offReason(date, staff, (leaves || []) as any[], ((comp || []) as any[]).map(c => c.comp_date))
  if (fixed || !monthly) return fixed
  // رصيد شهري: كم يوم داوم هالشهر قبل اليوم؟
  const month = date.slice(0, 7)
  const { data: ins } = await supabase.from('staff_attendance').select('recorded_at').eq('staff_id', staff.id).eq('org_id', org_id).eq('type', 'check_in')
    .gte('recorded_at', `${month}-01T00:00:00+03:00`).lt('recorded_at', `${date}T00:00:00+03:00`)
  const days = new Set(((ins || []) as any[]).map(r => new Date(Date.parse(r.recorded_at) + 3 * 3600e3).toISOString().slice(0, 10)))
  return isMonthlyExtraDay(month, Number(staff.monthly_off_days || 0), days.size) ? 'monthly' : null
}

// آخر حركات الموظف (يكفي آخر يومين) — لحالة «حاضر / انصرف / دوام جديد»
async function recentEvents(supabase: any, staff_id: string, org_id: string): Promise<AttEvent[]> {
  const { data } = await supabase.from('staff_attendance').select('id,type,recorded_at,shift_start_time,shift_end_time,shift_is_24h')
    .eq('staff_id', staff_id).eq('org_id', org_id)
    .gte('recorded_at', new Date(Date.now() - 48 * 3600e3).toISOString())
    .order('recorded_at', { ascending: false }).limit(20)
  return (data || []) as AttEvent[]
}

async function staffShift(supabase: any, shift_id: string | null): Promise<Shift> {
  if (!shift_id) return null
  const { data } = await supabase.from('shifts').select('start_time,end_time,is_24h').eq('id', shift_id).maybeSingle()
  return (data as Shift) || null
}

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
    // هوية الموظف من التوكن الموقّع فقط — كان أي أحد يقدر يسجّل حضور/انصراف لأي موظف بمعرّفه
    const auth = await verifyStaffToken(extractStaffToken(req))
    if (!auth.valid || !auth.data) return NextResponse.json({ error: auth.error }, { status: auth.reason === 'subscription_expired' ? 403 : 401 })
    const { staff_id, org_id } = auth.data
    const body = await req.json()
    const { type, latitude, longitude, accuracy_m } = body
    const branch_id: string | null = auth.data.branch_id || body.branch_id || null
    if (!branch_id || !type) {
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
      // ميزة الحضور مضمّنة أيضاً بإضافة "إدارة الموظفين الكاملة" (hr_full) حتى للباقة الأساسية -- نتحقق منها كبديل
      const { data: hrAddon } = await supabase
        .from('org_addon_subscriptions')
        .select('status,expires_at,marketplace_addons!inner(slug)')
        .eq('org_id', org_id).eq('status', 'active').eq('marketplace_addons.slug', 'hr_full').maybeSingle()
      const hasHrAddon = !!hrAddon && new Date((hrAddon as any).expires_at) > new Date()
      if (!hasHrAddon) {
        return NextResponse.json({ error: 'ميزة الحضور والانصراف متاحة فقط بالباقة المتوسطة أو المتقدمة، أو عبر إضافة "إدارة الموظفين الكاملة" — يرجى إبلاغ صاحب المنشأة' }, { status: 403 })
      }
    }

    // تأكد الموظف فعلاً تابع لهذا الفرع/المنشأة
    const { data: staff } = await supabase.from('staff_members').select('id,name,branch_id,shift_id,weekly_off_days,days_off_mode,monthly_off_days,biweekly_anchor,off_dates,monthly_salary').eq('id', staff_id).eq('org_id', org_id).maybeSingle()
    if (!staff) return NextResponse.json({ error: 'الموظف غير موجود' }, { status: 404 })
    // موقع التحقق لازم يكون فرع الموظف نفسه (مو أي فرع يرسله الطلب)
    if ((staff as any).branch_id && (staff as any).branch_id !== branch_id) return NextResponse.json({ error: 'الفرع غير صحيح' }, { status: 403 })

    // نفس قاعدة الواجهة: ما فيه حضور مرتين، ولا انصراف بدون حضور، والحضور يرجع يفتح لدوام جديد بس
    const currentShift = await staffShift(supabase, (staff as any).shift_id)
    const state = attendanceState({ events: await recentEvents(supabase, staff_id, org_id), shift: currentShift })
    if (type === 'check_in' && !state.canCheckIn) {
      return NextResponse.json({ error: state.checkedIn ? 'أنت مسجّل حضور بالفعل' : 'سجّلت انصرافك لهذا الدوام — الحضور يفتح مع بداية دوامك الجاي' }, { status: 409 })
    }
    if (type === 'check_out' && !state.canCheckOut) {
      return NextResponse.json({ error: 'سجّل حضورك أول' }, { status: 409 })
    }
    // الانصراف والأوفر تايم على الشفت اللي حضر عليه — تغيير الشفت وهو داخل دوامه يتطبّق من دوامه الجاي
    const sessionShift = activeShift(state.sessionIn, currentShift)

    const { data: branch } = await supabase.from('branches').select('latitude,longitude,attendance_radius_m,location_accuracy_m,name').eq('id', branch_id).eq('org_id', org_id).maybeSingle()
    if (!branch) return NextResponse.json({ error: 'الفرع غير موجود' }, { status: 404 })

    if (branch.latitude == null || branch.longitude == null) {
      return NextResponse.json({ error: 'موقع الفرع غير محدّد بعد — يرجى إبلاغ المالك لضبط موقع الفرع من صفحة إدارة الفروع' }, { status: 400 })
    }

    const dist = distanceMeters(Number(latitude), Number(longitude), Number(branch.latitude), Number(branch.longitude))
    // سماحية بقدر دقة الموقعين: موقع الفرع (لو انحدد من لابتوب يكون تقريبي، حتى 150 متر)
    // + GPS جوال الموظف (حتى 40 متر) — عشان الموقع ينفع يتحدد من أي جهاز
    const clamp = (v: unknown, max: number) => Math.min(Math.max(Number(v) || 0, 0), max)
    const tolerance = clamp((branch as any).location_accuracy_m, 150) + clamp(accuracy_m, 40)
    const withinRange = dist <= (branch.attendance_radius_m || 50) + tolerance

    if (!withinRange) {
      return NextResponse.json({
        error: `أنت بعيد عن الفرع بمسافة ${Math.round(dist)} متر — يجب أن تكون داخل نطاق ${branch.attendance_radius_m || 50} متر لتسجيل ${type==='check_in'?'الحضور':'الانصراف'}`,
      }, { status: 403 })
    }

    // يمنع تسجيل الانصراف قبل الوقت المحدد بشفت الموظف — إلا لو عنده استئذان موافق عليه اليوم
    let isExcused = false
    if (type === 'check_out' && sessionShift && state.sessionIn) {
      const shiftRow = sessionShift
      if (shiftRow && !shiftRow.is_24h && shiftRow.end_time) {
        // نهاية الشفت اللي حضر عليه فعلاً (يغطي الشفت الليلي والحضور المبكر قبل البداية)
        const shiftEnded = canCheckOutAt(Date.now(), Date.parse(state.sessionIn.recorded_at), shiftRow)
        if (!shiftEnded) {
          // استئذان موافق عليه خلال هالدوام (من وقت حضوره)
          const { data: approvedReq } = await supabase.from('attendance_permission_requests')
            .select('id').eq('staff_id', staff_id).eq('org_id', org_id).eq('status', 'approved')
            .gte('requested_at', state.sessionIn.recorded_at).limit(1).maybeSingle()
          if (approvedReq) {
            isExcused = true
          } else {
            return NextResponse.json({ error: `ما يصير تسجّل انصراف قبل الساعة ${String((shiftRow as any).end_time).slice(0,5)} (نهاية شفتك)` }, { status: 403 })
          }
        }
      }
    }

    let lateMinutes: number | null = null
    let penaltyAmount: number | null = null

    // يوم إجازة؟ الحضور فيه ينسجّل «دوام يوم إجازة» (يوم إضافي) بدون تأخير
    const offKind = type === 'check_in' ? await dayOffFor(supabase, staff as any, org_id, currentShift) : null
    const onDayOff = !!offKind

    // حساب التأخير — بس عند تسجيل الحضور، على بداية الشفت الأقرب (يغطي الشفت الليلي)
    if (type === 'check_in' && !onDayOff && currentShift && !currentShift.is_24h && currentShift.start_time) {
      // وقت السماح + مبلغ لكل ساعة (إعداد المالك بصفحة الحضور)
      const { data: lateCfg } = await supabase.from('organizations').select('late_grace_minutes,late_penalty_per_hour').eq('id', org_id).single()
      const r = applyLateRules(lateMinutesAt(Date.now(), currentShift), {
        graceMinutes: Number((lateCfg as any)?.late_grace_minutes || 0),
        perHour: (lateCfg as any)?.late_penalty_per_hour == null ? null : Number((lateCfg as any).late_penalty_per_hour),
      })
      lateMinutes = r.lateMinutes
      penaltyAmount = r.penalty
    }

    // الأوفر تايم يتثبّت لحظة الانصراف على شفت ذاك الوقت — تغيير الشفت بعدين ما يغيّر الأيام اللي فاتت
    let overtimeAtCheckout: number | null = null
    if (type === 'check_out') {
      const ot = await loadOvertimeSettings(supabase, org_id)
      overtimeAtCheckout = overtimeMinutes(new Date().toISOString(), sessionShift, ot.minMinutes)
    }

    const { data: insRow, error: insErr } = await supabase.from('staff_attendance').insert({
      org_id, branch_id, staff_id, type, is_excused: isExcused,
      latitude, longitude, distance_m: Math.round(dist), within_range: true,
      late_minutes: lateMinutes, penalty_amount: penaltyAmount,
      overtime_minutes: overtimeAtCheckout,
      ...(type === 'check_in' ? { on_day_off: onDayOff } : {}),
      // الحضور يثبّت شفت الموظف وقتها
      ...(type === 'check_in' ? {
        shift_start_time: currentShift?.start_time ?? null,
        shift_end_time: currentShift?.end_time ?? null,
        shift_is_24h: currentShift ? !!currentShift.is_24h : false,
      } : {}),
      accuracy_m: accuracy_m != null ? Number(accuracy_m) : null,
    } as any).select('id').single()
    if (insErr) return NextResponse.json({ error: 'فشل تسجيل الحضور — حاول مرة أخرى' }, { status: 500 })

    // دوام بيوم إجازة = يوم إضافي ينتظر قرار المالك (تعويض مالي / يوم بديل / رفض)
    if (type === 'check_in' && offKind && insRow) {
      const workDate = workDateFor(Date.now(), currentShift)
      const { data: extra } = await supabase.from('staff_extra_days').insert({
        org_id, staff_id, attendance_id: (insRow as any).id, work_date: workDate, reason: offKind === 'monthly' ? 'monthly' : 'weekly',
      } as any).select('id').single()
      if (extra) {
        await supabase.from('notifications').insert({
          org_id, branch_id, type: 'info', read: false,
          title: `يوم إضافي: ${(staff as any).name}`,
          message: offKind === 'monthly'
            ? `${(staff as any).name} داوم ${workDate} بعد ما خلّص أيام دوامه المطلوبة هالشهر — حدد التعويض: مبلغ أو يوم بديل.`
            : `${(staff as any).name} حضّر بيوم إجازته (${workDate}) — حدد التعويض: مبلغ أو يوم بديل.`,
          ref_type: 'extra_day', ref_id: (extra as any).id,
        } as any)
      }
    }
    // خصم تأخير؟ يوصل الموظف إشعار بصفحته على طول
    if (type === 'check_in' && penaltyAmount && penaltyAmount > 0) {
      await notifyStaffDeduction(supabase, org_id, staff_id, { kind: 'late', amount: penaltyAmount, minutes: lateMinutes || 0 })
    }

    // إشعارات المالك — عند الحضور فقط
    if (type === 'check_in') {
      if (lateMinutes && lateMinutes > 0) {
        const hrs = Math.floor(lateMinutes / 60)
        const mins = lateMinutes % 60
        const durationText = hrs > 0 ? `${hrs} ساعة${mins > 0 ? ` و${mins} دقيقة` : ''}` : `${mins} دقيقة`
        const penaltyText = penaltyAmount ? ` — غرامة ${penaltyAmount} ر.س تنخصم تلقائياً (تقدر تلغيها من تقرير الحضور)` : ''
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
    // سجل الموظف نفسه فقط — الهوية من التوكن (معاملات الرابط تُتجاهل)
    const auth = await verifyStaffToken(extractStaffToken(req))
    if (!auth.valid || !auth.data) return NextResponse.json({ error: auth.error }, { status: auth.reason === 'subscription_expired' ? 403 : 401 })
    const { staff_id, org_id } = auth.data

    const supabase = sb()

    const { data: orgCheck } = await supabase.from('organizations').select('plan').eq('id', org_id).single()
    if ((orgCheck as any)?.plan === 'basic') {
      const { data: hrAddon } = await supabase
        .from('org_addon_subscriptions')
        .select('status,expires_at,marketplace_addons!inner(slug)')
        .eq('org_id', org_id).eq('status', 'active').eq('marketplace_addons.slug', 'hr_full').maybeSingle()
      const hasHrAddon = !!hrAddon && new Date((hrAddon as any).expires_at) > new Date()
      if (!hasHrAddon) {
        return NextResponse.json({ success: true, locked: true, today: [], shift: null })
      }
    }

    const { data: staffRow } = await supabase.from('staff_members').select('id,shift_id,weekly_off_days,days_off_mode,monthly_off_days,biweekly_anchor,off_dates').eq('id', staff_id).eq('org_id', org_id).maybeSingle()
    const currentShift = await staffShift(supabase, (staffRow as any)?.shift_id || null)
    const st = attendanceState({ events: await recentEvents(supabase, staff_id, org_id), shift: currentShift })
    // وهو حاضر: نعرض شفت دوامه الحالي (اللي حضر عليه) — الشفت الجديد يبدأ من دوامه الجاي
    const shift = st.checkedIn ? activeShift(st.sessionIn, currentShift) : currentShift
    // today = الدوام الحالي/الأخير بس (حضور + انصراف) — الواجهة تبني الأزرار على state
    const data = [st.sessionOut, st.sessionIn].filter(Boolean)

    return NextResponse.json({ success: true, today: data, shift,
      state: { checkedIn: st.checkedIn, canCheckIn: st.canCheckIn, canCheckOut: st.canCheckOut, shiftStart: st.shiftStartMs ? new Date(st.shiftStartMs).toISOString() : null,
        dayOff: staffRow ? await dayOffFor(supabase, staffRow as any, org_id, currentShift) : null } })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
