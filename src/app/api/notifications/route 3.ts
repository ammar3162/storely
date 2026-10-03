import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyOrgAccess, enforcedBranchId } from '@/lib/verifyOrgAccess'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// إشعارات الفرع = الإشعارات العامة (بدون فرع) + إشعارات هذا الفرع. بدون فرع = كل إشعارات المؤسسة
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function branchFilter(branchId: string | null) {
  if (branchId && !UUID_RE.test(branchId)) throw new Error('invalid branch_id')
  return branchId ?`branch_id.is.null,branch_id.eq.${branchId}` : 'branch_id.is.null,branch_id.not.is.null'
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const org_id = searchParams.get('org_id')
    const branch_id = searchParams.get('branch_id')
    if (!org_id) return NextResponse.json({ error: 'org_id مطلوب' }, { status: 400 })

    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })
    const effectiveBranchId = enforcedBranchId(access, branch_id)

    const { data, error } = await sb().from('notifications')
      .select('id,type,read,title,message,created_at')
      .eq('org_id', org_id).or(branchFilter(effectiveBranchId))
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
    return NextResponse.json({ success: true, notifications: data || [] })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

// تعليم إشعار كمقروء ({ id }) أو كل الإشعارات ({ all: true, branch_id })
export async function PATCH(req: Request) {
  try {
    const { org_id, id, all, branch_id } = await req.json()
    if (!org_id || (!id && !all)) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })

    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })

    let q = sb().from('notifications').update({ read: true }).eq('org_id', org_id)
    q = id ? q.eq('id', id) : q.eq('read', false).or(branchFilter(enforcedBranchId(access, branch_id)))
    const { error } = await q

    if (error) return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const org_id = searchParams.get('org_id')
    const id = searchParams.get('id')
    if (!org_id || !id) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })

    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })

    const { error } = await sb().from('notifications').delete().eq('id', id).eq('org_id', org_id)
    if (error) return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
