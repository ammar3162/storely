import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { currentAccountant, accessExpired, normalizeEmail, isEmail } from '@/lib/accountantPortalAuth'
import { sendEmail } from '@/lib/email'
import { brandEmail } from '@/lib/emailTemplates'
import { siteUrl } from '@/lib/accountantSend'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const UUID = /^[0-9a-f-]{36}$/i
const MAX_MEMBERS = 20

// فريق مكتب المحاسبة — المحاسب الرئيسي يضيف موظفيه ويوزع عليهم عملاءه
// الموظف يأخذ نفس صلاحيات المحاسب على المنشأة (أقسام، فرع، مدة) ولا يقدر يوزعها لغيره
// المالك يوصله إشعار، ويشوف الموظف في قائمة المحاسبين ويقدر يشيله

/** أذونات المحاسب الرئيسي اللي يقدر يوزعها (مباشرة من المالك، مفعّلة، ما انتهت) */
async function myClients(db: ReturnType<typeof sb>, meId: string) {
  const { data } = await db.from('accountant_access').select('id,org_id,branch_id,sections,vat_registered,expires_on,organizations(name),branches(name)')
    .eq('accountant_id', meId).eq('status', 'active').is('delegated_from', null)
  return ((data || []) as any[]).filter(a => !accessExpired(a.expires_on))
}

const NOT_LEAD = 'إدارة فريق المكتب للمحاسب الذي دعته المنشأة مباشرة فقط'

