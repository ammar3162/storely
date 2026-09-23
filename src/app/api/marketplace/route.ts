import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyOrgAccess, enforcedBranchId, getCurrentProfile } from '@/lib/verifyOrgAccess'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
type DB = ReturnType<typeof sb>

function ratingsOf(reviews: any[]) {
  const grouped: Record<string, number[]> = {}
  for (const r of reviews) (grouped[r.supplier_id] ||= []).push(r.rating)
  const out: Record<string, { avg: number; count: number }> = {}
  for (const [sid, arr] of Object.entries(grouped)) out[sid] = { avg: arr.reduce((a, b) => a + b, 0) / arr.length, count: arr.length }
  return out
}

async function activeSupplier(db: DB, id: string) {
  const { data } = await db.from('supplier_profiles').select('id,business_name,phone,location,status').eq('id', id).eq('status', 'active').maybeSingle()
  return data as any
}

// سوق الموردين (للمسجلين فقط)
//   view=list                               الموردين المعتمدين + موردي الكتالوج مع أصنافهم وتقييماتهم
//   view=supplier&id&org_id&branch_id       صفحة مورد: الكتالوج + التقييم + طلبات التسعير والمحادثة الخاصة بالمنشأة
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const view = searchParams.get('view')
    if (!(await getCurrentProfile())) return NextResponse.json({ error: 'غير مسجل دخول' }, { status: 401 })
    const db = sb()

    if (view === 'list') {
      const [{ data: apps }, { data: profiles }] = await Promise.all([
        db.from('supplier_applications').select('id,company_name,business_type,description,phone,whatsapp,logo_url,offer,website')
          .eq('status', 'approved').eq('marketplace_consent', true).order('created_at', { ascending: false }),
        db.from('supplier_profiles').select('id,business_name,phone,location').eq('status', 'active').eq('is_visible', true),
      ])
      let newSuppliers: any[] = [], ratings = {}
      if (profiles?.length) {
        const ids = profiles.map((p: any) => p.id)
        const [{ data: items }, { data: reviews }] = await Promise.all([
          db.from('supplier_catalog_items').select('id,supplier_id,name,unit,price,image_url').eq('is_available', true).in('supplier_id', ids),
          db.from('supplier_reviews').select('supplier_id,rating').in('supplier_id', ids),
        ])
        newSuppliers = profiles.map((p: any) => ({ ...p, items: (items || []).filter((it: any) => it.supplier_id === p.id) })).filter(p => p.items.length > 0)
        ratings = ratingsOf(reviews || [])
      }
      return NextResponse.json({ success: true, suppliers: apps || [], new_suppliers: newSuppliers, ratings })
    }

    if (view === 'supplier') {
      const id = searchParams.get('id') || ''
      const supplier = await activeSupplier(db, id)
      if (!supplier) return NextResponse.json({ success: true, not_found: true })
      const [{ data: items }, { data: reviews }] = await Promise.all([
        db.from('supplier_catalog_items').select('id,name,unit,price,image_url,price_includes_vat').eq('supplier_id', id).eq('is_available', true).order('created_at', { ascending: false }),
        db.from('supplier_reviews').select('rating').eq('supplier_id', id),
      ])
      const out: any = {
        success: true, supplier, items: items || [],
        avg_rating: reviews?.length ? reviews.reduce((s: number, r: any) => s + r.rating, 0) / reviews.length : null,
        review_count: reviews?.length || 0,
      }

      const org_id = searchParams.get('org_id')
      if (org_id) {
        const access = await verifyOrgAccess(org_id)
        if (access.authorized) {
          const bid = enforcedBranchId(access, searchParams.get('branch_id'))
          let rq = db.from('quote_requests').select('id,items,status,quoted_price,quoted_note,created_at,delivery_date,rep_name,rep_phone,branch_id').eq('supplier_id', id).eq('org_id', org_id)
          let mq = db.from('chat_messages').select('id,sender_type,message,created_at,branch_id').eq('supplier_id', id).eq('org_id', org_id)
          if (bid) { rq = rq.eq('branch_id', bid); mq = mq.eq('branch_id', bid) }
          const [{ data: reqs }, { data: myReviews }, { data: msgs }, { data: org }] = await Promise.all([
            rq.order('created_at', { ascending: false }),
            db.from('supplier_reviews').select('quote_request_id').eq('org_id', org_id).eq('supplier_id', id),
            mq.order('created_at', { ascending: true }),
            db.from('organizations').select('name').eq('id', org_id).single(),
          ])
          Object.assign(out, {
            org_name: (org as any)?.name || '', my_requests: reqs || [],
            my_reviewed_ids: (myReviews || []).map((r: any) => r.quote_request_id), messages: msgs || [],
          })
        }
      }
      return NextResponse.json(out)
    }

    return NextResponse.json({ error: 'طلب غير معروف' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

// عمليات المنشأة مع مورد بالسوق: action = quote | chat | review | accept
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { action, org_id, supplier_id } = body
    if (!org_id || !supplier_id || !action) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })

    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })
    const db = sb()
    const supplier = await activeSupplier(db, supplier_id)
    if (!supplier) return NextResponse.json({ error: 'المورد غير موجود' }, { status: 404 })
    const { data: org } = await db.from('organizations').select('name').eq('id', org_id).single()
    const org_name = (org as any)?.name || ''
    const branch_id = enforcedBranchId(access, body.branch_id) || null

    if (action === 'quote') {
      // الأصناف تُقرأ من كتالوج المورد نفسه — الطلب يرسل المعرّفات والكميات فقط
      const wanted: Record<string, number> = {}
      for (const it of (Array.isArray(body.items) ? body.items : [])) {
        const qty = Number(it.qty) || 1
        if (it.id && qty > 0) wanted[String(it.id)] = qty
      }
      const ids = Object.keys(wanted)
      if (!ids.length) return NextResponse.json({ error: 'اختر أصناف' }, { status: 400 })
      const { data: catalog } = await db.from('supplier_catalog_items').select('id,name,unit').eq('supplier_id', supplier_id).in('id', ids)
      const items = (catalog || []).map((c: any) => ({ name: c.name, unit: c.unit, qty: wanted[c.id] }))
      if (!items.length) return NextResponse.json({ error: 'الأصناف غير متوفرة' }, { status: 400 })
      const { error } = await db.from('quote_requests').insert({ supplier_id, org_id, org_name, items, branch_id } as any)
      if (error) return NextResponse.json({ error: 'حدث خطأ أثناء إرسال الطلب' }, { status: 500 })
      return NextResponse.json({ success: true })
    }

    if (action === 'chat') {
      const message = String(body.message || '').trim().slice(0, 2000)
      if (!message) return NextResponse.json({ error: 'اكتب رسالة' }, { status: 400 })
      const { data, error } = await db.from('chat_messages').insert({ supplier_id, org_id, org_name, sender_type: 'customer', message, branch_id } as any)
        .select('id,sender_type,message,created_at,branch_id').single()
      if (error) return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
      return NextResponse.json({ success: true, message: data })
    }

    if (action === 'review') {
      const rating = Math.round(Number(body.rating))
      if (!(rating >= 1 && rating <= 5) || !body.quote_request_id) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
      // التقييم لطلب فعلي بين المنشأة والمورد، ومرة وحدة فقط
      const { data: qr } = await db.from('quote_requests').select('id').eq('id', body.quote_request_id).eq('org_id', org_id).eq('supplier_id', supplier_id).maybeSingle()
      if (!qr) return NextResponse.json({ error: 'الطلب غير موجود' }, { status: 404 })
      const { data: dup } = await db.from('supplier_reviews').select('id').eq('quote_request_id', body.quote_request_id).eq('org_id', org_id).limit(1)
      if (dup?.length) return NextResponse.json({ error: 'تم تقييم هذا الطلب مسبقاً' }, { status: 409 })
      const { error } = await db.from('supplier_reviews').insert({
        supplier_id, org_id, org_name, quote_request_id: body.quote_request_id, rating,
        comment: String(body.comment || '').trim().slice(0, 1000) || null,
      } as any)
      if (error) return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
      return NextResponse.json({ success: true })
    }

    if (action === 'accept') {
      const { data: qr } = await db.from('quote_requests').select('id').eq('id', body.request_id).eq('org_id', org_id).eq('supplier_id', supplier_id).maybeSingle()
      if (!qr) return NextResponse.json({ error: 'الطلب غير موجود' }, { status: 404 })
      // إضافة المورد لموردي المنشأة (أو ربطه لو موجود بنفس الاسم) — الاسم والرقم من ملف المورد
      const { data: existing } = await db.from('suppliers').select('id').eq('org_id', org_id).eq('name', supplier.business_name).limit(1)
      if (!existing?.length) {
        await db.from('suppliers').insert({ org_id, branch_id, name: supplier.business_name, phone: supplier.phone || null, marketplace_supplier_id: supplier_id } as any)
      } else {
        await db.from('suppliers').update({ marketplace_supplier_id: supplier_id, branch_id } as any).eq('id', (existing[0] as any).id)
      }
      await db.from('quote_requests').update({ status: 'accepted' } as any).eq('id', body.request_id)
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'عملية غير معروفة' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
