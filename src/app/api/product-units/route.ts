import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyOrgAccess, enforcedBranchId } from '@/lib/verifyOrgAccess'
import { normalizeUnit, saveProductUnit, sameUnit } from '@/lib/productUnits'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// وحدات الشراء لصنف (كرتون = 12 كيس) — من شاشة الصنف. الصنف لازم من نفس المنشأة (ومن فرع المدير)
async function ownProduct(db: ReturnType<typeof sb>, orgId: string, productId: string, branchId: string | null) {
  if (!/^[0-9a-f-]{36}$/i.test(productId)) return null
  let q = db.from('products').select('id,unit').eq('id', productId).eq('org_id', orgId)
  if (branchId) q = q.eq('branch_id', branchId)
  return ((await q.maybeSingle()).data as { id: string; unit: string | null } | null)
}

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams
  const org_id = sp.get('org_id') || '', product_id = sp.get('product_id') || ''
  const access = await verifyOrgAccess(org_id)
  if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })
  const db = sb()
  const p = await ownProduct(db, org_id, product_id, enforcedBranchId(access))
  if (!p) return NextResponse.json({ error: 'الصنف غير موجود' }, { status: 404 })
  const { data } = await db.from('product_units').select('unit,factor').eq('org_id', org_id).eq('product_id', product_id).order('factor')
  return NextResponse.json({ success: true, units: (data || []).map((u: any) => ({ unit: u.unit, factor: Number(u.factor) })) })
}

// POST { org_id, product_id, unit, factor } — يضيف أو يحدّث
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const org_id = typeof body.org_id === 'string' ? body.org_id : ''
  const access = await verifyOrgAccess(org_id)
  if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })
  const db = sb()
  const p = await ownProduct(db, org_id, String(body.product_id || ''), enforcedBranchId(access))
  if (!p) return NextResponse.json({ error: 'الصنف غير موجود' }, { status: 404 })
  const unit = normalizeUnit(body.unit), factor = Number(body.factor)
  if (!unit) return NextResponse.json({ error: 'اكتب اسم وحدة الشراء' }, { status: 400 })
  if (sameUnit(unit, p.unit)) return NextResponse.json({ error: 'وحدة الشراء هي نفس وحدة المخزون' }, { status: 400 })
  if (!(factor > 0) || factor > 100000) return NextResponse.json({ error: 'اكتب كم وحدة فيها (رقم أكبر من صفر)' }, { status: 400 })
  const ok = await saveProductUnit(db, org_id, p.id, p.unit, unit, factor)
  return ok ? NextResponse.json({ success: true, unit, factor }) : NextResponse.json({ error: 'تعذر الحفظ' }, { status: 500 })
}

// DELETE { org_id, product_id, unit }
export async function DELETE(req: Request) {
  const body = await req.json().catch(() => ({}))
  const org_id = typeof body.org_id === 'string' ? body.org_id : ''
  const access = await verifyOrgAccess(org_id)
  if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })
  const db = sb()
  const p = await ownProduct(db, org_id, String(body.product_id || ''), enforcedBranchId(access))
  if (!p) return NextResponse.json({ error: 'الصنف غير موجود' }, { status: 404 })
  await db.from('product_units').delete().eq('org_id', org_id).eq('product_id', p.id).eq('unit', normalizeUnit(body.unit))
  return NextResponse.json({ success: true })
}
