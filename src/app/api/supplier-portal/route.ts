import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getCurrentProfile } from '@/lib/verifyOrgAccess'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
type DB = ReturnType<typeof sb>

/** المورد المسجّل حالياً — هويته من الجلسة فقط (supplier_profiles.id = معرّف المستخدم) */
async function currentSupplier(db: DB) {
  const user = await getCurrentProfile()
  if (!user) return { user: null, supplier: null }
  const { data } = await db.from('supplier_profiles').select('*').eq('id', user.userId).maybeSingle()
  return { user, supplier: data as any }
}

/** طلب تسعير تابع لهذا المورد */
async function ownQuote(db: DB, supplierId: string, id: string) {
  const { data } = await db.from('quote_requests').select('id,org_id').eq('id', id).eq('supplier_id', supplierId).maybeSingle()
  return data as any
}

// لوحة المورد: الملف + الكتالوج + طلبات التسعير + المحادثات + التقييمات اللي أعطاها + المناديب
export async function GET() {
  try {
    const db = sb()
    const { user, supplier } = await currentSupplier(db)
    if (!user) return NextResponse.json({ error: 'غير مسجل دخول' }, { status: 401 })
    if (!supplier) return NextResponse.json({ error: 'هذا الحساب غير مسجّل كمورد', reason: 'not_supplier' }, { status: 404 })

    const id = supplier.id
    const [items, quotes, messages, given, reps] = await Promise.all([
      db.from('supplier_catalog_items').select('*').eq('supplier_id', id).order('created_at', { ascending: false }),
      db.from('quote_requests').select('id,org_id,org_name,items,status,quoted_price,quoted_note,created_at,delivery_date,rep_name,rep_phone,payment_status,paid_at')
        .eq('supplier_id', id).order('created_at', { ascending: false }),
      db.from('chat_messages').select('id,org_id,org_name,sender_type,message,created_at').eq('supplier_id', id).order('created_at', { ascending: true }),
      db.from('org_reviews').select('quote_request_id').eq('supplier_id', id),
      db.from('supplier_reps').select('id,name,phone').eq('supplier_id', id).order('created_at', { ascending: false }),
    ])
    return NextResponse.json({
      success: true, profile: supplier,
      items: items.data || [], quote_requests: quotes.data || [], messages: messages.data || [],
      given_review_ids: (given.data || []).map((r: any) => r.quote_request_id), reps: reps.data || [],
    })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

// عمليات المورد: body.action
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const db = sb()
    const { user, supplier } = await currentSupplier(db)
    if (!user) return NextResponse.json({ error: 'غير مسجل دخول' }, { status: 401 })

    // تسجيل مورد جديد بعد إنشاء حساب الدخول
    if (body.action === 'register') {
      if (supplier) return NextResponse.json({ success: true })
      const business_name = String(body.business_name || '').trim()
      if (!business_name) return NextResponse.json({ error: 'أدخل اسم النشاط' }, { status: 400 })
      const { error } = await db.from('supplier_profiles').insert({
        id: user.userId, business_name, phone: String(body.phone || '').trim() || null,
        email: user.email, location: String(body.location || '').trim() || null,
      } as any)
      if (error) return NextResponse.json({ error: 'حدث خطأ أثناء حفظ بيانات المورد' }, { status: 500 })
      return NextResponse.json({ success: true })
    }

    if (!supplier) return NextResponse.json({ error: 'هذا الحساب غير مسجّل كمورد' }, { status: 403 })
    const sid = supplier.id
    const ok = () => NextResponse.json({ success: true })
    const fail = (msg = 'حدث خطأ', status = 500) => NextResponse.json({ error: msg }, { status })

    switch (body.action) {
      case 'rep_add': {
        const name = String(body.name || '').trim(), phone = String(body.phone || '').trim()
        if (!name || !phone) return fail('بيانات ناقصة', 400)
        const { error } = await db.from('supplier_reps').insert({ supplier_id: sid, name, phone } as any)
        return error ? fail() : ok()
      }
      case 'rep_delete': {
        const { error } = await db.from('supplier_reps').delete().eq('id', body.id).eq('supplier_id', sid)
        return error ? fail() : ok()
      }
      case 'chat_reply': {
        const message = String(body.message || '').trim().slice(0, 2000)
        if (!message || !body.org_id) return fail('بيانات ناقصة', 400)
        // الرد فقط على منشأة سبق وتواصلت مع المورد (محادثة أو طلب تسعير)
        const [{ data: chat }, { data: quote }] = await Promise.all([
          db.from('chat_messages').select('id').eq('supplier_id', sid).eq('org_id', body.org_id).limit(1),
          db.from('quote_requests').select('id').eq('supplier_id', sid).eq('org_id', body.org_id).limit(1),
        ])
        if (!chat?.length && !quote?.length) return fail('غير مصرح', 403)
        const { data: org } = await db.from('organizations').select('name').eq('id', body.org_id).single()
        const { data, error } = await db.from('chat_messages').insert({
          supplier_id: sid, org_id: body.org_id, org_name: (org as any)?.name || 'عميل', sender_type: 'supplier', message,
        } as any).select('id,org_id,org_name,sender_type,message,created_at').single()
        return error ? fail() : NextResponse.json({ success: true, message: data })
      }
      case 'org_review': {
        const rating = Math.round(Number(body.rating))
        const q = await ownQuote(db, sid, body.quote_request_id)
        if (!q || !(rating >= 1 && rating <= 5)) return fail('بيانات ناقصة', 400)
        const { data: dup } = await db.from('org_reviews').select('id').eq('quote_request_id', q.id).eq('supplier_id', sid).limit(1)
        if (dup?.length) return fail('تم التقييم مسبقاً', 409)
        const { error } = await db.from('org_reviews').insert({ org_id: q.org_id, supplier_id: sid, quote_request_id: q.id, rating } as any)
        return error ? fail() : ok()
      }
      case 'quote_fulfill': {
        if (!(await ownQuote(db, sid, body.id))) return fail('الطلب غير موجود', 404)
        const { error } = await db.from('quote_requests').update({ status: 'fulfilled' } as any).eq('id', body.id)
        return error ? fail() : ok()
      }
      case 'quote_payment': {
        if (!(await ownQuote(db, sid, body.id))) return fail('الطلب غير موجود', 404)
        const paid = body.payment_status === 'paid'
        const { error } = await db.from('quote_requests').update({ payment_status: paid ? 'paid' : 'unpaid', paid_at: paid ? new Date().toISOString() : null } as any).eq('id', body.id)
        return error ? fail() : ok()
      }
      case 'quote_respond': {
        const price = Number(body.price)
        if (!(price >= 0) || body.price === '' || body.price == null) return fail('أدخل السعر', 400)
        if (!(await ownQuote(db, sid, body.id))) return fail('الطلب غير موجود', 404)
        const { error } = await db.from('quote_requests').update({
          status: 'quoted', quoted_price: price, quoted_note: String(body.note || '').trim() || null, responded_at: new Date().toISOString(),
        } as any).eq('id', body.id)
        return error ? fail() : ok()
      }
      case 'item_save': {
        const name = String(body.name || '').trim(), price = Number(body.price)
        if (!name || !(price >= 0)) return fail('بيانات ناقصة', 400)
        const imageUrl = body.image_url ? String(body.image_url) : null
        if (imageUrl && !imageUrl.startsWith(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/`)) return fail('رابط الصورة غير صالح', 400)
        const fields = { name, unit: String(body.unit || '').trim() || null, price, price_includes_vat: body.price_includes_vat !== false, image_url: imageUrl }
        const { error } = body.id
          ? await db.from('supplier_catalog_items').update({ ...fields, updated_at: new Date().toISOString() } as any).eq('id', body.id).eq('supplier_id', sid)
          : await db.from('supplier_catalog_items').insert({ ...fields, supplier_id: sid } as any)
        return error ? fail() : ok()
      }
      case 'item_toggle': {
        const { data: item } = await db.from('supplier_catalog_items').select('is_available').eq('id', body.id).eq('supplier_id', sid).maybeSingle()
        if (!item) return fail('الصنف غير موجود', 404)
        const { error } = await db.from('supplier_catalog_items').update({ is_available: !(item as any).is_available } as any).eq('id', body.id).eq('supplier_id', sid)
        return error ? fail() : ok()
      }
      case 'item_delete': {
        const { error } = await db.from('supplier_catalog_items').delete().eq('id', body.id).eq('supplier_id', sid)
        return error ? fail() : ok()
      }
      case 'visibility': {
        const { error } = await db.from('supplier_profiles').update({ is_visible: !!body.is_visible } as any).eq('id', sid)
        return error ? fail() : ok()
      }
      case 'account': {
        const business_name = String(body.business_name || '').trim()
        if (!business_name) return fail('أدخل اسم النشاط', 400)
        const { error } = await db.from('supplier_profiles').update({ business_name, location: String(body.location || '').trim() || null } as any).eq('id', sid)
        return error ? fail() : ok()
      }
    }
    return fail('عملية غير معروفة', 400)
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
