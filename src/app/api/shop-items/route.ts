import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyOrgAccess } from '@/lib/verifyOrgAccess'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const { org_id, item_id, name, category, price, description, image_url, is_featured } = await req.json()
    if (!org_id || !name) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })

    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })

    const supabase = sb()
    const payload = {
      org_id, name: name.trim(), category: category?.trim() || 'منتجات خارجية',
      price: price !== undefined && price !== '' ? Number(price) : null,
      description: description?.trim() || null, image_url: image_url || null,
      is_featured: !!is_featured,
    }

    if (item_id) {
      const { data: existing } = await supabase.from('shop_items').select('org_id').eq('id', item_id).maybeSingle()
      if (!existing || (existing as any).org_id !== org_id) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
      const { error } = await supabase.from('shop_items').update(payload as any).eq('id', item_id)
      if (error) return NextResponse.json({ error: 'فشل التحديث' }, { status: 500 })
      return NextResponse.json({ success: true, id: item_id })
    } else {
      const { data, error } = await supabase.from('shop_items').insert(payload as any).select('id').single()
      if (error) return NextResponse.json({ error: 'فشل الإضافة' }, { status: 500 })
      return NextResponse.json({ success: true, id: (data as any)?.id })
    }
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const { org_id, old_category, new_category } = await req.json()
    if (!org_id || !old_category || !new_category?.trim()) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })

    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })

    const supabase = sb()
    const { error } = await supabase.from('shop_items').update({ category: new_category.trim() } as any).eq('org_id', org_id).eq('category', old_category)
    if (error) return NextResponse.json({ error: 'فشل تغيير اسم القسم' }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const { org_id, item_id } = await req.json()
    if (!org_id || !item_id) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })

    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })

    const supabase = sb()
    const { data: existing } = await supabase.from('shop_items').select('org_id').eq('id', item_id).maybeSingle()
    if (!existing || (existing as any).org_id !== org_id) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })

    const { error } = await supabase.from('shop_items').delete().eq('id', item_id)
    if (error) return NextResponse.json({ error: 'فشل الحذف' }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
