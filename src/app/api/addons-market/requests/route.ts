import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyOrgAccess } from '@/lib/verifyOrgAccess'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const SELECT = 'id,addon_id,quantity,branch_ids,note,status,reason,created_at,decided_at,marketplace_addons(name,slug)'

// طلبات المنشأة (المعلّقة وآخر القرارات)
export async function GET(req: Request) {
  const org_id = new URL(req.url).searchParams.get('org_id') || ''
  const access = await verifyOrgAccess(org_id)
  if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })
  const { data } = await sb().from('addon_requests').select(SELECT).eq('org_id', org_id).order('created_at', { ascending: false }).limit(20)
  return NextResponse.json({ success: true, requests: data || [] })
}

// طلب إضافة — يوصل للأدمن يوافق عليه (بدل رسالة واتساب). quantity = كم وحدة يبي يضيف، branch_ids للمنيو = الفروع المطلوبة
export async function POST(req: Request) {
  try {
    const { org_id, addon_id, quantity, branch_ids, note } = await req.json()
    if (!org_id || !addon_id) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })
    if (access.role === 'manager') return NextResponse.json({ error: 'طلب الإضافات لمالك المنشأة' }, { status: 403 })

    const db = sb()
    const { data: addon } = await db.from('marketplace_addons').select('id,name').eq('id', addon_id).eq('is_active', true).maybeSingle()
    if (!addon) return NextResponse.json({ error: 'الإضافة غير متاحة' }, { status: 404 })

    let branchIds: string[] | null = null
    if (Array.isArray(branch_ids) && branch_ids.length) {
      const wanted = Array.from(new Set(branch_ids.filter((x: any) => typeof x === 'string'))).slice(0, 50)
      const { data: owned } = await db.from('branches').select('id').eq('org_id', org_id).eq('is_active', true).in('id', wanted)
      if ((owned || []).length !== wanted.length) return NextResponse.json({ error: 'فرع غير صحيح' }, { status: 400 })
      branchIds = wanted as string[]
    }
    const row = {
      org_id, addon_id, quantity: Math.max(1, Math.min(20, Number(quantity) || 1)), branch_ids: branchIds,
      note: typeof note === 'string' ? note.trim().slice(0, 300) || null : null, status: 'pending', requested_by: access.userId,
    }
    // طلب معلّق لنفس الإضافة يتحدّث بدل ما يتكرر
    const { data: pending } = await db.from('addon_requests').select('id').eq('org_id', org_id).eq('addon_id', addon_id).eq('status', 'pending').maybeSingle()
    const { error } = pending
      ? await db.from('addon_requests').update({ ...row, created_at: new Date().toISOString() } as any).eq('id', (pending as any).id)
      : await db.from('addon_requests').insert(row as any)
    if (error) return NextResponse.json({ error: 'فشل إرسال الطلب' }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

// إلغاء طلب معلّق
export async function DELETE(req: Request) {
  const { org_id, id } = await req.json().catch(() => ({}))
  const access = await verifyOrgAccess(org_id)
  if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })
  if (access.role === 'manager') return NextResponse.json({ error: 'طلب الإضافات لمالك المنشأة' }, { status: 403 })
  const { data, error } = await sb().from('addon_requests').update({ status: 'cancelled', decided_at: new Date().toISOString() } as any)
    .eq('id', id).eq('org_id', org_id).eq('status', 'pending').select('id')
  if (error || !data?.length) return NextResponse.json({ error: 'ما فيه طلب معلّق' }, { status: 404 })
  return NextResponse.json({ success: true })
}
