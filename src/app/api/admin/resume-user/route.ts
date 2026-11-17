import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requirePermission, logAdminAction } from '@/lib/adminAuth'
import { resumeOutcome } from '@/lib/subscriptionLifecycle'
import { forgetOrgSubState } from '@/lib/subscription'

// استئناف حساب موقوف: يرجع شغّال بنفس اشتراكه السابق (نفس النوع ونفس تاريخ الانتهاء) — بدون مدة جديدة.
// ما يلمس الإضافات (تواريخها أصلاً على نفس نهاية الاشتراك)، ولا مكافأة سفير، ولا تحويل أسعار، ولا «اشترك» جديد بالإحصائيات.
// لو انتهى الاشتراك أثناء الإيقاف: يرجع الحساب «منتهي» ويحتاج تجديد (المالك يشوف صفحة الانتهاء وزر التجديد).
export async function POST(req: Request) {
  const admin = await requirePermission(req.headers.get('x-admin-key'), 'manage_users')
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const { userId } = await req.json().catch(() => ({}))
  if (!userId) return NextResponse.json({ error: 'userId مطلوب' }, { status: 400 })
  const { data: profile } = await db.from('profiles').select('org_id,organizations(name)').eq('id', userId).maybeSingle()
  if (!profile) return NextResponse.json({ error: 'الحساب غير موجود' }, { status: 404 })
  const orgId = (profile as any).org_id as string | null
  const orgName = (profile as any).organizations?.name || null

  const ownerQ = db.from('profiles').select('status,subscription_type,subscription_ends_at')
  const { data: owner } = orgId ? await ownerQ.eq('org_id', orgId).eq('role', 'owner').maybeSingle() : await ownerQ.eq('id', userId).maybeSingle()
  if ((owner as any)?.status !== 'suspended') return NextResponse.json({ error: 'الحساب غير موقوف' }, { status: 409 })

  // نرجّع الحالة فقط — كل حسابات المنشأة (المالك والمديرين) مثل الإيقاف بالضبط
  const upd = db.from('profiles').update({ status: 'active' } as any)
  const { error } = orgId ? await upd.eq('org_id', orgId).eq('status', 'suspended') : await upd.eq('id', userId)
  if (error) return NextResponse.json({ error: 'تعذّر الاستئناف' }, { status: 500 })
  if (orgId) forgetOrgSubState(orgId)

  const out = resumeOutcome({ type: (owner as any)?.subscription_type, endsAt: (owner as any)?.subscription_ends_at })
  await logAdminAction(admin, 'resume_user', orgId, orgName, { userId, ends: out.endsAt, days_left: out.daysLeft })
  if (orgId) {
    try { await (db as any).from('subscription_events').insert({ org_id: orgId, event_type: 'resumed', plan: null, amount: 0 }) } catch {}
  }
  return NextResponse.json({ success: true, ...out, type: (owner as any)?.subscription_type || null })
}
