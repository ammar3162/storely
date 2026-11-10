// قوالب الإيميلات بهوية Storely — كل الإيميلات (الفواتير، الاستعادة، الترحيب، التفعيل) تبنى من هنا
// عشان يكون شكلها واحد. الإرسال نفسه من lib/email.ts
// ملاحظة: إيميلات Supabase (تأكيد التسجيل وغيرها) قوالبها في supabase/email-templates وتنلصق في لوحة Supabase

export const BRAND = {
  color: '#029FA2',
  dark: '#0f3f40',
  ink: '#0f172a',
  muted: '#64748b',
  bg: '#eef4f4',
  card: '#ffffff',
  line: '#e2e8f0',
  logo: 'https://www.storely.dev/storely-logo.png',
  site: 'https://www.storely.dev',
  whatsapp: '966594351667',
}

export const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))

export type EmailRow = { label: string; value: string; strong?: boolean }
export type EmailItem = { label: string; detail?: string; amount: number }
type Tone = 'success' | 'warning' | 'info' | 'danger'

const TONES: Record<Tone, [string, string]> = {
  success: ['#15803d', 'rgba(21,128,61,.1)'],
  warning: ['#b45309', 'rgba(180,83,9,.1)'],
  info: [BRAND.color, 'rgba(2,159,162,.1)'],
  danger: ['#b91c1c', 'rgba(185,28,28,.1)'],
}

export const sar = (n: number) => `${Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 })} ر.س`

/**
 * إيميل بهوية Storely. النصوص تنحمى تلقائياً من HTML.
 * raw* = قيم جاهزة ما تنحمى (لقوالب Supabase مثل {{ .ConfirmationURL }})
 */
