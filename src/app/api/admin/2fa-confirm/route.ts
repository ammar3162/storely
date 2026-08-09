import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { authenticator } from 'otplib'
import { verifyAdminSession } from '@/lib/adminAuth'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// الخطوة 2: يتأكد من رمز صحيح من التطبيق، وبعدها يفعّل التحقق الثنائي فعلياً
export async function POST(req: Request) {
  try {
    const adminKey = req.headers.get('x-admin-key')
    const session = await verifyAdminSession(adminKey)
    if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const { code } = await req.json()
    if (!code) return NextResponse.json({ error: 'أدخل الرمز' }, { status: 400 })

    const db = sb()
    const { data: admin } = await db.from('admin_users').select('totp_secret').eq('id', session.id).maybeSingle()
    if (!(admin as any)?.totp_secret) return NextResponse.json({ error: 'لم يتم إنشاء سر التحقق بعد' }, { status: 400 })

    const valid = authenticator.verify({ token: String(code).trim(), secret: (admin as any).totp_secret })
    if (!valid) return NextResponse.json({ error: 'الرمز غير صحيح' }, { status: 401 })

    await (db as any).from('admin_users').update({ totp_enabled: true }).eq('id', session.id)
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
