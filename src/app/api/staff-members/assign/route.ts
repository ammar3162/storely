import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyOrgAccess } from '@/lib/verifyOrgAccess'
import { loadOwnedStaff } from '@/lib/staffAccess'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// تخصيص منتجات لموظف — كل منتج لموظف واحد فقط. التعارض يُفحص هنا من قاعدة البيانات مباشرة.
//   { product_ids, override_ids? }: يستبدل القائمة كاملة؛ override_ids = منتجات يسحبها المالك صراحة من موظف آخر
//   { add_product_id }: يضيف منتج واحد (يرفض لو مخصص لغيره)
export async function POST(req: Request) {
  try {
    const { org_id, staff_id, product_ids, override_ids, add_product_id } = await req.json()
    if (!org_id || !staff_id) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })

    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })

    const db = sb()
    const target = await loadOwnedStaff(db, access, org_id, staff_id)
    if (!target) return NextResponse.json({ error: 'الموظف غير موجود' }, { status: 404 })

    const { data: others } = await db.from('staff_members').select('id,name,assigned_products').eq('org_id', org_id).neq('id', staff_id)

    if (add_product_id) {
      const conflict = (others || []).find((s: any) => (s.assigned_products || []).includes(add_product_id))
      if (conflict) return NextResponse.json({ error: `تعذّر التخصيص — هذا المنتج مخصص أصلاً لـ${(conflict as any).name}` }, { status: 409 })
      const updated = Array.from(new Set([...(target.assigned_products || []), add_product_id]))
      const { error } = await db.from('staff_members').update({ assigned_products: updated } as any).eq('id', staff_id)
      if (error) return NextResponse.json({ error: 'فشل التخصيص' }, { status: 500 })
      return NextResponse.json({ success: true })
    }

    if (!Array.isArray(product_ids)) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
    const selected: string[] = product_ids.map(String)
    const overrides = new Set<string>((Array.isArray(override_ids) ? override_ids : []).map(String))

    const conflictNames = new Set<string>()
    const toStrip: { id: string; assigned_products: string[] }[] = []
    for (const s of (others || []) as any[]) {
      const overlap = (s.assigned_products || []).filter((pid: string) => selected.includes(pid))
      if (!overlap.length) continue
      if (overlap.every((pid: string) => overrides.has(pid))) {
        toStrip.push({ id: s.id, assigned_products: (s.assigned_products || []).filter((pid: string) => !overlap.includes(pid)) })
      } else {
        conflictNames.add(s.name)
      }
    }
    if (conflictNames.size) {
      return NextResponse.json({ error: `تعذّر الحفظ — بعض المنتجات صارت مخصصة لموظف آخر (${Array.from(conflictNames).join('، ')}) بينما كانت النافذة مفتوحة. أعد المحاولة.` }, { status: 409 })
    }

    for (const s of toStrip) {
      await db.from('staff_members').update({ assigned_products: s.assigned_products } as any).eq('id', s.id).eq('org_id', org_id)
    }
    const { error } = await db.from('staff_members').update({ assigned_products: selected } as any).eq('id', staff_id)
    if (error) return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
