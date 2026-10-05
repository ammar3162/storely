import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyOrgAccess } from '@/lib/verifyOrgAccess'
import { normalizeEmail, isEmail } from '@/lib/accountantPortalAuth'
import { ACC_SECTIONS } from '@/lib/accountantExport'
import { siteUrl } from '@/lib/accountantSend'
import { sendEmail } from '@/lib/email'
import { brandEmail } from '@/lib/emailTemplates'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const UUID_RE = /^[0-9a-f-]{36}$/i
const MAX_PER_ORG = 3
const FIELDS = 'id,email,name,branch_id,sections,vat_registered,status,invited_at,accepted_at,last_view_at'

// بوابة المحاسب — صلاحيات المحاسبين على المنشأة (للمالك بس)
async function ownerOnly(org_id: unknown) {
  if (typeof org_id !== 'string' || !UUID_RE.test(org_id)) return { error: NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 }) }
  const access = await verifyOrgAccess(org_id)
  if (!access.authorized) return { error: NextResponse.json({ error: access.error }, { status: access.status }) }
  if (access.role !== 'owner') return { error: NextResponse.json({ error: 'بوابة المحاسب يديرها مالك الحساب بس' }, { status: 403 }) }
  return { ok: true as const }
}
function cleanSections(v: unknown) {
  const allowed = new Set(ACC_SECTIONS.map(s => s.key))
  return [...new Set((Array.isArray(v) ? v : []).filter((s: any) => allowed.has(s)))]
}
async function checkBranch(db: any, org_id: string, branch_id: unknown) {
  if (!branch_id) return { ok: true as const, id: null }
  if (typeof branch_id !== 'string' || !UUID_RE.test(branch_id)) return { ok: false as const }
  const { data } = await db.from('branches').select('id').eq('id', branch_id).eq('org_id', org_id).maybeSingle()
  return data ? { ok: true as const, id: branch_id } : { ok: false as const }
}

export async function GET(req: Request) {
  try {
    const org_id = new URL(req.url).searchParams.get('org_id')
    const g = await ownerOnly(org_id); if (g.error) return g.error
    const db = sb()
    const [{ data: list }, { data: logs }] = await Promise.all([
      db.from('accountant_access').select(FIELDS).eq('org_id', org_id!).order('invited_at'),
      db.from('accountant_view_logs').select('action,period_start,period_end,created_at,accountant_users(email,name)').eq('org_id', org_id!).order('created_at', { ascending: false }).limit(8),
    ])
    return NextResponse.json({ success: true, accountants: list || [], logs: logs || [] })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

// دعوة محاسب
export async function POST(req: Request) {
  try {
    const b = await req.json()
    const g = await ownerOnly(b.org_id); if (g.error) return g.error
    const email = normalizeEmail(b.email)
    if (!isEmail(email)) return NextResponse.json({ error: 'اكتب إيميل المحاسب صحيح' }, { status: 400 })
    const name = String(b.name || '').trim().slice(0, 80) || null
    const sections = cleanSections(b.sections)
    if (!sections.length) return NextResponse.json({ error: 'اختر وش يشوف المحاسب' }, { status: 400 })
    const db = sb()
    const br = await checkBranch(db, b.org_id, b.branch_id)
    if (!br.ok) return NextResponse.json({ error: 'الفرع غير موجود' }, { status: 404 })

    const { data: existing } = await db.from('accountant_access').select('id').eq('org_id', b.org_id).eq('email', email).maybeSingle()
    if (existing) return NextResponse.json({ error: 'هذا المحاسب مدعو من قبل' }, { status: 409 })
    const { count } = await db.from('accountant_access').select('id', { count: 'exact', head: true }).eq('org_id', b.org_id)
    if ((count || 0) >= MAX_PER_ORG) return NextResponse.json({ error: `الحد ${MAX_PER_ORG} محاسبين لكل منشأة` }, { status: 400 })

    // عنده حساب في البوابة (إيميله متأكد منه) → يتفعل مباشرة
    const { data: user } = await db.from('accountant_users').select('id').eq('email', email).maybeSingle()
    const { data: row, error } = await db.from('accountant_access').insert({
      org_id: b.org_id, email, name, branch_id: br.id, sections, vat_registered: b.vat_registered !== false,
      ...(user ? { accountant_id: (user as any).id, status: 'active', accepted_at: new Date().toISOString() } : {}),
    } as any).select(FIELDS).single()
    if (error) return NextResponse.json({ error: 'تعذر إرسال الدعوة' }, { status: 500 })

    const { data: org } = await db.from('organizations').select('name').eq('id', b.org_id).single()
    const orgName = (org as any)?.name || 'منشأة'
    const url = `${siteUrl()}/accountant-portal?email=${encodeURIComponent(email)}`
    const mail = await sendEmail({
      to: email, fromName: `${orgName} عبر Storely`, subject: `${orgName} تدعوك لمتابعة حساباتها في Storely`,
      html: brandEmail({ title: 'دعوة لبوابة المحاسب', preheader: `${orgName} تدعوك لمتابعة حساباتها`,
        greeting: name ? `هلا ${name}،` : 'هلا،',
        paragraphs: [`منشأة ${orgName} أضافتك محاسباً لها في Storely.`, 'تقدر تشوف مبيعاتها ومشترياتها وفواتيرها الضريبية وتحمّلها إكسل لأي فترة — وكل عملائك اللي يستخدمون Storely في حساب واحد.'],
        button: { label: 'ادخل بوابة المحاسب', url }, small: 'الدخول برمز يوصلك على هالإيميل — بدون كلمة مرور.' }),
    })
    return NextResponse.json({ success: true, accountant: row, email_sent: mail.success })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

// تعديل اللي يشوفه المحاسب
export async function PATCH(req: Request) {
  try {
    const b = await req.json()
    const g = await ownerOnly(b.org_id); if (g.error) return g.error
    if (!UUID_RE.test(String(b.id || ''))) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
    const upd: Record<string, unknown> = {}
    if ('sections' in b) { const s = cleanSections(b.sections); if (!s.length) return NextResponse.json({ error: 'اختر قسم واحد على الأقل' }, { status: 400 }); upd.sections = s }
    if ('vat_registered' in b) upd.vat_registered = b.vat_registered !== false
    const db = sb()
    if ('branch_id' in b) { const br = await checkBranch(db, b.org_id, b.branch_id); if (!br.ok) return NextResponse.json({ error: 'الفرع غير موجود' }, { status: 404 }); upd.branch_id = br.id }
    if (!Object.keys(upd).length) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
    const { data, error } = await db.from('accountant_access').update(upd as any).eq('id', b.id).eq('org_id', b.org_id).select(FIELDS).maybeSingle()
    if (error || !data) return NextResponse.json({ error: 'تعذر الحفظ' }, { status: 500 })
    return NextResponse.json({ success: true, accountant: data })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

// سحب الإذن — يوقف فوراً
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const org_id = searchParams.get('org_id'), id = searchParams.get('id') || ''
    const g = await ownerOnly(org_id); if (g.error) return g.error
    if (!UUID_RE.test(id)) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
    const { error } = await sb().from('accountant_access').delete().eq('id', id).eq('org_id', org_id!)
    if (error) return NextResponse.json({ error: 'تعذر الحذف' }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
