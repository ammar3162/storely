import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { verifyAdminSession } from '@/lib/adminAuth'
import { countSince, usageLevel, EMAIL_DAILY_LIMIT, EMAIL_WARN_AT } from '@/lib/emailUsage'

// عدد إيميلات آخر 24 ساعة في Resend (المرسلة + الواردة) مقابل حد الباقة المجانية — لأي مشرف
export async function GET(req: Request) {
  const admin = await verifyAdminSession(req.headers.get('x-admin-key'))
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const key = process.env.RESEND_RECEIVING_API_KEY
  if (!key) return NextResponse.json({ success: true, available: false })
  const resend = new Resend(key), since = Date.now() - 24 * 3600 * 1000
  try {
    const sent = await countSince(after => resend.emails.list({ limit: 100, ...(after ? { after } : {}) }).then(r => r.data as any), since)
    const received = await countSince(after => resend.emails.receiving.list({ limit: 100, ...(after ? { after } : {}) }).then(r => r.data as any), since)
    const used = sent + received
    return NextResponse.json({ success: true, available: true, used, sent, received, limit: EMAIL_DAILY_LIMIT, warnAt: EMAIL_WARN_AT, level: usageLevel(used) })
  } catch {
    return NextResponse.json({ success: true, available: false })
  }
}
