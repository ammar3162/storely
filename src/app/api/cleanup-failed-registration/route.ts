import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

const FRESH_MS = 10 * 60 * 1000

// حذف حساب تسجيل فشل إنشاء منشأته — للحساب اللي انشأ للتو فقط، ولا يلمس أي حساب قائم:
// المستخدم من الجلسة إن وجدت، وإلا (تأكيد البريد مفعّل) حساب غير مؤكد بدون ملف، عمره أقل من 10 دقائق
export async function POST(req: Request) {
  try {
    const authClient = await createServerClient()
    const { data: { user: sessionUser } } = await authClient.auth.getUser()
    const { userId } = await req.json().catch(() => ({}))
    const targetId = sessionUser?.id || (typeof userId === 'string' ? userId : '')
    if (!targetId) return NextResponse.json({ ok: false })

    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const { data: { user } } = await sb.auth.admin.getUserById(targetId)
    if (!user) return NextResponse.json({ ok: false })

    const isFresh = Date.now() - new Date(user.created_at).getTime() < FRESH_MS
    const unconfirmedOrOwn = !!sessionUser || !user.email_confirmed_at
    const { data: profile } = await sb.from('profiles').select('id').eq('id', user.id).maybeSingle()
    if (!isFresh || !unconfirmedOrOwn || profile) return NextResponse.json({ ok: false })

    await sb.auth.admin.deleteUser(user.id)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false })
  }
}
