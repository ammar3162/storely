import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nzhczszgryexiilsughk.supabase.co'
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_6b7SJgK6Hbu8OQOu0qBU0w_XHaUO6Mf'
  return createBrowserClient(url, key)
}
