import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyOrgAccess, enforcedBranchId } from '@/lib/verifyOrgAccess'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
type DB = ReturnType<typeof sb>

// الوصفات مشتركة على مستوى المنشأة كاملة (branch_id = null) — تُعرَّف مرة وتشتغل بكل الفروع
//   GET ?org_id                      قائمة الوصفات
//   GET ?org_id&id                   وصفة مع مكوّناتها
//   GET ?org_id&view=prices          متوسط سعر الشراء لكل مادة خام (لتقدير تكلفة الوصفة)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const org_id = searchParams.get('org_id')
    const id = searchParams.get('id')
    if (!org_id) return NextResponse.json({ error: 'org_id مطلوب' }, { status: 400 })

    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })
    const db = sb()

    if (searchParams.get('view') === 'prices') {
      const bid = enforcedBranchId(access, searchParams.get('branch_id'))
      let q = db.from('purchases').select('name,qty,total_amount').eq('org_id', org_id).not('total_amount', 'is', null).not('qty', 'is', null)
      if (bid) q = q.eq('branch_id', bid)
      const { data, error } = await q
      if (error) return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
      const totals: Record<string, { total: number; qty: number }> = {}
      for (const p of (data || []) as any[]) {
        const qty = Number(p.qty) || 0
        if (!p.name || qty <= 0) continue
        totals[p.name] ??= { total: 0, qty: 0 }
        totals[p.name].total += Number(p.total_amount) || 0
        totals[p.name].qty += qty
      }
      const price_map: Record<string, number> = {}
      for (const nm in totals) price_map[nm] = totals[nm].qty > 0 ? totals[nm].total / totals[nm].qty : 0
      return NextResponse.json({ success: true, price_map })
    }

    if (id) {
      const { data: recipe } = await db.from('recipes').select('id,name,sell_price').eq('id', id).eq('org_id', org_id).maybeSingle()
      if (!recipe) return NextResponse.json({ error: 'الوصفة غير موجودة' }, { status: 404 })
      const { data: items } = await db.from('recipe_items').select('component_product_id,qty').eq('recipe_id', id)
      return NextResponse.json({ success: true, recipe, items: items || [] })
    }

    const { data, error } = await db.from('recipes').select('id,name').eq('org_id', org_id).order('created_at', { ascending: false })
    if (error) return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
    return NextResponse.json({ success: true, recipes: data || [] })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

/** المكوّنات لازم تكون أصناف تابعة للمنشأة */
async function validItems(db: DB, org_id: string, items: any[]) {
  const rows = (Array.isArray(items) ? items : [])
    .map(i => ({ component_product_id: String(i.component_product_id || ''), qty: Number(i.qty) }))
    .filter(i => i.component_product_id && i.qty > 0)
  if (!rows.length) return { rows }
  const ids = [...new Set(rows.map(r => r.component_product_id))]
  const { data } = await db.from('products').select('id').eq('org_id', org_id).in('id', ids)
  if ((data || []).length !== ids.length) return { error: 'مكوّن غير صالح' }
  return { rows }
}

// إنشاء وصفة { org_id, name, sell_price, items } أو تعديلها { ..., id } (المكوّنات تُستبدل بالكامل)
export async function POST(req: Request) {
  try {
    const { org_id, id, name, sell_price, items } = await req.json()
    const cleanName = String(name || '').trim()
    if (!org_id || !cleanName) return NextResponse.json({ error: 'أدخل اسم الوصفة' }, { status: 400 })

    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })

    const db = sb()
    const checked = await validItems(db, org_id, items)
    if (checked.error) return NextResponse.json({ error: checked.error }, { status: 400 })
    const sellPrice = sell_price === '' || sell_price == null ? null : Number(sell_price)

    let recipeId = id as string | undefined
    if (recipeId) {
      const { data, error } = await db.from('recipes').update({ name: cleanName, sell_price: sellPrice } as any).eq('id', recipeId).eq('org_id', org_id).select('id')
      if (error) return NextResponse.json({ error: 'فشل تحديث الوصفة' }, { status: 500 })
      if (!data?.length) return NextResponse.json({ error: 'الوصفة غير موجودة' }, { status: 404 })
      await db.from('recipe_items').delete().eq('recipe_id', recipeId)
    } else {
      const { data: nr, error } = await db.from('recipes').insert({ org_id, branch_id: null, name: cleanName, sell_price: sellPrice } as any).select('id').single()
      if (error || !nr) return NextResponse.json({ error: 'فشل حفظ الوصفة' }, { status: 500 })
      recipeId = (nr as any).id
    }

    if (checked.rows!.length) {
      const { error: itemsErr } = await db.from('recipe_items').insert(checked.rows!.map(r => ({ ...r, recipe_id: recipeId })) as any)
      if (itemsErr) return NextResponse.json({ error: 'تم حفظ اسم الوصفة لكن فشل حفظ المكوّنات: ' + itemsErr.message, id: recipeId }, { status: 500 })
    }
    return NextResponse.json({ success: true, id: recipeId, items_count: checked.rows!.length })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const org_id = searchParams.get('org_id')
    const id = searchParams.get('id')
    if (!org_id || !id) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })

    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })

    const { data, error } = await sb().from('recipes').delete().eq('id', id).eq('org_id', org_id).select('id')
    if (error) return NextResponse.json({ error: 'فشل حذف الوصفة' }, { status: 500 })
    if (!data?.length) return NextResponse.json({ error: 'الوصفة غير موجودة' }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
