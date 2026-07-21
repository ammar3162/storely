import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendWhatsAppMessage } from '@/lib/whatsapp'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!
const ADMIN_PHONE  = process.env.ADMIN_ALERT_PHONE || '966594351667'

const sb = () => createClient(SUPABASE_URL, SERVICE_KEY)

type Issue = { type: string; severity: 'critical' | 'warning'; detail: string; count: number }

async function checkProductsWithoutBranch(supabase: any): Promise<Issue | null> {
  const { data, error } = await supabase
    .from('products')
    .select('org_id, organizations(name)')
    .is('branch_id', null)
    .eq('is_active', true)

  if (error || !data || data.length === 0) return null

  const orgNames = [...new Set(data.map((p: any) => p.organizations?.name || p.org_id))]
  return {
    type: 'منتجات بدون فرع',
    severity: 'critical',
    detail: `${data.length} منتج بدون فرع محدد في: ${orgNames.join('، ')}`,
    count: data.length,
  }
}

async function checkOrgsWithoutActiveBranch(supabase: any): Promise<Issue | null> {
  const { data: orgs } = await supabase.from('organizations').select('id, name')
  if (!orgs) return null

  const problematic: string[] = []
  for (const org of orgs) {
    const { count } = await supabase
      .from('branches')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', org.id)
      .eq('is_active', true)
    if (!count || count === 0) problematic.push(org.name)
  }

  if (problematic.length === 0) return null
  return {
    type: 'مؤسسات بدون فرع فعّال',
    severity: 'critical',
    detail: `المؤسسات: ${problematic.join('، ')}`,
    count: problematic.length,
  }
}

async function checkDuplicateProducts(supabase: any): Promise<Issue | null> {
  const { data } = await supabase.from('products').select('org_id, name').eq('is_active', true)
  if (!data) return null

  const seen: Record<string, number> = {}
  for (const p of data) {
    const key = `${p.org_id}::${p.name}`
    seen[key] = (seen[key] || 0) + 1
  }
  const duplicates = Object.entries(seen).filter(([, c]) => c > 1)
  if (duplicates.length === 0) return null

  return {
    type: 'منتجات مكررة بنفس الاسم',
    severity: 'warning',
    detail: `${duplicates.length} اسم منتج مكرر داخل نفس المؤسسة`,
    count: duplicates.length,
  }
}

async function checkStalePendingUsers(supabase: any): Promise<Issue | null> {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { data, count } = await supabase
    .from('profiles')
    .select('full_name', { count: 'exact' })
    .eq('status', 'pending')
    .lt('created_at', weekAgo)

  if (!count || count === 0) return null
  return {
    type: 'مستخدمين معلّقين أكثر من أسبوع',
    severity: 'warning',
    detail: `${count} مستخدم بانتظار الموافقة منذ أكثر من 7 أيام: ${(data || []).map((u: any) => u.full_name).join('، ')}`,
    count,
  }
}

async function checkExpiredButActiveSubs(supabase: any): Promise<Issue | null> {
  const now = new Date().toISOString()
  const { data, count } = await supabase
    .from('profiles')
    .select('full_name', { count: 'exact' })
    .eq('status', 'active')
    .eq('subscription_type', 'paid')
    .not('subscription_ends_at', 'is', null)
    .lt('subscription_ends_at', now)

  if (!count || count === 0) return null
  return {
    type: 'اشتراكات منتهية لكنها لسا مفعّلة',
    severity: 'warning',
    detail: `${count} حساب اشتراكه منتهي لكن الحالة لسا "مفعّل": ${(data || []).map((u: any) => u.full_name).join('، ')}`,
    count,
  }
}

function buildAlertMessage(issues: Issue[]) {
  const critical = issues.filter(i => i.severity === 'critical')
  const warning  = issues.filter(i => i.severity === 'warning')

  let msg = `🚨 *تنبيه فحص صحة Storely*\n\n`
  if (critical.length) {
    msg += `🔴 *مشاكل حرجة:*\n` + critical.map(i => `• ${i.type}: ${i.detail}`).join('\n') + '\n\n'
  }
  if (warning.length) {
    msg += `🟡 *تحتاج مراجعة:*\n` + warning.map(i => `• ${i.type}: ${i.detail}`).join('\n') + '\n\n'
  }
  msg += `🔗 راجع التفاصيل: storely.dev/storely-admin\n_فحص تلقائي ${new Date().toLocaleString('ar-SA', { timeZone: 'Asia/Riyadh' })}_`
  return msg
}

async function autoFix(supabase: any) {
  // إصلاح 1: مؤسسات بدون فرع — أنشئ فرع افتراضي
  const { data: orgs } = await supabase.from('organizations').select('id, name')
  for (const org of orgs || []) {
    const { count } = await supabase.from('branches').select('id', { count: 'exact', head: true }).eq('org_id', org.id).eq('is_active', true)
    if (!count || count === 0) {
      const { data: branch } = await supabase.from('branches').insert({ org_id: org.id, name: 'الفرع الرئيسي', is_active: true }).select().single()
      if (branch) {
        // إصلاح 2: ربط منتجات هذه المؤسسة بالفرع الجديد
        await supabase.from('products').update({ branch_id: branch.id }).eq('org_id', org.id).is('branch_id', null)
      }
    }
  }

  // إصلاح 3: منتجات بدون فرع — ربطها بالفرع الأول
  const { data: prodsNoBranch } = await supabase.from('products').select('id, org_id').is('branch_id', null).eq('is_active', true)
  for (const prod of prodsNoBranch || []) {
    const { data: branch } = await supabase.from('branches').select('id').eq('org_id', prod.org_id).eq('is_active', true).limit(1).single()
    if (branch) await supabase.from('products').update({ branch_id: branch.id }).eq('id', prod.id)
  }

  // ⚠️ ملاحظة أمان: كان هنا "إصلاح 4" يعطّل تلقائياً أي منتج بنفس اسم منتج آخر
  // بنفس المؤسسة (يعتبره تكرار). تم حذفه نهائياً بتاريخ اليوم لأنه عطّل
  // بيانات حقيقية بصمت بدون أي تأكيد أو تنبيه مسبق للمالك. التكرار الآن
  // يُبلّغ عنه فقط عبر checkDuplicateProducts (تنبيه واتساب)، والقرار
  // يبقى بيد المالك يدوياً من صفحة المخزون.
}

export async function GET(req: Request) {
  try {
    const supabase = sb()

    await autoFix(supabase)

    const checks = await Promise.all([
      checkProductsWithoutBranch(supabase),
      checkOrgsWithoutActiveBranch(supabase),
      checkDuplicateProducts(supabase),
      checkStalePendingUsers(supabase),
      checkExpiredButActiveSubs(supabase),
    ])

    const issues = checks.filter((c): c is Issue => c !== null)

    await supabase.from('health_check_logs').insert({
      issues_count: issues.length,
      issues: issues,
      checked_at: new Date().toISOString(),
    })

    if (issues.length > 0) {
      await sendWhatsAppMessage(ADMIN_PHONE, buildAlertMessage(issues))
    }

    return NextResponse.json({ success: true, issues_count: issues.length, issues })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
