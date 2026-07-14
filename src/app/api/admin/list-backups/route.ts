import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isValidAdminKey } from '@/lib/adminAuth'

export async function GET(req: Request) {
  const adminKey = req.headers.get('x-admin-key')
  const correct = process.env.ADMIN_PASSWORD || 'storely@2026'
  if (!(await isValidAdminKey(adminKey))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: orgs } = await supabase.from('organizations').select('id,name')
    const orgMap: Record<string, string> = {}
    ;(orgs || []).forEach((o: any) => { orgMap[o.id] = o.name })

    const result: any[] = []
    for (const org of orgs || []) {
      const { data: files, error } = await supabase.storage.from('backups').list(org.id, {
        sortBy: { column: 'created_at', order: 'desc' },
      })
      if (error || !files || files.length === 0) continue

      const filesWithUrls = await Promise.all(
        files.map(async (f: any) => {
          const { data: signed } = await supabase.storage
            .from('backups')
            .createSignedUrl(`${org.id}/${f.name}`, 3600)
          return {
            name: f.name,
            size: f.metadata?.size || 0,
            created_at: f.created_at,
            url: signed?.signedUrl || null,
          }
        })
      )

      result.push({
        org_id: org.id,
        org_name: orgMap[org.id] || org.id,
        files: filesWithUrls,
      })
    }

    return NextResponse.json({ success: true, backups: result })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
