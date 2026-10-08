import type { SupabaseClient } from '@supabase/supabase-js'
import { makeInviteToken, makeSession, INVITE_DAYS } from '@/lib/accountantPortalAuth'
import { ACC_SECTIONS } from '@/lib/accountantExport'
import { siteUrl } from '@/lib/accountantSend'
import { sendEmail } from '@/lib/email'
import { brandEmail } from '@/lib/emailTemplates'
import { clientIp } from '@/lib/loginThrottle'

// دعوة المحاسب: إيميل فيه زر «قبول الدعوة» → يتفعل الإذن عند المنشأة ويدخل المحاسب صفحته مباشرة

export const sectionLabels = (keys: string[]) => ACC_SECTIONS.filter(s => keys.includes(s.key)).map(s => s.label)

export async function sendInviteEmail(db: SupabaseClient, a: { id: string; org_id: string; email: string; name: string | null; sections: string[] }) {
  const { data: org } = await db.from('organizations').select('name').eq('id', a.org_id).single()
  const orgName = (org as any)?.name || 'منشأة'
  const base = siteUrl()
  const acceptUrl = `${base}/accountant-portal/invite?t=${makeInviteToken(a.id, a.email)}`
  return sendEmail({
    to: a.email, fromName: `${orgName} عبر Storely`, subject: `${orgName} تدعوك محاسباً لها في Storely`,
    html: brandEmail({ title: 'دعوة لتكون محاسب المنشأة', preheader: `${orgName} تدعوك لمتابعة حساباتها — اضغط قبول الدعوة`,
      greeting: a.name ? `هلا ${a.name}،` : 'هلا،',
      paragraphs: [
        `منشأة ${orgName} تدعوك تكون محاسبها في Storely، وتشوف بياناتها قراءة بس وتحمّلها إكسل لأي فترة.`,
        `اللي بتشوفه: ${sectionLabels(a.sections).join('، ')}.`,
        'اضغط «قبول الدعوة» — يتفعل الربط عند المنشأة وتدخل صفحتك على طول.',
      ],
      button: { label: 'قبول الدعوة', url: acceptUrl },
      note: `بعدها تدخل صفحتك متى ما بغيت من: ${base}/accountant-portal (برمز يوصلك على هالإيميل، بدون كلمة مرور).`,
      small: `زر القبول صالح ${INVITE_DAYS} أيام. إذا ما تعرف هالمنشأة تجاهل الإيميل أو ارفض الدعوة من نفس الرابط.` }),
  })
}

/** يقبل دعوة معلّقة → يتفعل الإذن ويوصل إشعار للمالك. من رابط الإيميل يرجع جلسة دخول (الإيميل تأكد بالرابط) */
export async function acceptInvite(db: SupabaseClient, req: Request, accessId: string, email: string, withSession: boolean) {
  const { data: row } = await db.from('accountant_access').select('id,org_id,name,status').eq('id', accessId).eq('email', email).maybeSingle()
  const a = row as any
  if (!a) return { error: 'الدعوة ما عادت موجودة — يمكن المنشأة سحبتها', status: 404 } as const
  // رابط الإيميل يُستخدم مرة وحدة بس — بعد القبول الدخول يصير برمز الإيميل العادي
  if (withSession && a.status !== 'pending') return { error: 'قبلت الدعوة من قبل — ادخل البوابة برمز يوصلك على إيميلك', status: 409 } as const
  const { data: user, error } = await db.from('accountant_users').upsert({ email, last_login_at: new Date().toISOString() } as any, { onConflict: 'email' }).select('id,name').single()
  if (error || !user) return { error: 'حدث خطأ، حاول مرة ثانية', status: 500 } as const
  const uid = (user as any).id
  if (!(user as any).name && a.name) await db.from('accountant_users').update({ name: a.name } as any).eq('id', uid)
  if (a.status === 'pending') {
    // شرط pending في التحديث نفسه — ما يتكرر الإشعار لو انضغط الزر مرتين
    const { data: done } = await db.from('accountant_access').update({ accountant_id: uid, status: 'active', accepted_at: new Date().toISOString() } as any)
      .eq('id', a.id).eq('status', 'pending').select('id')
    if (done?.length) await db.from('notifications').insert({ org_id: a.org_id, type: 'info', read: false, title: 'المحاسب قبل الدعوة',
      message: `${a.name || email} قبل دعوتك وصار يشوف بيانات منشأتك. تقدر تعدّل وش يشوف أو تسحب الإذن من الإعدادات ← المحاسب.` } as any)
  }
  if (!withSession) return { ok: true as const, orgId: a.org_id as string, session: null }
  const { data: sess } = await db.from('accountant_sessions').insert({ accountant_id: uid, ip: clientIp(req),
    user_agent: (req.headers.get('user-agent') || '').slice(0, 200) || null } as any).select('id').single()
  if (!sess) return { error: 'حدث خطأ، حاول مرة ثانية', status: 500 } as const
  return { ok: true as const, orgId: a.org_id as string, session: makeSession(uid, (sess as any).id) }
}

/** رفض الدعوة → تنحذف ويوصل إشعار للمالك */
export async function declineInvite(db: SupabaseClient, accessId: string, email: string) {
  const { data } = await db.from('accountant_access').delete().eq('id', accessId).eq('email', email).eq('status', 'pending').select('org_id,name')
  const a = (data as any[] | null)?.[0]
  if (a) await db.from('notifications').insert({ org_id: a.org_id, type: 'warning', read: false, title: 'المحاسب رفض الدعوة',
    message: `${a.name || email} رفض دعوة بوابة المحاسب. تأكد من الإيميل وادعه مرة ثانية إذا لزم.` } as any)
  return !!a
}

/** حالة دعوة البوابة لإيميل المحاسب في منشأة: pending / active / null (ما فيه دعوة) */
export async function inviteStatus(db: SupabaseClient, orgId: string, email: string | null | undefined): Promise<'pending' | 'active' | null> {
  if (!email) return null
  const { data } = await db.from('accountant_access').select('status').eq('org_id', orgId).eq('email', email.toLowerCase()).maybeSingle()
  return ((data as any)?.status as 'pending' | 'active') || null
}

/** لما المالك يضيف محاسب في «الربط مع المحاسب»: نرسل له دعوة البوابة (لو ما عنده) — والتقارير تنتظر قبوله */
export async function ensurePortalInvite(db: SupabaseClient, o: { org_id: string; email: string; name: string | null; sections: string[]; branch_id: string | null; vat_registered: boolean }) {
  const cur = await inviteStatus(db, o.org_id, o.email)
  if (cur) return { status: cur, email_sent: false }
  const { count } = await db.from('accountant_access').select('id', { count: 'exact', head: true }).eq('org_id', o.org_id)
  if ((count || 0) >= 3) return { status: null, email_sent: false, limit: true }
  const { data: row } = await db.from('accountant_access').insert({ org_id: o.org_id, email: o.email.toLowerCase(), name: o.name, sections: o.sections,
    branch_id: o.branch_id, vat_registered: o.vat_registered } as any).select('id,org_id,email,name,sections').single()
  if (!row) return { status: null, email_sent: false }
  const mail = await sendInviteEmail(db, row as any)
  return { status: 'pending' as const, email_sent: mail.success }
}
