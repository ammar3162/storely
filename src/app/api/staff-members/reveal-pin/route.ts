import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyOrgAccess } from '@/lib/verifyOrgAccess'
import { loadOwnedStaff } from '@/lib/staffAccess'
import { decryptPin } from '@/lib/pinVault'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// أيقونة العين: يرجّع رمز PIN للمالك (أو مدير فرع الموظف) لما يضغط عليها فقط — ما ينحفظ في القائمة
export async function POST(req: Request) {
  try {
    const { org_id, id } = await req.json()
    if (!org_id || !id) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })

    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })

    const staff = await loadOwnedStaff(sb(), access, org_id, id)
    if (!staff) return NextResponse.json({ error: 'الموظف غير موجود' }, { status: 404 })

    const pin = decryptPin(staff.pin_enc)
    if (!pin) return NextResponse.json({ success: false, reason: 'unavailable' })
    return NextResponse.json({ success: true, pin }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
