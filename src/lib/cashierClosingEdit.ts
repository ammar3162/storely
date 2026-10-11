import type { SupabaseClient } from '@supabase/supabase-js'
import { computeClosing } from '@/lib/cashierClosingCalc'
import { lockedFor, lockedFromError } from '@/lib/periodLock'
import { saudiToday } from '@/lib/accountantSchedule'

// تعديل/حذف إقفال الكاشير من المالك — كل شي يتحدث معه: الفرق، قرار العجز، خصم الراتب، وسجل التعديلات
const FIELDS = 'id,org_id,branch_id,staff_id,staff_name,closing_date,total_sales,network_amount,mada_amount,visa_amount,mastercard_amount,cash_amount,purchases,total_purchases,expected_cash,difference,status,deficit_reason,deficit_decision,edit_count'
const AUDIT = ['closing_date', 'total_sales', 'mada_amount', 'visa_amount', 'mastercard_amount', 'network_amount', 'cash_amount', 'purchases', 'total_purchases', 'difference', 'status', 'deficit_reason', 'deficit_decision'] as const
const pick = (o: any) => Object.fromEntries(AUDIT.map(k => [k, o?.[k] ?? null]))
type Fail = { ok: false; error: string; status: number }

/** شهر مقفل في الأرباح (لقطة محفوظة) — التعديل فيه يخرب الأرقام المحفوظة */
async function profitClosedFor(db: SupabaseClient, orgId: string, branchId: string | null, dates: string[]) {
  const months = [...new Set(dates.map(d => d.slice(0, 7) + '-01'))]
  let q = db.from('profitability_closings').select('month,branch_id').eq('org_id', orgId).in('month', months)
  const { data } = await q
  const hit = ((data || []) as any[]).find(r => r.branch_id === null || r.branch_id === branchId)
  return hit ? `أرباح شهر ${String(hit.month).slice(0, 7)} مقفلة في صفحة الربحية — افتح الشهر هناك أول` : null
}

async function guard(db: SupabaseClient, orgId: string, branchId: string | null, dates: string[]): Promise<Fail | null> {
  const locked = await lockedFor(db, orgId, dates)
  if (locked) return { ok: false, error: locked, status: 423 }
  const profit = await profitClosedFor(db, orgId, branchId, dates)
  if (profit) return { ok: false, error: profit, status: 423 }
  return null
}

export async function editClosing(db: SupabaseClient, orgId: string, id: string, input: any, editor: string): Promise<{ ok: true; closing: any } | Fail> {
  const { data: cur } = await db.from('cashier_closings').select(FIELDS).eq('id', id).eq('org_id', orgId).maybeSingle()
  const c = cur as any
  if (!c) return { ok: false, error: 'الإقفال غير موجود', status: 404 }

  const date = String(input?.closing_date || c.closing_date)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || isNaN(Date.parse(date + 'T00:00:00Z'))) return { ok: false, error: 'التاريخ غير صحيح', status: 400 }
  if (date > saudiToday()) return { ok: false, error: 'ما ينفع تاريخ بالمستقبل', status: 400 }
  const calc = computeClosing({
    total_sales: input?.total_sales ?? c.total_sales, mada_amount: input?.mada_amount ?? c.mada_amount, visa_amount: input?.visa_amount ?? c.visa_amount,
    mastercard_amount: input?.mastercard_amount ?? c.mastercard_amount, cash_amount: input?.cash_amount ?? c.cash_amount, purchases: input?.purchases ?? c.purchases,
  })
  if (!calc) return { ok: false, error: 'مبالغ غير صالحة', status: 400 }
  const reason = calc.status === 'deficit' ? String(input?.deficit_reason ?? c.deficit_reason ?? '').trim().slice(0, 500) : ''
  if (calc.status === 'deficit' && reason.length < 3) return { ok: false, error: 'فيه عجز — اكتب سببه', status: 400 }

  const g = await guard(db, orgId, c.branch_id, [c.closing_date, date]); if (g) return g

  // قرار العجز وخصم الراتب يمشون مع الأرقام الجديدة
  let decision: string | null = c.deficit_decision
  const wasDeficit = c.status === 'deficit', isDeficit = calc.status === 'deficit'
  const amount = Math.round(Math.abs(calc.difference) * 100) / 100
  if (!isDeficit) decision = null
  else if (!wasDeficit) decision = 'pending'
  if (wasDeficit && c.deficit_decision === 'approved') {
    if (isDeficit) await db.from('staff_payroll_adjustments').update({ amount, reason: `عجز إقفال الكاشير ${date}${reason ? ` — ${reason}` : ''}` } as any)
      .eq('org_id', orgId).eq('source', 'cashier_deficit').eq('source_id', id)
    else await db.from('staff_payroll_adjustments').delete().eq('org_id', orgId).eq('source', 'cashier_deficit').eq('source_id', id)
  }

  const upd = { ...calc, closing_date: date, deficit_reason: reason || null, deficit_decision: decision,
    deficit_decided_at: decision === c.deficit_decision ? undefined : null, edited_at: new Date().toISOString(), edited_by: editor, edit_count: Number(c.edit_count || 0) + 1 }
  if (upd.deficit_decided_at === undefined) delete (upd as any).deficit_decided_at
  const { data: after, error } = await db.from('cashier_closings').update(upd as any).eq('id', id).eq('org_id', orgId).select(FIELDS + ',edited_at,edited_by').single()
  if (error) return { ok: false, error: lockedFromError(error) || 'تعذر حفظ التعديل', status: lockedFromError(error) ? 423 : 500 }

  await db.from('cashier_closing_edits').insert({ org_id: orgId, closing_id: id, action: 'edit', before: pick(c), after: pick(after), edited_by: editor } as any)
  if (!isDeficit) await db.from('notifications').update({ read: true } as any).eq('org_id', orgId).eq('ref_type', 'cashier_deficit').eq('ref_id', id)
  if (isDeficit && !wasDeficit) await db.from('notifications').insert({ org_id: orgId, branch_id: c.branch_id, type: 'warning', read: false,
    title: `عجز بانتظار قرارك: ${c.staff_name}`, message: `بعد تعديل إقفال ${date} صار فيه عجز ${amount.toFixed(2)} ر.س — السبب: ${reason}. تخصمه من راتب الكاشير؟`,
    ref_type: 'cashier_deficit', ref_id: id } as any)
  return { ok: true, closing: after }
}

export async function deleteClosing(db: SupabaseClient, orgId: string, id: string, editor: string): Promise<{ ok: true } | Fail> {
  const { data: cur } = await db.from('cashier_closings').select(FIELDS).eq('id', id).eq('org_id', orgId).maybeSingle()
  const c = cur as any
  if (!c) return { ok: false, error: 'الإقفال غير موجود', status: 404 }
  const g = await guard(db, orgId, c.branch_id, [c.closing_date]); if (g) return g
  const { error } = await db.from('cashier_closings').delete().eq('id', id).eq('org_id', orgId)
  if (error) return { ok: false, error: lockedFromError(error) || 'تعذر الحذف', status: lockedFromError(error) ? 423 : 500 }
  // الخصم المعتمد من الراتب ينشال مع الإقفال
  await db.from('staff_payroll_adjustments').delete().eq('org_id', orgId).eq('source', 'cashier_deficit').eq('source_id', id)
  await db.from('notifications').update({ read: true } as any).eq('org_id', orgId).eq('ref_type', 'cashier_deficit').eq('ref_id', id)
  await db.from('cashier_closing_edits').insert({ org_id: orgId, closing_id: id, action: 'delete', before: pick(c), after: null, edited_by: editor } as any)
  return { ok: true }
}
