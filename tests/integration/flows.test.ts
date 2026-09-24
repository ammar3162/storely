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
const STAGING_REF = 'ruouijoyrvkwlebxnbrx'
const enabled = !!URL_ && !!KEY && !KEY.includes('الصق') && URL_.includes(STAGING_REF)
if (enabled) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = URL_
  process.env.SUPABASE_SERVICE_ROLE_KEY = KEY
}

// كل استدعاء يروح لقاعدة staging (سيدني) — المهلة الافتراضية 5 ثواني ما تكفي للاختبارات متعددة الخطوات
vi.setConfig({ testTimeout: 60_000 })

// ─── هوية المستخدم الحالي (بدل جلسة الدخول) ───
type Access = { userId: string; orgId: string; role: string; branchId: string | null }
const auth: { current: Access | null } = { current: null }

vi.mock('next/headers', () => ({ headers: async () => new Headers(), cookies: async () => ({ getAll: () => [], set: () => {} }) }))
vi.mock('@/lib/verifyOrgAccess', async (importOriginal) => {
  const real: any = await importOriginal()
  return {
    ...real,
    getCurrentProfile: async () => auth.current
      ? { userId: auth.current.userId, email: null, status: 'active', orgId: auth.current.orgId, role: auth.current.role, branchId: auth.current.branchId }
      : null,
    verifyOrgAccess: async (orgId: string) => auth.current && auth.current.orgId === orgId
      ? { authorized: true, userId: auth.current.userId, orgId, role: auth.current.role, branchId: auth.current.branchId }
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
        total_amount: 115, supplier: 'مورد تجريبي', invoice_date: today, has_vat: true, payment_status: 'paid',
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
})
