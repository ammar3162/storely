import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requirePermission, logAdminAction } from '@/lib/adminAuth'
import { orgRevenues } from '@/lib/orgBill'
import { needsFollowup, suggestRenewal, RENEWAL_WINDOW_DAYS } from '@/lib/offerQuote'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const NONE = ['00000000-0000-0000-0000-000000000000']
const OWNER_COLS = 'id,org_id,full_name,phone,status,subscription_type,subscription_ends_at,organizations(name,whatsapp_number,plan,max_branches,locked_plan_monthly,staff_included,billing_cycle,discount_type,discount_value,discount_until)'

const orgOf = (o: any) => ({ id: o.org_id, plan: o.organizations?.plan, max_branches: o.organizations?.max_branches, locked_plan_monthly: o.organizations?.locked_plan_monthly,
  staff_included: o.organizations?.staff_included, billing_cycle: o.organizations?.billing_cycle, discount_type: o.organizations?.discount_type,
  discount_value: o.organizations?.discount_value, discount_until: o.organizations?.discount_until })

// ?org_id → عروض منشأة (ملف العميل) | بدون → عروض تحتاج متابعة + اشتراكات تنتهي قريباً مع عرض تجديد مقترح | ?count → عدد المتابعات
export async function GET(req: Request) {
  const admin = await requirePermission(req.headers.get('x-admin-key'), 'manage_users')
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const db = sb() as any, url = new URL(req.url), now = Date.now()
  const orgId = url.searchParams.get('org_id')
  if (orgId) {
    const { data } = await db.from('subscription_offers').select('*').eq('org_id', orgId).order('created_at', { ascending: false }).limit(30)
    return NextResponse.json({ success: true, offers: data || [] })
  }

  const { data: open } = await db.from('subscription_offers').select('*').eq('status', 'sent').order('created_at', { ascending: false }).limit(200)
  const follow = ((open || []) as any[]).filter(o => needsFollowup(o, now))
  if (url.searchParams.get('count')) return NextResponse.json({ success: true, followups: follow.length, pending: follow.length })

  // المالكين المفعّلين اللي ينتهي اشتراكهم خلال 14 يوم
  const until = new Date(now + RENEWAL_WINDOW_DAYS * 86400000).toISOString()
  const { data: soon } = await db.from('profiles').select(OWNER_COLS).eq('role', 'owner').eq('status', 'active')
    .gte('subscription_ends_at', new Date(now).toISOString()).lte('subscription_ends_at', until).order('subscription_ends_at', { ascending: true })
  const soonRows = (soon || []) as any[]
  const followOrgIds = [...new Set(follow.map(o => o.org_id))]
  const { data: followOwners } = await db.from('profiles').select(OWNER_COLS).eq('role', 'owner').in('org_id', followOrgIds.length ? followOrgIds : NONE)
  const owners = [...soonRows, ...((followOwners || []) as any[])]
  const bills = await orgRevenues(db, owners.filter(o => o.org_id).map(orgOf)).catch(() => ({} as Record<string, { total: number }>))
  const contact = (o: any) => ({ owner_id: o.id, org_name: o.organizations?.name || '—', owner_name: o.full_name || null, phone: o.organizations?.whatsapp_number || o.phone || null,
    sub_type: o.subscription_type, ends_at: o.subscription_ends_at })

  const followups = follow.map(f => {
    const o = (followOwners || []).find((x: any) => x.org_id === f.org_id)
    return { ...f, ...(o ? contact(o) : { org_name: '—' }) }
  })
  // عرض تجديد مرسل ولسا ساري؟ ما نقترح ثاني
  const openByOrg = new Set(((open || []) as any[]).filter(o => new Date(o.valid_until).getTime() > now).map(o => o.org_id))
  const upcoming = soonRows.map(o => {
    const bill = bills[o.org_id]?.total || 0
    return { org_id: o.org_id, ...contact(o), sub_type: o.subscription_type, ends_at: o.subscription_ends_at, monthly_bill: bill,
      suggestion: suggestRenewal(bill), offer_open: openByOrg.has(o.org_id) }
  })
  return NextResponse.json({ success: true, followups, upcoming })
}

// action: paid (العميل دفع — بعد التفعيل) | cancel
export async function POST(req: Request) {
  const admin = await requirePermission(req.headers.get('x-admin-key'), 'manage_users')
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { id, action } = await req.json().catch(() => ({}))
  if (typeof id !== 'string' || !['paid', 'cancel'].includes(action)) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
  const patch = action === 'paid'
    ? { status: 'paid', paid_at: new Date().toISOString(), decided_by_name: admin.full_name || null }
    : { status: 'cancelled', decided_by_name: admin.full_name || null }
  const { data, error } = await (sb() as any).from('subscription_offers').update(patch).eq('id', id).eq('status', 'sent').select('id,org_id,amount,months').maybeSingle()
  if (error) return NextResponse.json({ error: 'تعذّر الحفظ' }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'العرض غير موجود أو تغيّرت حالته' }, { status: 404 })
  await logAdminAction(admin, action === 'paid' ? 'offer_paid' : 'offer_cancelled', data.org_id, null, { offer_id: id, amount: data.amount, months: data.months })
  return NextResponse.json({ success: true })
}
