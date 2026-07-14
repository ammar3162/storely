import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const { email } = await req.json()
    if (!email) return NextResponse.json({ error: 'أدخل الإيميل' }, { status: 400 })

    const db = sb()
    const target = String(email).trim().toLowerCase()

    // نبحث عبر صفحات قائمة المستخدمين (Supabase ما توفر بحث مباشر بالإيميل بالـ SDK الحالي)
    let exists = false
    let page = 1
    while (page <= 5) { // حد أقصى 5000 مستخدم (5 صفحات × 1000) — كافي حالياً
      const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 })
      if (error || !data?.users?.length) break
      if (data.users.some(u => u.email?.toLowerCase() === target)) { exists = true; break }
      if (data.users.length < 1000) break
      page++
    }

    return NextResponse.json({ exists })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
