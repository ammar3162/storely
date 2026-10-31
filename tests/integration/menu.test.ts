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
