/**
 * اختبارات تكامل على قاعدة staging — plans. تستدعي API routes الحقيقية وتتحقق من النتيجة بقاعدة البيانات.
 * كل ملف ينشئ منشأة تجريبية مؤقتة خاصة فيه (مالك + فرع) ويحذفها بالنهاية، فالملفات تشتغل بالتوازي بدون تداخل.
 * المتغيرات والـ mocks مشتركة: harness.ts و setup.ts.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { URL_, KEY, enabled, uniqPhone, newStamp, auth, ocrFixture, call } from './harness'

describe.skipIf(!enabled)('integration (staging) — plans', async () => {
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

  describe('upgrade requests (basic → standard, approved by admin)', () => {
    it('owner asks, admin approves: plan becomes standard with its limits, included add-ons are cancelled, extra staff kept', async () => {
      const reqs = await import('@/app/api/plan-requests/route')
      const adminReqs = await import('@/app/api/admin/plan-requests/route')
      const listUsers = await import('@/app/api/admin/list-users/route')
      const admin = async (body: any) => {
        const res = await adminReqs.POST(new Request('http://test/api/admin/plan-requests', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-key': 'it-admin' }, body: JSON.stringify(body) }))
        return { status: res.status, json: await res.json() as any }
      }
      await db.from('organizations').update({ plan: 'basic', max_branches: 1 } as any).eq('id', orgId)
      const slugs = ['cashier_closing', 'hr_full', 'extra_staff']
      const { data: ads } = await db.from('marketplace_addons').select('id,slug').in('slug', slugs)
      const idOf = (sl: string) => (ads as any[]).find(a => a.slug === sl).id
      const end = new Date(Date.now() + 10 * 864e5).toISOString()
      for (const sl of slugs) await db.from('org_addon_subscriptions').upsert({ org_id: orgId, addon_id: idOf(sl), status: 'active', quantity: sl === 'extra_staff' ? 2 : 1,
        activated_at: new Date().toISOString(), expires_at: end } as any, { onConflict: 'org_id,addon_id' })

      // الأدمن يشوفه مرشّح للترقية (99 + 29 + 39 + 2×10 = 187)
      const lu = await (await listUsers.GET(new Request('http://test/api/admin/list-users', { headers: { 'x-admin-key': 'it-admin' } }))).json() as any
      expect((lu.users || []).find((u: any) => u.org_id === orgId)?.monthly_bill).toBeGreaterThanOrEqual(150)

      auth.current = { userId, orgId, role: 'manager', branchId: branchA }
      expect((await call(reqs.POST, 'POST', '/api/plan-requests', { org_id: orgId, target_plan: 'pro' })).status).toBe(403)
      auth.current = { userId, orgId, role: 'owner', branchId: null }
      expect((await call(reqs.POST, 'POST', '/api/plan-requests', { org_id: orgId, target_plan: 'pro' })).status).toBe(200)
      expect((await call(reqs.POST, 'POST', '/api/plan-requests', { org_id: orgId, target_plan: 'pro' })).status).toBe(409)
      const mine = (await call(reqs.GET, 'GET', `/api/plan-requests?org_id=${orgId}`)).json.requests[0]
      expect(mine.status).toBe('pending')

      expect((await admin({ id: mine.id, action: 'approve' })).status).toBe(200)
      expect((await admin({ id: mine.id, action: 'approve' })).status).toBe(409)
      const { data: org } = await db.from('organizations').select('plan,max_branches').eq('id', orgId).single()
      expect(org).toMatchObject({ plan: 'pro', max_branches: 3 })
      const { data: subs } = await db.from('org_addon_subscriptions').select('addon_id,status').eq('org_id', orgId).in('addon_id', slugs.map(idOf))
      const st = (sl: string) => (subs as any[]).find(x => x.addon_id === idOf(sl))?.status
      expect([st('cashier_closing'), st('hr_full'), st('extra_staff')]).toEqual(['cancelled', 'cancelled', 'active'])
      const { data: n } = await db.from('notifications').select('title').eq('org_id', orgId).ilike('title', '%تمت ترقيتك%')
      expect((n || []).length).toBe(1)

      // من المتوسطة ما يقدر يطلب المتوسطة مرة ثانية
      expect((await call(reqs.POST, 'POST', '/api/plan-requests', { org_id: orgId, target_plan: 'pro' })).status).toBe(400)

      await db.from('org_addon_subscriptions').delete().eq('org_id', orgId).in('addon_id', slugs.map(idOf))
      await db.from('plan_requests').delete().eq('org_id', orgId)
      await db.from('branches').update({ is_active: false, plan_locked_at: null } as any).eq('org_id', orgId).neq('id', branchA)
      await db.from('organizations').update({ plan: 'pro', max_branches: 1, max_staff: 1 } as any).eq('id', orgId)
    }, 180_000)
  })

  describe('price lock for subscribers before the price change', () => {
    it('an active add-on keeps its locked price on renewal, a lapsed one comes back at the new price; changing plan drops the plan lock', async () => {
      const { activateAddon } = await import('@/lib/addonActivation')
      const updatePlan = await import('@/app/api/admin/update-plan/route')
      const { data: ad } = await db.from('marketplace_addons').select('id,monthly_price').eq('slug', 'ai_tools').single()
      const addonId = (ad as any).id, newPrice = Number((ad as any).monthly_price)
      const end = new Date(Date.now() + 10 * 864e5).toISOString()
      await db.from('profiles').update({ subscription_ends_at: end } as any).eq('id', userId)
      await db.from('org_addon_subscriptions').upsert({ org_id: orgId, addon_id: addonId, status: 'active', quantity: 1, locked_price: 20,
        activated_at: new Date().toISOString(), expires_at: end } as any, { onConflict: 'org_id,addon_id' })
      const sub = async () => (await db.from('org_addon_subscriptions').select('locked_price').eq('org_id', orgId).eq('addon_id', addonId).single()).data as any

      expect((await activateAddon(db as any, { orgId, addonId })).ok).toBe(true)
      expect(Number((await sub()).locked_price)).toBe(20)

      // لوحة الأدمن تشوف الإضافة مفعّلة وبسعرها المثبّت (كان الاستعلام يفشل ويعرضها غير مفعّلة)
      await db.from('organizations').update({ plan: 'basic' } as any).eq('id', orgId)   // الأساسية تعرض كل الإضافات
      const adminSubs = await import('@/app/api/admin/addon-subscriptions/route')
      const ar = await adminSubs.GET(new Request(`http://test/api/admin/addon-subscriptions?org_id=${orgId}`, { headers: { 'x-admin-key': 'it-admin' } }))
      const aj = await ar.json() as any
      const row = (aj.addons || []).find((x: any) => x.id === addonId)
      expect(row?.subscription?.isValid).toBe(true)
      expect(Number(row?.subscription?.locked_price)).toBe(20)
      // وصفحة العميل نفس الشي
      const market = await import('@/app/api/addons-market/route')
      const mj = (await call(market.GET, 'GET', `/api/addons-market?org_id=${orgId}`)).json
      expect(Number((mj.addons || []).find((x: any) => x.id === addonId)?.subscription?.locked_price)).toBe(20)

      await db.from('org_addon_subscriptions').update({ expires_at: new Date(Date.now() - 1000).toISOString() } as any).eq('org_id', orgId).eq('addon_id', addonId)
      const back = await activateAddon(db as any, { orgId, addonId })
      expect(back.ok && back.proratedAmount).toBe(Math.round(newPrice * 10 / 30))
      expect((await sub()).locked_price).toBeNull()

      await db.from('organizations').update({ plan: 'advanced', locked_plan_monthly: 399 } as any).eq('id', orgId)
      const call2 = (body: any) => updatePlan.POST(new Request('http://test/api/admin/update-plan', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-key': 'it-admin' }, body: JSON.stringify(body) }))
      await call2({ orgId, planName: 'advanced', maxBranches: 10, maxStaff: 999, maxSuppliers: 999 })
      expect((await db.from('organizations').select('locked_plan_monthly').eq('id', orgId).single()).data).toMatchObject({ locked_plan_monthly: 399 })
      await call2({ orgId, planName: 'pro', maxBranches: 3, maxStaff: 10, maxSuppliers: 10 })
      expect((await db.from('organizations').select('locked_plan_monthly').eq('id', orgId).single()).data).toMatchObject({ locked_plan_monthly: null })

      await db.from('org_addon_subscriptions').delete().eq('org_id', orgId).eq('addon_id', addonId)
      await db.from('branches').update({ is_active: false, plan_locked_at: null } as any).eq('org_id', orgId).neq('id', branchA)
      await db.from('organizations').update({ plan: 'pro', max_branches: 1, max_staff: 1 } as any).eq('id', orgId)
    }, 120_000)
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
      for (let i = 0; i < 3; i++) await db.from('staff_members').insert({ org_id: orgId, branch_id: branchA, name: `سعة ${i}`, phone: uniqPhone(), pin: 'x', is_active: true, role: 'staff' } as any)
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
      const { data: cb } = await db.from('branches').insert({ org_id: orgId, name: 'فرع كاشير', is_active: true } as any).select('id').single()
      const body = (n: number) => ({ org_id: orgId, branch_id: (cb as any).id, name: `كاشير ${n}`, phone: uniqPhone(), pin: '4821', role: 'cashier', permissions: { dispense: true } })

      expect((await call(addStaff.POST, 'POST', '/api/add-staff', body(1))).status).toBe(403)
      expect((await orgFeatures(db as any, orgId)).cashier).toBe(false)

      const { data: addon } = await db.from('marketplace_addons').select('id').eq('slug', 'cashier_closing').single()
      await db.from('org_addon_subscriptions').upsert({ org_id: orgId, addon_id: (addon as any).id, status: 'active', quantity: 1,
        activated_at: new Date().toISOString(), expires_at: new Date(Date.now() + 864e5).toISOString() } as any, { onConflict: 'org_id,addon_id' })
      expect((await orgFeatures(db as any, orgId)).cashier).toBe(true)
      const added = await call(addStaff.POST, 'POST', '/api/add-staff', body(2))
      expect(added.status).toBe(200)

      const { data: cashier } = await db.from('staff_members').select('id').eq('org_id', orgId).eq('name', 'كاشير 2').single()
      const res = await staffOrg.GET(new Request('http://test/api/staff-org', { headers: { Authorization: `Bearer ${generateStaffToken((cashier as any).id, orgId, (cb as any).id)}` } }))
      expect(((await res.json()) as any).cashier_feature).toBe(true)

      // الإضافة انتهت → يرجع مقفل
      await db.from('org_addon_subscriptions').update({ expires_at: new Date(Date.now() - 1000).toISOString() } as any).eq('org_id', orgId).eq('addon_id', (addon as any).id)
      expect((await orgFeatures(db as any, orgId)).cashier).toBe(false)

      await db.from('org_addon_subscriptions').delete().eq('org_id', orgId).eq('addon_id', (addon as any).id)
      await db.from('staff_members').delete().eq('org_id', orgId).like('name', 'كاشير %')
      await db.from('branches').update({ is_active: false } as any).eq('id', (cb as any).id)
      await db.from('organizations').update({ plan: 'pro', max_staff: 1 } as any).eq('id', orgId)
    }, 120_000)
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
