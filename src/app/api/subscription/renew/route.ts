import { notifyInsert } from '@/lib/notify'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getCurrentProfile } from '@/lib/verifyOrgAccess'
import { DEVICE_UNVERIFIED_ERROR, DEVICE_UNVERIFIED_REASON } from '@/lib/deviceMessages'
import { requestRenewal } from '@/lib/renewal'
import { forgetOrgSubState } from '@/lib/subscription'
import { notifyAdminsLater } from '@/lib/adminNotify'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// زر «تجديد الاشتراك» (المالك فقط): بدون بوابة دفع — طلب «بانتظار الدفع» + يوم سماح لو منتهي + إشعار للإدارة
// يستخدم جلسة المستخدم مباشرة (مو verifyOrgAccess) لأن الاشتراك المنتهي يقفل باقي المسارات
async function owner() {
  const me = await getCurrentProfile()
  if (!me) return { error: NextResponse.json({ error: 'سجّل دخولك' }, { status: 401 }) }
  if (me.deviceTrusted === false) return { error: NextResponse.json({ error: DEVICE_UNVERIFIED_ERROR, reason: DEVICE_UNVERIFIED_REASON }, { status: 403 }) }
  if (!me.orgId) return { error: NextResponse.json({ error: 'لا توجد منشأة' }, { status: 400 }) }
  if (me.role !== 'owner') return { error: NextResponse.json({ error: 'تجديد الاشتراك من مالك المنشأة', role: me.role }, { status: 403 }) }
  return { me }
}

export async function GET() {
  try {
    const g = await owner(); if (g.error) return g.error
    const db = sb()
    const [{ data: p }, { data: pending }] = await Promise.all([
      db.from('profiles').select('subscription_ends_at,subscription_type').eq('org_id', g.me.orgId!).eq('role', 'owner').maybeSingle(),
      db.from('subscription_renewals').select('id,created_at,grace_until').eq('org_id', g.me.orgId!).eq('status', 'pending_payment').maybeSingle(),
    ])
    const ends = (p as any)?.subscription_ends_at || null
    return NextResponse.json({ success: true, endsAt: ends, expired: ends ? Date.parse(ends) < Date.now() : false, type: (p as any)?.subscription_type || null, pending: pending || null },
      { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

export async function POST() {
  try {
    const g = await owner(); if (g.error) return g.error
    const db = sb()
    const r = await requestRenewal(db, g.me.orgId!, g.me.userId)
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status })
    if (r.created) {
      forgetOrgSubState(g.me.orgId!)
      // إشعار داخل حساب المالك + إيميل للإدارة (بعد الرد)
      await notifyInsert(db, { org_id: g.me.orgId, type: 'info', read: false, title: 'استلمنا طلب تجديد اشتراكك',
        message: 'حسابك يعمل الآن، وسيتواصل معك فريق Storely قريباً لإتمام الدفع.' } as any)
      notifyAdminsLater(db, g.me.orgId!, { kind: 'renewal', expired: r.extended, graceUntil: r.extended ? r.endsAt : null })
    }
    return NextResponse.json({ success: true, created: r.created, extended: r.extended, endsAt: r.endsAt })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
