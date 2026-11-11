import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyOrgAccess, enforcedBranchId } from '@/lib/verifyOrgAccess'
import { loadFoodCost } from '@/lib/foodCost'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// نسبة تكلفة المواد من المبيعات — آخر 7 أيام مقابل الأسبوع اللي قبله
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const org_id = searchParams.get('org_id')
    if (!org_id) return NextResponse.json({ error: 'org_id مطلوب' }, { status: 400 })
    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })
    const bid = enforcedBranchId(access, searchParams.get('branch_id'))
    if (bid && !UUID_RE.test(bid)) return NextResponse.json({ error: 'branch_id غير صالح' }, { status: 400 })
    const result = await loadFoodCost(sb(), org_id, bid || null)
    return NextResponse.json({ success: true, ...result })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
