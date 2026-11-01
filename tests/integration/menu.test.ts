/**
 * اختبارات تكامل على قاعدة staging — الباقات الجديدة والإيميلات التسويقية. تستدعي API routes الحقيقية وتتحقق من النتيجة بقاعدة البيانات.
 * كل ملف ينشئ منشأة تجريبية مؤقتة خاصة فيه (مالك + فرع) ويحذفها بالنهاية، فالملفات تشتغل بالتوازي بدون تداخل.
 * المتغيرات والـ mocks مشتركة: harness.ts و setup.ts.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { URL_, KEY, enabled, uniqPhone, newStamp, auth, ocrFixture, call } from './harness'

describe.skipIf(!enabled)('integration (staging) — menu', async () => {
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

  describe('new plans: org-wide limits and requested branches', () => {
    it('basic shares 3 staff across branches, the owner requests a 2nd branch (admin approves, no more than 2), upgrading drops the covered branch charge, staff management reprices at renewal', async () => {
      const extra = await import('@/app/api/branches/extra/route')
      const adminReqs = await import('@/app/api/admin/addon-requests/route')
      const activateUser = await import('@/app/api/admin/activate-user/route')
      const { checkStaffCapacity } = await import('@/lib/staffCapacity')
      const { checkSupplierCapacity } = await import('@/lib/supplierCapacity')
      const { changeOrgPlan } = await import('@/lib/changePlan')
      const admin = async (route: any, path: string, body: any) => {
        const res = await route.POST(new Request(`http://test${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-key': 'it-admin' }, body: JSON.stringify(body) }))
        return { status: res.status, json: await res.json() as any }
      }
      await db.from('branches').update({ is_active: false, plan_locked_at: null } as any).eq('org_id', orgId).neq('id', branchA)
      await db.from('organizations').update({ plan: 'basic', max_branches: 1, max_staff: 3, max_suppliers: 5, billing_cycle: 'monthly' } as any).eq('id', orgId)
      await db.from('profiles').update({ subscription_ends_at: new Date(Date.now() + 10 * 864e5).toISOString() } as any).eq('id', userId)
      const staff = (n: number, branch: string) => db.from('staff_members').insert({ org_id: orgId, branch_id: branch, name: `خطة ${n}`, phone: uniqPhone(), pin: 'x', is_active: true, role: 'staff' } as any)

      // ٣ موظفين للمنشأة كلها (مو لكل فرع)
      for (let i = 0; i < 3; i++) await staff(i, branchA)
      expect((await checkStaffCapacity(db as any, orgId, branchA)).ok).toBe(false)

      // المدير ما يقدر يطلب فرع
      auth.current = { userId, orgId, role: 'manager', branchId: branchA }
      expect((await call(extra.POST, 'POST', '/api/branches/extra', { org_id: orgId })).status).toBe(403)
      auth.current = { userId, orgId, role: 'owner', branchId: null }

      const offer = (await call(extra.GET, 'GET', `/api/branches/extra?org_id=${orgId}`)).json.offer
      expect(offer).toMatchObject({ plan: 'basic', total: 1, maxTotal: 2, pending: 0, canAdd: true, price: 79, staff: 3, suppliers: 5, nextPlan: 'pro' })
      const asked = await call(extra.POST, 'POST', '/api/branches/extra', { org_id: orgId })
      expect(asked.status).toBe(200)
      // الطلب ينتظر الأدمن — الفرع ما ينفتح قبل الموافقة، وطلب ثاني يتجاوز حد الأساسية
      expect((await checkStaffCapacity(db as any, orgId, branchA)).ok).toBe(false)
      const again = await call(extra.POST, 'POST', '/api/branches/extra', { org_id: orgId })
      expect(again.status).toBe(403)
      expect(again.json.code).toBe('plan_max')

      const { data: req } = await db.from('addon_requests').select('id,status').eq('org_id', orgId).eq('status', 'pending').single()
      expect((await admin(adminReqs, '/api/admin/addon-requests', { id: (req as any).id, action: 'approve' })).status).toBe(200)
      // بعد الموافقة: الفرع الثاني جاب معه ٣ موظفين و٥ موردين، وسعره 79 مثبّت
      expect((await call(extra.GET, 'GET', `/api/branches/extra?org_id=${orgId}`)).json.offer).toMatchObject({ total: 2, pending: 0, canAdd: false })
      expect((await checkStaffCapacity(db as any, orgId, branchA)).ok).toBe(true)
      expect((await checkSupplierCapacity(db as any, orgId)).ok).toBe(true)
      const { data: sub } = await db.from('org_addon_subscriptions').select('quantity,locked_price,status,marketplace_addons!inner(slug)').eq('org_id', orgId).eq('marketplace_addons.slug', 'extra_branch').single()
      expect(sub).toMatchObject({ quantity: 1, status: 'active' })
      expect(Number((sub as any).locked_price)).toBe(79)

      // إلغاء الفرع الإضافي: الموظفين الزايدين عن الحد (حتى اللي ما انربطوا بإضافة) يتوقفون مؤقتاً — الأحدث أول — ويرجعون لو رجع الحد
      const adminSubs = await import('@/app/api/admin/addon-subscriptions/route')
      const { data: brAddon } = await db.from('marketplace_addons').select('id').eq('slug', 'extra_branch').single()
      for (let i = 3; i < 5; i++) await staff(i, branchA)   // ٥ نشطين = حد الأساسية مع الفرع (٦) ما تعداه
      const del = await adminSubs.DELETE(new Request('http://test/api/admin/addon-subscriptions', { method: 'DELETE', headers: { 'Content-Type': 'application/json', 'x-admin-key': 'it-admin' }, body: JSON.stringify({ org_id: orgId, addon_id: (brAddon as any).id }) }))
      expect(del.status).toBe(200)
      const actives = async () => ((await db.from('staff_members').select('name').eq('org_id', orgId).eq('is_active', true).like('name', 'خطة %')).data || []).map((x: any) => x.name).sort()
      expect(await actives()).toEqual(['خطة 0', 'خطة 1', 'خطة 2'])
      const { activateAddon } = await import('@/lib/addonActivation')
      expect((await activateAddon(db as any, { orgId, addonId: (brAddon as any).id, quantity: 1 })).ok).toBe(true)
      expect(await actives()).toEqual(['خطة 0', 'خطة 1', 'خطة 2', 'خطة 3', 'خطة 4'])

      // إدارة الموظفين: يكمل على 39 لين التجديد، ومن التجديد على السعر الجديد
      const { data: hr } = await db.from('marketplace_addons').select('id').eq('slug', 'hr_full').single()
      await db.from('org_addon_subscriptions').upsert({ org_id: orgId, addon_id: (hr as any).id, status: 'active', quantity: 1, locked_price: 39,
        activated_at: new Date().toISOString(), expires_at: new Date(Date.now() + 864e5).toISOString() } as any, { onConflict: 'org_id,addon_id' })
      expect((await admin(activateUser, '/api/admin/activate-user', { userId, type: 'paid', ends: new Date(Date.now() + 30 * 864e5).toISOString() })).status).toBe(200)
      const { data: hrSub } = await db.from('org_addon_subscriptions').select('locked_price').eq('org_id', orgId).eq('addon_id', (hr as any).id).single()
      expect((hrSub as any).locked_price).toBeNull()
      // الفرع الإضافي يبقى على سعره المثبّت بعد التجديد
      const { data: br2 } = await db.from('org_addon_subscriptions').select('locked_price,marketplace_addons!inner(slug)').eq('org_id', orgId).eq('marketplace_addons.slug', 'extra_branch').single()
      expect(Number((br2 as any).locked_price)).toBe(79)

      // ترقية للشاملة (٣ فروع): الفرع المشترى صار داخل الباقة وما ينحسب
      await changeOrgPlan(db as any, orgId, { planName: 'pro', maxBranches: 3, maxStaff: 15, maxSuppliers: 20 })
      const { data: after } = await db.from('org_addon_subscriptions').select('status,marketplace_addons!inner(slug)').eq('org_id', orgId).eq('marketplace_addons.slug', 'extra_branch').single()
      expect((after as any).status).toBe('cancelled')
      expect((await call(extra.GET, 'GET', `/api/branches/extra?org_id=${orgId}`)).json.offer).toMatchObject({ plan: 'pro', total: 3, maxTotal: 5, price: 79 })

      await db.from('addon_requests').delete().eq('org_id', orgId)
      await db.from('org_addon_subscriptions').delete().eq('org_id', orgId)
      await db.from('staff_members').delete().eq('org_id', orgId).like('name', 'خطة %')
      await db.from('organizations').update({ plan: 'pro', max_branches: 1, max_staff: 1 } as any).eq('id', orgId)
    }, 180_000)
  })

  describe('free trial on the chosen plan', () => {
    it('a basic trial opens every feature but keeps the basic limits; after the trial the features follow the plan again', async () => {
      const { orgFeatures } = await import('@/lib/planFeatures')
      const { checkStaffCapacity } = await import('@/lib/staffCapacity')
      await db.from('branches').update({ is_active: false, plan_locked_at: null } as any).eq('org_id', orgId).neq('id', branchA)
      await db.from('organizations').update({ plan: 'basic', max_branches: 1, max_staff: 3, max_suppliers: 5 } as any).eq('id', orgId)
      await db.from('profiles').update({ subscription_type: 'trial', subscription_ends_at: new Date(Date.now() + 5 * 864e5).toISOString() } as any).eq('id', userId)
      expect(await orgFeatures(db as any, orgId)).toEqual({ cashier: true, hr: true, ai: true, profitability: true })
      for (let i = 0; i < 3; i++) await db.from('staff_members').insert({ org_id: orgId, branch_id: branchA, name: `تجربة ${i}`, phone: uniqPhone(), pin: 'x', is_active: true, role: 'staff' } as any)
      expect((await checkStaffCapacity(db as any, orgId, branchA)).ok).toBe(false)   // العدد حسب الأساسية
      await db.from('profiles').update({ subscription_type: 'paid' } as any).eq('id', userId)
      expect(await orgFeatures(db as any, orgId)).toEqual({ cashier: false, hr: false, ai: false, profitability: false })
      await db.from('staff_members').delete().eq('org_id', orgId).like('name', 'تجربة %')
      await db.from('organizations').update({ plan: 'pro', max_branches: 1, max_staff: 1 } as any).eq('id', orgId)
    }, 120_000)
  })

  describe('AI assistant data follows the add-ons', () => {
    it('subscription always; staff data only with staff management; a manager without permission gets nothing extra', async () => {
      const { buildAssistantContext } = await import('@/lib/assistantContext')
      await db.from('profiles').update({ subscription_type: 'paid', subscription_ends_at: new Date(Date.now() + 9 * 864e5).toISOString() } as any).eq('id', userId)
      await db.from('organizations').update({ plan: 'basic', max_branches: 1, max_staff: 3, max_suppliers: 5 } as any).eq('id', orgId)
      await db.from('staff_members').insert({ org_id: orgId, branch_id: branchA, name: 'مساعد سر', phone: uniqPhone(), pin: 'x', is_active: true, role: 'staff', monthly_salary: 4321 } as any)
      const on = (c: any) => c.sections.filter((x: any) => x.on).map((x: any) => x.key)

      let c = await buildAssistantContext(db as any, orgId, null, { role: 'owner' })
      expect(on(c)).toEqual(['subscription'])
      expect(c.prompt).toContain('الأساسية')
      expect(c.prompt).toContain('باقي 9 يوم')
      expect(c.prompt).not.toContain('مساعد سر')          // بيانات الموظفين مقفلة
      expect(c.prompt).toContain('يحتاج إضافة «إدارة الموظفين»')

      const { data: hr } = await db.from('marketplace_addons').select('id').eq('slug', 'hr_full').single()
      await db.from('org_addon_subscriptions').upsert({ org_id: orgId, addon_id: (hr as any).id, status: 'active', quantity: 1, activated_at: new Date().toISOString(), expires_at: new Date(Date.now() + 864e5).toISOString() } as any, { onConflict: 'org_id,addon_id' })
      c = await buildAssistantContext(db as any, orgId, null, { role: 'owner' })
      expect(on(c)).toEqual(['subscription', 'hr'])
      expect(c.prompt).toContain('مساعد سر')
      expect(c.prompt).toContain('4321')

      // مدير فرع بدون صلاحية الموظفين: لا اشتراك ولا موظفين
      c = await buildAssistantContext(db as any, orgId, branchA, { role: 'manager', permissions: { inventory: true } })
      expect(on(c)).toEqual([])
      expect(c.prompt).not.toContain('مساعد سر')
      // مدير عنده الحضور بس: الموظفين بدون الرواتب
      c = await buildAssistantContext(db as any, orgId, branchA, { role: 'manager', permissions: { attendance: true } })
      expect(c.prompt).toContain('مساعد سر')
      expect(c.prompt).not.toContain('4321')

      await db.from('org_addon_subscriptions').delete().eq('org_id', orgId).eq('addon_id', (hr as any).id)
      await db.from('staff_members').delete().eq('org_id', orgId).eq('name', 'مساعد سر')
      await db.from('organizations').update({ plan: 'pro', max_branches: 1, max_staff: 1 } as any).eq('id', orgId)
    }, 120_000)
  })

  describe('morning report', () => {
    it('builds the branch sections from real data and respects the add-ons', async () => {
      const { buildBranchReports, branchBlock, fullView } = await import('@/lib/morningReport')
      const now = Date.now(), yesterday = new Date(now + 3 * 3600e3 - 864e5).toISOString().slice(0, 10)
      const { data: shift } = await db.from('shifts').insert({ org_id: orgId, branch_id: branchA, name: 'تقرير', start_time: '00:00', end_time: '23:59' } as any).select('id').single()
      await db.from('staff_members').insert({ org_id: orgId, branch_id: branchA, name: 'غائب التقرير', phone: uniqPhone(), pin: 'x', is_active: true, role: 'staff', shift_id: (shift as any).id } as any)
      await db.from('products').insert({ org_id: orgId, branch_id: branchA, name: 'صنف التقرير', unit: 'حبة', reorder_point: 5, is_active: true } as any)
      await db.from('cashier_closings').insert({ org_id: orgId, branch_id: branchA, staff_name: 'كاشير', closing_date: yesterday, total_sales: 1000, cash_amount: 400, network_amount: 600, difference: -20 } as any).then(r => { if (r.error) throw r.error })

      const all = { ai: true, cashier: true, hr: true, profitability: true }
      const [rep] = await buildBranchReports(db as any, orgId, [{ id: branchA, name: 'الفرع الرئيسي' }], all, now)
      expect(rep.sales).toContain('1,000 ريال')
      expect(rep.sales).toContain('عجز 20 ريال')
      expect(rep.staff).toContain('غائب التقرير')
      expect(rep.stock).toContain('صنف التقرير')
      const basic = await buildBranchReports(db as any, orgId, [{ id: branchA, name: 'الفرع الرئيسي' }], { ai: false, cashier: false, hr: false, profitability: false }, now)
      expect(basic[0].sales).toBeNull()
      expect(basic[0].staff).toBeNull()
      expect(branchBlock(basic[0], fullView({ ai: false, cashier: false, hr: false, profitability: false }))).toContain('صنف التقرير')

      await db.from('cashier_closings').delete().eq('org_id', orgId).eq('closing_date', yesterday).eq('staff_name', 'كاشير')
      await db.from('staff_members').delete().eq('org_id', orgId).eq('name', 'غائب التقرير')
      await db.from('shifts').delete().eq('id', (shift as any).id)
      await db.from('products').delete().eq('org_id', orgId).eq('name', 'صنف التقرير')
    }, 120_000)
  })

  describe('per-customer discount (admin)', () => {
    it('admin sets a discount, it shows as a bill line for the owner and in the admin bill; removing it restores the bill', async () => {
      const disc = await import('@/app/api/admin/org-discount/route')
      const { monthlyBill } = await import('@/lib/orgBill')
      const me = await import('@/app/api/me/route')
      const post = async (body: any) => {
        const res = await disc.POST(new Request('http://test/api/admin/org-discount', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-key': 'it-admin' }, body: JSON.stringify(body) }))
        return { status: res.status, json: await res.json() as any }
      }
      await db.from('organizations').update({ plan: 'pro', max_branches: 3, locked_plan_monthly: null, billing_cycle: 'monthly' } as any).eq('id', orgId)
      const before = await monthlyBill(db as any, orgId)
      expect((await post({ orgId, type: 'percent', value: 150 })).status).toBe(400)
      expect((await post({ orgId, type: 'percent', value: 20, note: 'عميل مميز', until: '2099-12-31' })).status).toBe(200)
      expect(await monthlyBill(db as any, orgId)).toBe(Math.round(before * 0.8))
      const mj = await (await me.GET()).json() as any
      expect(mj.org).toMatchObject({ discount_type: 'percent', discount_note: 'عميل مميز' })
      expect(Number(mj.org.discount_value)).toBe(20)
      // منتهي = ما ينحسب
      await db.from('organizations').update({ discount_until: '2020-01-01' } as any).eq('id', orgId)
      expect(await monthlyBill(db as any, orgId)).toBe(before)
      expect((await post({ orgId, type: null })).status).toBe(200)
      expect((await db.from('organizations').select('discount_type,discount_value').eq('id', orgId).single()).data).toMatchObject({ discount_type: null, discount_value: null })
      await db.from('organizations').update({ max_branches: 1 } as any).eq('id', orgId)
    }, 120_000)
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
})
