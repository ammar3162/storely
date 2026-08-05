import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyOrgAccess } from '@/lib/verifyOrgAccess'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const org_id = searchParams.get('org_id')
  if (!org_id) return NextResponse.json({ error: 'org_id مطلوب' }, { status: 400 })
  const access = await verifyOrgAccess(org_id)
  if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })
  if (access.role !== 'owner') return NextResponse.json({ error: 'هذي الصلاحية للمالك فقط' }, { status: 403 })

  const db = sb()
  const { data, error } = await db.from('profiles')
    .select('id,full_name,branch_id,permissions,status,created_at,branches(name)')
    .eq('org_id', org_id).eq('role', 'manager')
    .order('created_at', { ascending: true })
  if (error) return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  return NextResponse.json({ success: true, managers: data || [] })
}

export async function POST(req: Request) {
  const { org_id, full_name, email, password, branch_id, permissions } = await req.json()
  if (!org_id || !full_name || !email || !password || !branch_id) {
    return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
  }
  if (String(password).length < 6) {
    return NextResponse.json({ error: 'كلمة المرور لازم تكون 6 أحرف على الأقل' }, { status: 400 })
  }
  const access = await verifyOrgAccess(org_id)
  if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })
  if (access.role !== 'owner') return NextResponse.json({ error: 'هذي الصلاحية للمالك فقط' }, { status: 403 })

  const db = sb()
  const { data: branch } = await db.from('branches').select('id').eq('id', branch_id).eq('org_id', org_id).maybeSingle()
  if (!branch) return NextResponse.json({ error: 'الفرع غير موجود' }, { status: 404 })

  const { data: newUser, error: createErr } = await db.auth.admin.createUser({
    email: String(email).trim().toLowerCase(),
    password: String(password),
    email_confirm: true,
  })
  if (createErr || !newUser?.user) {
    return NextResponse.json({ error: createErr?.message || 'فشل إنشاء حساب الدخول' }, { status: 500 })
  }

  const { error: profileErr } = await (db as any).from('profiles').insert({
    id: newUser.user.id,
    org_id, branch_id,
    full_name, role: 'manager',
    permissions: permissions || {},
    status: 'active',
  })
  if (profileErr) {
    await db.auth.admin.deleteUser(newUser.user.id).catch(() => {})
    return NextResponse.json({ error: 'فشل حفظ بيانات المدير' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

export async function PATCH(req: Request) {
  const { id, org_id, branch_id, permissions } = await req.json()
  if (!id || !org_id) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
  const access = await verifyOrgAccess(org_id)
  if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })
  if (access.role !== 'owner') return NextResponse.json({ error: 'هذي الصلاحية للمالك فقط' }, { status: 403 })

  const db = sb()
  const update: any = {}
  if (branch_id !== undefined) update.branch_id = branch_id
  if (permissions !== undefined) update.permissions = permissions
  const { error } = await db.from('profiles').update(update).eq('id', id).eq('org_id', org_id).eq('role', 'manager')
  if (error) return NextResponse.json({ error: 'حدث خطأ أثناء التعديل' }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  const org_id = searchParams.get('org_id')
  if (!id || !org_id) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
  const access = await verifyOrgAccess(org_id)
  if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })
  if (access.role !== 'owner') return NextResponse.json({ error: 'هذي الصلاحية للمالك فقط' }, { status: 403 })

  const db = sb()
  const { data: mgr } = await db.from('profiles').select('id').eq('id', id).eq('org_id', org_id).eq('role', 'manager').maybeSingle()
  if (!mgr) return NextResponse.json({ error: 'غير موجود' }, { status: 404 })

  await db.from('profiles').delete().eq('id', id)
  await db.auth.admin.deleteUser(id).catch(() => {})
  return NextResponse.json({ success: true })
}
