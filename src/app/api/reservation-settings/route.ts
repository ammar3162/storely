import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyOrgAccess } from '@/lib/verifyOrgAccess'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const RESERVED = ['api', 'admin', 'storely-admin', 'shop', 'book', 'login', 'dashboard', 'settings', 'staff']

function slugify(input: string) {
  return input.trim().toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06ff\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60)
}

export async function POST(req: Request) {
  try {
    const { org_id, res_slug, res_enabled, res_display_name, res_logo_url, res_color, res_tagline, res_hours, res_max_guests, checkOnly } = await req.json()
    if (!org_id) return NextResponse.json({ error: 'org_id مطلوب' }, { status: 400 })

    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })

    const supabase = sb()
    const cleanSlug = res_slug ? slugify(res_slug) : null

    if (cleanSlug) {
      if (cleanSlug.length < 3) return NextResponse.json({ error: 'اسم الرابط قصير جداً (3 أحرف على الأقل)' }, { status: 400 })
      if (RESERVED.includes(cleanSlug)) return NextResponse.json({ error: 'هذا الاسم محجوز، جرّب اسم ثاني' }, { status: 400 })
      const { data: existing } = await supabase.from('organizations').select('id').eq('res_slug', cleanSlug).neq('id', org_id).maybeSingle()
      if (existing) return NextResponse.json({ error: 'هذا الاسم مستخدم بالفعل، جرّب اسم ثاني' }, { status: 400 })
    }

    if (checkOnly) return NextResponse.json({ success: true, available: true, slug: cleanSlug })

    const { error } = await supabase.from('organizations').update({
      res_slug: cleanSlug, res_enabled: !!res_enabled, res_display_name: res_display_name?.trim() || null,
      res_logo_url: res_logo_url || null, res_color: res_color || '#B86E3F', res_tagline: res_tagline?.trim() || null,
      res_hours: res_hours || { enabled: false, is24h: true, open: '08:00', close: '23:00' },
      res_max_guests: res_max_guests || 10,
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
    const slug = searchParams.get('slug')

    const supabase = sb()

    // استعلام عام بالـslug — لصفحة الحجز نفسها، بدون تسجيل دخول
    if (slug) {
      const { data: org } = await supabase.from('organizations')
        .select('id,res_slug,res_enabled,res_display_name,res_logo_url,res_color,res_tagline,res_hours,res_max_guests,name')
        .eq('res_slug', slug).maybeSingle()
      if (!org || !(org as any).res_enabled) return NextResponse.json({ error: 'غير متاح' }, { status: 404 })

      const { data: addon } = await supabase.from('marketplace_addons').select('id').eq('slug', 'table_reservations').maybeSingle()
      if (!addon) return NextResponse.json({ error: 'غير متاح' }, { status: 404 })
      const { data: sub } = await supabase.from('org_addon_subscriptions').select('status,expires_at').eq('org_id', (org as any).id).eq('addon_id', (addon as any).id).eq('status', 'active').maybeSingle()
      if (!sub || new Date((sub as any).expires_at) <= new Date()) return NextResponse.json({ error: 'غير متاح' }, { status: 404 })

      return NextResponse.json({ success: true, org })
    }

    if (!org_id) return NextResponse.json({ error: 'org_id مطلوب' }, { status: 400 })

    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })

    const { data: org } = await supabase.from('organizations')
      .select('res_slug,res_enabled,res_display_name,res_logo_url,res_color,res_tagline,res_hours,res_max_guests,name')
      .eq('id', org_id).maybeSingle()

    return NextResponse.json({ success: true, org })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
