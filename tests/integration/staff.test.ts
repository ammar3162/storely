/**
 * اختبارات تكامل على قاعدة staging — staff. تستدعي API routes الحقيقية وتتحقق من النتيجة بقاعدة البيانات.
 * كل ملف ينشئ منشأة تجريبية مؤقتة خاصة فيه (مالك + فرع) ويحذفها بالنهاية، فالملفات تشتغل بالتوازي بدون تداخل.
 * المتغيرات والـ mocks مشتركة: harness.ts و setup.ts.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { URL_, KEY, enabled, uniqPhone, newStamp, auth, ocrFixture, call } from './harness'

describe.skipIf(!enabled)('integration (staging) — staff', async () => {
  const { createClient } = await import('@supabase/supabase-js')
  const db = createClient(URL_, KEY, { auth: { persistSession: false } })
  const purchases = await import('@/app/api/purchases/route')
  const restore = await import('@/app/api/purchases/restore/route')
  const movements = await import('@/app/api/stock-movements/route')
  const products = await import('@/app/api/products/route')
  const branches = await import('@/app/api/branches/route')
  const addStaff = await import('@/app/api/add-staff/route')
  const staffMembers = await import('@/app/api/staff-members/route')
  const regenPin = await import('@/app/api/staff-members/regenerate-pin/route')
  const gate = await import('@/lib/supplierOrderGate')
  const bcrypt = (await import('bcryptjs')).default

  const stamp = newStamp()
  let orgId = '', userId = '', branchA = ''
  const today = new Date().toISOString().slice(0, 10)

  const productByName = async (name: string) =>
    (await db.from('products').select('id,qty,avg_cost').eq('org_id', orgId).eq('name', name).single()).data as any
  const ledger = async (productId: string) =>
    ((await db.from('stock_movements').select('qty_change').eq('product_id', productId)).data || []).reduce((s: number, m: any) => s + Number(m.qty_change), 0)

  beforeAll(async () => {
    const { data: u, error: uErr } = await db.auth.admin.createUser({ email: `it-${stamp}@storely.test`, password: `It-${stamp}-x!`, email_confirm: true })
    if (uErr) throw uErr
    userId = u.user!.id
    const { data: org, error: oErr } = await db.from('organizations').insert({ name: `__it_${stamp}`, whatsapp_number: '966500000000', plan: 'pro', max_branches: 1, currency: 'SAR' } as any).select('id').single()
    if (oErr) throw oErr
    orgId = (org as any).id
    const { data: br } = await db.from('branches').insert({ org_id: orgId, name: 'الفرع الرئيسي', is_active: true } as any).select('id').single()
    branchA = (br as any).id
    await db.from('profiles').upsert({ id: userId, full_name: 'اختبار', org_id: orgId, role: 'owner', status: 'active' } as any)
    auth.current = { userId, orgId, role: 'owner', branchId: null }
  }, 180_000)

  afterAll(async () => {
    auth.current = null
    if (orgId) {
      const { deleteOrgCompletely } = await import('@/lib/deleteOrg')
      await deleteOrgCompletely(orgId, userId).catch(() => {})
      await db.from('organizations').delete().eq('id', orgId)
    }
    if (userId) await db.auth.admin.deleteUser(userId).catch(() => {})
  }, 180_000)

  describe('staff PINs', () => {
    it('stores new PINs hashed and never returns them', async () => {
      const r = await call(addStaff.POST, 'POST', '/api/add-staff', { org_id: orgId, branch_id: branchA, name: 'موظف', phone: `9665${String(stamp).slice(-8)}`, pin: '1234' })
      expect(r.status).toBe(200)
      expect(r.json.staff.pin).toBeUndefined()
      const { data: s } = await db.from('staff_members').select('id,pin').eq('id', r.json.staff.id).single()
      expect(String((s as any).pin).startsWith('$2')).toBe(true)
      expect(await bcrypt.compare('1234', (s as any).pin)).toBe(true)

      const list = await call(staffMembers.GET, 'GET', `/api/staff-members?org_id=${orgId}`)
      expect(list.json.staff.find((x: any) => x.id === r.json.staff.id).pin).toBe('$2')
    })

    it('regenerating a PIN returns it once and stores only the hash', async () => {
      const { data: s } = await db.from('staff_members').select('id').eq('org_id', orgId).limit(1).single()
      const r = await call(regenPin.POST, 'POST', '/api/staff-members/regenerate-pin', { org_id: orgId, id: (s as any).id })
      expect(r.json.pin).toMatch(/^\d{4}$/)
      const { data: after } = await db.from('staff_members').select('pin').eq('id', (s as any).id).single()
      expect(await bcrypt.compare(r.json.pin, (after as any).pin)).toBe(true)
    })
  })

  describe('staff adds a product from the staff app', () => {
    it('creates the product in the staff branch with stock, adds quantity to an existing one, and refuses without login', async () => {
      process.env.STAFF_TOKEN_SECRET = process.env.STAFF_TOKEN_SECRET || 'it-secret'
      const { generateStaffToken } = await import('@/lib/staffAuth')
      const addProduct = await import('@/app/api/staff-add-product/route')
      const { data: st } = await db.from('staff_members').insert({
        org_id: orgId, branch_id: branchA, name: 'موظف مخزون', phone: `9665${String(stamp + 7).slice(-8)}`, pin: 'x', is_active: true,
        permissions: { dispense: true, inventory: true, purchases: false, reports: false }, role: 'staff',
      } as any).select('id').single()
      const token = generateStaffToken((st as any).id, orgId, branchA)
      const post = (body: any, withAuth = true) => addProduct.POST(new Request('http://test/api/staff-add-product', {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...(withAuth ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body),
      }))

      expect((await post({ name: 'سكر', qty: 3, unit: 'كيلو' }, false)).status).toBe(401)

      const r1 = await post({ name: 'سكر', qty: 3, unit: 'كيلو' })
      const j1 = await r1.json()
      expect(r1.status).toBe(200); expect(j1.created).toBe(true)
      const sugar = (await db.from('products').select('id,qty,branch_id,requires_staff_assignment').eq('id', j1.product_id).single()).data as any
      expect(sugar).toMatchObject({ qty: 3, branch_id: branchA, requires_staff_assignment: false })

      const r2 = await post({ name: 'سكر', qty: 2, unit: 'كيلو' })
      expect((await r2.json()).created).toBe(false)
      expect(((await db.from('products').select('qty').eq('id', j1.product_id).single()).data as any).qty).toBe(5)

      const bad = await post({ name: 'ملح', qty: 0 })
      expect(bad.status).toBe(400)
    })
  })

  describe('deduction notifies the employee', () => {
    it("an owner deduction lands in the employee's notifications in their language", async () => {
      const adj = await import('@/app/api/staff-payroll-adjustments/route')
      const { data: st } = await db.from('staff_members').insert({
        org_id: orgId, branch_id: branchA, name: 'موظف إشعار', phone: `9665${String(stamp + 9).slice(-8)}`, pin: 'x', is_active: true,
        permissions: { dispense: true }, role: 'staff', preferred_lang: 'en',
      } as any).select('id').single()
      const r = await call(adj.POST, 'POST', '/api/staff-payroll-adjustments', { org_id: orgId, staff_id: (st as any).id, type: 'deduction', amount: 40, reason: 'broken plate' })
      expect(r.status).toBe(200)
      const { data: notes } = await db.from('staff_notifications').select('title,message').eq('staff_id', (st as any).id)
      expect(notes?.length).toBe(1)
      expect((notes as any)[0].title).toBe('Salary deduction')
      expect((notes as any)[0].message).toContain('40 SAR')
      expect((notes as any)[0].message).toContain('broken plate')
    })
  })

  describe('extra day (worked a day off) — owner decides', () => {
    it('paid adds a bonus to the payslip, comp marks a day off, and a second decision is refused', async () => {
      const extra = await import('@/app/api/extra-days/route')
      const { computeStaffPayroll, loadOvertimeSettings } = await import('@/lib/payroll')
      const { data: st } = await db.from('staff_members').insert({
        org_id: orgId, branch_id: branchA, name: 'موظف إضافي', phone: `9665${String(stamp + 11).slice(-8)}`, pin: 'x', is_active: true,
        permissions: { dispense: true }, role: 'staff', monthly_salary: 3000, weekly_off_days: [5],
      } as any).select('id,org_id,monthly_salary,housing_allowance,transport_allowance,food_allowance,shift_id,weekly_off_days').single()
      const staffId = (st as any).id
      const month = new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 7)
      const { data: e1 } = await db.from('staff_extra_days').insert({ org_id: orgId, staff_id: staffId, work_date: `${month}-01`, reason: 'weekly' } as any).select('id').single()
      const { data: e2 } = await db.from('staff_extra_days').insert({ org_id: orgId, staff_id: staffId, work_date: `${month}-02`, reason: 'weekly' } as any).select('id').single()

      const list = await call(extra.GET, 'GET', `/api/extra-days?org_id=${orgId}&status=pending`)
      expect(list.json.extra_days.find((x: any) => x.id === (e1 as any).id).suggested_amount).toBe(100)   // 3000 ÷ 30

      const paid = await call(extra.POST, 'POST', '/api/extra-days', { org_id: orgId, id: (e1 as any).id, decision: 'paid', amount: 100 })
      expect(paid.status).toBe(200)
      const again = await call(extra.POST, 'POST', '/api/extra-days', { org_id: orgId, id: (e1 as any).id, decision: 'paid', amount: 100 })
      expect(again.status).toBe(409)

      const comp = await call(extra.POST, 'POST', '/api/extra-days', { org_id: orgId, id: (e2 as any).id, decision: 'comp', comp_date: `${month}-10` })
      expect(comp.status).toBe(200)
      expect(((await db.from('staff_extra_days').select('status,comp_date').eq('id', (e2 as any).id).single()).data as any)).toMatchObject({ status: 'comp', comp_date: `${month}-10` })

      const pay = await computeStaffPayroll(db as any, st, month, await loadOvertimeSettings(db as any, orgId))
      expect(pay.bonusesTotal).toBe(100)
      expect(pay.netSalary).toBe(3100)
      const { data: notes } = await db.from('staff_notifications').select('title').eq('staff_id', staffId)
      expect((notes || []).length).toBe(2)
    })
  })

  describe('HR: branch managers are limited to their permission and branch', () => {
    it('blocks managers without the HR permission, hides other branches, and rejects staff from another org', async () => {
      const adj = await import('@/app/api/staff-payroll-adjustments/route')
      const salary = await import('@/app/api/staff-salary/route')
      const tasks = await import('@/app/api/staff-tasks/route')
      const leave = await import('@/app/api/staff-leave/route')
      const { data: brB } = await db.from('branches').insert({ org_id: orgId, name: 'فرع موارد ب', is_active: true } as any).select('id').single()
      const mk = async (o: string, b: string | null, n: number) => ((await db.from('staff_members').insert({
        org_id: o, branch_id: b, name: 'موظف ' + n, phone: uniqPhone(), pin: 'x', is_active: true, role: 'staff', monthly_salary: 3000, leave_balance_days: 5,
      } as any).select('id').single()).data as any).id
      const stA = await mk(orgId, branchA, 1), stB = await mk(orgId, (brB as any).id, 2)
      const { data: other } = await db.from('organizations').insert({ name: `__it_other_${stamp}`, whatsapp_number: '966500000000', plan: 'pro', max_branches: 1, currency: 'SAR' } as any).select('id').single()
      const stX = await mk((other as any).id, null, 3)
      await db.from('staff_payroll_adjustments').insert({ org_id: orgId, staff_id: stB, type: 'deduction', amount: 99, status: 'approved', requested_by: 'owner' } as any)
      try {
        const manager = (permissions: Record<string, boolean>) => { auth.current = { userId, orgId, role: 'manager', branchId: branchA, permissions } }

        manager({ inventory: true })
        expect((await call(adj.POST, 'POST', '/api/staff-payroll-adjustments', { org_id: orgId, staff_id: stA, type: 'deduction', amount: 10 })).status).toBe(403)
        expect((await call(adj.GET, 'GET', `/api/staff-payroll-adjustments?org_id=${orgId}`)).status).toBe(403)
        expect((await call(leave.GET, 'GET', `/api/staff-leave?org_id=${orgId}`)).status).toBe(403)
        expect((await call(tasks.POST, 'POST', '/api/staff-tasks', { org_id: orgId, staff_ids: [stA], title: 'ترتيب' })).status).toBe(403)

        manager({ hr: true })
        const list = await call(adj.GET, 'GET', `/api/staff-payroll-adjustments?org_id=${orgId}`)
        expect(list.status).toBe(200)
        expect(list.json.adjustments.some((a: any) => a.staff_id === stB)).toBe(false)
        expect((await call(salary.POST, 'POST', '/api/staff-salary', { org_id: orgId, staff_id: stB, monthly_salary: 1 })).status).toBe(404)
        expect(((await db.from('staff_members').select('monthly_salary').eq('id', stB).single()).data as any).monthly_salary).toBe(3000)
        expect((await call(tasks.POST, 'POST', '/api/staff-tasks', { org_id: orgId, staff_ids: [stB], title: 'ترتيب' })).status).toBe(404)
        expect((await call(salary.POST, 'POST', '/api/staff-salary', { org_id: orgId, staff_id: stA, monthly_salary: 3500 })).status).toBe(200)

        auth.current = { userId, orgId, role: 'owner', branchId: null }
        expect((await call(tasks.POST, 'POST', '/api/staff-tasks', { org_id: orgId, staff_ids: [stX], title: 'دخيل' })).status).toBe(404)
        expect((await db.from('staff_tasks').select('id').eq('staff_id', stX)).data?.length).toBe(0)
        const ok = await call(tasks.POST, 'POST', '/api/staff-tasks', { org_id: orgId, staff_ids: [stA, stB], title: 'جرد' })
        expect(ok.status).toBe(200)
        const rows = (await db.from('staff_tasks').select('staff_id,branch_id').eq('org_id', orgId).eq('title', 'جرد')).data as any[]
        expect(rows.find(r => r.staff_id === stB).branch_id).toBe((brB as any).id)
      } finally {
        auth.current = { userId, orgId, role: 'owner', branchId: null }
        const { deleteOrgCompletely } = await import('@/lib/deleteOrg')
        await deleteOrgCompletely((other as any).id)
      }
    })

    it('leave: pending requests count against the balance, and approval re-checks it', async () => {
      process.env.STAFF_TOKEN_SECRET = process.env.STAFF_TOKEN_SECRET || 'it-secret'
      const { generateStaffToken } = await import('@/lib/staffAuth')
      const leave = await import('@/app/api/staff-leave/route')
      const { data: st } = await db.from('staff_members').insert({
        org_id: orgId, branch_id: branchA, name: 'موظف إجازة', phone: `9665${String(stamp + 60).slice(-8)}`, pin: 'x', is_active: true, role: 'staff', leave_balance_days: 5,
      } as any).select('id').single()
      const token = generateStaffToken((st as any).id, orgId, branchA)
      const ask = async (start_date: string, end_date: string) => {
        const res = await leave.POST(new Request('http://test/api/staff-leave', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ start_date, end_date }) }))
        return { status: res.status, json: await res.json() as any }
      }
      expect((await ask('غلط', '2026-12-02')).status).toBe(400)
      expect((await ask('2026-12-01', '2026-12-03')).status).toBe(200)   // 3 أيام
      expect((await ask('2026-12-10', '2026-12-12')).status).toBe(400)   // 3 + 3 > 5
      expect((await ask('2026-12-10', '2026-12-11')).status).toBe(200)   // 3 + 2 = 5

      const reqs = (await db.from('staff_leave_requests').select('id,days_count').eq('staff_id', (st as any).id).order('days_count')).data as any[]
      await db.from('staff_members').update({ leave_balance_days: 2 } as any).eq('id', (st as any).id)
      expect((await call(leave.PATCH, 'PATCH', '/api/staff-leave', { org_id: orgId, request_id: reqs[1].id, decision: 'approved' })).status).toBe(400)  // 3 > 2
      expect((await call(leave.PATCH, 'PATCH', '/api/staff-leave', { org_id: orgId, request_id: reqs[0].id, decision: 'approved' })).status).toBe(200)  // 2
      expect(((await db.from('staff_members').select('leave_balance_days').eq('id', (st as any).id).single()).data as any).leave_balance_days).toBe(0)
    })
  })

  describe('accountant payroll includes staff who left during the month', () => {
    it('stamps the leave date, prorates salary, and keeps their deductions', async () => {
      const { loadAccountantReport } = await import('@/lib/accountantData')
      const now = new Date(Date.now() + 3 * 3600e3)
      const y = now.getUTCFullYear(), m = now.getUTCMonth() + 1, last = new Date(Date.UTC(y, m, 0)).getUTCDate()
      const month = `${y}-${String(m).padStart(2, '0')}`, today = now.toISOString().slice(0, 10)
      const { data: st } = await db.from('staff_members').insert({ org_id: orgId, branch_id: branchA, name: 'موظف ترك', phone: `9665${String(stamp + 90).slice(-8)}`, pin: 'x', is_active: true, role: 'staff', monthly_salary: 3100 } as any).select('id').single()
      const sid = (st as any).id
      await db.from('staff_payroll_adjustments').insert({ org_id: orgId, staff_id: sid, type: 'deduction', amount: 50, status: 'approved', requested_by: 'owner' } as any)
      await db.from('staff_members').update({ is_active: false } as any).eq('id', sid)
      const row = (await db.from('staff_members').select('deactivated_at').eq('id', sid).single()).data as any
      expect(row.deactivated_at).toBeTruthy()

      const rep = await loadAccountantReport(db as any, { orgId, branchId: null, period: { start: `${month}-01`, end: `${month}-${last}` }, sections: ['payroll'] as any, vatRegistered: false })
      const p = rep.payroll!.find(x => x.name === 'موظف ترك')!
      expect(p).toBeTruthy()
      expect(p.leftOn).toBe(today)
      expect(p.workedDays).toBe(Number(today.slice(8)))
      expect(p.gross).toBeCloseTo(Math.round(3100 * Number(today.slice(8)) / last * 100) / 100, 2)
      expect(p.deductions).toBe(50)

      // نفس الشي بتقرير الموظفين عند المالك
      const sr = await import('@/app/api/staff-report/route')
      const r = await call(sr.GET, 'GET', `/api/staff-report?org_id=${orgId}&month=${month}`)
      const hrRow = r.json.report.find((x: any) => x.staffId === sid)
      expect(hrRow.leftOn).toBe(today)
      expect(hrRow.deductionsTotal).toBe(50)

      // رجع للعمل = يرجع راتب كامل وينمسح تاريخ الإيقاف
      await db.from('staff_members').update({ is_active: true } as any).eq('id', sid)
      expect(((await db.from('staff_members').select('deactivated_at').eq('id', sid).single()).data as any).deactivated_at).toBeNull()
    })
  })
})
