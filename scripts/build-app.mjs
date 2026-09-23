#!/usr/bin/env node
/**
 * بناء واجهة تطبيق الجوال (static export) — ما يلمس المشروع الأصلي.
 *
 * 1) ينسخ المشروع لـ .app-build/
 * 2) يشيل اللي يحتاج سيرفر أو ما يلزم التطبيق (API، proxy، صفحة الهبوط، المتجر العام، لوحة الأدمن...)
 * 3) يبني بـ output: 'export' ← الناتج بمجلد app-www/ (webDir حق Capacitor)
 *
 * المتغيرات (من .env.app أو البيئة):
 *   NEXT_PUBLIC_API_BASE_URL   عنوان السيرفر (افتراضي https://www.storely.dev)
 *   NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY   (قيم عامة — نفس اللي بالموقع)
 *
 * الاستخدام: node scripts/build-app.mjs
 */
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const build = path.join(root, '.app-build')
const outDir = path.join(root, 'app-www')

// ─── المتغيرات ───
const env = { ...process.env }
const envFile = path.join(root, '.env.app')
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"]*)"?\s*$/)
    if (m && !env[m[1]]) env[m[1]] = m[2]
  }
}
env.NEXT_PUBLIC_API_BASE_URL ||= 'https://www.storely.dev'
for (const k of ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY']) {
  if (!env[k]) { console.error(`✖ ${k} مطلوب (بـ .env.app أو البيئة)`); process.exit(1) }
}

// ─── النسخ ───
console.log('• نسخ المشروع إلى .app-build/')
fs.rmSync(build, { recursive: true, force: true })
fs.mkdirSync(build)
const skip = new Set(['node_modules', '.next', '.git', '.app-build', 'app-www', 'android', 'ios', '.vercel'])
for (const entry of fs.readdirSync(root)) {
  if (skip.has(entry) || entry.startsWith('.env')) continue
  fs.cpSync(path.join(root, entry), path.join(build, entry), { recursive: true })
}
fs.symlinkSync(path.join(root, 'node_modules'), path.join(build, 'node_modules'))

// ─── إزالة اللي ما يناسب التطبيق ───
const app = path.join(build, 'src/app')
const remove = [
  'api',                 // الباك اند يبقى على السيرفر
  '(landing)',           // صفحة الهبوط — التطبيق يبدأ من app-shell/entry-page
  'shop', 'book',        // المتجر العام وحجز الطاولات (روابط عامة للزبائن)
  'permission', 'confirm', 'suppliers-join', // روابط عامة ديناميكية
  'storely-admin',       // لوحة الأدمن للويب فقط
  'marketplace/[id]',    // صفحة ديناميكية — تنفتح من المتصفح حالياً
  'sitemap.ts', 'robots.ts',
]
for (const r of remove) fs.rmSync(path.join(app, r), { recursive: true, force: true })
for (const d of fs.readdirSync(app)) if (/ \d+$/.test(d)) fs.rmSync(path.join(app, d), { recursive: true, force: true })
fs.rmSync(path.join(build, 'src/proxy.ts'), { force: true })
fs.copyFileSync(path.join(root, 'app-shell/entry-page.tsx'), path.join(app, 'page.tsx'))

// force-dynamic ما يتوافق مع static export (الصفحات أصلاً client components)
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)])
let stripped = 0
for (const f of walk(app).filter(f => /\.(tsx?|jsx?)$/.test(f))) {
  const src = fs.readFileSync(f, 'utf8')
  const next = src.replace(/^export const dynamic = ['"]force-dynamic['"];?\s*$/m, '')
  if (next !== src) { fs.writeFileSync(f, next); stripped++ }
}
console.log(`• إزالة force-dynamic من ${stripped} ملف`)

// ─── إعداد Next للتصدير ───
fs.rmSync(path.join(build, 'next.config.ts'), { force: true })
fs.writeFileSync(path.join(build, 'next.config.mjs'), `/** بناء تطبيق الجوال — ملفات ثابتة فقط */
export default {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
}
`)

// ─── البناء ───
console.log('• next build (static export)')
execSync('npx next build', { cwd: build, stdio: 'inherit', env: { ...env, NEXT_TELEMETRY_DISABLED: '1' } })

fs.rmSync(outDir, { recursive: true, force: true })
fs.cpSync(path.join(build, 'out'), outDir, { recursive: true })
console.log(`✔ الواجهة جاهزة بـ app-www/  (API: ${env.NEXT_PUBLIC_API_BASE_URL})`)
