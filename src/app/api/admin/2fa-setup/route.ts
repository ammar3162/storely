import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { authenticator } from 'otplib'
import QRCode from 'qrcode'
import { verifyAdminSession } from '@/lib/adminAuth'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const adminKey = req.headers.get('x-admin-key')
    const session = await verifyAdminSession(adminKey)
    if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const secret = authenticator.generateSecret()
    const otpauth = authenticator.keyuri(session.email, 'Storely Admin', secret)
    const qrDataUrl = await QRCode.toDataURL(otpauth)

    const db = sb()
    await (db as any).from('admin_users').update({ totp_secret: secret, totp_enabled: false }).eq('id', session.id)

    return NextResponse.json({ success: true, qrDataUrl, secret })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
