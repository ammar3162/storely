import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyOrgAccess } from '@/lib/verifyOrgAccess'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function DELETE(req: Request) {
  try {
    const { org_id, addon_id } = await req.json()
    if (!org_id || !addon_id) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })

    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })

    const supabase = sb()
    const { error } = await supabase.from('org_addon_subscriptions')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() } as any)
      .eq('org_id', org_id).eq('addon_id', addon_id)

    if (error) return NextResponse.json({ error: 'فشل الإلغاء' }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const org_id = searchParams.get('org_id')
    if (!org_id) return NextResponse.json({ error: 'org_id مطلوب' }, { status: 400 })

    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })

    const supabase = sb()
    const { data: addons } = await supabase.from('marketplace_addons').select('*').eq('is_active', true).order('sort_order')
    const { data: subs } = await supabase.from('org_addon_subscriptions').select('addon_id,status,expires_at').eq('org_id', org_id).eq('status', 'active')

    const now = new Date()
    const subsMap: Record<string, any> = {}
    for (const s of subs || []) {
      subsMap[(s as any).addon_id] = { ...(s as any), isValid: new Date((s as any).expires_at) > now }
    }

    const result = (addons || []).map((a: any) => ({
      ...a,
      subscription: subsMap[a.id] || null,
    }))

    return NextResponse.json({ success: true, addons: result })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
