import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requirePermission, logAdminAction } from '@/lib/adminAuth'
import { newCode, hashCode, CODE_TTL_MS } from '@/lib/deviceTrust'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// رمز دخول مؤقت من فريق ستورلي لما الإيميل ما يوصل العميل — يشتغل على أي جهاز، 10 دقايق، مرة وحدة
// الرمز يطلع للأدمن مرة وحدة بس (القاعدة تحفظ بصمته)، والعميل يكتبه بصفحة «تحقق من جهازك»
export async function POST(req: Request) {
  const admin = await requirePermission(req.headers.get('x-admin-key'), 'manage_users')
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  try {
    const { userId } = await req.json().catch(() => ({}))
    if (typeof userId !== 'string' || !/^[0-9a-f-]{36}$/.test(userId)) return NextResponse.json({ error: 'المستخدم غير صحيح' }, { status: 400 })
    const db = sb()
    const { data: profile } = await db.from('profiles').select('org_id,role,organizations(name)').eq('id', userId).maybeSingle()
    if (!profile) return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 })

    const code = newCode()
    const { error } = await db.from('login_codes').insert({
      user_id: userId, code_hash: hashCode(userId, code), device_hash: null,
      source: 'admin', expires_at: new Date(Date.now() + CODE_TTL_MS).toISOString(),
    })
    if (error) throw new Error(error.message)
    const p = profile as { org_id: string | null; organizations?: { name?: string } | null }
    await logAdminAction(admin, 'device_code', p.org_id, p.organizations?.name || null, { userId })
    return NextResponse.json({ success: true, code, minutes: CODE_TTL_MS / 60000 })
  } catch (e) {
    console.error('admin device-code failed:', e)
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
