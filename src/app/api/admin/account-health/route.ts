import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requirePermission } from '@/lib/adminAuth'
import { loadAccountHealth, loadOrgHealth } from '@/lib/accountHealth'

// صحة حسابات العملاء: مين نشط ومين يحتاج متابعة (lib/accountHealth) — قراءة بس
export const maxDuration = 60

export async function GET(req: Request) {
  const admin = await requirePermission(req.headers.get('x-admin-key'), 'manage_users')
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  try {
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    // ?org_id= : منشأة وحدة (ملف العميل)
    const orgId = new URL(req.url).searchParams.get('org_id')
    if (orgId) {
      if (!/^[0-9a-f-]{36}$/i.test(orgId)) return NextResponse.json({ error: 'org_id غير صحيح' }, { status: 400 })
      const account = await loadOrgHealth(sb, orgId)
      return account ? NextResponse.json({ success: true, account }) : NextResponse.json({ error: 'المنشأة غير موجودة' }, { status: 404 })
    }
    return NextResponse.json({ success: true, accounts: await loadAccountHealth(sb), generated_at: new Date().toISOString() })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
