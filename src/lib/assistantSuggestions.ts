// اقتراحات المساعد الذكي (طلب المالك 2026-11-17، مثل اقتراحات Siri وGemini): أسئلة جاهزة من بيانات المنشأة الحين.
// تنحسب من القاعدة مباشرة (بدون ذكاء اصطناعي ولا تكلفة) — والذكاء يشتغل بس لما يضغط المستخدم على اقتراح.
// كل اقتراح مربوط بأداة من أدوات المساعد (lib/assistantTools)، فما يطلع إلا اللي يقدر المساعد يجاوب عليه لهذا المستخدم.
import type { SupabaseClient } from '@supabase/supabase-js'
import { computeBusinessDate } from '@/lib/businessDate'
import { closingReturns } from '@/lib/closingReturns'

export type SuggestIcon = 'closing' | 'attendance' | 'late' | 'deficit' | 'returns' | 'stock' | 'vat' | 'payables' | 'subscription'
export type Suggestion = { id: string; label: string; prompt: string; icon: SuggestIcon; count?: number; urgent?: boolean }

export type SuggestionFacts = {
  hour: number                        // الساعة بتوقيت السعودية (0–23)
  tools: string[]                     // أدوات المساعد المسموحة لهذا المستخدم
  owner: boolean
  closingsToday?: number
  closingsYesterday?: number
  returnsToday?: number
  staffCount?: number
  checkedInToday?: number
  lateToday?: number
  lowStock?: number
  vatRegistered?: boolean
  vatDueInDays?: number | null        // كم يوم لين آخر موعد لتقديم الإقرار الحالي
  payablesDueWeek?: number
  subscriptionDaysLeft?: number | null
}

const days = (n: number) => (n <= 1 ? 'يوم واحد' : n === 2 ? 'يومين' : n <= 10 ? `${n} أيام` : `${n} يوماً`)

/** الاقتراحات مرتّبة: العاجل أول، ثم الأنسب لوقت اليوم (الصبح الحضور، والمساء الإقفالات) */
export function buildSuggestions(f: SuggestionFacts, max = 5): Suggestion[] {
  const has = (t: string) => f.tools.includes(t)
  const morning = f.hour >= 5 && f.hour < 13
  const evening = f.hour >= 17 || f.hour < 3
  const out: (Suggestion & { score: number })[] = []
  const add = (s: Suggestion, score: number) => out.push({ ...s, score })

  if (f.owner && f.subscriptionDaysLeft != null && f.subscriptionDaysLeft >= 0 && f.subscriptionDaysLeft <= 7)
    add({ id: 'subscription', icon: 'subscription', urgent: true, label: f.subscriptionDaysLeft === 0 ? 'اشتراكك ينتهي اليوم' : `اشتراكك ينتهي خلال ${days(f.subscriptionDaysLeft)}`, prompt: 'متى ينتهي اشتراكي؟ وكيف أجدده؟' }, 95)

  if (has('cashier_closings')) {
    // العجز اللي ينتظر قرار صار بطاقة قرار في Soul (lib/assistantDecisions) بأزرار الخصم والرفض، فما يتكرر هنا كسؤال
    if (f.closingsToday) add({ id: 'closings', icon: 'closing', label: 'إقفالات اليوم', count: f.closingsToday, prompt: 'اعرض ملخص إقفالات الكاشير اليوم: المبيعات والشبكة والكاش والعجز أو الزيادة' }, evening ? 90 : 62)
    else if (f.hour >= 22 || f.hour < 3) add({ id: 'closings-missing', icon: 'closing', urgent: true, label: 'لم يُسجَّل إقفال اليوم', prompt: 'هل سُجّل إقفال الكاشير اليوم؟ وما آخر إقفال مسجّل؟' }, 86)
    else if (morning && f.closingsYesterday) add({ id: 'closings-yesterday', icon: 'closing', label: 'إقفالات أمس', count: f.closingsYesterday, prompt: 'اعرض ملخص إقفالات الكاشير أمس: المبيعات والشبكة والكاش والعجز أو الزيادة' }, 72)
    if (f.returnsToday) add({ id: 'returns', icon: 'returns', label: 'مرتجعات اليوم', count: f.returnsToday, prompt: 'كم فاتورة مرتجعة في إقفالات اليوم؟ وما أسبابها؟' }, 76)
  }

  if (has('attendance') && f.staffCount) {
    add({ id: 'attendance', icon: 'attendance', label: 'من داوم اليوم؟', count: f.checkedInToday || 0, prompt: 'من حضر اليوم ومن لم يحضر بعد؟' }, morning ? 88 : 56)
    if (f.lateToday) add({ id: 'late', icon: 'late', label: 'من تأخر اليوم؟', count: f.lateToday, prompt: 'من تأخر اليوم وكم دقيقة؟' }, morning ? 80 : 52)
  }

  if (has('inventory') && f.lowStock) add({ id: 'stock', icon: 'stock', label: 'أصناف قاربت تنفد', count: f.lowStock, prompt: 'ما الأصناف التي قاربت على النفاد وكم باقي منها؟' }, 66)

  if (has('vat') && f.vatRegistered) {
    const due = f.vatDueInDays
    const filing = due != null && due <= 31                     // شهر تقديم الإقرار
    add({ id: 'vat', icon: 'vat', urgent: due != null && due <= 7, label: filing ? `الإقرار الضريبي (باقي ${days(due!)})` : 'ضريبة هذا الربع',
      prompt: filing ? 'جهّز لي ملخص الإقرار الضريبي المستحق تقديمه، مع آخر موعد للتقديم' : 'كم ضريبة القيمة المضافة لهذا الربع حتى الآن؟' }, filing ? (due! <= 10 ? 92 : 78) : 40)
  }

  if (has('purchases') && f.payablesDueWeek) add({ id: 'payables', icon: 'payables', label: 'فواتير موردين مستحقة', count: f.payablesDueWeek, prompt: 'ما فواتير الموردين غير المدفوعة المستحقة هذا الأسبوع؟' }, 60)

  return out.sort((a, b) => b.score - a.score).slice(0, max).map(({ score: _s, ...s }) => s)
}

