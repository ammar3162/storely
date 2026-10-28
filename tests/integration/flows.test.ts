/**
 * اختبارات تكامل على قاعدة staging — تستدعي API routes الحقيقية وتتحقق من النتيجة بقاعدة البيانات.
 * كل تشغيل ينشئ منشأة تجريبية مؤقتة (مالك + فرع) ويحذفها بالكامل بالنهاية.
 *
 * تحتاج .env.test.local فيه TEST_SUPABASE_URL و TEST_SUPABASE_SERVICE_ROLE_KEY (مشروع staging فقط).
 * بدونه تتخطى تلقائياً — فما تأثر على npm test أو البناء على Vercel.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

// ─── المتغيرات (قبل تحميل أي route) ───
const envFile = path.resolve(__dirname, '../../.env.test.local')
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '')
  }
}
const URL_ = process.env.TEST_SUPABASE_URL || ''
const KEY = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY || ''
const STAGING_REF = 'vmdhaqpuobxeyydbksfu'
const enabled = !!URL_ && !!KEY && !KEY.includes('الصق') && URL_.includes(STAGING_REF)
if (enabled) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = URL_
  process.env.SUPABASE_SERVICE_ROLE_KEY = KEY
}

// كل استدعاء يروح لقاعدة staging (سيدني) — المهلة الافتراضية 5 ثواني ما تكفي للاختبارات متعددة الخطوات
vi.setConfig({ testTimeout: 60_000 })

// ─── هوية المستخدم الحالي (بدل جلسة الدخول) ───
type Access = { userId: string; orgId: string; role: string; branchId: string | null; permissions?: Record<string, boolean> | null }
const auth: { current: Access | null } = { current: null }

vi.mock('next/headers', () => ({ headers: async () => new Headers(), cookies: async () => ({ getAll: () => [], set: () => {} }) }))
// ما نرسل واتساب حقيقي من الاختبارات
vi.mock('@/lib/whatsapp', () => ({ sendWhatsAppMessage: async () => ({ ok: true, success: true }), formatPhone: (x: string) => x }))
// لوحة الأدمن: جلسة أدمن وهمية للاختبار بس
vi.mock('@/lib/adminAuth', () => ({
  requirePermission: async (key: string | null) => (key === 'it-admin' ? { id: 'it-admin', name: 'اختبار' } : null),
  logAdminAction: async () => {},
}))
vi.mock('@/lib/verifyOrgAccess', async (importOriginal) => {
  const real: any = await importOriginal()
  return {
    ...real,
    getCurrentProfile: async () => auth.current
      ? { userId: auth.current.userId, email: null, status: 'active', orgId: auth.current.orgId, role: auth.current.role, branchId: auth.current.branchId }
      : null,
    verifyOrgAccess: async (orgId: string) => auth.current && auth.current.orgId === orgId
      ? { authorized: true, userId: auth.current.userId, orgId, role: auth.current.role, branchId: auth.current.branchId, permissions: auth.current.permissions ?? null }
      : { authorized: false, error: 'غير مصرح', status: 403 },
  }
})

async function call(handler: (req: Request) => Promise<Response>, method: string, url: string, body?: unknown) {
  const res = await handler(new Request(`http://test${url}`, {
    method, headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined,
  }))
  return { status: res.status, json: await res.json() as any }
}

describe.skipIf(!enabled)('integration (staging)', async () => {
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

  const stamp = Date.now()
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
  }, 60_000)

  afterAll(async () => {
    auth.current = null
    if (orgId) {
      const { deleteOrgCompletely } = await import('@/lib/deleteOrg')
      await deleteOrgCompletely(orgId, userId).catch(() => {})
      await db.from('organizations').delete().eq('id', orgId)
    }
    if (userId) await db.auth.admin.deleteUser(userId).catch(() => {})
  }, 60_000)

  describe('purchases, VAT and stock', () => {
    it('a VAT invoice for a new product stores net + 15% VAT and adds stock', async () => {
      const r = await call(purchases.POST, 'POST', '/api/purchases', {
        org_id: orgId, branch_id: branchA, category: 'مخزون', name: 'حليب', qty: 10, unit: 'كرتون',
        total_amount: 115, supplier: 'مورد تجريبي', invoice_date: today, has_vat: true, payment_status: 'paid', invoice_image: `${URL_}/storage/v1/object/public/invoices/it/invoice.jpg`,
      })
      expect(r.status).toBe(200)
      expect(r.json.product_action).toBe('created')
      const { data: p } = await db.from('purchases').select('amount,vat_amount,total_amount,has_vat').eq('org_id', orgId).eq('total_amount', 115).single()
      expect(p).toMatchObject({ amount: 100, vat_amount: 15, total_amount: 115, has_vat: true })
      expect((await productByName('حليب')).qty).toBe(10)
    })

    it('an invoice WITHOUT VAT stores zero VAT and updates the weighted average cost', async () => {
      const r = await call(purchases.POST, 'POST', '/api/purchases', {
        org_id: orgId, branch_id: branchA, category: 'مخزون', name: 'حليب', qty: 5, unit: 'كرتون',
        total_amount: 100, supplier: 'مورد تجريبي', invoice_date: today, has_vat: false, payment_status: 'paid',
      })
      expect(r.json.product_action).toBe('updated')
      const { data: p } = await db.from('purchases').select('amount,vat_amount,total_amount,has_vat').eq('org_id', orgId).eq('has_vat', false).single()
      expect(p).toMatchObject({ amount: 100, vat_amount: 0, total_amount: 100, has_vat: false })
      const milk = await productByName('حليب')
      expect(milk.qty).toBe(15)
      // (10 × 10 + 5 × 20) ÷ 15
      expect(Number(milk.avg_cost)).toBeCloseTo(13.33, 1)
    })

    it('deleting a stock purchase removes its quantity, restoring puts it back', async () => {
      const { data: p } = await db.from('purchases').select('id').eq('org_id', orgId).eq('has_vat', false).single()
      expect((await call(purchases.DELETE, 'DELETE', `/api/purchases?org_id=${orgId}&id=${(p as any).id}`)).status).toBe(200)
      expect((await productByName('حليب')).qty).toBe(10)
      expect((await call(restore.POST, 'POST', '/api/purchases/restore', { org_id: orgId, id: (p as any).id })).status).toBe(200)
      expect((await productByName('حليب')).qty).toBe(15)
    })
  })

  describe('dispense and waste', () => {
    it('dispensing reduces stock', async () => {
      const milk = await productByName('حليب')
      const r = await call(movements.POST, 'POST', '/api/stock-movements', { org_id: orgId, product_id: milk.id, type: 'out', qty: 4 })
      expect(r.status).toBe(200)
      expect((await productByName('حليب')).qty).toBe(11)
    })

    it('refuses to dispense more than available', async () => {
      const milk = await productByName('حليب')
      const r = await call(movements.POST, 'POST', '/api/stock-movements', { org_id: orgId, product_id: milk.id, type: 'out', qty: 999 })
      expect(r.status).toBe(400)
      expect((await productByName('حليب')).qty).toBe(11)
    })

    it('waste needs a reason, and reduces stock when given one', async () => {
      const milk = await productByName('حليب')
      expect((await call(movements.POST, 'POST', '/api/stock-movements', { org_id: orgId, product_id: milk.id, type: 'waste', qty: 1 })).status).toBe(400)
      expect((await call(movements.POST, 'POST', '/api/stock-movements', { org_id: orgId, product_id: milk.id, type: 'waste', qty: 1, waste_reason: 'تالف' })).status).toBe(200)
      expect((await productByName('حليب')).qty).toBe(10)
    })

    it('stock always equals the sum of its movements', async () => {
      const milk = await productByName('حليب')
      expect(await ledger(milk.id)).toBe(Number(milk.qty))
    })
  })

  describe('products API', () => {
    it('adding quantity from the edit form goes through a movement', async () => {
      const milk = await productByName('حليب')
      const r = await call(products.PATCH, 'PATCH', '/api/products', { org_id: orgId, id: milk.id, add_qty: 5 })
      expect(r.status).toBe(200)
      const after = await productByName('حليب')
      expect(after.qty).toBe(15)
      expect(await ledger(milk.id)).toBe(15)
    })
  })

  describe('plan limits and branch scoping', () => {
    it('refuses a new branch beyond the plan limit', async () => {
      const r = await call(branches.POST, 'POST', '/api/branches', { org_id: orgId, name: 'فرع زائد' })
      expect(r.status).toBe(403)
    })

    it('an extra-branch addon raises the limit by its quantity, and locks the extra branch when it expires', async () => {
      const { syncBranchesToLimit } = await import('@/lib/branchLimit')
      const { data: addon } = await db.from('marketplace_addons').select('id').eq('slug', 'extra_branch').single()
      const { data: sub } = await db.from('org_addon_subscriptions').insert({
        org_id: orgId, addon_id: (addon as any).id, status: 'active', quantity: 1,
        activated_at: new Date().toISOString(), expires_at: new Date(Date.now() + 86_400_000).toISOString(),
      } as any).select('id').single()

      const added = await call(branches.POST, 'POST', '/api/branches', { org_id: orgId, name: 'فرع مدفوع' })
      expect(added.status).toBe(200)
      expect((await call(branches.POST, 'POST', '/api/branches', { org_id: orgId, name: 'فرع ثالث' })).status).toBe(403)

      await db.from('org_addon_subscriptions').update({ expires_at: new Date(Date.now() - 1000).toISOString() } as any).eq('id', (sub as any).id)
      expect((await syncBranchesToLimit(db as any, orgId)).locked).toBe(1)
      const { data: paid } = await db.from('branches').select('is_active').eq('id', added.json.branch.id).single()
      expect((paid as any).is_active).toBe(false)
      const { data: main } = await db.from('branches').select('is_active').eq('id', branchA).single()
      expect((main as any).is_active).toBe(true)

      // تجديد الإضافة: الفرع الموقوف يرجع لحاله
      await db.from('org_addon_subscriptions').update({ expires_at: new Date(Date.now() + 86_400_000).toISOString() } as any).eq('id', (sub as any).id)
      expect((await syncBranchesToLimit(db as any, orgId)).restored).toBe(1)
      const { data: back } = await db.from('branches').select('is_active,plan_locked_at').eq('id', added.json.branch.id).single()
      expect(back).toMatchObject({ is_active: true, plan_locked_at: null })

      await db.from('org_addon_subscriptions').delete().eq('id', (sub as any).id)
      await db.from('branches').update({ is_active: false } as any).eq('id', added.json.branch.id)
    })

    it('a branch manager only sees products of their own branch', async () => {
      const { data: brB } = await db.from('branches').insert({ org_id: orgId, name: 'فرع ب', is_active: true } as any).select('id').single()
      await db.from('products').insert({ org_id: orgId, branch_id: (brB as any).id, name: 'منتج فرع ب', qty: 0, is_active: true } as any)
      await db.from('products').update({ branch_id: branchA } as any).eq('org_id', orgId).eq('name', 'حليب')

      auth.current = { userId, orgId, role: 'manager', branchId: branchA }
      const r = await call(products.GET, 'GET', `/api/products?org_id=${orgId}&branch_id=${(brB as any).id}`)
      auth.current = { userId, orgId, role: 'owner', branchId: null }

      const names = r.json.products.map((p: any) => p.name)
      expect(names).toContain('حليب')
      expect(names).not.toContain('منتج فرع ب')
    })

    it('rejects requests for another organization', async () => {
      const r = await call(products.GET, 'GET', '/api/products?org_id=00000000-0000-0000-0000-000000000000')
      expect(r.status).toBe(403)
    })
  })

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
        org_id: o, branch_id: b, name: 'موظف ' + n, phone: `9665${String(stamp + 40 + n).slice(-8)}`, pin: 'x', is_active: true, role: 'staff', monthly_salary: 3000, leave_balance_days: 5,
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

  describe('VAT invoice attachment must be a Storely upload', () => {
    it('rejects an external link as the invoice image', async () => {
      const r = await call(purchases.POST, 'POST', '/api/purchases', {
        org_id: orgId, branch_id: branchA, category: 'مخزون', name: 'رابط خارجي', qty: 1, unit: 'حبة',
        total_amount: 23, supplier: 'مورد', invoice_date: today, has_vat: true, payment_status: 'paid', invoice_image: 'https://evil.example/fake.jpg',
      })
      expect(r.status).toBe(400)
    })
  })

  describe('deleting an organization', () => {
    it('removes an org that has HR records (tasks, deductions, leave, staff notifications)', async () => {
      const { deleteOrgCompletely } = await import('@/lib/deleteOrg')
      const { data: o } = await db.from('organizations').insert({ name: `__it_del_${stamp}`, whatsapp_number: '966500000000', plan: 'pro', max_branches: 1, currency: 'SAR' } as any).select('id').single()
      const oid = (o as any).id
      const { data: b } = await db.from('branches').insert({ org_id: oid, name: 'ف', is_active: true } as any).select('id').single()
      const { data: s } = await db.from('staff_members').insert({ org_id: oid, branch_id: (b as any).id, name: 'م', phone: `9665${String(stamp + 70).slice(-8)}`, pin: 'x', is_active: true, role: 'staff' } as any).select('id').single()
      const sid = (s as any).id
      await db.from('staff_tasks').insert({ org_id: oid, branch_id: (b as any).id, staff_id: sid, title: 'م', status: 'pending' } as any)
      await db.from('staff_payroll_adjustments').insert({ org_id: oid, staff_id: sid, type: 'deduction', amount: 5, status: 'approved', requested_by: 'owner' } as any)
      await db.from('staff_leave_requests').insert({ org_id: oid, staff_id: sid, start_date: '2026-12-01', end_date: '2026-12-01', days_count: 1, status: 'pending' } as any)
      await db.from('staff_notifications').insert({ org_id: oid, staff_id: sid, type: 'info', title: 'ت', message: 'ت' } as any)
      const r = await deleteOrgCompletely(oid)
      expect(r.errors).toEqual([])
      expect((await db.from('organizations').select('id').eq('id', oid)).data?.length).toBe(0)
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

  describe('deleting a branch with records in a locked month', () => {
    it('refuses before touching anything, and whole-org deletion still works', async () => {
      const { deleteBranchCompletely, deleteOrgCompletely } = await import('@/lib/deleteOrg')
      const { data: o } = await db.from('organizations').insert({ name: `__it_lock_${stamp}`, whatsapp_number: '966500000000', plan: 'pro', max_branches: 2, currency: 'SAR' } as any).select('id').single()
      const oid = (o as any).id
      const { data: b } = await db.from('branches').insert({ org_id: oid, name: 'فرع مقفل', is_active: true } as any).select('id').single()
      const bid = (b as any).id
      await db.from('products').insert({ org_id: oid, branch_id: bid, name: 'صنف الفرع', qty: 0, is_active: true } as any)
      await db.from('purchases').insert({ org_id: oid, branch_id: bid, name: 'شراء سبتمبر', category: 'أخرى', qty: 1, amount: 10, has_vat: false, supplier: 'م', created_at: '2026-09-15T10:00:00+03:00' } as any)
      await db.from('period_locks').insert({ org_id: oid, month: '2026-09-01', locked_by_name: 'اختبار' } as any)

      const r = await deleteBranchCompletely(bid, oid)
      expect(r.success).toBe(false)
      expect(r.lockedMonths).toEqual(['2026-09-01'])
      // ما انحذف شي من الفرع
      expect((await db.from('products').select('id').eq('branch_id', bid)).data?.length).toBe(1)
      expect((await db.from('branches').select('id').eq('id', bid)).data?.length).toBe(1)

      const d = await deleteOrgCompletely(oid)
      expect(d.errors).toEqual([])
      expect((await db.from('organizations').select('id').eq('id', oid)).data?.length).toBe(0)
    })
  })

  describe('security: the browser cannot write to the database directly', () => {
    const ANON = process.env.TEST_SUPABASE_ANON_KEY || ''
    it.skipIf(!ANON)('a signed-in manager cannot promote themselves, upgrade the plan, change stock, or read staff PINs', async () => {
      const anon = createClient(URL_, ANON, { auth: { persistSession: false } })
      // أي زائر: دالة حذف الحسابات ممنوعة
      const del = await anon.rpc('delete_auth_user' as any, { user_id: '00000000-0000-0000-0000-000000000000' } as any)
      expect(del.error).not.toBeNull()

      const email = `it-mgr-${stamp}@storely.test`, password = `It-${stamp}-m!`
      const { data: u } = await db.auth.admin.createUser({ email, password, email_confirm: true })
      const mid = u.user!.id
      try {
        await db.from('profiles').upsert({ id: mid, full_name: 'مدير', org_id: orgId, role: 'manager', branch_id: branchA, status: 'active' } as any)
        await db.from('staff_members').insert({ org_id: orgId, branch_id: branchA, name: 'موظف سري', phone: `9665${String(stamp + 80).slice(-8)}`, pin: '$2a$10$x', is_active: true, role: 'staff' } as any)
        const user = createClient(URL_, ANON, { auth: { persistSession: false } })
        const { error: signErr } = await user.auth.signInWithPassword({ email, password })
        expect(signErr).toBeNull()

        await user.from('profiles').update({ role: 'owner', branch_id: null } as any).eq('id', mid)
        expect(((await db.from('profiles').select('role').eq('id', mid).single()).data as any).role).toBe('manager')

        const before = ((await db.from('organizations').select('plan,max_branches').eq('id', orgId).single()).data as any)
        await user.from('organizations').update({ plan: 'pro', max_branches: 99 } as any).eq('id', orgId)
        expect((await db.from('organizations').select('plan,max_branches').eq('id', orgId).single()).data).toEqual(before)

        const { data: prod } = await db.from('products').insert({ org_id: orgId, branch_id: branchA, name: 'منتج حماية', qty: 0, is_active: true } as any).select('id').single()
        const ins = await user.from('stock_movements').insert({ org_id: orgId, product_id: (prod as any).id, type: 'in', qty_change: 1000 } as any)
        expect(ins.error).not.toBeNull()

        expect((await user.from('staff_members').select('pin').eq('org_id', orgId)).data || []).toEqual([])
        // القراءة اللي يحتاجها التحديث الفوري لسا شغالة
        expect(((await user.from('notifications').select('id').eq('org_id', orgId)).error)).toBeNull()

        // التخزين: الزائر ما يشوف قائمة الفواتير، والمستخدم يرفع بمجلد منشأته بس
        expect((await anon.storage.from('invoices').list('', { limit: 5 })).data || []).toEqual([])
        const png = new Blob([new Uint8Array([137, 80, 78, 71])], { type: 'image/png' })
        expect((await user.storage.from('invoices').upload(`00000000-0000-0000-0000-000000000000/x-${stamp}.png`, png)).error).not.toBeNull()
        expect((await user.storage.from('invoices').upload(`x-${stamp}.png`, png)).error).not.toBeNull()
        const own = `${orgId}/it-${stamp}.png`
        expect((await user.storage.from('invoices').upload(own, png, { contentType: 'image/png' })).error).toBeNull()
        await db.storage.from('invoices').remove([own])
      } finally {
        await db.from('profiles').delete().eq('id', mid)
        await db.auth.admin.deleteUser(mid).catch(() => {})
      }
    })
  })

  describe('supplier orders: once per drop', () => {
    it('blocks a second order until the product is restocked', async () => {
      const milk = await productByName('حليب')
      const { data: sup } = await db.from('suppliers').insert({ org_id: orgId, name: 'مورد', phone: '966511111111' } as any).select('id').single()
      expect(await gate.orderedSinceLastRestock(db as any, milk.id)).toBe(false)

      await gate.logSupplierOrder(db as any, { product_id: milk.id, supplier_id: (sup as any).id, qty_at_trigger: 2, ok: true })
      expect(await gate.orderedSinceLastRestock(db as any, milk.id)).toBe(true)

      await new Promise(r => setTimeout(r, 1100)) // الحركة لازم تكون بعد الطلب زمنياً
      await db.from('stock_movements').insert({ product_id: milk.id, org_id: orgId, type: 'in', qty_change: 20, note: 'تعبئة اختبار' } as any)
      expect(await gate.orderedSinceLastRestock(db as any, milk.id)).toBe(false)
    })
  })

  describe('online menu per branch', () => {
    it('admin subscribes branches, owner and branch manager manage their menus, customers see the right menu', async () => {
      const adminSubs = await import('@/app/api/admin/addon-subscriptions/route')
      const shopSettings = await import('@/app/api/shop-settings/route')
      const shopItems = await import('@/app/api/shop-items/route')
      const shopImport = await import('@/app/api/shop-items/import/route')
      const { getPublicMenu } = await import('@/lib/shopMenu')
      const owner = auth.current!
      const adminCall = async (method: string, body: unknown) => {
        const res = await adminSubs[method as 'POST'](new Request('http://test/api/admin/addon-subscriptions', { method, headers: { 'Content-Type': 'application/json', 'x-admin-key': 'it-admin' }, body: JSON.stringify(body) }))
        return { status: res.status, json: await res.json() as any }
      }

      const { data: brB } = await db.from('branches').insert({ org_id: orgId, name: 'فرع النرجس', is_active: true } as any).select('id').single()
      const branchB = (brB as any).id
      const { data: addon } = await db.from('marketplace_addons').select('id').eq('slug', 'online_menu').single()
      const addonId = (addon as any).id

      // الأدمن: فرع من منشأة ثانية مرفوض، والكمية = عدد الفروع
      const { data: foreign } = await db.from('branches').select('id').neq('org_id', orgId).limit(1).single()
      expect((await adminCall('POST', { org_id: orgId, addon_id: addonId, branch_ids: [branchA, (foreign as any).id] })).status).toBe(400)
      const act = await adminCall('POST', { org_id: orgId, addon_id: addonId, branch_ids: [branchA, branchB] })
      expect(act.json.success).toBe(true)
      const { data: sub } = await db.from('org_addon_subscriptions').select('quantity,branch_ids').eq('org_id', orgId).eq('addon_id', addonId).single()
      expect((sub as any).quantity).toBe(2)
      expect([...(sub as any).branch_ids].sort()).toEqual([branchA, branchB].sort())

      const slug = `it-menu-${stamp}`
      expect((await call(shopSettings.POST, 'POST', '/api/shop-settings', { org_id: orgId, shop_slug: slug, shop_enabled: true })).json.success).toBe(true)

      // المالك: صنف لفرع أ، صنف لكل الفروع
      const g = await call(shopSettings.GET, 'GET', `/api/shop-settings?org_id=${orgId}&branch_id=${branchA}`)
      expect(g.json.mode).toBe('branch')
      expect(g.json.branchId).toBe(branchA)
      expect(g.json.branches.map((b: any) => b.shop_slug)).toEqual(['الفرع-الرئيسي', 'فرع-النرجس'])
      const itemA = (await call(shopItems.POST, 'POST', '/api/shop-items', { org_id: orgId, branch_id: branchA, scope: 'branch', name: 'لاتيه العليا', category: 'قهوة', price: 18 })).json.id
      const itemAll = (await call(shopItems.POST, 'POST', '/api/shop-items', { org_id: orgId, branch_id: branchA, scope: 'all', name: 'ماء', category: 'مشروبات', price: 2 })).json.id
      expect(((await db.from('shop_items').select('branch_id').eq('id', itemA).single()).data as any).branch_id).toBe(branchA)
      expect(((await db.from('shop_items').select('branch_id').eq('id', itemAll).single()).data as any).branch_id).toBeNull()

      // الوصفات: تنضاف بسعر البيع، والتكرار يتخطّى
      const { data: rec } = await db.from('recipes').insert({ org_id: orgId, name: 'كابتشينو', sell_price: 16 } as any).select('id').single()
      const imp = await call(shopImport.POST, 'POST', '/api/shop-items/import', { org_id: orgId, branch_id: branchA, scope: 'branch', category: 'قهوة', recipe_ids: [(rec as any).id] })
      expect(imp.json.added).toBe(1)
      expect((await call(shopImport.POST, 'POST', '/api/shop-items/import', { org_id: orgId, branch_id: branchA, scope: 'branch', category: 'قهوة', recipe_ids: [(rec as any).id] })).json.added).toBe(0)
      expect(((await db.from('shop_items').select('price,branch_id').eq('org_id', orgId).eq('name', 'كابتشينو').single()).data as any)).toEqual({ price: 16, branch_id: branchA })

      // مدير فرع النرجس: يشوف فرعه بس، وما يلمس فرع أ ولا أصناف كل الفروع ولا إعدادات المنشأة
      auth.current = { userId: owner.userId, orgId, role: 'manager', branchId: branchB, permissions: { online_store: true } }
      const mg = await call(shopSettings.GET, 'GET', `/api/shop-settings?org_id=${orgId}&branch_id=${branchA}`)
      expect(mg.json.branchId).toBe(branchB)
      expect(mg.json.canManageOrg).toBe(false)
      expect(mg.json.branches.map((b: any) => b.id)).toEqual([branchB])
      expect(mg.json.shopItems.map((i: any) => i.name)).toEqual(['ماء'])
      expect((await call(shopItems.POST, 'POST', '/api/shop-items', { org_id: orgId, item_id: itemA, name: 'مخترق' })).status).toBe(403)
      expect((await call(shopItems.POST, 'POST', '/api/shop-items', { org_id: orgId, item_id: itemAll, name: 'مخترق' })).status).toBe(403)
      expect((await call(shopItems.DELETE, 'DELETE', '/api/shop-items', { org_id: orgId, item_id: itemAll })).status).toBe(403)
      expect((await call(shopItems.POST, 'POST', '/api/shop-items', { org_id: orgId, branch_id: branchA, scope: 'all', name: 'x', category: 'y' })).status).toBe(403)
      expect((await call(shopSettings.POST, 'POST', '/api/shop-settings', { org_id: orgId, shop_slug: 'hijack', shop_enabled: true })).status).toBe(403)
      expect((await call(shopSettings.PATCH, 'PATCH', '/api/shop-settings', { org_id: orgId, branch_id: branchA, shop_slug: 'x1' })).status).toBe(403)
      expect((await call(shopItems.PATCH, 'PATCH', '/api/shop-items', { org_id: orgId, item_id: itemAll, field: 'is_hidden', value: true })).status).toBe(403)
      expect((await call(shopItems.PATCH, 'PATCH', '/api/shop-items', { org_id: orgId, item_id: itemA, field: 'is_available', value: false })).status).toBe(403)
      const itemB = (await call(shopItems.POST, 'POST', '/api/shop-items', { org_id: orgId, branch_id: branchA, name: 'سبانش النرجس', category: 'قهوة', price: 20 })).json.id
      expect(((await db.from('shop_items').select('branch_id').eq('id', itemB).single()).data as any).branch_id).toBe(branchB)
      await call(shopItems.PUT, 'PUT', '/api/shop-items', { org_id: orgId, old_category: 'قهوة', new_category: 'قهوة مختصة' })
      expect(((await db.from('shop_items').select('category').eq('id', itemA).single()).data as any).category).toBe('قهوة')
      expect(((await db.from('shop_items').select('category').eq('id', itemB).single()).data as any).category).toBe('قهوة مختصة')
      expect((await call(shopSettings.PATCH, 'PATCH', '/api/shop-settings', { org_id: orgId, branch_id: branchB, shop_hours: { enabled: true, is24h: false, open: '16:00', close: '02:00' } })).json.success).toBe(true)
      auth.current = owner

      // المالك: صنف للفرعين = صنف واحد لكل الفروع، وصنف نفد/مخفي
      const both = await call(shopItems.POST, 'POST', '/api/shop-items', { org_id: orgId, branch_id: branchA, scope: 'branch', branch_ids: [branchA, branchB], name: 'موهيتو', category: 'بارد', price: 15 })
      expect(both.json.count).toBe(1)
      expect(((await db.from('shop_items').select('branch_id').eq('id', both.json.id).single()).data as any).branch_id).toBeNull()
      expect((await call(shopItems.PATCH, 'PATCH', '/api/shop-items', { org_id: orgId, item_id: both.json.id, field: 'is_hidden', value: true })).json.success).toBe(true)
      expect((await call(shopItems.PATCH, 'PATCH', '/api/shop-items', { org_id: orgId, item_id: itemA, field: 'is_available', value: false })).json.success).toBe(true)
      expect((await call(shopItems.PATCH, 'PATCH', '/api/shop-items', { org_id: orgId, item_id: itemA, field: 'price', value: 1 })).status).toBe(400)

      // الزبون: الرابط العام = اختيار الفرع، ورابط الفرع = أصناف فرعه + كل الفروع
      const pick = await getPublicMenu(db as any, slug)
      expect(pick?.kind).toBe('pick')
      const menuA = await getPublicMenu(db as any, slug, encodeURIComponent('الفرع-الرئيسي'))
      expect(menuA?.kind === 'menu' && menuA.products.map(p => p.name).sort()).toEqual(['كابتشينو', 'لاتيه العليا', 'ماء'].sort())
      expect(menuA?.kind === 'menu' && menuA.products.find(p => p.name === 'لاتيه العليا')?.sold_out).toBe(true)
      const menuB = await getPublicMenu(db as any, slug, 'فرع-النرجس')
      expect(menuB?.kind === 'menu' && menuB.products.map(p => p.name).sort()).toEqual(['سبانش النرجس', 'ماء'].sort())
      expect(menuB?.kind === 'menu' && menuB.hours.open).toBe('16:00')

      // اشتراك قديم بدون فروع: منيو واحد بكل الأصناف (نفس السلوك السابق)
      await db.from('org_addon_subscriptions').update({ branch_ids: null } as any).eq('org_id', orgId).eq('addon_id', addonId)
      const legacy = await getPublicMenu(db as any, slug)
      expect(legacy?.kind === 'menu' && legacy.products.length).toBe(4)
      await db.from('org_addon_subscriptions').update({ branch_ids: [branchA, branchB] } as any).eq('org_id', orgId).eq('addon_id', addonId)

      // حذف فرع: يطلع من الاشتراك وتنقص الفاتورة، وأصنافه تنحذف
      const { deleteBranchCompletely } = await import('@/lib/deleteOrg')
      expect((await deleteBranchCompletely(branchB, orgId)).success).toBe(true)
      const { data: after } = await db.from('org_addon_subscriptions').select('quantity,branch_ids').eq('org_id', orgId).eq('addon_id', addonId).single()
      expect(after).toEqual({ quantity: 1, branch_ids: [branchA] })
      expect((await db.from('shop_items').select('id').eq('id', itemB)).data).toEqual([])
      const single = await getPublicMenu(db as any, slug)
      expect(single?.kind === 'menu' && single.branch?.id).toBe(branchA)
      // رابط الفرع المحذوف/المسحوب ما يعرض منيو فرع ثاني
      const gone = await getPublicMenu(db as any, slug, 'فرع-النرجس')
      expect(gone?.kind === 'pick' && gone.missing).toBe(true)

      // إلغاء الاشتراك: المنيو العام يختفي
      expect((await adminCall('DELETE', { org_id: orgId, addon_id: addonId })).json.success).toBe(true)
      expect(await getPublicMenu(db as any, slug)).toBeNull()
    }, 240_000)
  })

  describe('marketing emails', () => {
    it('unsubscribe link adds the email to opt-outs, and test accounts never receive campaigns', async () => {
      const unsub = await import('@/app/api/unsubscribe/route')
      const m = await import('@/lib/marketing')
      const email = `it-optout-${stamp}@example.org`
      const bad = await unsub.POST(new Request(`http://test/api/unsubscribe?e=${encodeURIComponent(email)}&t=wrong`, { method: 'POST' }))
      expect(bad.status).toBe(400)
      const ok = await unsub.POST(new Request(`http://test/api/unsubscribe?e=${encodeURIComponent(email)}&t=${m.unsubToken(email)}`, { method: 'POST', body: 'List-Unsubscribe=One-Click', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }))
      expect(ok.status).toBe(200)
      expect((await db.from('email_optouts').select('email').eq('email', email)).data).toHaveLength(1)
      // نفس الرابط مرتين ما يسبب خطأ
      expect((await unsub.POST(new Request(`http://test/api/unsubscribe?e=${encodeURIComponent(email)}&t=${m.unsubToken(email)}`, { method: 'POST' }))).status).toBe(200)
      await db.from('email_optouts').delete().eq('email', email)

      const all = await m.segmentRecipients(db as any, 'all')
      expect(all.some(r => r.email.endsWith('@storely.test'))).toBe(false)
      expect(new Set(all.map(r => r.email.toLowerCase())).size).toBe(all.length)
    })
  })

  describe('admin deletes a customer', () => {
    it('removes the org, its recipes and every login (owner + branch manager)', async () => {
      const del = await import('@/app/api/admin/delete-user/route')
      const s2 = Date.now()
      const { data: o } = await db.auth.admin.createUser({ email: `it-del-owner-${s2}@storely.test`, password: `It-${s2}-x!`, email_confirm: true })
      const { data: mgr } = await db.auth.admin.createUser({ email: `it-del-mgr-${s2}@storely.test`, password: `It-${s2}-y!`, email_confirm: true })
      const { data: org } = await db.from('organizations').insert({ name: `__it_del_${s2}`, whatsapp_number: '966500000000', plan: 'pro', max_branches: 2, currency: 'SAR' } as any).select('id').single()
      const oid = (org as any).id
      const { data: br } = await db.from('branches').insert({ org_id: oid, name: 'فرع', is_active: true } as any).select('id').single()
      await db.from('profiles').upsert([
        { id: o.user!.id, full_name: 'مالك', org_id: oid, role: 'owner', status: 'active' },
        { id: mgr.user!.id, full_name: 'مدير', org_id: oid, role: 'manager', branch_id: (br as any).id, status: 'active' },
      ] as any)
      await db.from('recipes').insert({ org_id: oid, name: 'لاتيه', sell_price: 18 } as any)
      await db.from('demo_requests').insert({ first_name: 'x', last_name: 'y', phone: '966500000001', business_name: 'z', status: 'new', matched_org_id: oid } as any)

      const res = await del.POST(new Request('http://test/api/admin/delete-user', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-key': 'it-admin' }, body: JSON.stringify({ userId: o.user!.id, orgId: oid }) }))
      const j = await res.json()
      expect(j.success, JSON.stringify(j)).toBe(true)
      expect((await db.from('organizations').select('id').eq('id', oid)).data).toEqual([])
      expect((await db.from('recipes').select('id').eq('org_id', oid)).data).toEqual([])
      expect((await db.auth.admin.getUserById(o.user!.id)).data.user).toBeNull()
      expect((await db.auth.admin.getUserById(mgr.user!.id)).data.user).toBeNull()
      // طلب العرض يبقى، بس ينفك ربطه
      const { data: demo } = await db.from('demo_requests').select('id,matched_org_id').eq('phone', '966500000001')
      expect((demo || []).every((d: any) => d.matched_org_id === null)).toBe(true)
      await db.from('demo_requests').delete().eq('phone', '966500000001')
    })
  })

  describe('changing plans keeps data, limits and features consistent', () => {
    it('pro → basic → pro: no data lost, extra branch paused then restored, features follow, expired add-ons give nothing', async () => {
      const updatePlan = await import('@/app/api/admin/update-plan/route')
      const { orgFeatures } = await import('@/lib/planFeatures')
      const { checkStaffCapacity } = await import('@/lib/staffCapacity')
      const admin = async (body: any) => {
        const res = await updatePlan.POST(new Request('http://test/api/admin/update-plan', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-key': 'it-admin' }, body: JSON.stringify(body) }))
        return { status: res.status, json: await res.json() as any }
      }
      const counts = async () => {
        const n = async (t: string) => (await db.from(t).select('id', { count: 'exact', head: true }).eq('org_id', orgId)).count
        return { products: await n('products'), staff: await n('staff_members'), branches: await n('branches'), purchases: await n('purchases'), moves: await n('stock_movements') }
      }

      // فروع اختبارات سابقة: نقفلها يدوي (مو بسبب الباقة) عشان ما ترجع مكان فرع هالاختبار
      await db.from('branches').update({ is_active: false, plan_locked_at: null } as any).eq('org_id', orgId).neq('id', branchA)
      await admin({ orgId, planName: 'pro', maxBranches: 3, maxStaff: 10, maxSuppliers: 10 })
      const { data: br2 } = await db.from('branches').insert({ org_id: orgId, name: 'فرع ترقية', is_active: true } as any).select('id').single()
      const before = await counts()
      expect(await orgFeatures(db as any, orgId)).toEqual({ cashier: true, hr: true, ai: true, profitability: true })

      // تخفيض للأساسية: الفرع الزايد يتوقف مؤقتاً، والبيانات كلها باقية
      const down = await admin({ orgId, planName: 'basic', maxBranches: 1, maxStaff: 3, maxSuppliers: 3 })
      expect(down.status).toBe(200)
      expect(await counts()).toEqual(before)
      expect((await db.from('branches').select('is_active').eq('id', (br2 as any).id).single()).data).toMatchObject({ is_active: false })
      expect(await orgFeatures(db as any, orgId)).toEqual({ cashier: false, hr: false, ai: false, profitability: false })

      // إضافة «موظف إضافي» منتهية ما تعطي رصيد
      const { data: es } = await db.from('marketplace_addons').select('id').eq('slug', 'extra_staff').single()
      await db.from('org_addon_subscriptions').upsert({ org_id: orgId, addon_id: (es as any).id, status: 'active', quantity: 2,
        activated_at: new Date().toISOString(), expires_at: new Date(Date.now() - 1000).toISOString() } as any, { onConflict: 'org_id,addon_id' })
      for (let i = 0; i < 3; i++) await db.from('staff_members').insert({ org_id: orgId, branch_id: branchA, name: `سعة ${i}`, phone: `9665${String(stamp + 80 + i).slice(-8)}`, pin: 'x', is_active: true, role: 'staff' } as any)
      expect((await checkStaffCapacity(db as any, orgId, branchA)).ok).toBe(false)
      // تجديدها يرجع الرصيد، وتغيير الباقة ما يمسح وحداتها من الحد المعروض
      await db.from('org_addon_subscriptions').update({ expires_at: new Date(Date.now() + 864e5).toISOString() } as any).eq('org_id', orgId).eq('addon_id', (es as any).id)
      expect((await checkStaffCapacity(db as any, orgId, branchA)).ok).toBe(true)
      await admin({ orgId, planName: 'basic', maxBranches: 1, maxStaff: 3, maxSuppliers: 3 })
      expect((await db.from('organizations').select('max_staff').eq('id', orgId).single()).data).toMatchObject({ max_staff: 5 })

      // ترقية مرة ثانية: الفرع يرجع والميزات تنفتح
      await admin({ orgId, planName: 'pro', maxBranches: 3, maxStaff: 10, maxSuppliers: 10 })
      expect((await db.from('branches').select('is_active').eq('id', (br2 as any).id).single()).data).toMatchObject({ is_active: true })
      expect((await orgFeatures(db as any, orgId)).cashier).toBe(true)

      await db.from('org_addon_subscriptions').delete().eq('org_id', orgId).eq('addon_id', (es as any).id)
      await db.from('staff_members').delete().eq('org_id', orgId).like('name', 'سعة %')
      await db.from('branches').update({ is_active: false } as any).eq('id', (br2 as any).id)
      await db.from('organizations').update({ plan: 'pro', max_branches: 1, max_staff: 1 } as any).eq('id', orgId)
    }, 180_000)
  })

  describe('basic plan + add-ons open the same features everywhere', () => {
    it('a cashier can be added on basic only with the cashier-closing add-on, and staff see it too', async () => {
      process.env.STAFF_TOKEN_SECRET = process.env.STAFF_TOKEN_SECRET || 'it-secret'
      const addStaff = await import('@/app/api/add-staff/route')
      const staffOrg = await import('@/app/api/staff-org/route')
      const { orgFeatures } = await import('@/lib/planFeatures')
      const { generateStaffToken } = await import('@/lib/staffAuth')
      process.env.STAFF_TOKEN_SECRET = process.env.STAFF_TOKEN_SECRET || 'it-secret'
      await db.from('organizations').update({ plan: 'basic', max_staff: 10 } as any).eq('id', orgId)
      const body = (n: number) => ({ org_id: orgId, branch_id: branchA, name: `كاشير ${n}`, phone: `9665${String(stamp + 60 + n).slice(-8)}`, pin: '4821', role: 'cashier', permissions: { dispense: true } })

      expect((await call(addStaff.POST, 'POST', '/api/add-staff', body(1))).status).toBe(403)
      expect((await orgFeatures(db as any, orgId)).cashier).toBe(false)

      const { data: addon } = await db.from('marketplace_addons').select('id').eq('slug', 'cashier_closing').single()
      await db.from('org_addon_subscriptions').upsert({ org_id: orgId, addon_id: (addon as any).id, status: 'active', quantity: 1,
        activated_at: new Date().toISOString(), expires_at: new Date(Date.now() + 864e5).toISOString() } as any, { onConflict: 'org_id,addon_id' })
      expect((await orgFeatures(db as any, orgId)).cashier).toBe(true)
      const added = await call(addStaff.POST, 'POST', '/api/add-staff', body(2))
      expect(added.status).toBe(200)

      const { data: cashier } = await db.from('staff_members').select('id').eq('org_id', orgId).eq('name', 'كاشير 2').single()
      const res = await staffOrg.GET(new Request('http://test/api/staff-org', { headers: { Authorization: `Bearer ${generateStaffToken((cashier as any).id, orgId, branchA)}` } }))
      expect(((await res.json()) as any).cashier_feature).toBe(true)

      // الإضافة انتهت → يرجع مقفل
      await db.from('org_addon_subscriptions').update({ expires_at: new Date(Date.now() - 1000).toISOString() } as any).eq('org_id', orgId).eq('addon_id', (addon as any).id)
      expect((await orgFeatures(db as any, orgId)).cashier).toBe(false)

      await db.from('org_addon_subscriptions').delete().eq('org_id', orgId).eq('addon_id', (addon as any).id)
      await db.from('staff_members').delete().eq('org_id', orgId).like('name', 'كاشير %')
      await db.from('organizations').update({ plan: 'pro', max_staff: 1 } as any).eq('id', orgId)
    }, 120_000)
  })

  describe('products shared between staff', () => {
    it('two staff can have the same product, and products from another branch are refused', async () => {
      const assign = await import('@/app/api/staff-members/assign/route')
      const mkStaff = async (n: number) => {
        const r = await db.from('staff_members').insert({
          org_id: orgId, branch_id: branchA, name: `مشترك ${n}`, phone: `9665${String(stamp + 40 + n).slice(-8)}`, pin: 'x', is_active: true, role: 'staff',
        } as any).select('id').single()
        if (r.error) throw new Error('staff insert: ' + r.error.message)
        return r.data as any
      }
      const a = await mkStaff(1), b = await mkStaff(2)
      const { data: p } = await db.from('products').insert({ org_id: orgId, branch_id: branchA, name: `مشترك_${stamp}`, unit: 'قطعة', qty: 0, is_active: true } as any).select('id').single()
      const pid = (p as any).id
      expect((await call(assign.POST, 'POST', '/api/staff-members/assign', { org_id: orgId, staff_id: a.id, product_ids: [pid] })).status).toBe(200)
      expect((await call(assign.POST, 'POST', '/api/staff-members/assign', { org_id: orgId, staff_id: b.id, add_product_id: pid })).status).toBe(200)
      const { data: rows } = await db.from('staff_members').select('id,assigned_products').in('id', [a.id, b.id])
      for (const r of rows as any[]) expect(r.assigned_products).toEqual([pid])

      const { data: other } = await db.from('branches').insert({ org_id: orgId, name: 'فرع ثاني تخصيص', is_active: true } as any).select('id').single()
      const { data: p2 } = await db.from('products').insert({ org_id: orgId, branch_id: (other as any).id, name: `بعيد_${stamp}`, unit: 'قطعة', qty: 0, is_active: true } as any).select('id').single()
      expect((await call(assign.POST, 'POST', '/api/staff-members/assign', { org_id: orgId, staff_id: a.id, product_ids: [pid, (p2 as any).id] })).status).toBe(400)

      // الاثنين يصرفون نفس المنتج بنفس اللحظة — ولا صرفة تضيع
      process.env.STAFF_TOKEN_SECRET = process.env.STAFF_TOKEN_SECRET || 'it-secret'
      const { generateStaffToken } = await import('@/lib/staffAuth')
      const dispense = await import('@/app/api/staff-dispense/route')
      await db.from('stock_movements').insert({ product_id: pid, org_id: orgId, branch_id: branchA, type: 'in', qty_change: 10 } as any)
      const go = (sid: string) => dispense.POST(new Request('http://test/api/staff-dispense', { method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${generateStaffToken(sid, orgId, branchA)}` },
        body: JSON.stringify({ productId: pid, qty: 3, staffName: 'اسم مزوّر' }) }))
      await db.from('stock_movements').insert({ product_id: pid, org_id: orgId, branch_id: branchA, type: 'in', qty_change: 9 } as any)
      // 5 صرفات بنفس اللحظة من موظفين (19 − 5×3 = 4) — قبل قفل صف المنتج كانت وحدة تضيع
      const res = await Promise.all([go(a.id), go(b.id), go(a.id), go(b.id), go(a.id)])
      expect(res.map(r => r.status)).toEqual([200, 200, 200, 200, 200])
      expect((await db.from('products').select('qty').eq('id', pid).single()).data).toMatchObject({ qty: 4 })
      const { data: outs } = await db.from('stock_movements').select('staff_name').eq('product_id', pid).eq('type', 'out')
      expect((outs as any[]).map(o => o.staff_name).sort()).toEqual(['مشترك 1', 'مشترك 1', 'مشترك 1', 'مشترك 2', 'مشترك 2'])

      await db.from('stock_movements').delete().eq('product_id', pid)
      await db.from('staff_members').delete().in('id', [a.id, b.id])
      await db.from('branches').update({ is_active: false } as any).eq('id', (other as any).id)
    }, 120_000)
  })

  describe('recipe production estimate', () => {
    it('uses the recipe-specific ingredient, shows grams, and counts the Saudi day', async () => {
      const recon = await import('@/app/api/recipe-reconciliation/route')
      const mk = async (name: string, unit: string) => (await db.from('products').insert({ org_id: orgId, branch_id: branchA, name: `${name}_${stamp}`, unit, qty: 0, is_active: true } as any).select('id').single()).data as any
      const milk = await mk('حليب_وصفة', 'لتر'), cupA = await mk('كوب_لاتيه', 'قطعة'), beans = await mk('بن_وصفة', 'كيلو')
      const recipe = async (name: string, items: any[]) => {
        const { data: r } = await db.from('recipes').insert({ org_id: orgId, name: `${name}_${stamp}` } as any).select('id').single()
        await db.from('recipe_items').insert(items.map(i => ({ recipe_id: (r as any).id, ...i })) as any)
        return (r as any).id
      }
      const latte = await recipe('لاتيه', [{ component_product_id: milk.id, qty: 0.2 }, { component_product_id: cupA.id, qty: 1 }, { component_product_id: beans.id, qty: 0.018 }])
      const flat = await recipe('فلات', [{ component_product_id: milk.id, qty: 0.15 }])
      // الحليب مشترك بين الوصفتين: صرف 10 لتر ما يعني 50 لاتيه — الأكواب (12) هي المرجع
      const at = new Date(Date.now() - 3600_000).toISOString()
      await db.from('stock_movements').insert([
        { product_id: milk.id, type: 'in', qty_change: 20, recorded_at: at, org_id: orgId, branch_id: branchA },
        { product_id: cupA.id, type: 'in', qty_change: 50, recorded_at: at, org_id: orgId, branch_id: branchA },
        { product_id: beans.id, type: 'in', qty_change: 2, recorded_at: at, org_id: orgId, branch_id: branchA },
        { product_id: milk.id, type: 'out', qty_change: -10, recorded_at: at, org_id: orgId, branch_id: branchA },
        { product_id: cupA.id, type: 'out', qty_change: -12, recorded_at: at, org_id: orgId, branch_id: branchA },
        { product_id: beans.id, type: 'out', qty_change: -1, recorded_at: at, org_id: orgId, branch_id: branchA },
      ] as any).then(({ error }) => expect(error).toBeNull())
      const r = await call(recon.POST, 'POST', '/api/recipe-reconciliation', { org_id: orgId, branch_id: branchA })
      expect(r.status).toBe(200)
      const L = r.json.recipes.find((x: any) => x.id === latte), F = r.json.recipes.find((x: any) => x.id === flat)
      expect(L.basis).toBe('exclusive')
      expect(L.estimatedProduced).toBe(12)
      expect(L.components.find((c: any) => c.unit === 'لتر').shared).toBe(true)
      expect(F.basis).toBe('shared')

      // طريقة الجرد: جرد 50 كوب، وصل 50 + 20، هدر 2، جرد آخر 40 → استُهلك 78 كوب = 78 لاتيه (مهما كان الصرف المسجّل)
      const counts = await import('@/app/api/stock-counts/route')
      const t0 = new Date(Date.now() - 3 * 864e5).toISOString()
      await db.from('stock_counts').insert({ org_id: orgId, branch_id: branchA, product_id: cupA.id, counted_qty: 50, system_qty: 50, counted_at: t0 } as any)
      await db.from('stock_movements').insert([
        { product_id: cupA.id, org_id: orgId, branch_id: branchA, type: 'in', qty_change: 20, recorded_at: new Date(Date.now() - 2 * 864e5).toISOString() },
        { product_id: cupA.id, org_id: orgId, branch_id: branchA, type: 'waste', qty_change: -2, recorded_at: new Date(Date.now() - 864e5).toISOString() },
      ] as any)
      const { data: cupNow } = await db.from('products').select('qty').eq('id', cupA.id).single()
      const saved = await call(counts.POST, 'POST', '/api/stock-counts', { org_id: orgId, counts: [{ product_id: cupA.id, counted_qty: 40 }] })
      expect(saved.status).toBe(200)
      expect((await db.from('products').select('qty').eq('id', cupA.id).single()).data).toMatchObject({ qty: 40 })
      expect(saved.json.adjusted).toBe((cupNow as any).qty === 40 ? 0 : 1)
      expect((await call(counts.POST, 'POST', '/api/stock-counts', { org_id: orgId, counts: [{ product_id: cupA.id, counted_qty: 1.5 }] })).status).toBe(400)

      const from = new Date(Date.now() - 4 * 864e5 + 3 * 3600e3).toISOString().slice(0, 10)
      const rc = await call(recon.POST, 'POST', '/api/recipe-reconciliation', { org_id: orgId, branch_id: branchA, method: 'count', from })
      const LC = rc.json.recipes.find((x: any) => x.id === latte)
      expect(rc.json.method).toBe('count')
      expect(LC.estimatedProduced).toBe(78)
      expect(LC.bottleneckName).toContain('كوب_لاتيه')

      await db.from('recipes').delete().in('id', [latte, flat])
    }, 180_000)
  })

  describe('addon requests (approved from the admin panel)', () => {
    it('owner requests, admin approves on top of the current quantity, rejects with a reason; managers cannot request', async () => {
      const reqs = await import('@/app/api/addons-market/requests/route')
      const adminReqs = await import('@/app/api/admin/addon-requests/route')
      const admin = async (body: any) => {
        const res = await adminReqs.POST(new Request('http://test/api/admin/addon-requests', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-key': 'it-admin' }, body: JSON.stringify(body) }))
        return { status: res.status, json: await res.json() as any }
      }
      const { data: addon } = await db.from('marketplace_addons').select('id').eq('slug', 'extra_suppliers').single()
      const addonId = (addon as any).id
      const { data: org0 } = await db.from('organizations').select('max_suppliers').eq('id', orgId).single()
      const base = (org0 as any).max_suppliers || 0

      auth.current = { userId, orgId, role: 'manager', branchId: branchA }
      expect((await call(reqs.POST, 'POST', '/api/addons-market/requests', { org_id: orgId, addon_id: addonId, quantity: 1 })).status).toBe(403)
      auth.current = { userId, orgId, role: 'owner', branchId: null }

      // طلبين لنفس الإضافة = طلب معلّق واحد
      expect((await call(reqs.POST, 'POST', '/api/addons-market/requests', { org_id: orgId, addon_id: addonId, quantity: 1 })).status).toBe(200)
      expect((await call(reqs.POST, 'POST', '/api/addons-market/requests', { org_id: orgId, addon_id: addonId, quantity: 2 })).status).toBe(200)
      let mine = (await call(reqs.GET, 'GET', `/api/addons-market/requests?org_id=${orgId}`)).json.requests.filter((r: any) => r.status === 'pending')
      expect(mine).toHaveLength(1)
      expect(mine[0].quantity).toBe(2)

      const list = await adminReqs.GET(new Request('http://test/api/admin/addon-requests', { headers: { 'x-admin-key': 'it-admin' } }))
      expect(((await list.json()) as any).requests.some((r: any) => r.id === mine[0].id)).toBe(true)

      expect((await admin({ id: mine[0].id, action: 'approve' })).status).toBe(200)
      const sub = async () => (await db.from('org_addon_subscriptions').select('quantity,status').eq('org_id', orgId).eq('addon_id', addonId).single()).data as any
      expect(await sub()).toMatchObject({ quantity: 2, status: 'active' })
      expect((await admin({ id: mine[0].id, action: 'approve' })).status).toBe(409)

      // طلب ثاني يضيف فوق الموجود
      await call(reqs.POST, 'POST', '/api/addons-market/requests', { org_id: orgId, addon_id: addonId, quantity: 1 })
      mine = (await call(reqs.GET, 'GET', `/api/addons-market/requests?org_id=${orgId}`)).json.requests.filter((r: any) => r.status === 'pending')
      await admin({ id: mine[0].id, action: 'approve' })
      expect((await sub()).quantity).toBe(3)
      const { data: org1 } = await db.from('organizations').select('max_suppliers').eq('id', orgId).single()
      expect((org1 as any).max_suppliers).toBe(base + 3)

      // رفض بسبب + إشعار للعميل
      await call(reqs.POST, 'POST', '/api/addons-market/requests', { org_id: orgId, addon_id: addonId, quantity: 1 })
      mine = (await call(reqs.GET, 'GET', `/api/addons-market/requests?org_id=${orgId}`)).json.requests.filter((r: any) => r.status === 'pending')
      expect((await admin({ id: mine[0].id, action: 'reject', reason: 'اختبار' })).status).toBe(200)
      expect((await sub()).quantity).toBe(3)
      const { data: notes } = await db.from('notifications').select('message').eq('org_id', orgId).ilike('message', '%اختبار%')
      expect((notes || []).length).toBe(1)

      // إلغاء من العميل
      await call(reqs.POST, 'POST', '/api/addons-market/requests', { org_id: orgId, addon_id: addonId, quantity: 1 })
      mine = (await call(reqs.GET, 'GET', `/api/addons-market/requests?org_id=${orgId}`)).json.requests.filter((r: any) => r.status === 'pending')
      expect((await call(reqs.DELETE, 'DELETE', '/api/addons-market/requests', { org_id: orgId, id: mine[0].id })).status).toBe(200)

      await db.from('org_addon_subscriptions').delete().eq('org_id', orgId).eq('addon_id', addonId)
      await db.from('organizations').update({ max_suppliers: base } as any).eq('id', orgId)
    }), 180_000
  })

  describe('renewal reminders', () => {
    it('expired owners get a renewal reminder every two days, not daily', async () => {
      process.env.CRON_SECRET = process.env.CRON_SECRET || 'it-cron'
      const rem = await import('@/app/api/subscription-reminders/route')
      const run = async () => (await rem.POST(new Request('http://test/api/subscription-reminders', { method: 'POST', headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } }))).json()
      const s3 = Date.now()
      const { data: u } = await db.auth.admin.createUser({ email: `it-rem-${s3}@storely.test`, password: `It-${s3}-x!`, email_confirm: true })
      const { data: org } = await db.from('organizations').insert({ name: `__it_rem_${s3}`, whatsapp_number: '966500000009', plan: 'pro', max_branches: 1, currency: 'SAR' } as any).select('id').single()
      const oid = (org as any).id
      await db.from('profiles').upsert({ id: u.user!.id, full_name: 'منتهي', org_id: oid, role: 'owner', status: 'active', subscription_type: 'paid', subscription_ends_at: new Date(Date.now() - 3 * 864e5).toISOString() } as any)
      const at = async () => ((await db.from('profiles').select('renewal_reminder_at').eq('id', u.user!.id).single()).data as any).renewal_reminder_at
      try {
        await run(); const first = await at(); expect(first).toBeTruthy()
        await run(); expect(await at()).toBe(first) // نفس اليوم: ما يتكرر
        await db.from('profiles').update({ renewal_reminder_at: new Date(Date.now() - 2 * 864e5).toISOString() } as any).eq('id', u.user!.id)
        await run(); expect(new Date(await at()).getTime()).toBeGreaterThan(Date.now() - 60000) // بعد يومين: يرجع يرسل
        await db.from('profiles').update({ renewal_reminder_at: null, subscription_ends_at: new Date(Date.now() - 40 * 864e5).toISOString() } as any).eq('id', u.user!.id)
        await run(); expect(await at()).toBeNull() // بعد ٣٠ يوم: يوقف
      } finally {
        const { deleteOrgCompletely } = await import('@/lib/deleteOrg')
        await deleteOrgCompletely(oid, u.user!.id).catch(() => {})
      }
    })
  })
})