export async function GET(req: Request) {
  try {
    const db = sb()
    const me = await currentAccountant(db, req)
    if (!me) return NextResponse.json({ error: 'سجّل الدخول' }, { status: 401 })
    const clients = await myClients(db, me.id)
    if (!clients.length) return NextResponse.json({ success: true, lead: false, members: [], clients: [] }, { headers: { 'Cache-Control': 'no-store' } })
    const [{ data: team }, { data: assigned }] = await Promise.all([
      db.from('accountant_team').select('email,name,created_at').eq('lead_id', me.id).order('created_at'),
      clients.length ? db.from('accountant_access').select('email,org_id,last_view_at').in('delegated_from', clients.map(c => c.id)) : Promise.resolve({ data: [] as any[] }),
    ])
    const members = ((team || []) as any[]).map(t => {
      const rows = ((assigned || []) as any[]).filter(a => a.email === t.email)
      return { email: t.email, name: t.name, orgs: rows.map(r => r.org_id), last_view_at: rows.map(r => r.last_view_at).filter(Boolean).sort().pop() || null }
    })
    return NextResponse.json({ success: true, lead: true, members, clients: clients.map(c => ({ org_id: c.org_id, name: c.organizations?.name || '—', branch: c.branches?.name || null })) }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

// { action: 'add', email, name } | { action: 'assign', email, org_id, on }
export async function POST(req: Request) {
  try {
    const db = sb()
    const me = await currentAccountant(db, req)
    if (!me) return NextResponse.json({ error: 'سجّل الدخول' }, { status: 401 })
    const b = await req.json().catch(() => ({}))
    const email = normalizeEmail(b.email)
    if (!isEmail(email)) return NextResponse.json({ error: 'اكتب بريداً إلكترونياً صحيحاً' }, { status: 400 })
    if (email === me.email.toLowerCase()) return NextResponse.json({ error: 'هذا بريدك أنت' }, { status: 400 })
    const lead = me.name || me.email
    // موظف المكتب (إذنه مُسند من محاسب) ما يقدر يكوّن فريقاً
    const clients = await myClients(db, me.id)
    if (!clients.length) return NextResponse.json({ error: NOT_LEAD }, { status: 403 })

    if (b.action === 'add') {
      const name = String(b.name || '').trim().slice(0, 80) || null
      const { count } = await db.from('accountant_team').select('id', { count: 'exact', head: true }).eq('lead_id', me.id)
      if ((count || 0) >= MAX_MEMBERS) return NextResponse.json({ error: `الحد ${MAX_MEMBERS} موظفاً في الفريق` }, { status: 400 })
      const { error } = await db.from('accountant_team').insert({ lead_id: me.id, email, name } as any)
      if (error) return NextResponse.json({ error: error.code === '23505' ? 'هذا الموظف في فريقك مسبقاً' : 'تعذر الإضافة' }, { status: error.code === '23505' ? 409 : 500 })
      // لا إيميل هنا: الموظف لا يستطيع الدخول قبل أن تُسند إليه منشأة (والمنشأة يصلها إشعار)
      return NextResponse.json({ success: true })
    }

    if (b.action === 'assign') {
      if (!UUID.test(String(b.org_id || ''))) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
      const { data: member } = await db.from('accountant_team').select('name').eq('lead_id', me.id).eq('email', email).maybeSingle()
      if (!member) return NextResponse.json({ error: 'الموظف ليس في فريقك' }, { status: 404 })
      const mine = clients.find(c => c.org_id === b.org_id)
      if (!mine) return NextResponse.json({ error: 'ليست لديك صلاحية توزيع هذه المنشأة' }, { status: 403 })
      const { data: existing } = await db.from('accountant_access').select('id,delegated_from').eq('org_id', mine.org_id).eq('email', email).maybeSingle()

      if (b.on === false) {
        if (existing && (existing as any).delegated_from === mine.id) await db.from('accountant_access').delete().eq('id', (existing as any).id)
        return NextResponse.json({ success: true })
      }
      if (existing) return NextResponse.json((existing as any).delegated_from === mine.id ? { success: true } : { error: 'لدى هذا الموظف إذن مستقل على المنشأة من مالكها' }, { status: (existing as any).delegated_from === mine.id ? 200 : 409 })
      // حساب الموظف في البوابة (ينشأ لو ما دخل قبل) — الإذن يتفعّل مباشرة بدون دعوة من المالك
      const { data: user } = await db.from('accountant_users').upsert({ email } as any, { onConflict: 'email', ignoreDuplicates: false }).select('id,name').single()
      if (!user) return NextResponse.json({ error: 'تعذر الإسناد' }, { status: 500 })
      if (!(user as any).name && (member as any).name) await db.from('accountant_users').update({ name: (member as any).name } as any).eq('id', (user as any).id)
      const now = new Date().toISOString()
      const { error } = await db.from('accountant_access').insert({ org_id: mine.org_id, email, name: (member as any).name, branch_id: mine.branch_id, sections: mine.sections,
        vat_registered: mine.vat_registered, expires_on: mine.expires_on, status: 'active', accountant_id: (user as any).id, invited_at: now, accepted_at: now, delegated_from: mine.id } as any)
      if (error) return NextResponse.json({ error: 'تعذر الإسناد' }, { status: 500 })
      // أول إسناد له من هذا المكتب → إيميل الدخول (قبلها ما عنده شي يشوفه)
      const { count: before } = await db.from('accountant_access').select('id', { count: 'exact', head: true }).eq('email', email).in('delegated_from', clients.map(c => c.id))
      if ((before || 0) === 1) await sendEmail({ to: email, subject: `${lead} أسند إليك منشأة في بوابة المحاسب`,
        html: brandEmail({ title: 'أُسندت إليك منشأة', preheader: `${lead} أسند إليك ${mine.organizations?.name || 'منشأة'}`, greeting: (member as any).name ? `مرحباً ${(member as any).name}،` : 'مرحباً،',
          paragraphs: [`أسند إليك ${lead} منشأة «${mine.organizations?.name || ''}» ضمن فريق مكتبه في بوابة المحاسب على Storely.`, 'ادخل بهذا البريد الإلكتروني، وسيصلك رمز الدخول عليه.'],
          button: { label: 'الدخول إلى البوابة', rawUrl: `${siteUrl()}/accountant-portal?email=${encodeURIComponent(email)}` } }) }).catch(() => null)
      await db.from('notifications').insert({ org_id: mine.org_id, branch_id: mine.branch_id || null, type: 'info', read: false, title: 'محاسبك أضاف موظفاً من مكتبه',
        message: `${lead} أسند منشأتك إلى ${(member as any).name || email} من فريق مكتبه، بنفس الأقسام المتاحة له. يمكنك إزالته من الإعدادات ← بوابة المحاسب.`.slice(0, 600) } as any)
      return NextResponse.json({ success: true })
    }
    return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

// إزالة موظف من الفريق — تنشال كل المنشآت المسندة له
export async function DELETE(req: Request) {
  try {
    const db = sb()
    const me = await currentAccountant(db, req)
    if (!me) return NextResponse.json({ error: 'سجّل الدخول' }, { status: 401 })
    const email = normalizeEmail(new URL(req.url).searchParams.get('email'))
    if (!isEmail(email)) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
    const { data: mine } = await db.from('accountant_access').select('id').eq('accountant_id', me.id).is('delegated_from', null)
    const ids = ((mine || []) as any[]).map(a => a.id)
    if (!ids.length) return NextResponse.json({ error: NOT_LEAD }, { status: 403 })
    if (ids.length) await db.from('accountant_access').delete().eq('email', email).in('delegated_from', ids)
    await db.from('accountant_team').delete().eq('lead_id', me.id).eq('email', email)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
