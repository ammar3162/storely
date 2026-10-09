import type { SupabaseClient } from '@supabase/supabase-js'
import { normalizeAgentCode, agentReward } from '@/lib/agentRewards'
import { planKeyOf, PLAN_PRICING } from '@/lib/planPricing'
import { notifyAgent } from '@/lib/agentNotify'

const last9 = (p: string | null | undefined) => String(p || '').replace(/\D/g, '').slice(-9)

/** منشأة جديدة سجّلت بكود مندوب → نربطها فيه (مو لو المندوب سجّل نفسه) */
export async function attachReferral(db: SupabaseClient, o: { orgId: string; orgName: string; code: unknown; ownerEmail?: string | null; ownerPhone?: string | null }) {
  const code = normalizeAgentCode(o.code)
  if (!code) return null
  const { data: a } = await db.from('sales_agents').select('id,email,phone,status').eq('code', code).maybeSingle()
  const agent = a as any
  if (!agent || agent.status !== 'active') return null
  if ((o.ownerEmail && o.ownerEmail.toLowerCase() === agent.email) || (o.ownerPhone && last9(o.ownerPhone) === last9(agent.phone))) return null
  const { data: upd } = await db.from('organizations').update({ referred_by_agent: agent.id, referred_at: new Date().toISOString() } as any)
    .eq('id', o.orgId).is('referred_by_agent', null).select('id')
  if (!upd?.length) return null
  await notifyAgent(db, agent.id, { title: 'منشأة جديدة سجّلت من رابطك',
    lines: [`«${o.orgName}» سجّلت عن طريقك وبدأت فترة التجربة.`, 'أول ما تشترك وتدفع، تنضاف مكافأتك في محفظتك ويوصلك إشعار.'],
    whatsapp: `👏 «${o.orgName}» سجّلت من رابطك وبدأت التجربة.\nأول ما تشترك وتدفع تنضاف مكافأتك في محفظتك.` })
  return agent.id as string
}

/** أول اشتراك مدفوع لمنشأة جاء بها مندوب → مكافأة وحدة في محفظته (القيد الفريد على org_id يمنع التكرار) */
export async function awardAgentCommission(db: SupabaseClient, orgId: string) {
  const { data: org } = await db.from('organizations').select('name,plan,max_branches,billing_cycle,referred_by_agent').eq('id', orgId).maybeSingle()
  const o = org as any
  if (!o?.referred_by_agent) return null
  const { data: agent } = await db.from('sales_agents').select('id,status').eq('id', o.referred_by_agent).maybeSingle()
  if (!agent || (agent as any).status !== 'active') return null
  const plan = planKeyOf(o.plan, o.max_branches)
  const cycle = o.billing_cycle === 'yearly' ? 'yearly' : 'monthly'
  const amount = agentReward(plan, cycle)
  const { data: row, error } = await db.from('agent_commissions').insert({ agent_id: o.referred_by_agent, org_id: orgId, plan, billing_cycle: cycle, amount } as any).select('id').maybeSingle()
  if (error || !row) return null   // انحسبت من قبل
  await notifyAgent(db, o.referred_by_agent, { title: `تم اشتراك عميل جديد — ${amount} ريال في محفظتك`,
    lines: [`«${o.name}» اشتركت في ${PLAN_PRICING[plan].label} (${cycle === 'yearly' ? 'سنوي' : 'شهري'}).`, `انضاف لمحفظتك ${amount} ريال.`],
    whatsapp: `🎉 تم اشتراك «${o.name}» في Storely\n\nانضاف لمحفظتك *${amount} ريال* 💰` })
  return amount
}
