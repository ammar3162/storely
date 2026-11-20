import { describe, it, expect } from 'vitest'
import { canDecide, deficitDecision, excuseDecision, leaveDecision, advanceDecision, extraDayDecision, payableDecision, stockDecision, ago, dayLabel, type BuildCtx } from './assistantDecisions'
import { countAr, soulPath } from './soulDecisions'

const nowMs = Date.parse('2026-11-19T09:00:00Z')   // 12 الظهر بتوقيت السعودية، الخميس
const x: BuildCtx = { today: '2026-11-19', nowMs, cur: '⃁', branchName: () => null }
const ALL = { cashier: true, hr: true, inventory: true, purchases: true, ai: true, profitability: true }

describe('Soul decisions: who decides what', () => {
  it('deficit and extra day are the owner’s; staff requests follow HR/attendance; supplies and invoices follow their pages', () => {
    const owner = { role: 'owner' }, mgr = (p: Record<string, boolean>) => ({ role: 'manager', permissions: p })
    expect(canDecide('deficit', owner, ALL)).toBe(true)
    expect(canDecide('deficit', mgr({ reports: true, hr: true }), ALL)).toBe(false)
    expect(canDecide('extra_day', mgr({ hr: true }), ALL)).toBe(false)
    expect(canDecide('excuse', mgr({ attendance: true }), ALL)).toBe(true)
    expect(canDecide('leave', mgr({ attendance: true }), ALL)).toBe(false)
    expect(canDecide('advance', mgr({ hr: true }), ALL)).toBe(true)
    expect(canDecide('stock', mgr({ inventory: true }), ALL)).toBe(false)
    expect(canDecide('stock', mgr({ suppliers: true }), ALL)).toBe(true)
    expect(canDecide('payable', mgr({ reports: true }), ALL)).toBe(true)
    expect(canDecide('payable', mgr({}), ALL)).toBe(false)
    // بدون الميزة ما فيه بطاقة
    expect(canDecide('deficit', owner, { ...ALL, cashier: false })).toBe(false)
    expect(canDecide('leave', owner, { ...ALL, hr: false })).toBe(false)
  })
})

describe('Soul decisions: cards read naturally', () => {
  it('deficit: amount, cashier, day, reason, returned invoices; older than a week is grouped', () => {
    const d = deficitDecision({ id: 'c1', staff_name: 'أحمد', closing_date: '2026-11-19', difference: -35, deficit_reason: 'فاتورة مرتجعة', returns: [{ invoice_no: '9', photo: 'p' }], created_at: '2026-11-18T20:40:00Z' }, x)
    expect(d).toMatchObject({ key: 'deficit:c1', title: 'عجز 35 ⃁ في إقفال أحمد', meta: 'اليوم، السبب: فاتورة مرتجعة', amountText: '35 ⃁', old: false })
    expect(d.lines).toEqual([{ label: 'فواتير مرتجعة مصوّرة في الإقفال', value: '1' }])
    const old = deficitDecision({ id: 'c2', staff_name: 'خالد', closing_date: '2026-11-03', difference: -1240.5, deficit_reason: null }, x)
    expect(old).toMatchObject({ title: 'عجز 1,240.5 ⃁ في إقفال خالد', meta: 'الثلاثاء 3 نوفمبر، بدون سبب مكتوب', old: true })
  })
  it('staff requests: excuse, leave and advance with time and reason', () => {
    expect(excuseDecision({ id: 'e1', staff_name: 'خالد', reason: 'موعد طبي', requested_at: '2026-11-19T08:40:00Z' }, x))
      .toMatchObject({ key: 'excuse:e1', title: 'طلب انصراف مبكر من خالد', meta: 'السبب: موعد طبي، قبل 20 دقيقة' })
    expect(leaveDecision({ id: 'l1', start_date: '2026-11-20', end_date: '2026-11-22', days_count: 3, staff_members: { name: 'سارة' }, requested_at: '2026-11-19T07:00:00Z' }, x))
      .toMatchObject({ title: 'طلب إجازة 3 أيام من سارة', meta: 'من 20 نوفمبر إلى 22 نوفمبر' })
    expect(leaveDecision({ id: 'l2', start_date: '2026-11-25', end_date: '2026-11-25', days_count: 1, staff_members: { name: 'فهد' } }, x).title).toBe('طلب إجازة يوم واحد من فهد')
    expect(advanceDecision({ id: 'a1', amount: 500, reason: null, staff_members: { name: 'ريم' }, created_at: '2026-11-19T06:00:00Z' }, x))
      .toMatchObject({ title: 'طلب سلفة 500 ⃁ من ريم', meta: 'قبل 3 ساعات', amountText: '500 ⃁' })
  })
  it('extra day suggests a day’s pay (salary ÷ 30)', () => {
    expect(extraDayDecision({ id: 'x1', work_date: '2026-11-13', staff_members: { name: 'خالد', monthly_salary: 3600 } }, x))
      .toMatchObject({ title: 'يوم عمل إضافي من خالد', meta: 'الجمعة 13 نوفمبر، أجر يوم 120 ⃁', suggested: 120, workDate: '2026-11-13' })
  })
  it('an invoice with several lines is one card that pays all of them', () => {
    const d = payableDecision([
      { id: 'p1', invoice_group: 'g1', supplier: 'مورد الخضار', total_amount: 1000, due_date: '2026-11-21' },
      { id: 'p2', invoice_group: 'g1', supplier: 'مورد الخضار', total_amount: 240, due_date: '2026-11-21' },
    ], x)
    expect(d).toMatchObject({ key: 'payable:g1', ids: ['p1', 'p2'], title: 'فاتورة مورد الخضار مستحقة', meta: '1,240 ⃁، تستحق بعد يومين' })
    expect(payableDecision([{ id: 'p3', supplier: 'المخبز', total_amount: 90, due_date: '2026-11-17' }], x).meta).toBe('90 ⃁، استحقت الثلاثاء 17 نوفمبر')
  })
  it('stock card lists what reached the supplier threshold; a new item changes its key', () => {
    const a = stockDecision([{ id: 'p1', name: 'حليب', qty: 3, unit: 'كرتون' }, { id: 'p2', name: 'خبز برجر', qty: 2, unit: 'كيس' }], 'all')
    expect(a.title).toBe('صنفان وصلا حد الطلب')
    expect(a.lines?.[0]).toEqual({ label: 'حليب', value: 'المتبقي 3 كراتين' })
    const b = stockDecision([{ id: 'p1', name: 'حليب', qty: 3 }, { id: 'p2', name: 'خبز', qty: 2 }, { id: 'p9', name: 'أكواب', qty: 40 }], 'all')
    expect(b.title).toBe('3 أصناف وصلت حد الطلب')
    expect(b.key).not.toBe(a.key)
  })
  it('Arabic counting, relative time and links', () => {
    expect([1, 2, 3, 10, 11].map(n => countAr(n, ['قرار واحد', 'قراران', 'قرارات', 'قراراً']))).toEqual(['قرار واحد', 'قراران', '3 قرارات', '10 قرارات', '11 قراراً'])
    expect(ago('2026-11-19T08:59:00Z', nowMs)).toBe('قبل دقيقة')
    expect(ago('2026-11-19T07:00:00Z', nowMs)).toBe('قبل ساعتين')
    expect(dayLabel('2026-11-18', '2026-11-19')).toBe('أمس')
    expect(soulPath('deficit', 'c1')).toBe('/dashboard?soul=deficit:c1')
    expect(soulPath()).toBe('/dashboard?soul=1')
  })
})
