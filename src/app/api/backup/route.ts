import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    let body: any = {}; try { body = await req.json() } catch {}
    const orgIds: string[] = []
    if (body.org_id) { orgIds.push(body.org_id) } else {
      const { data: orgs } = await supabase.from('organizations').select('id')
      orgs?.forEach((o: any) => orgIds.push(o.id))
    }
    const results = []
    for (const org_id of orgIds) {
      const { data: org } = await supabase.from('organizations').select('*').eq('id', org_id).single()
      if (!org) continue
      const [{ data: products },{ data: purchases },{ data: movements },{ data: profiles }] = await Promise.all([
        supabase.from('products').select('*').eq('org_id', org_id),
        supabase.from('purchases').select('*').eq('org_id', org_id),
        supabase.from('stock_movements').select('*,products!inner(org_id)').eq('products.org_id', org_id),
        supabase.from('profiles').select('id,full_name,phone,role,status,created_at').eq('org_id', org_id),
      ])
      const backup = { meta:{ version:'1.0', exported_at:new Date().toISOString(), org_name:org.name, org_id }, organization:org, profiles, products, purchases, stock_movements:movements, summary:{ products_count:(products||[]).length, purchases_count:(purchases||[]).length, movements_count:(movements||[]).length, users_count:(profiles||[]).length } }
      const date = new Date().toISOString().split('T')[0]
      const filename = `${org_id}/${date}_backup.json`
      const { error: uploadError } = await supabase.storage.from('backups').upload(filename, JSON.stringify(backup,null,2), { contentType:'application/json', upsert:true })
      if (uploadError) { results.push({ org:org.name, success:false, error:uploadError.message }); continue }
      await supabase.from('organizations').update({ last_backup_at:new Date().toISOString() } as any).eq('id', org_id)
      results.push({ org:org.name, success:true, filename, summary:backup.summary })
    }
    return NextResponse.json({ success:true, results })
  } catch (err: any) { return NextResponse.json({ success:false, error:err.message }, { status:500 }) }
}
export async function GET() { return POST(new Request('http://localhost',{method:'POST',body:'{}'})) }
