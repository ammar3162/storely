import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyOrgAccess } from '@/lib/verifyOrgAccess'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const RESERVED = ['api', 'admin', 'storely-admin', 'shop', 'login', 'dashboard', 'settings', 'staff']

function slugify(input: string) {
  return input.trim().toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06ff\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60)
}

export async function POST(req: Request) {
  try {
    const { org_id, shop_slug, shop_enabled, shop_tagline, checkOnly } = await req.json()
    if (!org_id) return NextResponse.json({ error: 'org_id مطلوب' }, { status: 400 })

    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })

    const supabase = sb()
    const cleanSlug = shop_slug ? slugify(shop_slug) : null

    if (cleanSlug) {
      if (cleanSlug.length < 3) return NextResponse.json({ error: 'اسم الرابط قصير جداً (3 أحرف على الأقل)' }, { status: 400 })
      if (RESERVED.includes(cleanSlug)) return NextResponse.json({ error: 'هذا الاسم محجوز، جرّب اسم ثاني' }, { status: 400 })
      const { data: existing } = await supabase.from('organizations').select('id').eq('shop_slug', cleanSlug).neq('id', org_id).maybeSingle()
      if (existing) return NextResponse.json({ error: 'هذا الاسم مستخدم بالفعل، جرّب اسم ثاني' }, { status: 400 })
    }

    if (checkOnly) return NextResponse.json({ success: true, available: true, slug: cleanSlug })

    const { error } = await supabase.from('organizations').update({
      shop_slug: cleanSlug, shop_enabled: !!shop_enabled, shop_tagline: shop_tagline?.trim() || null,
    } as any).eq('id', org_id)

    if (error) return NextResponse.json({ error: 'فشل الحفظ — الاسم مستخدم بالفعل غالباً' }, { status: 500 })

    return NextResponse.json({ success: true, slug: cleanSlug })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const org_id = searchParams.get('org_id')
    if (!org_id) return NextResponse.json({ error: 'org_id مطلوب' }, { status: 400 })

    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })

    const supabase = sb()
    const { data: org } = await supabase.from('organizations').select('shop_slug,shop_enabled,shop_tagline,name,logo_url').eq('id', org_id).maybeSingle()
    const bid = searchParams.get('branch_id')
    let q = supabase.from('products').select('id,name,unit,category,show_on_shop,public_price,public_description,public_image_url').eq('org_id', org_id).eq('is_active', true)
    if (bid) q = q.eq('branch_id', bid)
    const { data: products } = await q.order('name')

    return NextResponse.json({ success: true, org, products: products || [] })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
