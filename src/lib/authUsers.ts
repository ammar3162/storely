import type { SupabaseClient, User } from '@supabase/supabase-js'

// البحث عن حساب دخول بالإيميل. Supabase يرجّع الحسابات صفحات (1000 بالصفحة) — نمشي على الصفحات
// لين نلقاه، بدل ما نكتفي بأول صفحة (كان يفشل بعد ما يتعدى عدد الحسابات 1000).
export const AUTH_PAGE_SIZE = 1000
export const AUTH_MAX_PAGES = 50   // حد أمان: 50 ألف حساب

export const normalizeEmail = (e: unknown) => String(e ?? '').trim().toLowerCase()

export async function findAuthUserByEmail(db: SupabaseClient, email: string): Promise<User | null> {
  const target = normalizeEmail(email)
  if (!target) return null
  for (let page = 1; page <= AUTH_MAX_PAGES; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: AUTH_PAGE_SIZE })
    if (error) throw error
    const users = data?.users || []
    const hit = users.find(u => normalizeEmail(u.email) === target)
    if (hit) return hit
    if (users.length < AUTH_PAGE_SIZE) break
  }
  return null
}
