import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyOrgAccess, enforcedBranchId } from '@/lib/verifyOrgAccess'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const BRANCH_FIELDS = 'id,name,location,whatsapp_number,latitude,longitude'

async function maxBranchesFor(db: ReturnType<typeof sb>, org_id: string) {
  const { data } = await db.from('organizations').select('max_branches').eq('id', org_id).single()
  return Number((data as any)?.max_branches) || 1
}

async function activeCount(db: ReturnType<typeof sb>, org_id: string) {
  const { count } = await db.from('branches').select('id', { count: 'exact', head: true }).eq('org_id', org_id).eq('is_active', true)
  return count || 0
}

// قائمة الفروع النشطة (مدير الفرع يشوف فرعه فقط)
// include_inactive=1 (للمالك): يضيف الفروع الموقوفة وحد الباقة
// with_limits=1: يضيف max_staff لكل فرع (استعلام منفصل — لو فشل ترجع الفروع بدونه)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const org_id = searchParams.get('org_id')
    const includeInactive = searchParams.get('include_inactive') === '1'
    const withLimits = searchParams.get('with_limits') === '1'
    if (!org_id) return NextResponse.json({ error: 'org_id مطلوب' }, { status: 400 })

    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })
    const effectiveBranchId = enforcedBranchId(access)

    const db = sb()
    let q = db.from('branches').select(BRANCH_FIELDS).eq('org_id', org_id).eq('is_active', true)
    if (effectiveBranchId) q = q.eq('id', effectiveBranchId)
    const { data, error } = await q.order('created_at')
    if (error) return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })

    if (withLimits && data?.length) {
      const { data: limits, error: limErr } = await db.from('branches').select('id,max_staff').in('id', data.map((b: any) => b.id))
      if (!limErr) {
        const byId = new Map((limits || []).map((l: any) => [l.id, l.max_staff]))
        for (const b of data as any[]) b.max_staff = byId.get(b.id) ?? null
      }
    }

    if (!includeInactive || access.role !== 'owner') return NextResponse.json({ success: true, branches: data || [] })

    const [{ data: inactive }, max_branches] = await Promise.all([
      db.from('branches').select(BRANCH_FIELDS).eq('org_id', org_id).eq('is_active', false).order('created_at'),
      maxBranchesFor(db, org_id),
    ])
    return NextResponse.json({ success: true, branches: data || [], inactive: inactive || [], max_branches })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

// إضافة فرع جديد (المالك فقط) — مع فرض حد الباقة على الخادم
export async function POST(req: Request) {
  try {
    const { org_id, name, location } = await req.json()
    if (!org_id || !String(name || '').trim()) return NextResponse.json({ error: 'أدخل اسم الفرع' }, { status: 400 })

    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })
    if (access.role !== 'owner') return NextResponse.json({ error: 'هذي الصلاحية للمالك فقط' }, { status: 403 })

    const db = sb()
    const [max, active] = await Promise.all([maxBranchesFor(db, org_id), activeCount(db, org_id)])
    if (active >= max) return NextResponse.json({ error: `وصلت للحد الأقصى لباقتك (${max} فرع) — رقّي باقتك لإضافة المزيد` }, { status: 403 })

    const { data, error } = await db.from('branches')
      .insert({ org_id, name: String(name).trim(), location: String(location || '').trim() || null } as any)
      .select(BRANCH_FIELDS).single()
    if (error || !data) return NextResponse.json({ error: 'فشل إضافة الفرع' }, { status: 500 })
    return NextResponse.json({ success: true, branch: data })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

// تعديل فرع: الاسم / الإيقاف وإعادة التفعيل / رقم الواتساب (المالك فقط)
// أو حفظ الموقع (المالك لأي فرع، مدير الفرع لفرعه فقط)
export async function PATCH(req: Request) {
  try {
    const body = await req.json()
    const { org_id, id } = body
    if (!org_id || !id) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })

    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })

    const db = sb()
    const update: Record<string, unknown> = {}

    if ('latitude' in body || 'longitude' in body) {
      const lat = Number(body.latitude), lng = Number(body.longitude)
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
        return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
      }
      const effectiveBranchId = enforcedBranchId(access)
      if (effectiveBranchId && effectiveBranchId !== id) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
      update.latitude = lat
      update.longitude = lng
    } else {
      if (access.role !== 'owner') return NextResponse.json({ error: 'هذي الصلاحية للمالك فقط' }, { status: 403 })

      if ('name' in body) {
        const name = String(body.name || '').trim()
        if (!name) return NextResponse.json({ error: 'أدخل اسم الفرع' }, { status: 400 })
        update.name = name
      }
      if ('whatsapp_number' in body) {
        update.whatsapp_number = body.whatsapp_number ? String(body.whatsapp_number).trim() : null
      }
      if ('is_active' in body) {
        const active = await activeCount(db, org_id)
        if (body.is_active === true) {
          const max = await maxBranchesFor(db, org_id)
          if (active >= max) return NextResponse.json({ error: 'الباقة ممتلئة — رقّي باقتك لتفعيل فرع إضافي' }, { status: 403 })
        } else if (active <= 1) {
          return NextResponse.json({ error: 'لا يمكن إيقاف الفرع الوحيد' }, { status: 400 })
        }
        update.is_active = !!body.is_active
      }
      if (!Object.keys(update).length) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
    }

    const { data, error } = await db.from('branches').update(update as any).eq('id', id).eq('org_id', org_id).select('id')
    if (error) return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
    if (!data?.length) return NextResponse.json({ error: 'الفرع غير موجود' }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
