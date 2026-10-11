import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyOrgAccess } from '@/lib/verifyOrgAccess'
import { sales12m, vatLevel } from '@/lib/vatThreshold'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// هل المنشأة مسجلة بالضريبة + مبيعات آخر ١٢ شهر مقارنة بحد التسجيل الإلزامي
export async function GET(req: Request) {
  try {
    const org_id = new URL(req.url).searchParams.get('org_id') || ''
    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })
    const db = sb()
    const { data: org, error } = await db.from('organizations').select('vat_registered').eq('id', org_id).single()
    if (error || !org) return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
    const today = new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 10)
    const sales = await sales12m(db, org_id, today)
    return NextResponse.json({ success: true, vat_registered: (org as any).vat_registered ?? null, sales12m: sales, level: vatLevel(sales), is_owner: access.role === 'owner' })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
