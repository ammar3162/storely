import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requirePermission } from '@/lib/adminAuth'
import { loadAccountHealth } from '@/lib/accountHealth'

// صحة حسابات العملاء: مين نشط ومين يحتاج متابعة (lib/accountHealth) — قراءة بس
export const maxDuration = 60

export async function GET(req: Request) {
  const admin = await requirePermission(req.headers.get('x-admin-key'), 'manage_users')
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  try {
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    return NextResponse.json({ success: true, accounts: await loadAccountHealth(sb), generated_at: new Date().toISOString() })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
