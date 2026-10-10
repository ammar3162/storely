import { createClient } from '@supabase/supabase-js'

// رسائل الشريط المتحرك (عامة) — الصفحة التسويقية تجيبها من الخادم عشان ما تتحرك الصفحة بعد التحميل
export async function getMarqueeMessages(): Promise<{ id: string; message: string }[]> {
  try {
    const { data, error } = await createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
      .from('marquee_messages').select('id,message').eq('is_active', true).order('display_order', { ascending: true })
    return error ? [] : ((data || []) as any[])
  } catch { return [] }
}