export function brandEmail(o: {
  title: string
  preheader?: string
  eyebrow?: string
  headerSide?: { title: string; sub?: string }
  greeting?: string
  paragraphs?: string[]
  code?: string
  rawCode?: string
  button?: { label: string; url?: string; rawUrl?: string }
  rows?: EmailRow[]
  badge?: { text: string; tone: Tone }
  items?: EmailItem[]
  totalLabel?: string
  note?: string
  small?: string
  rawLinkFallback?: string
  rawSections?: string   // HTML جاهز ومحمي مسبقاً (جداول التقارير)
  rawFooter?: string     // HTML جاهز أسفل الإيميل (رابط إلغاء الاشتراك بالإعلانات)
  // إيميلات الأمان (رمز التحقق، استعادة كلمة المرور): بدون زر واتساب ورابط الموقع — روابط أقل = أقل احتمال للسبام
  minimal?: boolean
}) {
  const b = BRAND
  const btnUrl = o.button ? (o.button.rawUrl ?? esc(o.button.url || '')) : ''
  const total = (o.items || []).reduce((n, it) => n + Number(it.amount), 0)
  const code = o.rawCode ?? (o.code ? esc(o.code) : '')

  const rows = (o.rows || []).map(r => `
        <tr><td style="padding:3px 0;color:${b.muted};font-size:12px;width:40%">${esc(r.label)}</td>
            <td style="padding:3px 0;font-size:12px;${r.strong ? 'font-weight:bold;' : ''}">${esc(r.value)}</td></tr>`).join('')
  const badge = o.badge ? `
        <tr><td style="padding:3px 0;color:${b.muted};font-size:12px">الحالة</td>
            <td style="padding:3px 0"><span style="display:inline-block;font-size:11px;font-weight:bold;color:${TONES[o.badge.tone][0]};background:${TONES[o.badge.tone][1]};padding:2px 10px;border-radius:999px">${esc(o.badge.text)}</span></td></tr>` : ''

  const items = (o.items || []).length ? `
    <tr><td style="padding:6px 28px 4px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="font-size:11px;color:${b.muted};padding-bottom:6px;border-bottom:2px solid ${b.color}">البند</td>
            <td style="font-size:11px;color:${b.muted};padding-bottom:6px;border-bottom:2px solid ${b.color};text-align:left">المبلغ</td></tr>
        ${(o.items || []).map(it => `
        <tr><td style="padding:10px 0;border-bottom:1px solid ${b.line};font-size:13px;line-height:1.6">${esc(it.label)}${it.detail ? `<div style="font-size:11px;color:${b.muted}">${esc(it.detail)}</div>` : ''}</td>
            <td style="padding:10px 0;border-bottom:1px solid ${b.line};font-size:13px;font-weight:bold;text-align:left;white-space:nowrap" dir="ltr">${esc(sar(it.amount))}</td></tr>`).join('')}
        <tr><td style="padding:14px 0 0;font-size:15px;font-weight:bold">${esc(o.totalLabel || 'الإجمالي')}</td>
            <td style="padding:14px 0 0;font-size:19px;font-weight:bold;color:${b.color};text-align:left;white-space:nowrap" dir="ltr">${esc(sar(total))}</td></tr>
      </table>
    </td></tr>` : ''

  return `<!doctype html>
<html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(o.title)}</title></head>
<body style="margin:0;padding:0;background:${b.bg}">
<div dir="rtl" style="background:${b.bg};padding:28px 12px;font-family:Tahoma,Arial,sans-serif;color:${b.ink}">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:540px;margin:0 auto;background:${b.card};border-radius:20px;border:1px solid ${b.line};overflow:hidden">
    <tr><td style="background:${b.color};background-image:linear-gradient(135deg,${b.color},${b.dark});padding:20px 26px;color:#ffffff">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td style="vertical-align:middle">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>
            <td style="padding-left:10px"><img src="${b.logo}" width="40" height="40" alt="Storely" style="display:block;border-radius:10px;background:#ffffff"></td>
            <td><div style="font-size:20px;font-weight:bold;letter-spacing:.5px" dir="ltr">Storely</div><div style="font-size:11px;opacity:.8">نظام واحد يربط كل أعمال منشأتك</div></td>
          </tr></table>
        </td>
        ${o.headerSide ? `<td style="text-align:left;vertical-align:middle"><div style="font-size:15px;font-weight:bold">${esc(o.headerSide.title)}</div>${o.headerSide.sub ? `<div style="font-size:11px;opacity:.8" dir="ltr">${esc(o.headerSide.sub)}</div>` : ''}</td>` : ''}
      </tr></table>
    </td></tr>
    <tr><td style="padding:24px 28px 6px">
      ${o.eyebrow ? `<div style="font-size:12px;font-weight:bold;color:${b.color};margin-bottom:6px">${esc(o.eyebrow)}</div>` : ''}
      <div style="font-size:20px;font-weight:bold;line-height:1.5;margin-bottom:10px">${esc(o.title)}</div>
      ${o.greeting ? `<p style="margin:0 0 8px;font-size:14px;line-height:1.9">${esc(o.greeting)}</p>` : ''}
      ${(o.paragraphs || []).map(p => `<p style="margin:0 0 8px;font-size:14px;line-height:1.9;color:#334155">${esc(p)}</p>`).join('')}
    </td></tr>
    ${code ? `<tr><td style="padding:8px 28px 4px;text-align:center">
      <div style="display:inline-block;background:${b.bg};border:1px dashed ${b.color};border-radius:14px;padding:14px 26px">
        <div style="font-size:11px;color:${b.muted};margin-bottom:4px">رمز التحقق</div>
        <div style="font-size:30px;font-weight:bold;letter-spacing:8px;color:${b.dark}" dir="ltr">${code}</div>
      </div></td></tr>` : ''}
    ${rows || badge ? `<tr><td style="padding:12px 28px 6px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid ${b.line};border-radius:14px;padding:10px 14px">${rows}${badge}</table></td></tr>` : ''}
    ${items}
    ${o.rawSections || ''}
    ${o.button ? `<tr><td style="padding:18px 28px 6px;text-align:center">
      <a href="${btnUrl}" style="display:inline-block;background:${b.color};color:#ffffff;text-decoration:none;font-weight:bold;font-size:14px;padding:13px 30px;border-radius:12px">${esc(o.button.label)}</a>
      ${o.rawLinkFallback ? `<div style="font-size:11px;color:${b.muted};margin-top:10px;line-height:1.7">إذا لم يعمل الزر، انسخ هذا الرابط:<br><span dir="ltr" style="word-break:break-all">${o.rawLinkFallback}</span></div>` : ''}
    </td></tr>` : ''}
    ${o.note ? `<tr><td style="padding:14px 28px 0"><div style="font-size:12px;line-height:1.8;background:rgba(2,159,162,.06);border:1px solid rgba(2,159,162,.18);border-radius:12px;padding:10px 12px;color:#334155">${esc(o.note)}</div></td></tr>` : ''}
    <tr><td style="padding:20px 28px 24px;text-align:center">
      ${o.small ? `<div style="font-size:12px;color:${b.muted};line-height:1.8;margin-bottom:12px">${esc(o.small)}</div>` : ''}
      ${o.minimal ? `<div style="font-size:11px;color:#94a3b8;line-height:1.8">Storely — نظام واحد يربط كل أعمال منشأتك</div>` : `<a href="https://wa.me/${b.whatsapp}" style="display:inline-block;color:${b.color};text-decoration:none;font-weight:bold;font-size:12px;border:1px solid rgba(2,159,162,.35);padding:9px 18px;border-radius:10px">تواصل معنا عبر واتساب</a>
      <div style="font-size:11px;color:#94a3b8;margin-top:14px;line-height:1.8">Storely — نظام واحد يربط كل أعمال منشأتك<br><a href="${b.site}" style="color:#94a3b8" dir="ltr">storely.dev</a></div>`}
      ${o.rawFooter || ''}
    </td></tr>
  </table>
</div>
</body></html>`
}

