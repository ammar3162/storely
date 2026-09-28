import { NextResponse, type NextRequest } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

// عودة المستخدم من Google: نبدّل الرمز بجلسة (كوكيز)، ثم نوجّهه حسب حالة حسابه:
// عنده منشأة ← لوحة التحكم (الـ proxy يتكفل بحالات الإيقاف/الانتظار)، ما عنده ← إكمال بيانات المنشأة
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')
  if (!code) return NextResponse.redirect(new URL('/login?error=google', origin))

  const supabase = await createClient()
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)
  if (error || !data.user) return NextResponse.redirect(new URL('/login?error=google', origin))

  const db = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: profile } = await db.from('profiles').select('org_id').eq('id', data.user.id).maybeSingle()
  if (profile?.org_id) return NextResponse.redirect(new URL('/dashboard', origin))

  // حساب مورد سجّل بـ Google — يرجع لبوابة الموردين
  const { data: supplier } = await db.from('supplier_profiles' as any).select('id').eq('id', data.user.id).maybeSingle()
  if (supplier) return NextResponse.redirect(new URL('/supplier-portal/dashboard', origin))

  return NextResponse.redirect(new URL('/login?mode=complete', origin))
}
