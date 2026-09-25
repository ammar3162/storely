import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getCurrentProfile } from '@/lib/verifyOrgAccess'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// جولة الترحيب + إعلانات الميزات اللي ما شافها المستخدم (مفلترة حسب المنشأة المستهدفة)
export async function GET() {
  try {
    const profile = await getCurrentProfile()
    if (!profile) return NextResponse.json({ error: 'غير مسجل دخول' }, { status: 401 })

    const db = sb()
    const [{ data: p }, { data: org }, { data: all }, { data: seen }] = await Promise.all([
      db.from('profiles').select('seen_welcome').eq('id', profile.userId).single(),
      profile.orgId ? db.from('organizations').select('name').eq('id', profile.orgId).single() : Promise.resolve({ data: null }),
      db.from('feature_announcements').select('id,version,title,description,type,page,icon,color,target_orgs').order('created_at'),
      db.from('user_seen_features').select('feature_version').eq('profile_id', profile.userId),
    ])

    const seenSet = new Set((seen || []).map((s: any) => s.feature_version))
    // target_orgs فاضية = للكل؛ غير كذا للمنشآت المحددة فقط
    const announcements = (all || [])
      .filter((a: any) =>
        !seenSet.has(a.version) && a.version !== '1.0.0' &&
        (!a.target_orgs || a.target_orgs.length === 0 || (profile.orgId && a.target_orgs.includes(profile.orgId))))
      .map(({ target_orgs: _t, ...a }: any) => a)

    return NextResponse.json({
      success: true,
      seen_welcome: (p as any)?.seen_welcome !== false,
      org_name: (org as any)?.name || '',
      announcements,
    })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

// تسجيل المشاهدة: { version } لإعلان، أو { welcome: true } لجولة الترحيب
export async function POST(req: Request) {
  try {
    const profile = await getCurrentProfile()
    if (!profile) return NextResponse.json({ error: 'غير مسجل دخول' }, { status: 401 })

    const { version, welcome } = await req.json()
    const db = sb()
    if (welcome === true) {
      await db.from('profiles').update({ seen_welcome: true } as any).eq('id', profile.userId)
      await db.from('user_seen_features').upsert({ profile_id: profile.userId, feature_version: '1.0.0' } as any, { onConflict: 'profile_id,feature_version' })
    } else if (typeof version === 'string' && version) {
      await db.from('user_seen_features').upsert({ profile_id: profile.userId, feature_version: version.slice(0, 64) } as any, { onConflict: 'profile_id,feature_version' })
    } else {
      return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
    }
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
