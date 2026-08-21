import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const slug = url.searchParams.get('slug') || 'test-cofe'
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { data: org, error: orgErr } = await supabase
      .from('organizations')
      .select('id,name,shop_slug,shop_enabled')
      .eq('shop_slug', slug)
      .maybeSingle()

    const { data: addon, error: addonErr } = await supabase
      .from('marketplace_addons')
      .select('id')
      .eq('slug', 'online_menu')
      .maybeSingle()

    let sub = null, subErr = null
    if (org && addon) {
      const r = await supabase
        .from('org_addon_subscriptions')
        .select('status,expires_at')
        .eq('org_id', (org as any).id)
        .eq('addon_id', (addon as any).id)
        .eq('status', 'active')
        .maybeSingle()
      sub = r.data; subErr = r.error
    }

    return NextResponse.json({
      supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      org, orgErr,
      addon, addonErr,
      sub, subErr,
    })
  } catch (e: any) {
    return NextResponse.json({ fatal_error: String(e?.message || e) }, { status: 500 })
  }
}
