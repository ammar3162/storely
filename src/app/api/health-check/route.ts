import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const API_KEY      = process.env.WASENDER_API_KEY!
const SESSION      = process.env.WASENDER_SESSION_ID!
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!
const ADMIN_PHONE  = process.env.ADMIN_ALERT_PHONE || '966594351667'

const sb = () => createClient(SUPABASE_URL, SERVICE_KEY)

async function sendWhatsApp(phone: string, text: string) {
  try {
    await fetch('https://www.wasenderapi.com/api/send-message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
      body: JSON.stringify({ session_id: SESSION, to: phone, text }),
    })
  } catch {}
}

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

export async function GET(req: Request) {
  try {
    const supabase = sb()

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
      await sendWhatsApp(ADMIN_PHONE, buildAlertMessage(issues))
    }

    return NextResponse.json({ success: true, issues_count: issues.length, issues })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
