'use client'
import { useEffect, useState } from 'react'
import { UserPlus } from 'lucide-react'
import { confirmDialog } from '@/components/ConfirmDialog'
import { toast } from '@/components/toast'
import { Btn, Drawer, Empty, Field, Loading, Notice, adminFetch, useAdmin } from '../_admin/kit'
import { StorelyCard, StorelyPageHeader, StorelyStatusBadge } from '@/components/ui'

const PERMS: Record<string, string> = {
  manage_users: 'إدارة العملاء (تفعيل، إيقاف، حذف، الباقات)',
  manage_suppliers: 'طلبات الموردين',
  view_analytics: 'عرض النظرة العامة',
  view_metrics: 'مقاييس الإيراد',
  manage_packages: 'الباقات والأسعار',
  manage_backups: 'النسخ الاحتياطية',
}

type Form = { id?: string; full_name: string; email: string; password: string; permissions: Record<string, boolean> }
const EMPTY: Form = { full_name: '', email: '', password: '', permissions: {} }

export default function AdminsPage() {
  const { admin } = useAdmin()
  const [list, setList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<Form | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    const j = await adminFetch('/api/admin/list-admins')
    setList(j.admins || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  if (admin.role !== 'super_admin') return <div className="min-w-0 space-y-6" dir="rtl"><StorelyPageHeader title="المشرفون" /><StorelyCard><Empty title="هذي الصفحة للمشرف الكامل فقط" /></StorelyCard></div>

  async function save() {
    if (!form) return
    setError('')
    if (!form.full_name || !form.email || (!form.id && form.password.length < 8)) { setError(form.id ? 'أدخل الاسم والإيميل' : 'أدخل الاسم والإيميل وكلمة مرور 8 أحرف على الأقل'); return }
    setSaving(true)
    const j = form.id
      ? await adminFetch('/api/admin/update-admin', { method: 'POST', body: { admin_id: form.id, full_name: form.full_name, email: form.email, permissions: form.permissions, new_password: form.password || undefined } })
      : await adminFetch('/api/admin/create-admin', { method: 'POST', body: { email: form.email, password: form.password, full_name: form.full_name, permissions: form.permissions } })
    setSaving(false)
    if (!j.ok) { setError(j.error || 'حدث خطأ'); return }
    toast(form.id ? 'تم حفظ التعديلات' : 'تمت إضافة المشرف', 'success')
    setForm(null); load()
  }

  async function toggle(a: any) {
    await adminFetch('/api/admin/update-admin', { method: 'POST', body: { admin_id: a.id, is_active: !a.is_active } })
    load()
  }

  async function remove(a: any) {
    if (!(await confirmDialog({ title: 'حذف المشرف', message: `حذف ${a.full_name} (${a.email}) نهائياً؟` }))) return
    const j = await adminFetch('/api/admin/delete-admin', { method: 'POST', body: { admin_id: a.id } })
    if (!j.success) toast('تعذّر الحذف: ' + (j.error || ''), 'error')
    load()
  }

  return (
    <div className="min-w-0 space-y-6" dir="rtl">
      <StorelyPageHeader title="المشرفون" description="من يقدر يدخل لوحة الإدارة، وبأي صلاحيات"
        actions={<Btn kind="primary" onClick={() => { setError(''); setForm({ ...EMPTY }) }}><UserPlus size={15} /> إضافة مشرف</Btn>} />

      <StorelyCard>
        {loading ? <Loading /> : list.length === 0 ? <Empty title="ما فيه مشرفين" /> : list.map((a, i) => (
          <div key={a.id} className={`flex min-w-0 flex-wrap items-center gap-5 p-5 sm:p-6 ${i ? 'border-t border-[var(--storely-border)]' : ''}`}>
            <div className="min-w-0 flex-1 basis-64">
              <div className="flex flex-wrap items-center gap-2">
                <span className="break-words text-base font-semibold">{a.full_name}</span>
                {a.role === 'super_admin' ? <span className="text-[13px] font-semibold text-[var(--storely-muted)]">مشرف كامل</span> : <span className="text-[13px] text-[var(--storely-muted)]">مشرف</span>}
                {!a.is_active && <StorelyStatusBadge status="danger">معطّل</StorelyStatusBadge>}
                {a.id === admin.id && <StorelyStatusBadge status="info">أنت</StorelyStatusBadge>}
              </div>
              <div className="mt-2 break-all text-start text-sm text-[var(--storely-muted)]" dir="ltr">{a.email}</div>
              {a.role !== 'super_admin' && (
                <div className="mt-3 text-sm leading-7 text-[var(--storely-muted)]">
                  {Object.entries(a.permissions || {}).filter(([, v]) => v).map(([k]) => PERMS[k] || k).join(' · ') || 'بدون صلاحيات'}
                </div>
              )}
            </div>
            {a.role !== 'super_admin' && (
              <div className="storely-actions">
                <Btn small onClick={() => { setError(''); setForm({ id: a.id, full_name: a.full_name, email: a.email, password: '', permissions: a.permissions || {} }) }}>تعديل</Btn>
                <Btn small onClick={() => toggle(a)}>{a.is_active ? 'تعطيل' : 'تفعيل'}</Btn>
                <Btn small kind="danger" onClick={() => remove(a)}>حذف</Btn>
              </div>
            )}
          </div>
        ))}
      </StorelyCard>

      <Drawer open={!!form} onClose={() => setForm(null)} title={form?.id ? 'تعديل مشرف' : 'إضافة مشرف'} width={460}>
        {form && (
          <div className="space-y-6">
            <Field label="الاسم الكامل"><input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} className="storely-input" /></Field>
            <Field label="البريد الإلكتروني"><input type="email" dir="ltr" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="storely-input" /></Field>
            <Field label={form.id ? 'كلمة مرور جديدة' : 'كلمة المرور'} hint={form.id ? 'اتركها فاضية لو ما تبي تغيّرها' : '8 أحرف على الأقل'}>
              <input type="password" dir="ltr" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="storely-input" />
            </Field>
            <div>
              <div className="mb-3 text-base font-semibold">الصلاحيات</div>
              <div className="flex flex-col gap-3">
                {Object.entries(PERMS).map(([k, l]) => (
                  <label key={k} className={`flex cursor-pointer items-start gap-3 rounded-[var(--radius-sm)] border bg-white p-4 text-sm leading-6 ${form.permissions[k] ? 'border-[var(--storely-navy)]' : 'border-[var(--storely-border)]'}`}>
                    <input className="mt-1 size-4 shrink-0 accent-[var(--storely-navy)]" type="checkbox" checked={!!form.permissions[k]} onChange={e => setForm({ ...form, permissions: { ...form.permissions, [k]: e.target.checked } })} />
                    {l}
                  </label>
                ))}
              </div>
            </div>
            {error && <Notice tone="danger">{error}</Notice>}
            <Btn kind="primary" full loading={saving} onClick={save}>{form.id ? 'حفظ التعديلات' : 'إضافة المشرف'}</Btn>
          </div>
        )}
      </Drawer>
    </div>
  )
}
