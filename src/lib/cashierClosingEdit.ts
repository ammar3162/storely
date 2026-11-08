import type { SupabaseClient } from '@supabase/supabase-js'
import { computeClosing } from '@/lib/cashierClosingCalc'
import { lockedFor, lockedFromError } from '@/lib/periodLock'
import { saudiToday } from '@/lib/accountantSchedule'
import { deliveryFromInput } from '@/lib/deliveryApps'

// تعديل/حذف إقفال الكاشير من المالك أو المحاسب — كل شي يتحدث معه: الفرق، قرار العجز، خصم الراتب، وسجل التعديلات
const FIELDS = 'id,org_id,branch_id,staff_id,staff_name,closing_date,total_sales,network_amount,mada_amount,visa_amount,mastercard_amount,cash_amount,delivery,delivery_amount,purchases,total_purchases,expected_cash,difference,status,deficit_reason,deficit_decision,edit_count'
const AUDIT = ['closing_date', 'total_sales', 'mada_amount', 'visa_amount', 'mastercard_amount', 'network_amount', 'cash_amount', 'delivery', 'delivery_amount', 'purchases', 'total_purchases', 'difference', 'status', 'deficit_reason', 'deficit_decision'] as const
const pick = (o: any) => Object.fromEntries(AUDIT.map(k => [k, o?.[k] ?? null]))
export type Fail = { ok: false; error: string; status: number }
export type EditSource = { source?: 'owner' | 'accountant'; accountantId?: string | null }

/** شهر مقفل في الأرباح (لقطة محفوظة) — التعديل فيه يخرب الأرقام المحفوظة */
async function profitClosedFor(db: SupabaseClient, orgId: string, branchId: string | null, dates: string[]) {
  const months = [...new Set(dates.map(d => d.slice(0, 7) + '-01'))]
  let q = db.from('profitability_closings').select('month,branch_id').eq('org_id', orgId).in('month', months)
  const { data } = await q
  const hit = ((data || []) as any[]).find(r => r.branch_id === null || r.branch_id === branchId)
  return hit ? `أرباح شهر ${String(hit.month).slice(0, 7)} مقفلة في صفحة الربحية — افتح الشهر هناك أول` : null
}

/** الشهر مقفل (من المحاسب أو في الأرباح)؟ — نفس الشرط لتعديل الإقفالات والمشتريات */
export async function periodGuard(db: SupabaseClient, orgId: string, branchId: string | null, dates: string[]): Promise<Fail | null> {
  const locked = await lockedFor(db, orgId, dates)
  if (locked) return { ok: false, error: locked, status: 423 }
  const profit = await profitClosedFor(db, orgId, branchId, dates)
  if (profit) return { ok: false, error: profit, status: 423 }
  return null
}

export async function editClosing(db: SupabaseClient, orgId: string, id: string, input: any, editor: string, by: EditSource = {}): Promise<{ ok: true; closing: any; editId: string | null } | Fail> {
  const source = by.source || 'owner'
  const { data: cur } = await db.from('cashier_closings').select(FIELDS).eq('id', id).eq('org_id', orgId).maybeSingle()
  const c = cur as any
  if (!c) return { ok: false, error: 'الإقفال غير موجود', status: 404 }

  const date = String(input?.closing_date || c.closing_date)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || isNaN(Date.parse(date + 'T00:00:00Z'))) return { ok: false, error: 'التاريخ غير صحيح', status: 400 }
  if (date > saudiToday()) return { ok: false, error: 'لا يمكن اختيار تاريخ في المستقبل', status: 400 }
  // التوصيل: لو ما انرسل نخلي المبالغ المحفوظة
  const delivery = input?.delivery !== undefined ? deliveryFromInput(input.delivery) : c.delivery
  const calc = computeClosing({
    total_sales: input?.total_sales ?? c.total_sales, mada_amount: input?.mada_amount ?? c.mada_amount, visa_amount: input?.visa_amount ?? c.visa_amount,
    mastercard_amount: input?.mastercard_amount ?? c.mastercard_amount, cash_amount: input?.cash_amount ?? c.cash_amount, purchases: input?.purchases ?? c.purchases, delivery,
  })
  if (!calc) return { ok: false, error: 'مبالغ غير صالحة', status: 400 }
  const reason = calc.status === 'deficit' ? String(input?.deficit_reason ?? c.deficit_reason ?? '').trim().slice(0, 500) : ''
  if (calc.status === 'deficit' && reason.length < 3) return { ok: false, error: 'يوجد عجز — اكتب سببه', status: 400 }

  const g = await periodGuard(db, orgId, c.branch_id, [c.closing_date, date]); if (g) return g

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
    deficit_decided_at: decision === c.deficit_decision ? undefined : null, edited_at: new Date().toISOString(), edited_by: editor, edited_source: source, edit_count: Number(c.edit_count || 0) + 1 }
  if (upd.deficit_decided_at === undefined) delete (upd as any).deficit_decided_at
  const { data: after, error } = await db.from('cashier_closings').update(upd as any).eq('id', id).eq('org_id', orgId).select(FIELDS + ',edited_at,edited_by,edited_source').single()
  if (error) return { ok: false, error: lockedFromError(error) || 'تعذر حفظ التعديل', status: lockedFromError(error) ? 423 : 500 }

  const { data: log } = await db.from('cashier_closing_edits').insert({ org_id: orgId, closing_id: id, action: 'edit', before: pick(c), after: pick(after), edited_by: editor,
    source, accountant_id: by.accountantId || null } as any).select('id').single()
  if (!isDeficit) await db.from('notifications').update({ read: true } as any).eq('org_id', orgId).eq('ref_type', 'cashier_deficit').eq('ref_id', id)
  if (isDeficit && !wasDeficit) await db.from('notifications').insert({ org_id: orgId, branch_id: c.branch_id, type: 'warning', read: false,
    title: `عجز بانتظار قرارك: ${c.staff_name}`, message: `بعد تعديل إقفال ${date} أصبح هناك عجز بقيمة ${amount.toFixed(2)} ⃁ — السبب: ${reason}. هل تريد خصمه من راتب الكاشير؟`,
    ref_type: 'cashier_deficit', ref_id: id } as any)
  return { ok: true, closing: after, editId: (log as any)?.id || null }
}

