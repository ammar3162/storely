// يبني قوالب إيميلات Supabase (تأكيد التسجيل، الاستعادة...) بنفس تصميم src/lib/emailTemplates.ts
// التشغيل: node scripts/build-email-templates.mjs
// الناتج في supabase/email-templates/ — تنلصق يدوياً في Supabase → Authentication → Emails
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const ts = require('typescript')
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const src = fs.readFileSync(path.join(root, 'src/lib/emailTemplates.ts'), 'utf8')
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
const mod = { exports: {} }
new Function('module', 'exports', 'require', js)(mod, mod.exports, require)
const { brandEmail, BRAND } = mod.exports

const templates = {
  'confirm-signup': {
    subject: 'أكّد بريدك الإلكتروني — Storely',
    html: brandEmail({
      title: 'أكّد بريدك الإلكتروني', eyebrow: 'خطوة أخيرة', preheader: 'فعّل حسابك في Storely',
      paragraphs: ['شكراً لتسجيلك في Storely. اضغط الزر التالي لتأكيد بريدك الإلكتروني وتفعيل حسابك:'],
      button: { label: 'تأكيد البريد الإلكتروني', rawUrl: '{{ .ConfirmationURL }}' },
      rawLinkFallback: '{{ .ConfirmationURL }}',
      small: 'إذا ما سجّلت في Storely، تجاهل هذي الرسالة.',
    }),
  },
  'reset-password': {
    subject: 'استعادة كلمة المرور — Storely',
    html: brandEmail({
      title: 'استعادة كلمة المرور', eyebrow: 'أمان الحساب', preheader: 'رابط تعيين كلمة مرور جديدة',
      paragraphs: ['وصلنا طلب لتعيين كلمة مرور جديدة لحسابك. اضغط الزر التالي للمتابعة:'],
      button: { label: 'تعيين كلمة مرور جديدة', rawUrl: '{{ .SiteURL }}/reset-password?token_hash={{ .TokenHash }}&amp;type=recovery' },
      note: 'الرابط صالح لفترة محدودة، ويشتغل مرة وحدة فقط.',
      small: 'إذا ما طلبت هذا، تجاهل الرسالة وحسابك بأمان.',
    }),
  },
  'magic-link': {
    subject: 'رابط الدخول إلى Storely',
    html: brandEmail({
      title: 'رابط الدخول إلى حسابك', eyebrow: 'تسجيل الدخول', preheader: 'ادخل لحسابك في Storely',
      paragraphs: ['اضغط الزر للدخول مباشرة، أو استخدم رمز التحقق:'],
      rawCode: '{{ .Token }}',
      button: { label: 'الدخول إلى Storely', rawUrl: '{{ .ConfirmationURL }}' },
      small: 'إذا ما طلبت الدخول، تجاهل الرسالة.',
    }),
  },
  'change-email': {
    subject: 'تأكيد تغيير البريد الإلكتروني — Storely',
    html: brandEmail({
      title: 'تأكيد تغيير البريد', eyebrow: 'أمان الحساب', preheader: 'أكّد بريدك الجديد',
      paragraphs: ['طلبت تغيير بريد حسابك من {{ .Email }} إلى {{ .NewEmail }}. اضغط الزر للتأكيد:'],
      button: { label: 'تأكيد البريد الجديد', rawUrl: '{{ .ConfirmationURL }}' },
      small: 'إذا ما طلبت هذا التغيير، تواصل معنا فوراً.',
    }),
  },
  'invite': {
    subject: 'دعوة للانضمام إلى Storely',
    html: brandEmail({
      title: 'تمت دعوتك إلى Storely', eyebrow: 'دعوة', preheader: 'اقبل الدعوة وأنشئ حسابك',
      paragraphs: ['تمت دعوتك لاستخدام Storely. اضغط الزر لقبول الدعوة وإنشاء كلمة المرور:'],
      button: { label: 'قبول الدعوة', rawUrl: '{{ .ConfirmationURL }}' },
    }),
  },
  'reauthentication': {
    subject: 'رمز التحقق — Storely',
    html: brandEmail({
      title: 'رمز التحقق', eyebrow: 'أمان الحساب', preheader: 'رمز التحقق لتأكيد العملية',
      paragraphs: ['استخدم الرمز التالي لتأكيد العملية:'],
      rawCode: '{{ .Token }}',
      small: 'لا تشارك هذا الرمز مع أي أحد، ولا يطلبه منك فريق Storely.',
    }),
  },
}

const out = path.join(root, 'supabase/email-templates')
fs.mkdirSync(out, { recursive: true })
for (const [name, t] of Object.entries(templates)) {
  fs.writeFileSync(path.join(out, `${name}.html`), t.html)
}
fs.writeFileSync(path.join(out, 'subjects.txt'), Object.entries(templates).map(([n, t]) => `${n}: ${t.subject}`).join('\n') + '\n')
console.log(`built ${Object.keys(templates).length} templates in supabase/email-templates (logo: ${BRAND.logo})`)
