import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isCronRequest } from '@/lib/cronAuth'
import { isSubscriptionActive } from '@/lib/subscription'
import { duePeriod, scheduleToday } from '@/lib/accountantSchedule'
import { sendAccountantReport } from '@/lib/accountantSend'
import { inviteStatus } from '@/lib/accountantInvite'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
export const maxDuration = 300

// كل ساعة: يرسل تقارير المحاسبين اللي جا موعدها (الساعة اللي حددها المالك)
export async function GET(req: Request) {
  if (!isCronRequest(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const db = sb()
  const { data: links } = await db.from('accountant_links')
    .select('id,org_id,branch_id,name,email,whatsapp,channels,sections,frequency,weekday,month_day,send_hour,vat_registered,last_period_end').eq('is_active', true)
  let sent = 0, failed = 0
  for (const link of (links || []) as any[]) {
    const period = duePeriod(link, scheduleToday(link))
    if (!period) continue
    try {
      if (!(await isSubscriptionActive(db, link.org_id))) continue
      // المحاسب ما قبل الدعوة للحين → ننتظر (ما نعلّم الفترة، تنرسل أول موعد بعد قبوله)
      if ((await inviteStatus(db, link.org_id, link.email)) === 'pending') continue
      // نعلّم الفترة قبل الإرسال — لو انعادت المهمة ما يتكرر التقرير
      const { data: claimed } = await db.from('accountant_links').update({ last_period_end: period.end } as any)
        .eq('id', link.id).or(`last_period_end.is.null,last_period_end.lt.${period.end}`).select('id')
      if (!claimed?.length) continue
      const r = await sendAccountantReport(db, link, period)
      if (r.email_status === 'failed' || r.whatsapp_status === 'failed') failed++; else sent++
    } catch (e) {
      failed++
      console.error('ACCOUNTANT_REPORT_FAILED', link.org_id, e)
    }
  }
  return NextResponse.json({ ok: true, sent, failed })
}
