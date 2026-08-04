import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// عام — تستخدمه الصفحة التسويقية لعرض رسائل الشريط المتحرك، بدون أي حاجة لتسجيل دخول
export async function GET() {
  const { data, error } = await sb()
    .from('marquee_messages')
    .select('id,message')
    .eq('is_active', true)
    .order('display_order', { ascending: true })
  if (error) return NextResponse.json({ messages: [] })
  return NextResponse.json({ messages: data || [] })
}
