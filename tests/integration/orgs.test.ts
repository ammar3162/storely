/**
 * اختبارات تكامل على قاعدة staging — orgs. تستدعي API routes الحقيقية وتتحقق من النتيجة بقاعدة البيانات.
 * كل ملف ينشئ منشأة تجريبية مؤقتة خاصة فيه (مالك + فرع) ويحذفها بالنهاية، فالملفات تشتغل بالتوازي بدون تداخل.
 * المتغيرات والـ mocks مشتركة: harness.ts و setup.ts.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { URL_, KEY, enabled, uniqPhone, newStamp, auth, ocrFixture, call } from './harness'

describe.skipIf(!enabled)('integration (staging) — orgs', async () => {
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
})
