import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// يتحقق من حالة اشتراك إضافة معيّن -- عبر مفتاح الخدمة (يتخطى RLS بأمان)، بدل ما نعتمد على
// قراءة مباشرة من المتصفح لجدول org_addon_subscriptions (ما فيه سياسة قراءة عليه أصلاً).
// يرجّع Boolean بس (active/expired)، بدون تفاصيل حساسة زي السعر أو الكمية.
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id مطلوب' }, { status: 400 })

    const { data } = await sb().from('org_addon_subscriptions').select('status,expires_at').eq('id', id).maybeSingle()
    const active = !!data && (data as any).status === 'active' && new Date((data as any).expires_at) > new Date()

    return NextResponse.json({ success: true, active })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
