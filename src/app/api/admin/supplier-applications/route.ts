import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requirePermission } from '@/lib/adminAuth'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: Request) {
  const adminKey = req.headers.get('x-admin-key')
  if(!(await requirePermission(adminKey, 'manage_suppliers'))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const { data } = await sb().from('supplier_applications').select('id,company_name,status,contact_name,phone,email,website,business_type,description,created_at').order('created_at', {ascending:false})
  return NextResponse.json({ data: data || [] })
}

export async function POST(req: Request) {
  const adminKey = req.headers.get('x-admin-key')
  if(!(await requirePermission(adminKey, 'manage_suppliers'))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const { id, status } = await req.json()
  await sb().from('supplier_applications').update({ status }).eq('id', id)
  return NextResponse.json({ success: true })
}
