import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requirePermission, logAdminAction } from '@/lib/adminAuth'
import { decryptIban } from '@/lib/agentAuth'
import { notifyAgent } from '@/lib/agentNotify'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const UUID_RE = /^[0-9a-f-]{36}$/i

// المناديب في لوحة الإدارة: الرصيد لكل مندوب، والصرف، والإيقاف
export async function GET(req: Request) {
  if (!(await requirePermission(req.headers.get('x-admin-key'), 'manage_users'))) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const db = sb()
  const [{ data: agents }, { data: comms }, { data: pays }, { data: orgs }] = await Promise.all([
    db.from('sales_agents').select('id,code,name,phone,email,payout_method,iban_last4,status,created_at,last_login_at').order('created_at', { ascending: false }),
    db.from('agent_commissions').select('agent_id,org_id,amount,status,created_at,organizations(name)').order('created_at', { ascending: false }),
    db.from('agent_payouts').select('agent_id,amount,method,note,paid_by,created_at').order('created_at', { ascending: false }),
    db.from('organizations').select('id,referred_by_agent').not('referred_by_agent', 'is', null),
  ])
  const list = ((agents || []) as any[]).map(a => {
    const c = ((comms || []) as any[]).filter(x => x.agent_id === a.id)
    const p = ((pays || []) as any[]).filter(x => x.agent_id === a.id)
    const earned = c.filter(x => x.status === 'available').reduce((s, x) => s + Number(x.amount), 0)
    const paid = p.reduce((s, x) => s + Number(x.amount), 0)
    return { ...a, signups: ((orgs || []) as any[]).filter(o => o.referred_by_agent === a.id).length, paidCustomers: c.filter(x => x.status === 'available').length,
      earned, paid, balance: earned - paid, commissions: c.map(x => ({ org: x.organizations?.name, amount: Number(x.amount), status: x.status, created_at: x.created_at })), payouts: p }
  })
  return NextResponse.json({ success: true, agents: list })
}

export async function POST(req: Request) {
  const admin = await requirePermission(req.headers.get('x-admin-key'), 'manage_users')
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  try {
    const b = await req.json()
    if (!UUID_RE.test(String(b.agent_id || ''))) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
    const db = sb()
    const { data: agent } = await db.from('sales_agents').select('id,name,iban_enc,payout_method').eq('id', b.agent_id).maybeSingle()
    if (!agent) return NextResponse.json({ error: 'المندوب غير موجود' }, { status: 404 })

    if (b.action === 'reveal_iban') {
      await logAdminAction(admin, 'agent_reveal_iban', b.agent_id, (agent as any).name, {})
      return NextResponse.json({ success: true, iban: decryptIban((agent as any).iban_enc) })
    }
    if (b.action === 'status') {
      const status = b.status === 'suspended' ? 'suspended' : 'active'
      await db.from('sales_agents').update({ status } as any).eq('id', b.agent_id)
      if (status === 'suspended') await db.from('agent_sessions').update({ revoked_at: new Date().toISOString() } as any).eq('agent_id', b.agent_id).is('revoked_at', null)
      await logAdminAction(admin, 'agent_status', b.agent_id, (agent as any).name, { status })
      return NextResponse.json({ success: true })
    }
    if (b.action === 'payout') {
      const amount = Math.round(Number(b.amount) * 100) / 100
      if (!(amount > 0)) return NextResponse.json({ error: 'اكتب المبلغ' }, { status: 400 })
      const [{ data: c }, { data: p }] = await Promise.all([
        db.from('agent_commissions').select('amount').eq('agent_id', b.agent_id).eq('status', 'available'),
        db.from('agent_payouts').select('amount').eq('agent_id', b.agent_id),
      ])
      const balance = ((c || []) as any[]).reduce((s, x) => s + Number(x.amount), 0) - ((p || []) as any[]).reduce((s, x) => s + Number(x.amount), 0)
      if (amount > balance + 0.001) return NextResponse.json({ error: `الرصيد ${balance} ريال بس` }, { status: 400 })
      const method = b.method === 'transfer' ? 'transfer' : 'cash'
      const note = String(b.note || '').trim().slice(0, 200) || null
      const { error } = await db.from('agent_payouts').insert({ agent_id: b.agent_id, amount, method, note, paid_by: admin.email } as any)
      if (error) return NextResponse.json({ error: 'تعذر التسجيل' }, { status: 500 })
      await logAdminAction(admin, 'agent_payout', b.agent_id, (agent as any).name, { amount, method })
      await notifyAgent(db, b.agent_id, { title: `صرفنا لك ${amount} ريال`, lines: [`تم صرف ${amount} ريال ${method === 'transfer' ? 'بتحويل بنكي' : 'كاش'}.`, 'شكراً لك — تقدر تشوف التفاصيل في محفظتك.'],
        whatsapp: `💸 صرفنا لك *${amount} ريال* ${method === 'transfer' ? 'بتحويل بنكي' : 'كاش'}.\nشكراً لك 🌷` })
      return NextResponse.json({ success: true })
    }
    return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
