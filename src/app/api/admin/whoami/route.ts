import { NextResponse } from 'next/server'
import { verifyAdminSession } from '@/lib/adminAuth'

export async function GET(req: Request) {
  const adminKey = req.headers.get('x-admin-key')
  const legacyPassword = process.env.ADMIN_PASSWORD || 'storely@2026'

  // كلمة المرور القديمة الثابتة تُعتبر مصرّح لها دائماً (توافق قديم)
  if (adminKey === legacyPassword) {
    return NextResponse.json({ authenticated: true, admin: { role: 'super_admin', full_name: 'مفتاح النظام' } })
  }

  const session = await verifyAdminSession(adminKey)
  if (!session) return NextResponse.json({ authenticated: false }, { status: 401 })

  return NextResponse.json({ authenticated: true, admin: session })
}
