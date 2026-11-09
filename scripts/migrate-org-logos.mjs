// نقل شعارات المنشآت من مجلد الفواتير (صار خاص) لمجلد org-logos العام — يشتغل مرة وحدة بعد 2026-11-07_private_invoices.sql
// node scripts/migrate-org-logos.mjs <SUPABASE_URL> [--apply]   (مفتاح الخدمة من SUPABASE_SERVICE_ROLE_KEY)
// بدون --apply يعرض وش بيسوي بس. ما يحذف شي: الملف القديم يبقى بمكانه.
import { createClient } from '@supabase/supabase-js'
const [, , url, flag] = process.argv
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) { console.error('usage: SUPABASE_SERVICE_ROLE_KEY=… node scripts/migrate-org-logos.mjs <url> [--apply]'); process.exit(1) }
const apply = flag === '--apply'
const db = createClient(url, key, { auth: { persistSession: false } })
const marker = '/storage/v1/object/public/invoices/'
const { data: orgs, error } = await db.from('organizations').select('id,name,logo_url').like('logo_url', `%${marker}%`)
if (error) throw error
let moved = 0, failed = 0
for (const o of orgs) {
  const path = decodeURIComponent(o.logo_url.split(marker)[1].split('?')[0])
  if (!apply) { console.log('سيُنقل:', o.id, path); continue }
  const { data: blob, error: dErr } = await db.storage.from('invoices').download(path)
  if (dErr || !blob) { console.error('فشل التحميل', o.id, path, dErr?.message); failed++; continue }
  const { error: uErr } = await db.storage.from('org-logos').upload(path, blob, { upsert: true, contentType: blob.type || 'image/png' })
  if (uErr) { console.error('فشل الرفع', o.id, uErr.message); failed++; continue }
  const newUrl = db.storage.from('org-logos').getPublicUrl(path).data.publicUrl
  const { error: oErr } = await db.from('organizations').update({ logo_url: newUrl }).eq('id', o.id)
  if (oErr) { console.error('فشل تحديث المنشأة', o.id, oErr.message); failed++; continue }
  moved++
}
console.log(apply ? `انتقل ${moved} شعار، فشل ${failed}` : `${orgs.length} شعار بينتقل (تجربة بدون تطبيق)`)
