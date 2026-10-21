import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyOrgAccess, enforcedBranchId } from '@/lib/verifyOrgAccess'
import { resolveMenuScope } from '@/lib/shopMenu'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// يضيف أصناف للمنيو من الوصفات (بسعر البيع) أو من مخزون الفرع — الاسم والسعر من قاعدة البيانات
export async function POST(req: Request) {
  try {
    const { org_id, branch_id, scope: target, category, recipe_ids, product_ids } = await req.json()
    const recipeIds = Array.isArray(recipe_ids) ? recipe_ids.filter((x: any) => typeof x === 'string').slice(0, 200) : []
    const productIds = Array.isArray(product_ids) ? product_ids.filter((x: any) => typeof x === 'string').slice(0, 200) : []
    if (!org_id || !String(category || '').trim() || (!recipeIds.length && !productIds.length)) {
      return NextResponse.json({ error: 'اختر القسم والأصناف' }, { status: 400 })
    }

    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })

    const supabase = sb()
    const scope = await resolveMenuScope(supabase, org_id, access, branch_id)
    if (!scope.ok) return NextResponse.json({ error: scope.error }, { status: scope.status })
    if (scope.mode === 'branch' && target === 'all' && !scope.canManageOrg) {
      return NextResponse.json({ error: 'أصناف كل الفروع يضيفها مالك المنشأة' }, { status: 403 })
    }
    const itemBranch = scope.mode === 'branch' && target !== 'all' ? scope.branchId : null
    // مصدر الأصناف: الفرع المختار (أو فرع المدير بالمنيو الموحد)
    const srcBranch = scope.branchId || enforcedBranchId(access, null)

    const [{ data: recipes }, { data: products }] = await Promise.all([
      recipeIds.length
        ? (() => {
            let q = supabase.from('recipes').select('id,name,sell_price').eq('org_id', org_id).in('id', recipeIds)
            if (srcBranch) q = q.or(`branch_id.eq.${srcBranch},branch_id.is.null`)
            return q
          })()
        : Promise.resolve({ data: [] as any[] }),
      productIds.length
        ? (() => {
            let q = supabase.from('products').select('id,name,public_price,public_image_url,public_description').eq('org_id', org_id).eq('is_active', true).in('id', productIds)
            if (srcBranch) q = q.eq('branch_id', srcBranch)
            return q
          })()
        : Promise.resolve({ data: [] as any[] }),
    ])

    // ما نكرر صنف موجود بنفس الاسم بهالمنيو
    let existingQ = supabase.from('shop_items').select('name').eq('org_id', org_id)
    if (scope.mode === 'branch') existingQ = existingQ.or(`branch_id.eq.${scope.branchId},branch_id.is.null`)
    const { data: existing } = await existingQ
    const taken = new Set((existing || []).map((r: any) => String(r.name).trim().toLowerCase()))

    const cat = String(category).trim()
    const rows: any[] = []
    const add = (name: string, price: any, image: string | null, description: string | null) => {
      const key = String(name || '').trim().toLowerCase()
      if (!key || taken.has(key)) return
      taken.add(key)
      rows.push({
        org_id, branch_id: itemBranch, name: String(name).trim(), category: cat,
        price: price !== null && price !== undefined && Number(price) > 0 ? Number(price) : null,
        image_url: image || null, description: description || null, is_featured: false,
      })
    }
    for (const r of recipes || []) add((r as any).name, (r as any).sell_price, null, null)
    for (const p of products || []) add((p as any).name, (p as any).public_price, (p as any).public_image_url, (p as any).public_description)

    if (!rows.length) return NextResponse.json({ success: true, added: 0, skipped: recipeIds.length + productIds.length })
    const { error } = await supabase.from('shop_items').insert(rows)
    if (error) return NextResponse.json({ error: 'فشل الإضافة' }, { status: 500 })
    return NextResponse.json({ success: true, added: rows.length, skipped: recipeIds.length + productIds.length - rows.length })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