export async function deleteClosing(db: SupabaseClient, orgId: string, id: string, editor: string): Promise<{ ok: true } | Fail> {
  const { data: cur } = await db.from('cashier_closings').select(FIELDS).eq('id', id).eq('org_id', orgId).maybeSingle()
  const c = cur as any
  if (!c) return { ok: false, error: 'الإقفال غير موجود', status: 404 }
  const g = await periodGuard(db, orgId, c.branch_id, [c.closing_date]); if (g) return g
  const { error } = await db.from('cashier_closings').delete().eq('id', id).eq('org_id', orgId)
  if (error) return { ok: false, error: lockedFromError(error) || 'تعذر الحذف', status: lockedFromError(error) ? 423 : 500 }
  // الخصم المعتمد من الراتب ينشال مع الإقفال
  await db.from('staff_payroll_adjustments').delete().eq('org_id', orgId).eq('source', 'cashier_deficit').eq('source_id', id)
  await db.from('notifications').update({ read: true } as any).eq('org_id', orgId).eq('ref_type', 'cashier_deficit').eq('ref_id', id)
  await db.from('cashier_closing_edits').insert({ org_id: orgId, closing_id: id, action: 'delete', before: pick(c), after: null, edited_by: editor } as any)
  return { ok: true }
}

/** المالك يرجّع تعديل على إقفال — بشرط ما يكون بعده تعديل ثاني ما انرجع، والإقفال يرجع بنفس قواعد التعديل */
export async function revertClosingEdit(db: SupabaseClient, orgId: string, editId: string, editor: string): Promise<{ ok: true } | Fail> {
  const { data } = await db.from('cashier_closing_edits').select('id,closing_id,action,before,created_at,reverted_at').eq('id', editId).eq('org_id', orgId).maybeSingle()
  const e = data as any
  if (!e || e.action !== 'edit') return { ok: false, error: 'التعديل غير موجود', status: 404 }
  if (e.reverted_at) return { ok: false, error: 'تم التراجع عن هذا التعديل مسبقاً', status: 409 }
  const { data: later } = await db.from('cashier_closing_edits').select('id').eq('org_id', orgId).eq('closing_id', e.closing_id).is('reverted_at', null).gt('created_at', e.created_at).limit(1)
  if (later?.length) return { ok: false, error: 'يوجد تعديل أحدث على الإقفال نفسه — تراجع عنه أولاً', status: 409 }
  const b = e.before || {}
  const r = await editClosing(db, orgId, e.closing_id, {
    closing_date: b.closing_date, total_sales: b.total_sales, mada_amount: b.mada_amount, visa_amount: b.visa_amount, mastercard_amount: b.mastercard_amount,
    cash_amount: b.cash_amount, purchases: b.purchases || [], delivery: b.delivery || [], deficit_reason: b.deficit_reason,
  }, editor)
  if (!r.ok) return r
  const now = new Date().toISOString()
  await db.from('cashier_closing_edits').update({ reverted_at: now, reverted_by: editor } as any).eq('id', editId).eq('org_id', orgId)
  // سطر الترجيع نفسه ما ينرجع (يرجّعه تعديل جديد لو احتاج)
  if (r.editId) await db.from('cashier_closing_edits').update({ reverted_at: now, reverted_by: editor } as any).eq('id', r.editId).eq('org_id', orgId)
  return { ok: true }
}
