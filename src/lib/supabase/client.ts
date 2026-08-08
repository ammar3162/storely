import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'

declare global {
  interface Window {
    __storely_supabase_client?: ReturnType<typeof createBrowserClient<Database>>
  }
}

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'

  // نخزّن العميل على مستوى نافذة المتصفح (window) — يضمن نسخة موحّدة حقيقية بين كل الصفحات
  // حتى لو Next.js قسّم الكود بملفات منفصلة (chunks) لكل صفحة، عشان نمنع تعدد مؤقتات تجديد الجلسة المتنافسة
  if (typeof window === 'undefined') {
    return createBrowserClient<Database>(url, key)
  }
  if (!window.__storely_supabase_client) {
    window.__storely_supabase_client = createBrowserClient<Database>(url, key)
  }
  return window.__storely_supabase_client
}
