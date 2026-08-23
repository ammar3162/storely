import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyOrgAccess } from '@/lib/verifyOrgAccess'
import { verifyStaffToken, extractStaffToken } from '@/lib/staffAuth'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function todayStr() {
  // بتوقيت السعودية (UTC+3) عشان "اليوم" يتماشى مع دوام الموظف الفعلي
  const now = new Date()
  const saudi = new Date(now.getTime() + 3 * 60 * 60 * 1000)
  return saudi.toISOString().slice(0, 10)
}

// جلب المهام — للمالك (org_id بالـquery، اختياري staff_id للفلترة) أو للموظف (توكن، مهامه فقط)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const orgIdParam = searchParams.get('org_id')
    const staffIdParam = searchParams.get('staff_id')
    const supabase = sb()

    if (orgIdParam) {
      // طرف المالك — يشوف كل المهام (القوالب اليومية + العادية)، بدون توليد تلقائي
      const access = await verifyOrgAccess(orgIdParam)
      if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })

      let q = supabase.from('staff_tasks').select('*,staff_members(name)').eq('org_id', orgIdParam).order('created_at', { ascending: false })
      if (staffIdParam) q = q.eq('staff_id', staffIdParam)
      const { data, error } = await q
      if (error) return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
      return NextResponse.json({ success: true, tasks: data || [] })
    }

    // طرف الموظف — نولّد نسخة اليوم لأي مهمة يومية أول، ثم نرجع مهامه (بدون القوالب نفسها)
    const auth = verifyStaffToken(extractStaffToken(req))
    if (!auth.valid) return NextResponse.json({ error: auth.error }, { status: 401 })
    const { org_id, staff_id } = auth.data!

    const today = todayStr()

    const { data: templates } = await supabase
      .from('staff_tasks')
      .select('id,org_id,branch_id,staff_id,title,description,requires_photo')
      .eq('org_id', org_id).eq('staff_id', staff_id).eq('is_daily', true)

    for (const tpl of (templates || []) as any[]) {
      const { data: existing } = await supabase
        .from('staff_tasks')
        .select('id')
        .eq('template_id', tpl.id)
        .gte('created_at', `${today}T00:00:00.000+03:00`)
        .lte('created_at', `${today}T23:59:59.999+03:00`)
        .maybeSingle()
      if (!existing) {
        await supabase.from('staff_tasks').insert({
          org_id: tpl.org_id, branch_id: tpl.branch_id, staff_id: tpl.staff_id,
          title: tpl.title, description: tpl.description, requires_photo: tpl.requires_photo,
          status: 'pending', template_id: tpl.id, is_daily: false,
        } as any)
      }
    }

    const { data, error } = await supabase
      .from('staff_tasks').select('*').eq('org_id', org_id).eq('staff_id', staff_id)
      .eq('is_daily', false) // نخفي القوالب نفسها عن الموظف، يشوف بس النسخ اليومية والمهام العادية
      .order('created_at', { ascending: false })
    if (error) return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })

    return NextResponse.json({ success: true, tasks: data || [] })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

// المالك يولّد مهمة أو عدة مهام لموظف/موظفين
export async function POST(req: Request) {
  try {
    const { org_id, branch_id, staff_ids, title, description, requires_photo } = await req.json()
    if (!org_id || !title || !Array.isArray(staff_ids) || staff_ids.length === 0) {
      return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
    }

    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })

    const supabase = sb()
    const { data: orgCheck } = await supabase.from('organizations').select('plan').eq('id', org_id).single()
    if ((orgCheck as any)?.plan === 'basic') {
      return NextResponse.json({ error: 'ميزة المهام متاحة فقط بالباقة المتوسطة أو المتقدمة' }, { status: 403 })
    }

    const rows = staff_ids.map((sid: string) => ({
      org_id, branch_id: branch_id || null, staff_id: sid,
      title, description: description || null, requires_photo: !!requires_photo,
      status: 'pending',
    }))

    const { error } = await supabase.from('staff_tasks').insert(rows as any)
    if (error) return NextResponse.json({ error: 'فشل إنشاء المهام' }, { status: 500 })

    return NextResponse.json({ success: true, count: rows.length })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

// الموظف يكمّل مهمة (بتوكنه)، أو المالك يؤكد/يرفض إتمام مهمة أو يفعّل/يوقف التكرار اليومي (بـorg_id)
export async function PATCH(req: Request) {
  try {
    const body = await req.json()
    const supabase = sb()

    if (body.org_id) {
      const { org_id, task_id } = body
      const access = await verifyOrgAccess(org_id)
      if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })

      if (body.toggle_daily !== undefined) {
        // تفعيل/إيقاف تكرار المهمة اليومي
        const { data: task } = await supabase.from('staff_tasks').select('id,is_daily').eq('id', task_id).eq('org_id', org_id).maybeSingle()
        if (!task) return NextResponse.json({ error: 'المهمة غير موجودة' }, { status: 404 })
        const { error } = await supabase.from('staff_tasks').update({ is_daily: !((task as any).is_daily) } as any).eq('id', task_id)
        if (error) return NextResponse.json({ error: 'فشل التحديث' }, { status: 500 })
        return NextResponse.json({ success: true, is_daily: !((task as any).is_daily) })
      }

      // المالك يؤكد/يرفض
      const { decision } = body
      if (!task_id || !['confirmed', 'rejected'].includes(decision)) {
        return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
      }
      const { data: task } = await supabase.from('staff_tasks').select('id,status').eq('id', task_id).eq('org_id', org_id).maybeSingle()
      if (!task) return NextResponse.json({ error: 'المهمة غير موجودة' }, { status: 404 })
      if ((task as any).status !== 'completed') return NextResponse.json({ error: 'المهمة لسه ما اكتملت من الموظف' }, { status: 400 })

      const { error } = await supabase.from('staff_tasks').update({
        status: decision, confirmed_by: 'owner', confirmed_at: new Date().toISOString(),
      } as any).eq('id', task_id)
      if (error) return NextResponse.json({ error: 'فشل التحديث' }, { status: 500 })
      return NextResponse.json({ success: true })
    } else {
      // الموظف يكمّل مهمته
      const auth = verifyStaffToken(extractStaffToken(req))
      if (!auth.valid) return NextResponse.json({ error: auth.error }, { status: 401 })
      const { org_id, staff_id } = auth.data!
      const { task_id, photo_url } = body
      if (!task_id) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })

      const { data: task } = await supabase.from('staff_tasks').select('id,requires_photo,status').eq('id', task_id).eq('org_id', org_id).eq('staff_id', staff_id).maybeSingle()
      if (!task) return NextResponse.json({ error: 'المهمة غير موجودة' }, { status: 404 })
      if ((task as any).status !== 'pending') return NextResponse.json({ error: 'تم إتمام هذي المهمة مسبقاً' }, { status: 400 })
      if ((task as any).requires_photo && !photo_url) return NextResponse.json({ error: 'هذي المهمة تحتاج صورة إثبات' }, { status: 400 })

      const { error } = await supabase.from('staff_tasks').update({
        status: 'completed', photo_url: photo_url || null, completed_at: new Date().toISOString(),
      } as any).eq('id', task_id)
      if (error) return NextResponse.json({ error: 'فشل التحديث' }, { status: 500 })
      return NextResponse.json({ success: true })
    }
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
