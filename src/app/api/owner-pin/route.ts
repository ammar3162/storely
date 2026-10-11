import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyOrgAccess } from '@/lib/verifyOrgAccess'
import { ownerPinIsSet, setOwnerPin } from '@/lib/ownerPin'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function ownerOnly(org_id: unknown) {
  if (typeof org_id !== 'string' || !/^[0-9a-f-]{36}$/i.test(org_id)) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
  const access = await verifyOrgAccess(org_id)
  if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })
  if (access.role !== 'owner') return NextResponse.json({ error: 'رمز الحماية لمالك الحساب بس' }, { status: 403 })
  return null
}

// هل اختار المالك رمز الحماية؟
export async function GET(req: Request) {
  const org_id = new URL(req.url).searchParams.get('org_id')
  const deny = await ownerOnly(org_id); if (deny) return deny
  return NextResponse.json({ success: true, isSet: await ownerPinIsSet(sb(), org_id!) })
}

// اختيار الرمز أو تغييره (التغيير يحتاج الرمز الحالي)
export async function POST(req: Request) {
  try {
    const b = await req.json()
    const deny = await ownerOnly(b.org_id); if (deny) return deny
    const r = await setOwnerPin(sb(), b.org_id, String(b.pin || ''), b.current_pin ? String(b.current_pin) : undefined)
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
