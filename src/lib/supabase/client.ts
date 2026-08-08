import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'

let client: ReturnType<typeof createBrowserClient<Database>> | undefined

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'
  // نسخة وحدة مشتركة (Singleton) — تمنع تعدد نسخ العميل ومؤقتات تجديد الجلسة المتنافسة
  // اللي كانت تسبب تلف بيانات الجلسة أحياناً (خصوصاً مع اتصالات Realtime)
  if (!client) {
    client = createBrowserClient<Database>(url, key)
  }
  return client
}