const arDate = (d: string | number | Date) =>
  new Date(d).toLocaleDateString('ar-SA-u-ca-gregory', { numberingSystem: 'latn', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Riyadh' })

// ─── الإيميلات الجاهزة ───

export function invoiceEmail(o: { invoiceNumber: string | number; orgName: string; items: EmailItem[]; pdfUrl?: string; status?: 'paid' | 'due'; date?: string }) {
  const paid = (o.status || 'paid') === 'paid'
  const total = o.items.reduce((n, it) => n + Number(it.amount), 0)
  return {
    subject: `فاتورة اشتراك #${o.invoiceNumber} — ${o.orgName} — ${sar(total)}`,
    html: brandEmail({
      title: paid ? 'شكراً لك، هذه فاتورة اشتراكك' : 'فاتورة مستحقة الدفع',
      preheader: `فاتورة #${o.invoiceNumber} بقيمة ${sar(total)}`,
      headerSide: { title: 'فاتورة اشتراك', sub: `#${o.invoiceNumber}` },
      rows: [
        { label: 'المنشأة', value: o.orgName || '—', strong: true },
        { label: 'تاريخ الفاتورة', value: o.date || arDate(Date.now()) },
      ],
      badge: paid ? { text: 'مدفوعة', tone: 'success' } : { text: 'مستحقة الدفع', tone: 'warning' },
      items: o.items,
      totalLabel: paid ? 'الإجمالي المدفوع' : 'المبلغ المستحق',
      button: o.pdfUrl ? { label: 'تحميل الفاتورة (PDF)', url: o.pdfUrl } : undefined,
      small: 'المبالغ بالريال السعودي. لأي استفسار عن الفاتورة تواصل معنا.',
    }),
  }
}

export function resetPasswordEmail(o: { name?: string; link: string }) {
  return {
    subject: 'استعادة كلمة المرور — Storely',
    html: brandEmail({
      title: 'استعادة كلمة المرور',
      preheader: 'رابط تعيين كلمة مرور جديدة لحسابك في Storely',
      eyebrow: 'أمان الحساب',
      greeting: `مرحباً${o.name ? ` ${o.name}` : ''}،`,
      paragraphs: ['تلقّينا طلباً لتعيين كلمة مرور جديدة لحسابك. اضغط الزر التالي للمتابعة:'],
      button: { label: 'تعيين كلمة مرور جديدة', url: o.link },
      note: 'الرابط صالح لمدة ساعة واحدة، ويُستخدم مرة واحدة فقط.',
      small: 'إذا لم تطلب ذلك، فتجاهل هذه الرسالة، وحسابك في أمان.',
      minimal: true,
    }),
  }
}

// رمز الدخول: عند التسجيل (أول جهاز) أو الدخول من جهاز جديد
export function deviceCodeEmail(o: { name?: string; code: string; device: string; firstTime: boolean }) {
  return {
    subject: o.firstTime ? `رمز تأكيد حسابك في Storely: ${o.code}` : `رمز الدخول إلى Storely: ${o.code}`,
    html: brandEmail({
      title: o.firstTime ? 'تأكيد حسابك' : 'الدخول من جهاز جديد',
      preheader: `رمزك ${o.code} — صالح لمدة 10 دقائق`,
      eyebrow: 'أمان الحساب',
      greeting: `مرحباً${o.name ? ` ${o.name}` : ''}،`,
      paragraphs: [o.firstTime
        ? 'شكراً لتسجيلك في Storely. أدخل الرمز التالي لتأكيد بريدك الإلكتروني وتفعيل حسابك:'
        : `طُلب الدخول إلى حسابك من جهاز جديد (${o.device}). أدخل الرمز التالي لإكمال الدخول:`],
      code: o.code,
      note: 'الرمز صالح لمدة 10 دقائق، ويُستخدم مرة واحدة فقط. بعد التحقق لن يُطلب منك رمز على هذا الجهاز مرة أخرى.',
      small: o.firstTime ? 'إذا لم تسجّل في Storely، تجاهل هذه الرسالة.' : 'إذا لم تحاول الدخول، لا تشارك هذا الرمز مع أحد، وغيّر كلمة المرور من الإعدادات.',
      minimal: true,
    }),
  }
}

// ═══ الاشتراك: قبل الانتهاء بـ٣ أيام، ويوم الانتهاء ═══
// بأسلوب رسائل الشركات: تذكير لطيف ودعوة واضحة للتجديد — بدون ذكر للبيانات أو التوقف
// للوصول إلى «الوارد»: عنوان واضح بدون رموز، رابط واحد على نفس النطاق، نسخة نصية، وبدون أزرار جانبية (minimal)
const daysAr = (n: number) => n <= 1 ? 'يوم واحد' : n === 2 ? 'يومين' : `${n} أيام`
const SIGN = 'مع تحيات فريق Storely'
export function subscriptionEndingEmail(o: { name?: string | null; daysLeft: number; endsAt: string; isTrial: boolean }) {
  const subject = o.isTrial ? `تنتهي تجربتك المجانية في Storely خلال ${daysAr(o.daysLeft)}` : `ينتهي اشتراكك في Storely خلال ${daysAr(o.daysLeft)}`
  const url = `${BRAND.site}/login`
  const label = o.isTrial ? 'تفعيل الاشتراك' : 'تجديد الاشتراك'
  const paragraphs = o.isTrial ? [
    `نأمل أن تكون تجربتك مع Storely مفيدة لمنشأتك. نود تذكيرك بأن تجربتك المجانية تنتهي يوم ${arDate(o.endsAt)}.`,
    'لمواصلة الاستخدام، اختر المزايا التي تناسب منشأتك وفعّل اشتراكك من حسابك.',
    'إذا احتجت إلى مساعدة في اختيار المزايا، فريقنا جاهز لخدمتك.',
  ] : [
    `نود تذكيرك بأن اشتراكك في Storely ينتهي يوم ${arDate(o.endsAt)}.`,
    'لضمان استمرار خدماتك دون انقطاع، يمكنك تجديد اشتراكك من حسابك في أي وقت قبل هذا التاريخ.',
    'شكراً لثقتك بـ Storely، ويسعدنا دائماً خدمتك.',
  ]
  return {
    subject,
    html: brandEmail({ title: subject, preheader: o.isTrial ? `تنتهي تجربتك يوم ${arDate(o.endsAt)}` : `جدّد قبل ${arDate(o.endsAt)} لاستمرار خدماتك`, greeting: o.name ? `مرحباً ${o.name}،` : 'مرحباً،',
      paragraphs, button: { label, rawUrl: url }, minimal: true, small: 'وصلك هذا البريد لأنك مالك حساب في Storely.' }),
    text: [o.name ? `مرحباً ${o.name}،` : 'مرحباً،', '', ...paragraphs, '', `${label}: ${url}`, '', SIGN].join('\n'),
  }
}
export function subscriptionEndedEmail(o: { name?: string | null; isTrial: boolean }) {
  const subject = o.isTrial ? 'انتهت تجربتك المجانية في Storely' : 'انتهى اشتراكك في Storely'
  const url = `${BRAND.site}/login`
  const paragraphs = o.isTrial ? [
    'شكراً لتجربتك Storely. نود إعلامك بأن فترة التجربة المجانية انتهت اليوم.',
    'فعّل اشتراكك الآن لمواصلة متابعة منشأتك من حيث توقفت، باختيار المزايا التي تحتاجها فقط.',
    'يسعدنا دائماً خدمتك.',
  ] : [
    'نود إعلامك بأن اشتراكك في Storely انتهى اليوم.',
    'جدّد اشتراكك الآن ليُعاد تفعيل حسابك فوراً، وتواصل متابعة منشأتك من حيث توقفت.',
    'شكراً لثقتك بـ Storely، ويسعدنا دائماً خدمتك.',
  ]
  const label = o.isTrial ? 'تفعيل الاشتراك' : 'تجديد الاشتراك'
  return {
    subject,
    html: brandEmail({ title: subject, preheader: o.isTrial ? 'فعّل اشتراكك لمواصلة الاستخدام' : 'جدّد اشتراكك ليُعاد تفعيل حسابك فوراً', greeting: o.name ? `مرحباً ${o.name}،` : 'مرحباً،',
      paragraphs, button: { label, rawUrl: url }, minimal: true, small: 'وصلك هذا البريد لأنك مالك حساب في Storely.' }),
    text: [o.name ? `مرحباً ${o.name}،` : 'مرحباً،', '', ...paragraphs, '', `${label}: ${url}`, '', SIGN].join('\n'),
  }
}

export function welcomeEmail(o: { name: string; trialEnds?: string | null }) {
  return {
    subject: 'أهلاً بك في Storely',
    html: brandEmail({
      title: `أهلاً بك في Storely، ${o.name}`,
      preheader: 'حسابك جاهز، ابدأ بإضافة مخزونك',
      eyebrow: 'تم إنشاء حسابك',
      paragraphs: ['حسابك جاهز الآن. ابدأ بإضافة منتجاتك ومخزونك، وسينبّهك Storely قبل نقص أي صنف.'],
      rows: [
        { label: 'المنشأة', value: o.name, strong: true },
        { label: 'نوع الاشتراك', value: 'تجربة مجانية لمدة 14 يوماً' },
        ...(o.trialEnds ? [{ label: 'تنتهي التجربة', value: arDate(o.trialEnds) }] : []),
      ],
      badge: { text: 'تجربة مجانية', tone: 'info' },
      button: { label: 'الدخول إلى حسابك', url: `${BRAND.site}/login` },
    }),
  }
}

export function activationEmail(o: { name: string; orgName: string; paid: boolean; endsAt?: string | null }) {
  return {
    subject: o.paid ? 'تم تفعيل اشتراكك في Storely' : 'تم تفعيل حسابك في Storely',
    html: brandEmail({
      title: o.paid ? 'تم تفعيل اشتراكك بنجاح' : 'تم تفعيل حسابك بنجاح',
      preheader: `حساب ${o.orgName} مفعّل${o.endsAt ? ` حتى ${arDate(o.endsAt)}` : ''}`,
      eyebrow: 'تفعيل الاشتراك',
      greeting: `أهلاً ${o.name}،`,
      paragraphs: ['تم تفعيل حسابك في Storely، ويمكنك استخدام جميع المزايا الآن.'],
      rows: [
        { label: 'المنشأة', value: o.orgName || '—', strong: true },
        { label: 'نوع الاشتراك', value: o.paid ? 'مدفوع' : 'تجريبي' },
        { label: 'ينتهي في', value: o.endsAt ? arDate(o.endsAt) : '—' },
      ],
      badge: o.paid ? { text: 'مفعّل', tone: 'success' } : { text: 'تجريبي', tone: 'info' },
      button: { label: 'الدخول إلى حسابك', url: `${BRAND.site}/login` },
    }),
  }
}
