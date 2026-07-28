import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// عام — تستخدمه الصفحة التسويقية لعرض شعارات الشركاء، بدون أي حاجة لتسجيل دخول
export async function GET() {
  const { data, error } = await sb()
    .from('landing_partners')
    .select('id,name,logo_url')
    .order('display_order', { ascending: true })
  if (error) return NextResponse.json({ partners: [] })
  return NextResponse.json({ partners: data || [] })
}
