import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { currentAccountant, accessExpired } from '@/lib/accountantPortalAuth'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// قائمة المنشآت للقائمة الجانبية (خفيفة وسريعة): الاسم والشعار وعدد الطلبات
export async function GET(req: Request) {
  try {
    const db = sb()
    const me = await currentAccountant(db, req)
    if (!me) return NextResponse.json({ error: 'سجّل دخولك' }, { status: 401 })
    const [{ data: rows }, { data: reqs }] = await Promise.all([
      db.from('accountant_access').select('org_id,expires_on,organizations(name,logo_url),branches(name)').eq('accountant_id', me.id).eq('status', 'active'),
      db.from('accountant_requests').select('org_id,status').eq('accountant_id', me.id).neq('status', 'resolved'),
    ])
    const count = (o: string, st: string) => ((reqs || []) as any[]).filter(r => r.org_id === o && r.status === st).length
    const orgs = ((rows || []) as any[]).map(a => ({
      org_id: a.org_id, name: a.organizations?.name || '—', logo_url: a.organizations?.logo_url || null, branch: a.branches?.name || null,
      expired: accessExpired(a.expires_on), open: count(a.org_id, 'open'), answered: count(a.org_id, 'answered'),
    })).sort((x, y) => x.name.localeCompare(y.name, 'ar'))
    return NextResponse.json({ success: true, accountant: { name: me.name, email: me.email }, orgs })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