/** آخر موعد لتقديم الإقرار الربعي: نهاية الشهر اللي بعد نهاية الربع (يناير/أبريل/يوليو/أكتوبر = شهر التقديم) */
export function vatDueInDays(today: string): number {
  const [y, m] = today.split('-').map(Number)          // m: 1–12
  const filingMonth = (m - 1) % 3 === 0 ? m : m + (3 - ((m - 1) % 3))   // شهر التقديم القادم (أو الحالي)
  const fy = filingMonth > 12 ? y + 1 : y, fm = filingMonth > 12 ? filingMonth - 12 : filingMonth
  const lastDay = new Date(Date.UTC(fy, fm, 0)).getUTCDate()
  const due = Date.UTC(fy, fm - 1, lastDay), now = Date.parse(today + 'T00:00:00Z')
  return Math.max(0, Math.round((due - now) / 86400000))
}

const saudiNow = () => new Date(Date.now() + 3 * 3600e3)
const saudiDate = (d: Date) => d.toISOString().slice(0, 10)

/** الأرقام اللي تنبني عليها الاقتراحات — استعلامات عدّ خفيفة بالتوازي (مدير الفرع: فرعه بس) */
export async function loadSuggestionFacts(db: SupabaseClient, o: { orgId: string; branchId: string | null; tools: string[]; owner: boolean }): Promise<SuggestionFacts> {
  const has = (t: string) => o.tools.includes(t)
  const now = saudiNow(), hour = now.getUTCHours(), today = saudiDate(now)
  const yesterday = saudiDate(new Date(now.getTime() - 86400000))
  const startToday = `${today}T00:00:00+03:00`
  const br = (q: any) => (o.branchId ? q.eq('branch_id', o.branchId) : q)

  const { data: org } = await db.from('organizations').select('vat_registered,business_day_start_hour').eq('id', o.orgId).maybeSingle()
  const businessToday = computeBusinessDate({ startHour: (org as any)?.business_day_start_hour })
  const businessYesterday = saudiDate(new Date(Date.parse(businessToday + 'T12:00:00Z') - 86400000))

  const tasks: Record<string, PromiseLike<any>> = {}
  if (has('cashier_closings')) {
    tasks.closings = br(db.from('cashier_closings').select('closing_date,returns').eq('org_id', o.orgId).in('closing_date', [businessToday, businessYesterday]) )
  }
  if (has('attendance')) {
    tasks.staff = br(db.from('staff_members').select('id', { count: 'exact', head: true }).eq('org_id', o.orgId).eq('is_active', true) )
    tasks.checkins = br(db.from('staff_attendance').select('staff_id,late_minutes').eq('org_id', o.orgId).eq('type', 'check_in').gte('recorded_at', startToday) )
  }
  if (has('inventory')) tasks.stock = br(db.from('products').select('qty,reorder_point').eq('org_id', o.orgId).eq('is_active', true).limit(3000) )
  if (has('purchases')) {
    const inWeek = saudiDate(new Date(now.getTime() + 7 * 86400000))
    tasks.payables = br(db.from('purchases').select('id,invoice_group').eq('org_id', o.orgId).is('deleted_at', null).eq('payment_status', 'unpaid').gte('due_date', today).lte('due_date', inWeek) )
  }
  if (o.owner) tasks.owner = db.from('profiles').select('subscription_ends_at').eq('org_id', o.orgId).eq('role', 'owner').maybeSingle()

  const keys = Object.keys(tasks)
  const res = Object.fromEntries((await Promise.all(keys.map(k => Promise.resolve(tasks[k]).catch(() => ({ data: null, count: null }))))).map((r, i) => [keys[i], r]))

  const closings = ((res.closings?.data || []) as any[])
  const todays = closings.filter(c => c.closing_date === businessToday)
  const checkins = ((res.checkins?.data || []) as any[])
  const ends = res.owner?.data?.subscription_ends_at
  return {
    hour, tools: o.tools, owner: o.owner,
    closingsToday: todays.length,
    closingsYesterday: closings.filter(c => c.closing_date === businessYesterday).length,
    returnsToday: todays.reduce((t, c) => t + closingReturns(c).length, 0),
    staffCount: res.staff?.count || 0,
    checkedInToday: new Set(checkins.map(c => c.staff_id)).size,
    lateToday: new Set(checkins.filter(c => Number(c.late_minutes) > 0).map(c => c.staff_id)).size,
    lowStock: ((res.stock?.data || []) as any[]).filter(p => Number(p.qty) <= Number(p.reorder_point ?? 5)).length,
    vatRegistered: (org as any)?.vat_registered === true,
    vatDueInDays: vatDueInDays(today),
    payablesDueWeek: new Set(((res.payables?.data || []) as any[]).map(p => p.invoice_group || p.id)).size,
    subscriptionDaysLeft: ends ? Math.ceil((Date.parse(ends) - Date.now()) / 86400000) : null,
  }
}
