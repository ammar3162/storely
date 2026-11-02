import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyOrgAccess } from '@/lib/verifyOrgAccess'
import { revertClosingEdit } from '@/lib/cashierClosingEdit'
import { revertPurchaseBatch } from '@/lib/purchaseEdit'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const UUID = /^[0-9a-f-]{36}$/i

async function owner(orgId: unknown) {
  if (typeof orgId !== 'string' || !UUID.test(orgId)) return { error: NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 }) }
  const access = await verifyOrgAccess(orgId)
  if (!access.authorized) return { error: NextResponse.json({ error: access.error }, { status: access.status }) }
  if (access.role !== 'owner') return { error: NextResponse.json({ error: 'هذي الصلاحية للمالك فقط' }, { status: 403 }) }
  return { userId: access.userId! }
}

// سجل تعديلات إقفال أو فاتورة (قبل وبعد ومين عدّل) — للمالك
export async function GET(req: Request) {
  try {
    const q = new URL(req.url).searchParams
    const orgId = q.get('org_id'), kind = q.get('kind'), id = q.get('id') || ''
    const g = await owner(orgId); if (g.error) return g.error
    if (!UUID.test(id)) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
    const db = sb()
    if (kind === 'closing') {
      const { data } = await db.from('cashier_closing_edits').select('id,action,before,after,edited_by,source,created_at,reverted_at,reverted_by')
        .eq('org_id', orgId!).eq('closing_id', id).order('created_at', { ascending: false }).limit(50)
      return NextResponse.json({ success: true, edits: data || [] })
    }
    if (kind === 'purchase') {
      // تعديلات السطر نفسه + أي سطر من نفس الدفعة (نفس الفاتورة)
      const { data } = await db.from('purchase_edits').select('id,batch_id,purchase_id,before,after,edited_by,source,created_at,reverted_at,reverted_by')
        .eq('org_id', orgId!).eq('purchase_id', id).order('created_at', { ascending: false }).limit(50)
      return NextResponse.json({ success: true, edits: data || [] })
    }
    return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

// المالك يرجّع تعديل — الإقفال برقم سطر السجل، والفاتورة بالدفعة
export async function POST(req: Request) {
  try {
    const b = await req.json()
    const g = await owner(b.org_id); if (g.error) return g.error
    if (!UUID.test(String(b.id || ''))) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
    const db = sb()
    const editor = (await db.from('profiles').select('full_name').eq('id', g.userId).maybeSingle()).data?.full_name || 'المالك'
    const r = b.kind === 'closing' ? await revertClosingEdit(db, b.org_id, b.id, editor)
      : b.kind === 'purchase' ? await revertPurchaseBatch(db, b.org_id, b.id, editor)
      : { ok: false as const, error: 'بيانات ناقصة', status: 400 }
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
