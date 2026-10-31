import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyOrgAccess } from '@/lib/verifyOrgAccess'
import { branchOffer, addExtraBranch } from '@/lib/extraBranch'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// عرض إضافة فرع (السعر وكم يقدر يضيف) — المالك فقط
export async function GET(req: Request) {
  const org_id = new URL(req.url).searchParams.get('org_id') || ''
  const access = await verifyOrgAccess(org_id)
  if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })
  if (access.role !== 'owner') return NextResponse.json({ error: 'هذي الصلاحية للمالك فقط' }, { status: 403 })
  return NextResponse.json({ success: true, offer: await branchOffer(sb(), org_id) })
}

// إضافة فرع بنفسه (بدون موافقة) لين حد باقته — ينضاف لفاتورته
export async function POST(req: Request) {
  try {
    const { org_id } = await req.json()
    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })
    if (access.role !== 'owner') return NextResponse.json({ error: 'هذي الصلاحية للمالك فقط' }, { status: 403 })
    const res = await addExtraBranch(sb(), org_id, access.userId || null)
    if (!res.ok) return NextResponse.json({ error: res.error, code: res.code }, { status: res.status })
    return NextResponse.json({ success: true, prorated_amount: res.proratedAmount, max_branches: res.total })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
