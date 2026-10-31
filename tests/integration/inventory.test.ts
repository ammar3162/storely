/**
 * اختبارات تكامل على قاعدة staging — inventory. تستدعي API routes الحقيقية وتتحقق من النتيجة بقاعدة البيانات.
 * كل ملف ينشئ منشأة تجريبية مؤقتة خاصة فيه (مالك + فرع) ويحذفها بالنهاية، فالملفات تشتغل بالتوازي بدون تداخل.
 * المتغيرات والـ mocks مشتركة: harness.ts و setup.ts.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { URL_, KEY, enabled, uniqPhone, newStamp, auth, ocrFixture, call } from './harness'

describe.skipIf(!enabled)('integration (staging) — inventory', async () => {
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

  describe('VAT invoice attachment must be a Storely upload', () => {
    it('rejects an external link as the invoice image', async () => {
      const r = await call(purchases.POST, 'POST', '/api/purchases', {
        org_id: orgId, branch_id: branchA, category: 'مخزون', name: 'رابط خارجي', qty: 1, unit: 'حبة',
        total_amount: 23, supplier: 'مورد', invoice_date: today, has_vat: true, payment_status: 'paid', invoice_image: 'https://evil.example/fake.jpg',
      })
      expect(r.status).toBe(400)
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

  describe('invoice agent (reads the invoice, records clear items, asks about the rest)', () => {
    it('matches clear items, asks about unclear ones, learns the answer, and saves once on confirm', async () => {
      const agent = await import('@/app/api/invoice-agent/route')
      const confirm = await import('@/app/api/invoice-agent/confirm/route')
      const mk = async (name: string, unit: string) => (await db.from('products').insert({ org_id: orgId, branch_id: branchA, name: `${name} ${stamp}`, unit, qty: 0, is_active: true } as any).select('id,name').single()).data as any
      const sugar = await mk('سكر ناعم', 'كيلو'), cup12 = await mk('كوب ورقي 12', 'كرتون'), cup8 = await mk('كوب ورقي 8', 'كرتون')
      const image = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/invoices/${orgId}/agent-${stamp}.jpg`
      ocrFixture.current = { ok: true, data: { supplier: 'مورد الوكيل', invoice_date: new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 10), has_vat: false, total_amount: 230,
        invoice_number: null, supplier_vat_number: null, items: [
          { name: `سكر ناعم ${stamp}`, qty: 5, unit: 'كيلو', total: 50 },     // واضح
          { name: `كوب ورقي ${stamp}`, qty: 2, unit: 'كرتون', total: 80 },     // 12 ولا 8؟
          { name: 'زعفران فاخر', qty: 1, unit: 'علبة', total: 100 },          // مو موجود → صنف مخزون جديد
          { name: 'منظف أرضيات', qty: null, unit: null, total: 25 },          // مو مخزون → مشتريات
        ] } }
      const created = await call(agent.POST, 'POST', '/api/invoice-agent', { org_id: orgId, branch_id: branchA, image: 'x', mediaType: 'image/jpeg', invoice_image: image })
      expect(created.status).toBe(200)
      let d = created.json.draft
      expect(d.status).toBe('needs_review')
      expect(d.items.map((i: any) => i.status)).toEqual(['matched', 'ask', 'ask', 'ask'])
      expect(d.items[0].product_id).toBe(sugar.id)

      // حفظ قبل الإجابات مرفوض
      expect((await call(confirm.POST, 'POST', '/api/invoice-agent/confirm', { org_id: orgId, id: d.id })).status).toBe(400)
      // صنف من منشأة ثانية مرفوض
      expect((await call(agent.PATCH, 'PATCH', '/api/invoice-agent', { org_id: orgId, id: d.id, index: 1, action: 'match', product_id: '00000000-0000-0000-0000-000000000000' })).status).toBe(404)

      d = (await call(agent.PATCH, 'PATCH', '/api/invoice-agent', { org_id: orgId, id: d.id, index: 1, action: 'match', product_id: cup12.id })).json.draft
      d = (await call(agent.PATCH, 'PATCH', '/api/invoice-agent', { org_id: orgId, id: d.id, index: 2, action: 'new' })).json.draft
      d = (await call(agent.PATCH, 'PATCH', '/api/invoice-agent', { org_id: orgId, id: d.id, index: 3, action: 'expense' })).json.draft
      expect(d.status).toBe('ready')

      // ضغطتين حفظ بنفس اللحظة = تنحفظ مرة وحدة
      const [a1, a2] = await Promise.all([
        call(confirm.POST, 'POST', '/api/invoice-agent/confirm', { org_id: orgId, id: d.id }),
        call(confirm.POST, 'POST', '/api/invoice-agent/confirm', { org_id: orgId, id: d.id }),
      ])
      expect([a1.status, a2.status].sort()).toEqual([200, 409])
      const { data: rows } = await db.from('purchases').select('name,category').eq('org_id', orgId).eq('supplier', 'مورد الوكيل')
      expect((rows as any[]).length).toBe(4)
      // المخزون فئة «مخزون»، والمنظف «مشتريات» وما انضاف للمخزون
      expect((rows as any[]).filter(r => r.category === 'مخزون').length).toBe(3)
      expect((rows as any[]).find(r => r.name === 'منظف أرضيات')?.category).toBe('مشتريات')
      expect((await db.from('products').select('id').eq('org_id', orgId).eq('name', 'منظف أرضيات')).data).toEqual([])
      const qty = async (id: string) => ((await db.from('products').select('qty').eq('id', id).single()).data as any).qty
      expect([await qty(sugar.id), await qty(cup12.id), await qty(cup8.id)]).toEqual([5, 2, 0])
      const { data: saffron } = await db.from('products').select('qty').eq('org_id', orgId).eq('name', 'زعفران فاخر').maybeSingle()
      expect((saffron as any)?.qty).toBe(1)

      // تعلّم: نفس الاسم بالفاتورة الجاية ينربط على طول بدون سؤال
      ocrFixture.current = { ok: true, data: { supplier: 'مورد الوكيل', has_vat: false, total_amount: 40, items: [{ name: `كوب ورقي ${stamp}`, qty: 1, unit: 'كرتون', total: 40 }] } }
      const again = (await call(agent.POST, 'POST', '/api/invoice-agent', { org_id: orgId, branch_id: branchA, image: 'x', mediaType: 'image/jpeg', invoice_image: image })).json.draft
      expect(again.items[0]).toMatchObject({ status: 'matched', product_id: cup12.id, learned: true })
      expect((await call(agent.DELETE, 'DELETE', '/api/invoice-agent', { org_id: orgId, id: again.id })).status).toBe(200)

      await db.from('purchases').delete().eq('org_id', orgId).eq('supplier', 'مورد الوكيل')
      await db.from('invoice_drafts').delete().eq('org_id', orgId)
      await db.from('product_aliases').delete().eq('org_id', orgId)
    }, 180_000)
  })

  describe('products shared between staff', () => {
    it('two staff can have the same product, and products from another branch are refused', async () => {
      const assign = await import('@/app/api/staff-members/assign/route')
      const mkStaff = async (n: number) => {
        const r = await db.from('staff_members').insert({
          org_id: orgId, branch_id: branchA, name: `مشترك ${n}`, phone: uniqPhone(), pin: 'x', is_active: true, role: 'staff',
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
})
