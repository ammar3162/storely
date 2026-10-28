import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyOrgAccess, enforcedBranchId } from '@/lib/verifyOrgAccess'
import { isStoredInvoiceUrl } from '@/lib/invoiceUrl'
import { OCR_TYPES } from '@/lib/invoiceFile'
import { readInvoice } from '@/lib/invoiceOcr'
import { classifyItems, applyAnswer, draftStatus, aliasKey, type AgentItem } from '@/lib/invoiceAgent'

// قراءة فاتورة مفصّلة تاخذ أكثر من ١٠ ثواني
export const maxDuration = 60
const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const DRAFT_COLS = 'id,branch_id,invoice_image,supplier,supplier_vat_number,invoice_number,invoice_date,has_vat,total,items,status,result_summary,created_at'
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

async function branchProducts(db: any, orgId: string, branchId: string | null) {
  let q = db.from('products').select('id,name,unit').eq('org_id', orgId).eq('is_active', true)
  if (branchId) q = q.eq('branch_id', branchId)
  return ((await q.limit(2000)).data || []) as { id: string; name: string; unit: string | null }[]
}

// المسودات المفتوحة (تنتظر إجابة أو تأكيد)
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams
  const org_id = sp.get('org_id') || ''
  const access = await verifyOrgAccess(org_id)
  if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })
  const bid = enforcedBranchId(access, sp.get('branch_id'))
  let q = sb().from('invoice_drafts').select(DRAFT_COLS).eq('org_id', org_id).in('status', ['needs_review', 'ready']).order('created_at', { ascending: false }).limit(20)
  if (bid) q = q.eq('branch_id', bid)
  const { data } = await q
  return NextResponse.json({ success: true, drafts: data || [] })
}

// فاتورة جديدة: يقرأها الوكيل ويطابق أصنافها ويحفظها مسودة
export async function POST(req: Request) {
  try {
    const { org_id, branch_id, image, mediaType, invoice_image } = await req.json()
    if (!org_id || !image || typeof image !== 'string') return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })
    if (invoice_image && !isStoredInvoiceUrl(invoice_image)) return NextResponse.json({ error: 'رابط الفاتورة غير صالح — ارفع الصورة من جديد' }, { status: 400 })
    const db = sb()
    const bid = enforcedBranchId(access, branch_id) || null
    if (bid) {
      const { data: b } = await db.from('branches').select('id').eq('id', bid).eq('org_id', org_id).maybeSingle()
      if (!b) return NextResponse.json({ error: 'الفرع غير موجود' }, { status: 404 })
    }

    const type = (OCR_TYPES as readonly string[]).includes(mediaType) ? mediaType : 'image/jpeg'
    const ocr = await readInvoice(image, type)
    if (!ocr.ok) return NextResponse.json({ error: ocr.error, ...(ocr.unavailable ? { unavailable: true } : {}) }, { status: ocr.status })
    const d = ocr.data
    const rawItems = Array.isArray(d.items) && d.items.length ? d.items
      : (Number(d.total_amount) > 0 ? [{ name: d.supplier ? `مشتريات من ${d.supplier}` : 'صنف', qty: 1, unit: null, total: Number(d.total_amount) }] : [])
    if (!rawItems.length) return NextResponse.json({ error: 'ما لقينا أصناف بالفاتورة — جرّب صورة أوضح' }, { status: 422 })

    const [products, { data: al }] = await Promise.all([
      branchProducts(db, org_id, bid),
      db.from('product_aliases').select('alias_norm,product_id').eq('org_id', org_id),
    ])
    const aliases = Object.fromEntries(((al || []) as any[]).map(a => [a.alias_norm, a.product_id]))
    const items = classifyItems(rawItems, products, aliases)
    const { data: draft, error } = await db.from('invoice_drafts').insert({
      org_id, branch_id: bid, created_by: access.userId, invoice_image: invoice_image || null,
      supplier: d.supplier ? String(d.supplier).slice(0, 120) : null, supplier_vat_number: d.supplier_vat_number || null,
      invoice_number: d.invoice_number || null, invoice_date: DATE_RE.test(String(d.invoice_date || '')) ? d.invoice_date : null,
      has_vat: !!d.has_vat, total: Number(d.total_amount) > 0 ? Math.round(Number(d.total_amount) * 100) / 100 : null,
      items, status: draftStatus(items),
    } as any).select(DRAFT_COLS).single()
    if (error || !draft) return NextResponse.json({ error: 'تعذر حفظ المسودة' }, { status: 500 })
    return NextResponse.json({ success: true, draft })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ أثناء قراءة الفاتورة' }, { status: 500 })
  }
}

