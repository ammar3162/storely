import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { currentAccountant, accessFor, accessExpired } from '@/lib/accountantPortalAuth'
import { closedMonths, isClosedMonth, monthName } from '@/lib/periodLock'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function guard(req: Request, orgId: unknown) {
  const db = sb()
  const me = await currentAccountant(db, req)
  if (!me) return { error: NextResponse.json({ error: 'سجّل دخولك' }, { status: 401 }) }
  const access = await accessFor(db, me.id, String(orgId || ''))
  if (!access) return { error: NextResponse.json({ error: 'ما عندك صلاحية على هالمنشأة' }, { status: 403 }) }
  return { db, me, access }
}

// آخر ١٢ شهر خلصت وحالة كل واحد
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    if (searchParams.get('all') === '1') {
      const db = sb()
      const me = await currentAccountant(db, req)
      if (!me) return NextResponse.json({ error: 'سجّل دخولك' }, { status: 401 })
      const months = closedMonths(6)
      const { data: acc } = await db.from('accountant_access').select('org_id,expires_on,organizations(name,logo_url)').eq('accountant_id', me.id).eq('status', 'active')
      const orgs = ((acc || []) as any[]).filter(a => !accessExpired(a.expires_on))
      const { data: locks } = orgs.length ? await db.from('period_locks').select('org_id,month,locked_by_name,locked_at').in('org_id', orgs.map(o => o.org_id)).in('month', months) : { data: [] }
      return NextResponse.json({ success: true, months: months.map(m => ({ month: m, label: monthName(m) })),
        orgs: orgs.map(o => ({ org_id: o.org_id, name: o.organizations?.name || '—', logo_url: o.organizations?.logo_url || null,
          locked: Object.fromEntries(((locks || []) as any[]).filter(l => l.org_id === o.org_id).map(l => [l.month, { by: l.locked_by_name, at: l.locked_at }])) })) })
    }
    const g = await guard(req, searchParams.get('org_id')); if (g.error) return g.error
    const months = closedMonths(12)
    const { data } = await g.db.from('period_locks').select('month,locked_by_name,locked_at').eq('org_id', g.access.org_id).in('month', months)
    const map = new Map(((data || []) as any[]).map(l => [l.month, l]))
    return NextResponse.json({ success: true, months: months.map(m => ({ month: m, label: monthName(m), locked: map.has(m), locked_by_name: map.get(m)?.locked_by_name || null, locked_at: map.get(m)?.locked_at || null })) })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

// إقفال/فتح شهر — يوصل المالك إشعار
export async function POST(req: Request) {
  try {
    const b = await req.json()
    const g = await guard(req, b.org_id); if (g.error) return g.error
    const month = String(b.month || '')
    if (!isClosedMonth(month)) return NextResponse.json({ error: 'تقدر تقفل الشهور اللي خلصت بس' }, { status: 400 })
    if (!['lock', 'unlock'].includes(b.action)) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
    const by = g.me.name || g.me.email, label = monthName(month), org = g.access.org_id
    if (b.action === 'lock') {
      const { error } = await g.db.from('period_locks').upsert({ org_id: org, month, locked_by: g.me.id, locked_by_name: by } as any, { onConflict: 'org_id,month', ignoreDuplicates: true })
      if (error) return NextResponse.json({ error: 'تعذر الإقفال' }, { status: 500 })
    } else {
      const { error } = await g.db.from('period_locks').delete().eq('org_id', org).eq('month', month)
      if (error) return NextResponse.json({ error: 'تعذر الفتح' }, { status: 500 })
    }
    await Promise.all([
      g.db.from('period_lock_log').insert({ org_id: org, month, action: b.action, by_name: by } as any),
      g.db.from('notifications').insert({ org_id: org, type: 'info', read: false,
        title: b.action === 'lock' ? `🔒 محاسبك أقفل شهر ${label}` : `🔓 محاسبك فتح شهر ${label}`,
        message: b.action === 'lock' ? `${by} راجع شهر ${label} وأقفله — ما ينقدر يتعدّل فيه مشتريات ولا إقفالات كاشير.` : `${by} فتح شهر ${label} — صار ينقدر يتعدّل.` } as any),
    ])
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
