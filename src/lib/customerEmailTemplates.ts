// رسائل جاهزة لمراسلة العميل من ملفه في لوحة الإدارة (طلب المالك 2026-11-18): ضغطة تعبّي العنوان والنص، والأدمن يراجع ويرسل.
// بنفس أسلوب إيميلات الاشتراك التلقائية (emailTemplates): تذكير لطيف ودعوة واضحة — بدون ذكر للبيانات أو التوقف.
// التاريخ والباقة ينكتبون من بيانات العميل، و{الاسم} و{المنشأة} يبدّلها الخادم وقت الإرسال (lib/marketing.personalize).
// يطلع بس اللي يناسب حالته (تجربة/مدفوع، باقي وقت/انتهى)، والأنسب لحالته أول ومعلّم «مقترحة».
import { planLabel, PLAN_PRICING } from '@/lib/planPricing'

export type EmailButtonKey = 'renew' | 'activate' | 'login'
/** الأزرار المسموحة فقط — الخادم يبني الرابط من هنا ولا يقبل روابط من المتصفح */
export const EMAIL_BUTTONS: Record<EmailButtonKey, { label: string; path: string }> = {
  renew: { label: 'تجديد الاشتراك', path: '/renew' },
  activate: { label: 'تفعيل الاشتراك', path: '/renew' },
  login: { label: 'الدخول إلى Storely', path: '/login' },
}
export const isEmailButton = (k: unknown): k is EmailButtonKey => typeof k === 'string' && Object.prototype.hasOwnProperty.call(EMAIL_BUTTONS, k)

export type CustomerEmailTemplate = { id: string; name: string; subject: string; body: string; button?: EmailButtonKey; suggested?: boolean }
export type TemplateCustomer = { subscription_type: string; subscription_ends_at: string | null; plan: string; max_branches?: number | null }

