import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyOrgAccess, enforcedBranchId } from '@/lib/verifyOrgAccess'
import { loadOwnedSupplier } from '@/lib/supplierAccess'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/

// موردو المنشأة النشطون (للفرع) + عدد رسائل الطلب الفاشلة لكل مورد آخر 24 ساعة + حد الموردين
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const org_id = searchParams.get('org_id')
    const branch_id = searchParams.get('branch_id')
    if (!org_id) return NextResponse.json({ error: 'org_id مطلوب' }, { status: 400 })

    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })
    const bid = enforcedBranchId(access, branch_id)

    const db = sb()
    let q = db.from('suppliers').select('id,name,phone,notify_mode,notify_time,notify_day,marketplace_supplier_id').eq('org_id', org_id).eq('is_active', true)
    if (bid) q = q.eq('branch_id', bid)
    const [{ data, error }, { data: org }] = await Promise.all([
      q.order('created_at', { ascending: false }),
      db.from('organizations').select('max_suppliers').eq('id', org_id).single(),
    ])
    if (error) return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })

    const failed_recent: Record<string, number> = {}
    const ids = (data || []).map((s: any) => s.id)
    if (ids.length) {
      const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const { data: logs } = await db.from('supplier_order_logs').select('supplier_id').eq('status', 'failed').gte('created_at', since24h).in('supplier_id', ids)
      for (const r of (logs || []) as any[]) failed_recent[r.supplier_id] = (failed_recent[r.supplier_id] || 0) + 1
    }

    return NextResponse.json({ success: true, suppliers: data || [], failed_recent, max_suppliers: (org as any)?.max_suppliers || 999 })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

// تعديل مورد: { phone } أو إعدادات الإرسال { notify_mode, notify_time, notify_day }
export async function PATCH(req: Request) {
  try {
    const body = await req.json()
    const { org_id, id } = body
    if (!org_id || !id) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })

    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })

    const db = sb()
    if (!(await loadOwnedSupplier(db, access, org_id, id))) return NextResponse.json({ error: 'المورد غير موجود' }, { status: 404 })

    const update: Record<string, unknown> = {}
    if ('phone' in body) {
      const phone = String(body.phone || '').trim()
      if (!phone) return NextResponse.json({ error: 'أدخل رقم صحيح' }, { status: 400 })
      update.phone = phone
    }
    if ('notify_mode' in body) update.notify_mode = String(body.notify_mode || '')
    if ('notify_time' in body) {
      if (!TIME_RE.test(String(body.notify_time || ''))) return NextResponse.json({ error: 'وقت غير صالح' }, { status: 400 })
      update.notify_time = body.notify_time
    }
    if ('notify_day' in body) {
      const day = Number(body.notify_day)
      if (!Number.isInteger(day) || day < 0 || day > 6) return NextResponse.json({ error: 'يوم غير صالح' }, { status: 400 })
      update.notify_day = day
    }
    if (!Object.keys(update).length) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })

    const { error } = await db.from('suppliers').update(update as any).eq('id', id).eq('org_id', org_id)
    if (error) return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

// حذف مورد — يفك ارتباط أصنافه أولاً
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const org_id = searchParams.get('org_id')
    const id = searchParams.get('id')
    if (!org_id || !id) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })

    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })

    const db = sb()
    if (!(await loadOwnedSupplier(db, access, org_id, id))) return NextResponse.json({ error: 'المورد غير موجود' }, { status: 404 })

    await db.from('products').update({ supplier_id: null, supplier_reorder_point: null, supplier_order_qty: 0 } as any).eq('supplier_id', id).eq('org_id', org_id)
    const { error } = await db.from('suppliers').delete().eq('id', id).eq('org_id', org_id)
    if (error) return NextResponse.json({ error: 'فشل حذف المورد' }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
