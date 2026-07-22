import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requirePermission } from '@/lib/adminAuth'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  const { data } = await sb().from('platform_settings').select('maintenance_mode,maintenance_message').eq('id', 1).single()
  return NextResponse.json({
    maintenanceMode: (data as any)?.maintenance_mode || false,
    maintenanceMessage: (data as any)?.maintenance_message || 'الموقع بصيانة مؤقتة، بنرجع قريباً 🛠️',
  })
}

export async function POST(req: Request) {
  const adminKey = req.headers.get('x-admin-key')
  if (!(await requirePermission(adminKey, 'view_consent_logs'))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const { maintenanceMode, maintenanceMessage } = await req.json()
  const update: any = {}
  if (typeof maintenanceMode === 'boolean') update.maintenance_mode = maintenanceMode
  if (typeof maintenanceMessage === 'string') update.maintenance_message = maintenanceMessage
  const { error } = await sb().from('platform_settings').update(update).eq('id', 1)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