const DAY = 86400000
const riyadhDay = (t: number) => Math.floor((t + 3 * 3600e3) / DAY)
/** نفس صيغة التاريخ في إيميلات الاشتراك: «25 نوفمبر 2026» */
export const arDate = (d: string | number | Date) =>
  new Date(d).toLocaleDateString('ar-SA-u-ca-gregory', { numberingSystem: 'latn', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Riyadh' })
const daysAr = (n: number) => (n <= 1 ? 'يوم واحد' : n === 2 ? 'يومين' : n <= 10 ? `${n} أيام` : `${n} يوماً`)
const within = (d: number) => (d === 0 ? 'اليوم' : d === 1 ? 'غداً' : `خلال ${daysAr(d)}`)
const letter = (...lines: string[]) => ['مرحباً {الاسم}،', ...lines].join('\n')

export function customerEmailTemplates(c: TemplateCustomer, now = Date.now()): CustomerEmailTemplate[] {
  const trial = c.subscription_type === 'trial'
  const ends = c.subscription_ends_at ? Date.parse(c.subscription_ends_at) : NaN
  const known = Number.isFinite(ends)
  const ended = known && ends < now
  const d = known ? Math.max(0, riyadhDay(ends) - riyadhDay(now)) : 0      // كم يوم باقي (بالتقويم، توقيت السعودية)
  const date = known ? arDate(ends) : ''
  const label = planLabel(c.plan, c.max_branches)
  const inPlan = label === PLAN_PRICING.custom.label ? 'في باقتك المخصصة' : `في باقة «${label}»`
  const out: CustomerEmailTemplate[] = []

  if (known && ended) out.push(trial ? {
    id: 'ended', name: 'انتهاء التجربة', suggested: true, button: 'activate',
    subject: 'انتهت تجربتك المجانية في Storely',
    body: letter(
      `شكراً لتجربتك Storely. نود إعلامك بأن التجربة المجانية لـ{المنشأة} انتهت يوم ${date}.`,
      'فعّل اشتراكك الآن لمواصلة متابعة منشأتك من حيث توقفت، باختيار المزايا التي تحتاجها فقط.',
      'إذا كان لديك أي استفسار، رُدّ على هذا البريد ويسعدنا مساعدتك.'),
  } : {
    id: 'ended', name: 'انتهاء الاشتراك', suggested: true, button: 'renew',
    subject: 'انتهى اشتراكك في Storely',
    body: letter(
      `نود إعلامك بأن اشتراك {المنشأة} في Storely انتهى يوم ${date}.`,
      'جدّد اشتراكك الآن ليُعاد تفعيل حسابك فوراً، وتواصل متابعة منشأتك من حيث توقفت.',
      'شكراً لثقتك بـ Storely، ويسعدنا دائماً خدمتك.'),
  })

  if (known && !ended && trial) out.push({
    id: 'trial-ending', name: 'تذكير بانتهاء التجربة', suggested: d <= 3, button: 'activate',
    subject: `تنتهي تجربتك المجانية في Storely ${within(d)}`,
    body: letter(
      `نأمل أن تكون تجربة {المنشأة} مع Storely مفيدة. نود تذكيرك بأن التجربة المجانية تنتهي ${d === 0 ? 'اليوم' : `يوم ${date}`}.`,
      'لمواصلة الاستخدام، اختر المزايا التي تناسب منشأتك وفعّل اشتراكك من حسابك.',
      'إذا احتجت إلى مساعدة في اختيار المزايا، رُدّ على هذا البريد وسنساعدك.'),
  })

  if (known && !ended && !trial) out.push({
    id: 'renewal', name: 'تذكير بتجديد الاشتراك', suggested: d <= 14, button: 'renew',
    subject: `ينتهي اشتراكك في Storely ${within(d)}`,
    body: letter(
      `نود تذكيرك بأن اشتراك {المنشأة} ${inPlan} ينتهي ${d === 0 ? 'اليوم' : `يوم ${date}`}.`,
      d === 0 ? 'لضمان استمرار خدماتك دون انقطاع، جدّد اشتراكك من حسابك اليوم.' : 'لضمان استمرار خدماتك دون انقطاع، يمكنك تجديد اشتراكك من حسابك في أي وقت قبل هذا التاريخ.',
      'شكراً لثقتك بـ Storely، ويسعدنا دائماً خدمتك.'),
  }, {
    id: 'confirmed', name: 'تأكيد الاشتراك', button: 'login',
    subject: 'تأكيد اشتراكك في Storely',
    body: letter(
      `شكراً لثقتك بـ Storely. نؤكد لك أن اشتراك {المنشأة} ${inPlan} مفعّل حتى ${date}.`,
      'إذا احتجت إلى أي مساعدة في الإعداد أو الاستخدام، رُدّ على هذا البريد وسنخدمك بكل سرور.'),
  })

  if (trial && !ended) out.push({
    id: 'welcome', name: 'ترحيب بعميل جديد', button: 'login',
    subject: 'أهلاً بك في Storely',
    body: letter(
      'أهلاً بـ{المنشأة} في Storely، ويسعدنا انضمامك إلينا.',
      'لتبدأ بسرعة، أضف أصنافك وموظفيك من القائمة الجانبية، ويمكنك أن تسأل المساعد داخل النظام عن أي خطوة.',
      'وإذا احتجت إلى أي مساعدة، رُدّ على هذا البريد وسنساعدك خطوة بخطوة.'),
  })

  out.push({
    id: 'follow-up', name: 'متابعة الاستخدام', button: 'login',
    subject: 'كيف يمكننا مساعدتك في Storely؟',
    body: letter(
      'نود الاطمئنان على تجربة {المنشأة} مع Storely، وأن كل شيء يسير كما تريد.',
      'إذا واجهتك أي صعوبة في الإعداد أو الاستخدام، رُدّ على هذا البريد بما تحتاجه، وسنساعدك خطوة بخطوة.'),
  })

  // المقترحة أول (والباقي بنفس ترتيبه)
  return [...out.filter(t => t.suggested), ...out.filter(t => !t.suggested)]
}
