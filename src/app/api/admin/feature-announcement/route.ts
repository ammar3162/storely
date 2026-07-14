import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isValidAdminKey } from '@/lib/adminAuth'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(req: Request) {
  const adminKey = req.headers.get('x-admin-key')
  if(!(await isValidAdminKey(adminKey))) return NextResponse.json({error:'unauthorized'},{status:401})
  
  const { version, title, description, type, color, target_orgs } = await req.json()
  
  await sb().from('feature_announcements' as any).insert({
    version, title, description, type: type||'banner',
    color: color||'#7c3aed', icon: '📢',
    target_orgs: target_orgs||[]
  })
  
  return NextResponse.json({ success: true })
}
