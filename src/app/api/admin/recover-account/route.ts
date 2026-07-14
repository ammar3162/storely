import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import { requirePermission } from '@/lib/adminAuth'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// يُستخدم لربط حساب دخول جديد بمؤسسة موجودة فقدت ملفها الشخصي (يتحقق إنه ما فيه ملف شخصي مسبقاً لهذي المؤسسة)
export async function POST(req: Request) {
  try {
    const adminKey = req.headers.get('x-admin-key')
    if (!(await requirePermission(adminKey, 'manage_users'))) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    const { org_id, email, full_name } = await req.json()
    if (!org_id || !email) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })

    const db = sb()

    const { data: org } = await db.from('organizations').select('id,name,whatsapp_number').eq('id', org_id).maybeSingle()
    if (!org) return NextResponse.json({ error: 'المؤسسة غير موجودة' }, { status: 404 })

    const { count } = await db.from('profiles').select('id', { count: 'exact', head: true }).eq('org_id', org_id)
    if ((count || 0) > 0) {
      return NextResponse.json({ error: 'هذي المؤسسة عندها ملف شخصي بالفعل — لا حاجة للاسترجاع' }, { status: 400 })
    }

    const tempPassword = crypto.randomBytes(12).toString('base64')

    const { data: newUser, error: createErr } = await db.auth.admin.createUser({
      email: String(email).trim().toLowerCase(),
      password: tempPassword,
      email_confirm: true,
    })
    if (createErr || !newUser?.user) {
      return NextResponse.json({ error: createErr?.message || 'فشل إنشاء حساب الدخول' }, { status: 500 })
    }

    const { error: profileErr } = await (db as any).from('profiles').insert({
      id: newUser.user.id,
      org_id: org.id,
      full_name: full_name || org.name,
      role: 'owner',
      phone: org.whatsapp_number || null,
      status: 'active',
      subscription_type: 'trial',
      subscription_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    })
    if (profileErr) {
      await db.auth.admin.deleteUser(newUser.user.id).catch(() => {})
      return NextResponse.json({ error: profileErr.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, user_id: newUser.user.id, email, tempPassword })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
