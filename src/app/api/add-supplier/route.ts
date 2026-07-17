import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyOrgAccess } from '@/lib/verifyOrgAccess'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { org_id } = body
    if (!org_id) return NextResponse.json({ error: 'org_id مطلوب' }, { status: 400 })

    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })

    const supabase = sb()

    const { data: org } = await supabase
      .from('organizations')
      .select('max_suppliers')
      .eq('id', org_id)
      .single()

    const maxSup = (org as any)?.max_suppliers || 1

    const { count } = await supabase
      .from('suppliers')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', org_id)
      .eq('is_active', true)

    if ((count || 0) >= maxSup) {
      return NextResponse.json({
        error: `وصلت للحد الأقصى (${maxSup} مورد) — يرجى ترقية الباقة`
      }, { status: 403 })
    }

    const { data: newSup, error } = await supabase
      .from('suppliers')
      .insert({ ...body, is_active: true })
      .select()
      .single()

    if (error) { console.error('SUPPLIER INSERT ERROR:', error); return NextResponse.json({ error: error.message }, { status: 500 }) }

    return NextResponse.json({ success: true, supplier: newSup })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
