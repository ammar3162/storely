import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getCurrentProfile } from '@/lib/verifyOrgAccess'
import { readDeviceId, hashDevice, forgetTrust } from '@/lib/deviceTrust'
import { DEVICE_UNVERIFIED_ERROR, DEVICE_UNVERIFIED_REASON } from '@/lib/deviceMessages'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// أجهزة المستخدم الموثوقة (صفحة الإعدادات) — كل مستخدم يشوف ويشيل أجهزته هو بس
async function me() {
  const profile = await getCurrentProfile()
  if (!profile) return { error: NextResponse.json({ error: 'غير مسجل دخول' }, { status: 401 }) }
  if (profile.deviceTrusted === false) return { error: NextResponse.json({ error: DEVICE_UNVERIFIED_ERROR, reason: DEVICE_UNVERIFIED_REASON }, { status: 403 }) }
  return { profile }
}

export async function GET() {
  try {
    const { profile, error } = await me()
    if (error) return error
    const deviceId = await readDeviceId()
    const current = deviceId ? hashDevice(deviceId) : ''
    const { data } = await sb().from('trusted_devices').select('id,device_hash,label,created_at,last_seen_at')
      .eq('user_id', profile.userId).is('revoked_at', null).order('last_seen_at', { ascending: false })
    const devices = ((data || []) as { id: string; device_hash: string; label: string | null; created_at: string; last_seen_at: string }[])
      .map(d => ({ id: d.id, label: d.label || 'جهاز غير معروف', created_at: d.created_at, last_seen_at: d.last_seen_at, current: d.device_hash === current }))
    return NextResponse.json({ success: true, devices })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

// شيل جهاز: يحتاج رمز من جديد لو دخل منه
export async function DELETE(req: Request) {
  try {
    const { profile, error } = await me()
    if (error) return error
    const id = new URL(req.url).searchParams.get('id') || ''
    if (!/^[0-9a-f-]{36}$/.test(id)) return NextResponse.json({ error: 'الجهاز غير موجود' }, { status: 400 })
    const { data } = await sb().from('trusted_devices').update({ revoked_at: new Date().toISOString() })
      .eq('id', id).eq('user_id', profile.userId).is('revoked_at', null).select('id')
    if (!data?.length) return NextResponse.json({ error: 'الجهاز غير موجود' }, { status: 404 })
    forgetTrust(profile.userId)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
