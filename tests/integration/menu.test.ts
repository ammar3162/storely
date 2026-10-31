/**
 * اختبارات تكامل على قاعدة staging — menu. تستدعي API routes الحقيقية وتتحقق من النتيجة بقاعدة البيانات.
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
})
