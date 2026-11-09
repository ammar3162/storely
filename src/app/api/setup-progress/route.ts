import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyOrgAccess } from '@/lib/verifyOrgAccess'
import { featuresFrom, activeAddonSlugs, orgOnTrial } from '@/lib/planFeatures'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// «جهّز حسابك»: وين وصل المالك في أول خطوات الاستخدام — حسب المزايا اللي اختارها (مو التجربة اللي تفتح كل شي)
export async function GET(req: Request) {
  try {
    const org_id = new URL(req.url).searchParams.get('org_id')
    if (!org_id) return NextResponse.json({ error: 'org_id مطلوب' }, { status: 400 })
    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })

    const db = sb()
    const [{ data: org }, slugs, trial] = await Promise.all([
      db.from('organizations').select('plan,created_at,whatsapp_number').eq('id', org_id).single(),
      activeAddonSlugs(db, org_id),
      orgOnTrial(db, org_id),
    ])
    const o: any = org || {}
    const f = featuresFrom(o.plan || 'basic', slugs, false)
    const count = async (q: any) => ((await q).count || 0) > 0
    const head = { count: 'exact' as const, head: true }
    const [products, staff, dispense, closing, purchase, attendance] = await Promise.all([
      f.inventory !== false ? count(db.from('products').select('id', head).eq('org_id', org_id).eq('is_active', true)) : false,
      count(db.from('staff_members').select('id', head).eq('org_id', org_id)),
      f.inventory !== false ? count(db.from('stock_movements').select('id', head).eq('org_id', org_id).eq('type', 'out').not('staff_id', 'is', null)) : false,
      f.cashier ? count(db.from('cashier_closings').select('id', head).eq('org_id', org_id)) : false,
      f.purchases !== false ? count(db.from('purchases').select('id', head).eq('org_id', org_id).is('deleted_at', null)) : false,
      f.hr ? count(db.from('staff_attendance').select('id', head).eq('org_id', org_id)) : false,
    ])
    const ageDays = o.created_at ? (Date.now() - new Date(o.created_at).getTime()) / 864e5 : 999
    return NextResponse.json({
      success: true,
      show: trial || ageDays <= 30,
      features: { inventory: f.inventory !== false, purchases: f.purchases !== false, cashier: !!f.cashier, hr: !!f.hr },
      done: { products, staff, dispense, closing, purchase, attendance, whatsapp: !!(o.whatsapp_number || '').trim() },
    })
  } catch {
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 })
  }
}
