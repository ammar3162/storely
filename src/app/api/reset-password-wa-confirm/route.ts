import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET: التحقق من صلاحية الرمز (تستخدمها الصفحة عند التحميل)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get('token')
    if (!token) return NextResponse.json({ valid: false, error: 'رمز غير موجود' }, { status: 400 })

    const db = sb()
    const { data: row } = await (db as any)
      .from('password_reset_tokens')
      .select('id,expires_at,used')
      .eq('token', token)
      .maybeSingle()

    if (!row) return NextResponse.json({ valid: false, error: 'رابط غير صحيح' })
    if (row.used) return NextResponse.json({ valid: false, error: 'تم استخدام هذا الرابط من قبل' })
    if (new Date(row.expires_at) < new Date()) return NextResponse.json({ valid: false, error: 'انتهت صلاحية الرابط' })

    return NextResponse.json({ valid: true })
  } catch {
    return NextResponse.json({ valid: false, error: 'حدث خطأ' }, { status: 500 })
  }
}

// POST: تغيير كلمة المرور فعلياً
export async function POST(req: Request) {
  try {
    const { token, newPassword } = await req.json()
    if (!token || !newPassword) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
    if (String(newPassword).length < 8) return NextResponse.json({ error: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' }, { status: 400 })

    const db = sb()
    const { data: row } = await (db as any)
      .from('password_reset_tokens')
      .select('id,profile_id,expires_at,used')
      .eq('token', token)
      .maybeSingle()

    if (!row) return NextResponse.json({ error: 'رابط غير صحيح' }, { status: 400 })
    if (row.used) return NextResponse.json({ error: 'تم استخدام هذا الرابط من قبل' }, { status: 400 })
    if (new Date(row.expires_at) < new Date()) return NextResponse.json({ error: 'انتهت صلاحية الرابط' }, { status: 400 })

    const { error: updateErr } = await db.auth.admin.updateUserById(row.profile_id, { password: newPassword })
    if (updateErr) return NextResponse.json({ error: 'حدث خطأ أثناء تحديث كلمة المرور' }, { status: 500 })

    await (db as any).from('password_reset_tokens').update({ used: true }).eq('id', row.id)

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
