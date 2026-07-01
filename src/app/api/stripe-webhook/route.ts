import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
const getSb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const PLAN_LIMITS: Record<string,{max_branches:number,max_staff:number,max_suppliers:number}> = {
  basic:    { max_branches:1,  max_staff:2,   max_suppliers:3   },
  pro:      { max_branches:3,  max_staff:10,  max_suppliers:10  },
  advanced: { max_branches:99, max_staff:999, max_suppliers:999 },
}

export async function POST(req: Request) {
  const body = await req.text()
  const sig  = req.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: 'Webhook signature invalid' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const { org_id, user_id, plan } = session.metadata!
    const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.basic
    const ends = new Date()
    ends.setMonth(ends.getMonth() + 1)

    const sb = getSb()
    await sb.from('organizations').update({
      plan: plan==='pro'?'pro':plan==='advanced'?'advanced':'basic',
      max_branches:  limits.max_branches,
      max_staff:     limits.max_staff,
      max_suppliers: limits.max_suppliers,
    } as any).eq('id', org_id)

    await sb.from('profiles').update({
      subscription_type: 'paid',
      subscription_ends_at: ends.toISOString(),
    } as any).eq('id', user_id)
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object as Stripe.Subscription
    const org_id = sub.metadata?.org_id
    if (org_id) {
      const sb2 = getSb()
      await sb2.from('profiles').update({
        subscription_type: 'trial',
        subscription_ends_at: new Date().toISOString(),
      } as any).eq('org_id', org_id)
    }
  }

  return NextResponse.json({ received: true })
}
