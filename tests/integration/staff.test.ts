/**
 * اختبارات تكامل على قاعدة staging — staff. تستدعي API routes الحقيقية وتتحقق من النتيجة بقاعدة البيانات.
 * كل ملف ينشئ منشأة تجريبية مؤقتة خاصة فيه (مالك + فرع) ويحذفها بالنهاية، فالملفات تشتغل بالتوازي بدون تداخل.
 * المتغيرات والـ mocks مشتركة: harness.ts و setup.ts.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import crypto from 'node:crypto'
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

      // «منتج موجود»: يختار المنتج من القائمة (product_id) ويضيف الكمية — بدون اسم
      const r3 = await post({ product_id: j1.product_id, qty: 4 })
      const j3 = await r3.json()
      expect(r3.status).toBe(200); expect(j3).toMatchObject({ created: false, product_id: j1.product_id })
      expect(((await db.from('products').select('qty').eq('id', j1.product_id).single()).data as any).qty).toBe(9)
      // منتج من منشأة ثانية أو مو موجود: ينرفض
      expect((await post({ product_id: '00000000-0000-0000-0000-000000000000', qty: 1 })).status).toBe(404)
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

  describe('owner edits a shift', () => {
    it('changes name and times, switches to 24h, validates input, and refuses branch managers', async () => {
      const shifts = await import('@/app/api/shifts/route')
      const created = await call(shifts.POST, 'POST', '/api/shifts', { org_id: orgId, branch_id: branchA, name: 'صباحي', start_time: '08:00', end_time: '16:00', is_24h: false })
      expect(created.status).toBe(200)
      const id = created.json.shift.id
      const row = async () => (await db.from('shifts').select('name,start_time,end_time,is_24h').eq('id', id).single()).data as any

      // تعديل الاسم والأوقات (شفت ليلي يعدّي منتصف الليل)
      const edited = await call(shifts.PATCH, 'PATCH', '/api/shifts', { id, name: '  مسائي  ', start_time: '18:00', end_time: '02:00', is_24h: false })
      expect(edited.status).toBe(200)
      expect(await row()).toMatchObject({ name: 'مسائي', is_24h: false })
      expect(String((await row()).start_time).slice(0, 5)).toBe('18:00')
      expect(String((await row()).end_time).slice(0, 5)).toBe('02:00')

      // دوام 24 ساعة يثبّت الأوقات
      expect((await call(shifts.PATCH, 'PATCH', '/api/shifts', { id, name: 'مفتوح', is_24h: true })).status).toBe(200)
      expect(await row()).toMatchObject({ name: 'مفتوح', is_24h: true })
      expect(String((await row()).end_time).slice(0, 5)).toBe('23:59')

      // مدخلات غلط ما تحفظ شي
      expect((await call(shifts.PATCH, 'PATCH', '/api/shifts', { id, name: '', start_time: '08:00', end_time: '16:00' })).status).toBe(400)
      expect((await call(shifts.PATCH, 'PATCH', '/api/shifts', { id, name: 'x', start_time: '25:00', end_time: '16:00' })).status).toBe(400)
      expect((await call(shifts.PATCH, 'PATCH', '/api/shifts', { id, name: 'x', start_time: '08:00', end_time: '08:00' })).status).toBe(400)
      expect((await call(shifts.PATCH, 'PATCH', '/api/shifts', { id: crypto.randomUUID(), name: 'x', start_time: '08:00', end_time: '16:00' })).status).toBe(404)
      expect((await row()).name).toBe('مفتوح')

      // مدير الفرع (حتى مع صلاحية الحضور) ما يعدّل الشفتات
      const ownerAuth = auth.current
      auth.current = { userId, orgId, role: 'manager', branchId: branchA, permissions: { attendance: true } }
      try {
        expect((await call(shifts.PATCH, 'PATCH', '/api/shifts', { id, name: 'مدير', start_time: '09:00', end_time: '17:00' })).status).toBe(403)
      } finally { auth.current = ownerAuth }
      expect((await row()).name).toBe('مفتوح')

      await call(shifts.DELETE, 'DELETE', `/api/shifts?id=${id}`)
    })
  })

  describe('cashier closing with delivery apps', () => {
    it('cashier picks the apps and enters each amount, expected cash drops by the delivery, new apps are remembered, and edits recalculate', async () => {
      process.env.STAFF_TOKEN_SECRET = process.env.STAFF_TOKEN_SECRET || 'it-secret'
      const { generateStaffToken } = await import('@/lib/staffAuth')
      const staffOrg = await import('@/app/api/staff-org/route')
      const closing = await import('@/app/api/cashier-closing/route')
      const { editClosing } = await import('@/lib/cashierClosingEdit')

      const { data: st, error: stErr } = await db.from('staff_members').insert({
        org_id: orgId, branch_id: branchA, name: 'كاشير توصيل', phone: uniqPhone(), pin: 'x', is_active: true, role: 'cashier',
      } as any).select('id').single()
      if (stErr) throw stErr
      const token = generateStaffToken((st as any).id, orgId, branchA)
      const withToken = (handler: any, method: string, body?: unknown) => handler(new Request('http://test/api', {
        method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: body ? JSON.stringify(body) : undefined,
      })).then(async (r: Response) => ({ status: r.status, json: await r.json() as any }))

      // بدون أي إعداد: الكاشير يشوف التطبيقات الأشهر
      expect((await withToken(staffOrg.GET, 'GET')).json.delivery_apps).toEqual(['هنقرستيشن', 'جاهز', 'كيتا', 'مرسول', 'ذا شفز', 'تويو'])

      // مبيعات 5000 = شبكة 2000 + هنقر 700 + تطبيق كتبه الكاشير 500 + كاش 1800
      const r = await withToken(closing.POST, 'POST', {
        total_sales: 5000, mada_amount: 2000, cash_amount: 1800, purchases: [],
        delivery: [{ name: 'هنقرستيشن', amount: 700 }, { name: ' لقمة ', amount: 500 }, { name: 'كيتا', amount: 0 }],
      })
      expect(r.status).toBe(200)
      const id = r.json.closing.id
      const saved = (await db.from('cashier_closings').select('delivery,delivery_amount,expected_cash,status').eq('id', id).single()).data as any
      expect(saved.delivery).toEqual([{ name: 'هنقرستيشن', amount: 700 }, { name: 'لقمة', amount: 500 }])
      expect(Number(saved.delivery_amount)).toBe(1200)
      expect(Number(saved.expected_cash)).toBe(1800)
      expect(saved.status).toBe('balanced')
      // التطبيق الجديد ينحفظ للمنشأة ويطلع جاهز المرة الجاية
      expect(((await db.from('organizations').select('delivery_apps').eq('id', orgId).single()).data as any).delivery_apps).toEqual(['لقمة'])
      expect((await withToken(staffOrg.GET, 'GET')).json.delivery_apps).toContain('لقمة')

      const bad = await withToken(closing.POST, 'POST', { total_sales: 100, cash_amount: 100, delivery: [{ name: 'جاهز', amount: -3 }] })
      expect(bad.status).toBe(400)

      // المالك يعدّل مبلغ التوصيل — الفرق يتحسب من جديد
      const e = await editClosing(db as any, orgId, id, { delivery: [{ name: 'هنقرستيشن', amount: 700 }, { name: 'لقمة', amount: 300 }], deficit_reason: 'اختبار العجز' }, 'اختبار')
      expect(e.ok).toBe(true)
      const after = (await db.from('cashier_closings').select('delivery_amount,difference,status').eq('id', id).single()).data as any
      expect(Number(after.delivery_amount)).toBe(1000)
      expect(Number(after.difference)).toBe(-200)
      expect(after.status).toBe('deficit')
      // تعديل بدون حقل التوصيل يحافظ على المبالغ
      const e2 = await editClosing(db as any, orgId, id, { cash_amount: 2000 }, 'اختبار')
      expect(e2.ok).toBe(true)
      const after2 = (await db.from('cashier_closings').select('delivery_amount,status').eq('id', id).single()).data as any
      expect(Number(after2.delivery_amount)).toBe(1000)
      expect(after2.status).toBe('balanced')

      const list = await call(closing.GET, 'GET', `/api/cashier-closing?org_id=${orgId}`)
      expect(list.json.closings.find((c: any) => c.id === id).delivery_amount).toBe(1000)
    })
  })

  describe('accountant edits from the portal', () => {
    it('accountant edits a closing and an invoice (applied at once, marked «from the accountant»), is limited by sections/branch/locks, and the owner can revert', async () => {
      process.env.STAFF_TOKEN_SECRET = process.env.STAFF_TOKEN_SECRET || 'it-secret'
      const { makeSession } = await import('@/lib/accountantPortalAuth')
      const edit = await import('@/app/api/accountant-portal/edit/route')
      const dataEdits = await import('@/app/api/data-edits/route')
      const today = new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 10)

      // محاسب بإذن مفعّل على كل الفروع + جلسة جهاز
      const { data: acc, error: aErr } = await db.from('accountant_users').insert({ email: `it-acc-${stamp}@storely.test`, name: 'محاسب الاختبار' } as any).select('id').single()
      if (aErr) throw aErr
      const accId = (acc as any).id
      const { data: access } = await db.from('accountant_access').insert({ org_id: orgId, email: `it-acc-${stamp}@storely.test`, accountant_id: accId, status: 'active',
        sections: ['sales', 'purchases', 'vat', 'expenses'] } as any).select('id').single()
      const { data: sess } = await db.from('accountant_sessions').insert({ accountant_id: accId } as any).select('id').single()
      const cookie = `acc_session=${makeSession(accId, (sess as any).id)}`
      const portal = (body: any) => edit.POST(new Request('http://test/api/accountant-portal/edit', { method: 'POST', headers: { 'Content-Type': 'application/json', cookie }, body: JSON.stringify({ org_id: orgId, ...body }) }))
        .then(async r => ({ status: r.status, json: await r.json() as any }))

      try {
        // إقفال مطابق: مبيعات 1000 = مدى 600 + كاش 400
        const { data: cl, error: cErr } = await db.from('cashier_closings').insert({ org_id: orgId, branch_id: branchA, staff_name: 'كاشير', closing_date: today,
          total_sales: 1000, mada_amount: 600, network_amount: 600, cash_amount: 400, expected_cash: 400, difference: 0, status: 'balanced' } as any).select('id').single()
        if (cErr) throw cErr
        const closingId = (cl as any).id

        const e1 = await portal({ kind: 'closing', id: closingId, total_sales: 1000, mada_amount: 600, cash_amount: 380, purchases: [], delivery: [], deficit_reason: 'عدّ المحاسب' })
        expect(e1.status).toBe(200)
        const after1 = (await db.from('cashier_closings').select('cash_amount,status,difference,edited_source,edited_by').eq('id', closingId).single()).data as any
        expect(after1).toMatchObject({ status: 'deficit', edited_source: 'accountant', edited_by: 'محاسب الاختبار' })
        expect(Number(after1.difference)).toBe(-20)
        const log = (await db.from('cashier_closing_edits').select('id,source,accountant_id').eq('closing_id', closingId).single()).data as any
        expect(log).toMatchObject({ source: 'accountant', accountant_id: accId })
        const { count: notes } = await db.from('notifications').select('id', { count: 'exact', head: true }).eq('org_id', orgId).eq('ref_type', 'accountant_edit').eq('ref_id', log.id)
        expect(notes).toBe(1)

        // فاتورة بسطرين: الرقم الضريبي ينطبق على الفاتورة كلها، والمبلغ على السطر
        const group = crypto.randomUUID()
        const { data: rows, error: pErr } = await db.from('purchases').insert([
          { org_id: orgId, branch_id: branchA, name: 'كاسات', category: 'مشتريات', supplier: 'مورد', amount: 100, has_vat: true, invoice_group: group },
          { org_id: orgId, branch_id: branchA, name: 'أكياس', category: 'مشتريات', supplier: 'مورد', amount: 50, has_vat: true, invoice_group: group },
        ] as any).select('id,name')
        if (pErr) throw pErr
        const line = (rows as any[]).find(r => r.name === 'كاسات').id
        expect((await portal({ kind: 'purchase', id: line, supplier_vat_number: '123' })).status).toBe(400)
        const e2 = await portal({ kind: 'purchase', id: line, amount: 120, has_vat: true, supplier_vat_number: '300000000000003', invoice_number: 'INV-9' })
        expect(e2.status).toBe(200)
        const pr = ((await db.from('purchases').select('id,name,amount,supplier_vat_number,invoice_number,edited_source').eq('invoice_group', group)).data || []) as any[]
        expect(pr.find(r => r.name === 'كاسات')).toMatchObject({ amount: 120, supplier_vat_number: '300000000000003', invoice_number: 'INV-9', edited_source: 'accountant' })
        expect(pr.find(r => r.name === 'أكياس')).toMatchObject({ amount: 50, supplier_vat_number: '300000000000003', edited_source: 'accountant' })
        const pe = ((await db.from('purchase_edits').select('batch_id,source').eq('org_id', orgId).in('purchase_id', pr.map(r => r.id))).data || []) as any[]
        expect(pe.length).toBe(2); expect(new Set(pe.map(e => e.batch_id)).size).toBe(1)

        // قسم مو مسموح: بدون المبيعات والمصروفات ما يعدّل الإقفال
        await db.from('accountant_access').update({ sections: ['stock'] } as any).eq('id', (access as any).id)
        expect((await portal({ kind: 'closing', id: closingId, cash_amount: 400 })).status).toBe(403)
        expect((await portal({ kind: 'purchase', id: line, amount: 1 })).status).toBe(403)
        // فرع ثاني: الإذن على فرع ما فيه الإقفال
        const { data: br2 } = await db.from('branches').insert({ org_id: orgId, name: 'فرع المحاسب', is_active: true } as any).select('id').single()
        await db.from('accountant_access').update({ sections: ['sales', 'purchases'], branch_id: (br2 as any).id } as any).eq('id', (access as any).id)
        expect((await portal({ kind: 'closing', id: closingId, cash_amount: 400 })).status).toBe(403)
        expect((await portal({ kind: 'purchase', id: line, amount: 1 })).status).toBe(403)
        await db.from('accountant_access').update({ branch_id: null } as any).eq('id', (access as any).id)
        // شهر مقفل: ما ينعدّل
        const month = today.slice(0, 7) + '-01'
        await db.from('period_locks').insert({ org_id: orgId, month } as any)
        expect((await portal({ kind: 'closing', id: closingId, cash_amount: 400 })).status).toBe(423)
        await db.from('period_locks').delete().eq('org_id', orgId).eq('month', month)

        // المالك يشوف السجل ويرجّع
        const hist = await call(dataEdits.GET, 'GET', `/api/data-edits?org_id=${orgId}&kind=closing&id=${closingId}`)
        expect(hist.json.edits[0]).toMatchObject({ source: 'accountant' })
        expect((await call(dataEdits.POST, 'POST', '/api/data-edits', { org_id: orgId, kind: 'closing', id: log.id })).status).toBe(200)
        const back = (await db.from('cashier_closings').select('cash_amount,status,edited_source').eq('id', closingId).single()).data as any
        expect(back).toMatchObject({ status: 'balanced', edited_source: 'owner' })
        expect(Number(back.cash_amount)).toBe(400)
        expect((await call(dataEdits.POST, 'POST', '/api/data-edits', { org_id: orgId, kind: 'closing', id: log.id })).status).toBe(409)

        expect((await call(dataEdits.POST, 'POST', '/api/data-edits', { org_id: orgId, kind: 'purchase', id: pe[0].batch_id })).status).toBe(200)
        const pr2 = ((await db.from('purchases').select('name,amount,supplier_vat_number,invoice_number').eq('invoice_group', group)).data || []) as any[]
        expect(pr2.find(r => r.name === 'كاسات')).toMatchObject({ amount: 100, supplier_vat_number: null, invoice_number: null })
        expect(pr2.find(r => r.name === 'أكياس')).toMatchObject({ supplier_vat_number: null })

        // مدير فرع ما يقدر يرجّع (للمالك بس)
        const ownerAuth = auth.current
        auth.current = { ...ownerAuth!, role: 'branch_manager', branchId: branchA }
        expect((await call(dataEdits.GET, 'GET', `/api/data-edits?org_id=${orgId}&kind=closing&id=${closingId}`)).status).toBe(403)
        auth.current = ownerAuth
      } finally {
        await db.from('period_locks').delete().eq('org_id', orgId)
        await db.from('accountant_users').delete().eq('id', accId)
      }
    })
  })

  describe('accountant office team, bulk edits and journal export', () => {
    it('lead delegates a client to a team member (inherits sections, follows owner changes, removable), bulk-fixes supplier VAT, and exports balanced journal', async () => {
      process.env.STAFF_TOKEN_SECRET = process.env.STAFF_TOKEN_SECRET || 'it-secret'
      const savedKey = process.env.RESEND_API_KEY; delete process.env.RESEND_API_KEY
      const { makeSession, accessFor } = await import('@/lib/accountantPortalAuth')
      const team = await import('@/app/api/accountant-portal/team/route')
      const edit = await import('@/app/api/accountant-portal/edit/route')
      const journal = await import('@/app/api/accountant-portal/journal/route')
      const owner = await import('@/app/api/accountant-access/route')
      const leadEmail = `it-lead-${stamp}@storely.test`, memberEmail = `it-member-${stamp}@storely.test`
      const { data: lead } = await db.from('accountant_users').insert({ email: leadEmail, name: 'رئيس المكتب' } as any).select('id').single()
      const leadId = (lead as any).id
      const { data: la } = await db.from('accountant_access').insert({ org_id: orgId, email: leadEmail, name: 'رئيس المكتب', accountant_id: leadId, status: 'active', sections: ['sales', 'purchases'] } as any).select('id').single()
      const { data: sess } = await db.from('accountant_sessions').insert({ accountant_id: leadId } as any).select('id').single()
      const cookie = `acc_session=${makeSession(leadId, (sess as any).id)}`
      const req = (h: (r: Request) => Promise<Response>, method: string, url: string, body?: any) => h(new Request(`http://test${url}`, { method, headers: { 'Content-Type': 'application/json', cookie }, body: body ? JSON.stringify(body) : undefined }))
        .then(async r => { const isJson = (r.headers.get('content-type') || '').includes('json'); const text = await r.text(); return { status: r.status, text, json: isJson ? JSON.parse(text) as any : null } })
      try {
        // الفريق والإسناد
        expect((await req(team.POST, 'POST', '/api/accountant-portal/team', { action: 'add', email: memberEmail, name: 'موظف المكتب' })).status).toBe(200)
        expect((await req(team.POST, 'POST', '/api/accountant-portal/team', { action: 'add', email: memberEmail })).status).toBe(409)
        expect((await req(team.POST, 'POST', '/api/accountant-portal/team', { action: 'assign', email: memberEmail, org_id: orgId, on: true })).status).toBe(200)
        const mUser = (await db.from('accountant_users').select('id').eq('email', memberEmail).single()).data as any
        expect(await accessFor(db as any, mUser.id, orgId)).toMatchObject({ sections: ['sales', 'purchases'] })
        const listed = await req(team.GET, 'GET', '/api/accountant-portal/team')
        expect(listed.json.members[0]).toMatchObject({ email: memberEmail, orgs: [orgId] })

        // المالك: يشوف الموظف، تعديل المحاسب الرئيسي ينسحب عليه، وما يقدر يعدّل الموظف مباشرة
        const ol = await call(owner.GET, 'GET', `/api/accountant-access?org_id=${orgId}`)
        const memberRow = ol.json.accountants.find((a: any) => a.email === memberEmail)
        expect(memberRow).toMatchObject({ delegated_from: (la as any).id, team_of: 'رئيس المكتب' })
        expect((await call(owner.PATCH, 'PATCH', '/api/accountant-access', { org_id: orgId, id: (la as any).id, sections: ['purchases'] })).status).toBe(200)
        expect((await accessFor(db as any, mUser.id, orgId))?.sections).toEqual(['purchases'])
        expect((await call(owner.PATCH, 'PATCH', '/api/accountant-access', { org_id: orgId, id: memberRow.id, sections: ['sales'] })).status).toBe(400)
        await db.from('accountant_access').update({ sections: ['sales', 'purchases'] } as any).in('id', [(la as any).id, memberRow.id])

        // إلغاء الإسناد ثم إعادته
        expect((await req(team.POST, 'POST', '/api/accountant-portal/team', { action: 'assign', email: memberEmail, org_id: orgId, on: false })).status).toBe(200)
        expect(await accessFor(db as any, mUser.id, orgId)).toBeNull()
        expect((await req(team.POST, 'POST', '/api/accountant-portal/team', { action: 'assign', email: memberEmail, org_id: orgId, on: true })).status).toBe(200)

        // تعديل جماعي: الرقم الضريبي لكل فواتير المورد + يُحفظ للمورد
        const supName = `مورد الفريق ${stamp}`
        const { error: sErr } = await db.from('suppliers').insert({ org_id: orgId, name: supName, phone: uniqPhone() } as any); if (sErr) throw sErr
        const { data: pr, error: pErr } = await db.from('purchases').insert([{ org_id: orgId, branch_id: branchA, supplier: supName, name: 'صنف أ', category: 'مشتريات', amount: 100, has_vat: true },
          { org_id: orgId, branch_id: branchA, supplier: supName, name: 'صنف ب', category: 'مشتريات', amount: 40, has_vat: true }] as any).select('id')
        if (pErr) throw pErr
        const ids = ((pr || []) as any[]).map(p => p.id)
        const bulk = await req(edit.POST, 'POST', '/api/accountant-portal/edit', { org_id: orgId, kind: 'bulk_purchase', ids, supplier_vat_number: '300000000000003', supplier: supName })
        expect(bulk.json).toMatchObject({ success: true, changed: 2 })
        expect((await db.from('suppliers').select('vat_number').eq('org_id', orgId).eq('name', supName).single()).data).toMatchObject({ vat_number: '300000000000003' })
        expect((await req(edit.POST, 'POST', '/api/accountant-portal/edit', { org_id: orgId, kind: 'bulk_purchase', ids, supplier_vat_number: '123' })).status).toBe(400)
        expect((await req(edit.POST, 'POST', '/api/accountant-portal/edit', { org_id: orgId, kind: 'bulk_purchase', ids: [ids[1]], has_vat: false })).json.changed).toBe(1)

        // القيود: دليل الحسابات يُحفظ، والملف فيه الحساب الجديد
        expect((await req(journal.GET, 'GET', `/api/accountant-portal/journal?org_id=${orgId}`)).json.saved).toBe(false)
        expect((await req(journal.POST, 'POST', '/api/accountant-portal/journal', { org_id: orgId, map: { purchases: { code: '51001', name: 'مشتريات المطبخ' } } })).json.map.purchases.code).toBe('51001')
        const today = new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 10)
        const csv = await req(journal.GET, 'GET', `/api/accountant-portal/journal?org_id=${orgId}&from=${today.slice(0, 8)}01&to=${today}&format=csv`)
        expect(csv.status).toBe(200)
        expect(csv.text.startsWith('رقم القيد')).toBe(true)   // text() يحذف BOM؛ وجوده مختبر في journalExport.test
        expect(csv.text).toContain('51001')

        // سحب المحاسب الرئيسي من المالك → الموظف ينشال معه
        expect((await call(owner.DELETE, 'DELETE', `/api/accountant-access?org_id=${orgId}&id=${(la as any).id}`)).status).toBe(200)
        expect(await accessFor(db as any, mUser.id, orgId)).toBeNull()
      } finally {
        if (savedKey) process.env.RESEND_API_KEY = savedKey
        await db.from('accountant_access').delete().eq('org_id', orgId).in('email', [leadEmail, memberEmail])
        await db.from('accountant_users').delete().in('email', [leadEmail, memberEmail])
      }
    })
  })
})
