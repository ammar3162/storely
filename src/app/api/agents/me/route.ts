import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { currentAgent, encryptIban } from '@/lib/agentAuth'
import { normalizeIban, isValidSaIban } from '@/lib/agentRewards'
import { siteUrl } from '@/lib/accountantSend'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// محفظة المندوب: الرصيد، والمنشآت اللي جابها، والمكافآت، والصرف
export async function GET(req: Request) {
  try {
    const db = sb()
    const me = await currentAgent(db, req)
    if (!me) return NextResponse.json({ error: 'سجّل دخولك' }, { status: 401 })
    const [{ data: orgs }, { data: comms }, { data: pays }] = await Promise.all([
      db.from('organizations').select('id,name,referred_at').eq('referred_by_agent', me.id).order('referred_at', { ascending: false }).limit(200),
      db.from('agent_commissions').select('org_id,plan,billing_cycle,amount,status,created_at').eq('agent_id', me.id).order('created_at', { ascending: false }),
      db.from('agent_payouts').select('amount,method,note,created_at').eq('agent_id', me.id).order('created_at', { ascending: false }),
    ])
    const earned = ((comms || []) as any[]).filter(c => c.status === 'available').reduce((s, c) => s + Number(c.amount), 0)
    const paid = ((pays || []) as any[]).reduce((s, p) => s + Number(p.amount), 0)
    const byOrg = new Map(((comms || []) as any[]).map(c => [c.org_id, c]))
    const customers = ((orgs || []) as any[]).map(o => {
      const c = byOrg.get(o.id) as any
      return { name: o.name, joined_at: o.referred_at, status: c ? (c.status === 'cancelled' ? 'cancelled' : 'paid') : 'trial', reward: c && c.status === 'available' ? Number(c.amount) : null, rewarded_at: c?.created_at || null }
    })
    return NextResponse.json({ success: true, agent: { name: me.name, code: me.code, email: me.email, phone: me.phone, payout_method: me.payout_method, iban_last4: me.iban_last4 },
      link: `${siteUrl()}/r/${me.code}`, wallet: { balance: earned - paid, earned, paid }, customers, payouts: pays || [] })
  } catch {
    return NextResponse.json({ error: 'تعذر التحميل، حاول مرة ثانية' }, { status: 500 })
  }
}

// تعديل طريقة الاستلام
export async function PATCH(req: Request) {
  try {
    const db = sb()
    const me = await currentAgent(db, req)
    if (!me) return NextResponse.json({ error: 'سجّل دخولك' }, { status: 401 })
    const b = await req.json()
    if (b.payout_method === 'cash') {
      await db.from('sales_agents').update({ payout_method: 'cash' } as any).eq('id', me.id)
      return NextResponse.json({ success: true })
    }
    if (b.payout_method !== 'transfer') return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
    const iban = normalizeIban(b.iban)
    if (!isValidSaIban(iban)) return NextResponse.json({ error: 'رقم الآيبان غير صحيح — ٢٤ خانة يبدأ بـ SA' }, { status: 400 })
    await db.from('sales_agents').update({ payout_method: 'transfer', iban_enc: encryptIban(iban), iban_last4: iban.slice(-4) } as any).eq('id', me.id)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'تعذر الحفظ' }, { status: 500 })
  }
}
