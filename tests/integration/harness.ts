/**
 * أدوات مشتركة لاختبارات التكامل على قاعدة staging (كل ملف يشتغل بالتوازي بمنشأة تجريبية خاصة فيه).
 * تحتاج .env.test.local فيه TEST_SUPABASE_URL و TEST_SUPABASE_SERVICE_ROLE_KEY (مشروع staging فقط).
 * بدونه تتخطى تلقائياً — فما تأثر على npm test أو البناء على Vercel.
 */
import fs from 'node:fs'
import path from 'node:path'

// ─── المتغيرات (قبل تحميل أي route) ───
const envFile = path.resolve(__dirname, '../../.env.test.local')
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '')
  }
}
export const URL_ = process.env.TEST_SUPABASE_URL || ''
export const KEY = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY || ''
export const STAGING_REF = 'vmdhaqpuobxeyydbksfu'
export const enabled = !!URL_ && !!KEY && !KEY.includes('الصق') && URL_.includes(STAGING_REF)
if (enabled) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = URL_
  process.env.SUPABASE_SERVICE_ROLE_KEY = KEY
}

// رقم جوال فريد لموظفين الاختبارات (ما يتعارض بين الاختبارات أو التشغيلات أو الملفات المتوازية)
export const uniqPhone = () => `9665${String(Math.floor(Math.random() * 1e8)).padStart(8, '0')}`
// ختم فريد لكل ملف (الملفات تبدأ بنفس اللحظة تقريباً — نضيف رقم عشوائي عشان ما تتكرر الأسماء والإيميلات)
export const newStamp = () => Date.now() * 1000 + Math.floor(Math.random() * 1000)

// ─── هوية المستخدم الحالي (بدل جلسة الدخول) — يقراها mock التحقق بـ setup.ts ───
export type Access = { userId: string; orgId: string; role: string; branchId: string | null; permissions?: Record<string, boolean> | null }
export const auth: { current: Access | null } = { current: null }
// قراءة الفاتورة بالذكاء الاصطناعي: فاتورة ثابتة بدل الخدمة المدفوعة
export const ocrFixture: { current: any } = { current: null }

export async function call(handler: (req: Request) => Promise<Response>, method: string, url: string, body?: unknown) {
  const res = await handler(new Request(`http://test${url}`, {
    method, headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined,
  }))
  return { status: res.status, json: await res.json() as any }
}
