import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const PRICE_MAP: Record<string,string> = {
  basic:    process.env.STRIPE_PRICE_BASIC!,
  pro:      process.env.STRIPE_PRICE_PRO!,
  advanced: process.env.STRIPE_PRICE_ADVANCED!,
}

export async function POST(req: Request) {
  try {
    const { plan, org_id, user_id, email } = await req.json()
    if (!plan || !org_id || !user_id) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })

    const priceId = PRICE_MAP[plan]
    if (!priceId) return NextResponse.json({ error: 'باقة غير صحيحة' }, { status: 400 })

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: email,
      metadata: { org_id, user_id, plan },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings?payment=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings?payment=cancelled`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