// إجابة العميل على صنف، أو تعديل بيانات الفاتورة (المورد/التاريخ/الضريبة)
export async function PATCH(req: Request) {
  try {
    const body = await req.json()
    const { org_id, id } = body
    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })
    const db = sb()
    const { data: draft } = await db.from('invoice_drafts').select('id,branch_id,items,status').eq('id', id).eq('org_id', org_id).maybeSingle()
    if (!draft) return NextResponse.json({ error: 'المسودة غير موجودة' }, { status: 404 })
    const dr = draft as any
    const bid = enforcedBranchId(access)
    if (bid && dr.branch_id !== bid) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
    if (!['needs_review', 'ready'].includes(dr.status)) return NextResponse.json({ error: 'الفاتورة انحفظت أو انلغت' }, { status: 409 })

    const update: any = {}
    if (typeof body.supplier === 'string') update.supplier = body.supplier.trim().slice(0, 120) || null
    if (typeof body.invoice_date === 'string' && DATE_RE.test(body.invoice_date)) update.invoice_date = body.invoice_date
    if (typeof body.has_vat === 'boolean') update.has_vat = body.has_vat

    let items: AgentItem[] = Array.isArray(dr.items) ? dr.items : []
    if (Number.isInteger(body.index)) {
      const i = body.index as number
      if (i < 0 || i >= items.length || !['match', 'new', 'skip', 'set'].includes(body.action)) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
      let productName: string | null = null
      if (body.action === 'match') {
        // الصنف لازم يكون من نفس المنشأة والفرع
        let q = db.from('products').select('id,name').eq('id', body.product_id).eq('org_id', org_id).eq('is_active', true)
        if (dr.branch_id) q = q.eq('branch_id', dr.branch_id)
        const { data: p } = await q.maybeSingle()
        if (!p) return NextResponse.json({ error: 'الصنف غير موجود' }, { status: 404 })
        productName = (p as any).name
        // يتعلم: المرة الجاية نفس الاسم ينربط بدون سؤال
        await db.from('product_aliases').upsert({ org_id, product_id: (p as any).id, alias_norm: aliasKey(items[i].name) } as any, { onConflict: 'org_id,alias_norm' })
      }
      items = items.map((it, j) => j === i ? applyAnswer(it, { action: body.action, product_id: body.product_id, product_name: productName, qty: body.qty, total: body.total }) : it)
      update.items = items
    }
    update.status = draftStatus(items)
    const { data: saved, error } = await db.from('invoice_drafts').update(update).eq('id', id).eq('org_id', org_id).select(DRAFT_COLS).single()
    if (error) return NextResponse.json({ error: 'تعذر الحفظ' }, { status: 500 })
    return NextResponse.json({ success: true, draft: saved })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

// إلغاء المسودة
export async function DELETE(req: Request) {
  const { org_id, id } = await req.json().catch(() => ({}))
  const access = await verifyOrgAccess(org_id)
  if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })
  let q = sb().from('invoice_drafts').update({ status: 'cancelled' } as any).eq('id', id).eq('org_id', org_id).in('status', ['needs_review', 'ready'])
  const bid = enforcedBranchId(access)
  if (bid) q = q.eq('branch_id', bid)
  const { data } = await q.select('id')
  if (!data?.length) return NextResponse.json({ error: 'المسودة غير موجودة' }, { status: 404 })
  return NextResponse.json({ success: true })
}
