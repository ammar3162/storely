import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { deleteOrgCompletely } from '@/lib/deleteOrg'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    // تحقق أمان — يقبل بس Vercel Cron الرسمي أو مفتاح يدوي للاختبار
    const cronSecret = req.headers.get('x-cron-secret')
    const authHeader = req.headers.get('authorization')
    const isManualAuth = cronSecret === process.env.ADMIN_PASSWORD
    const isVercelCron = authHeader === `Bearer ${process.env.CRON_SECRET}`
    if (!isManualAuth && !isVercelCron) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    const now = new Date().toISOString()
    const { data: dueOrgs } = await sb().from('organizations')
      .select('id,name')
      .not('deletion_scheduled_at', 'is', null)
      .lte('deletion_scheduled_at', now)

    const results = []
    for (const org of dueOrgs || []) {
      const result = await deleteOrgCompletely((org as any).id)
      results.push({ org: (org as any).name, success: result.success, errors: result.errors })
    }

    return NextResponse.json({ success: true, processed: results.length, results })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
export async function GET(req: Request) { return POST(new Request('http://localhost',{method:'POST',body:'{}',headers:req.headers})) }
