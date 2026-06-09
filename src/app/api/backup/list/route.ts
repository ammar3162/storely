import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const { org_id } = await req.json()
    if (!org_id) return NextResponse.json({ success:false, message:'org_id مطلوب' })
    const { data: files, error } = await supabase.storage.from('backups').list(org_id, { limit:10, sortBy:{ column:'created_at', order:'desc' } })
    if (error) return NextResponse.json({ success:false, error:error.message })
    const backups = await Promise.all((files||[]).map(async (file) => {
      const { data: urlData } = await supabase.storage.from('backups').createSignedUrl(`${org_id}/${file.name}`, 3600)
      return { name:file.name, size:file.metadata?.size||0, created_at:file.created_at, url:urlData?.signedUrl||null }
    }))
    return NextResponse.json({ success:true, backups })
  } catch (err: any) { return NextResponse.json({ success:false, error:err.message }, { status:500 }) }
}
