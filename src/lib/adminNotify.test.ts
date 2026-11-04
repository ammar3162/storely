import { describe, it, expect } from 'vitest'
import { approverEmails, requestEmail } from './adminNotify'

describe('approverEmails', () => {
  it('only active admins who can approve, without duplicates', () => {
    expect(approverEmails([
      { email: 'Boss@Mail.com', role: 'super_admin', is_active: true },
      { email: 'boss@mail.com', role: 'super_admin', is_active: true },
      { email: 'ops@mail.com', role: 'admin', is_active: true, permissions: { manage_users: true } },
      { email: 'viewer@mail.com', role: 'admin', is_active: true, permissions: { view_metrics: true } },
      { email: 'old@mail.com', role: 'super_admin', is_active: false },
      { email: null, role: 'super_admin', is_active: true },
    ])).toEqual(['boss@mail.com', 'ops@mail.com'])
  })
})

describe('requestEmail', () => {
  it('add-on request: subject and details', () => {
    const m = requestEmail({ kind: 'addon', addonName: 'الحضور والانصراف', quantity: 1, note: 'للفرع الثاني' }, { name: 'مقهى الريحان', owner: 'خالد', phone: '0500000000' })
    expect(m.subject).toBe('طلب جديد: إضافة «الحضور والانصراف» — مقهى الريحان')
    expect(m.html).toContain('للفرع الثاني')
    expect(m.html).toContain('storely-admin/addon-requests')
  })

  it('plan request shows from/to plans and current bill', () => {
    const m = requestEmail({ kind: 'plan', fromPlan: 'basic', toPlan: 'pro', billAtRequest: 138 }, { name: 'مطعم' })
    expect(m.subject).toContain('ترقية إلى الشاملة')
    expect(m.html).toContain('الأساسية')
    expect(m.html).toContain('138 ر.س شهرياً')
  })

  it('escapes customer text and keeps the subject on one line', () => {
    const m = requestEmail({ kind: 'addon', addonName: 'x', quantity: 2 }, { name: 'a\r\nBcc: evil@x.com <script>' })
    expect(m.subject).not.toMatch(/[\r\n]/)
    expect(m.html).not.toContain('<script>')
  })

  it('signup: plan, source and link to customers', () => {
    const m = requestEmail({ kind: 'signup', email: 'owner@mail.com', businessType: 'كوفي', plan: 'pro', branches: 3, billing: 'monthly', source: 'tiktok', sourceDetail: null, agentCode: 'AB12', demoMatched: true }, { name: 'كوفي الورد', owner: 'سارة', phone: '0555555555' })
    expect(m.subject).toBe('تسجيل جديد: كوفي الورد')
    for (const t of ['الشاملة', '3 فروع', 'تيك توك', 'AB12', 'owner@mail.com', 'كوفي', 'storely-admin/customers', 'طلب عرض سابق']) expect(m.html).toContain(t)
  })
})
