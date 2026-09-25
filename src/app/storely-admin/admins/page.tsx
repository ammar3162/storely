'use client'
import { useEffect, useState } from 'react'
import { UserPlus } from 'lucide-react'
import { confirmDialog } from '@/components/ConfirmDialog'
import { toast } from '@/components/toast'
import { A, Badge, Btn, Card, Drawer, Empty, Field, Loading, PageHeader, adminFetch, inputStyle, useAdmin } from '../_admin/kit'

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

  if (admin.role !== 'super_admin') return <><PageHeader title="المشرفون" /><Card><Empty title="هذي الصفحة للمشرف الكامل فقط" /></Card></>

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
    <>
      <PageHeader title="المشرفون" subtitle="من يقدر يدخل لوحة الإدارة، وبأي صلاحيات"
        actions={<Btn kind="primary" onClick={() => { setError(''); setForm({ ...EMPTY }) }}><UserPlus size={15} /> إضافة مشرف</Btn>} />

      <Card pad={0}>
        {loading ? <Loading /> : list.length === 0 ? <Empty title="ما فيه مشرفين" /> : list.map((a, i) => (
          <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', borderTop: i ? `1px solid ${A.border}` : 'none', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 260px', minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 14, fontWeight: 700 }}>{a.full_name}</span>
                {a.role === 'super_admin' ? <Badge tone="primary">مشرف كامل</Badge> : <Badge>مشرف</Badge>}
                {!a.is_active && <Badge tone="danger">معطّل</Badge>}
                {a.id === admin.id && <Badge tone="info">أنت</Badge>}
              </div>
              <div style={{ fontSize: 12.5, color: A.text3, marginTop: 3 }} dir="ltr">{a.email}</div>
              {a.role !== 'super_admin' && (
                <div style={{ fontSize: 12, color: A.text2, marginTop: 6 }}>
                  {Object.entries(a.permissions || {}).filter(([, v]) => v).map(([k]) => PERMS[k] || k).join(' · ') || 'بدون صلاحيات'}
                </div>
              )}
            </div>
            {a.role !== 'super_admin' && (
              <div style={{ display: 'flex', gap: 6 }}>
                <Btn small onClick={() => { setError(''); setForm({ id: a.id, full_name: a.full_name, email: a.email, password: '', permissions: a.permissions || {} }) }}>تعديل</Btn>
                <Btn small onClick={() => toggle(a)}>{a.is_active ? 'تعطيل' : 'تفعيل'}</Btn>
                <Btn small kind="danger" onClick={() => remove(a)}>حذف</Btn>
              </div>
            )}
          </div>
        ))}
      </Card>

      <Drawer open={!!form} onClose={() => setForm(null)} title={form?.id ? 'تعديل مشرف' : 'إضافة مشرف'} width={460}>
        {form && (
          <Card>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Field label="الاسم الكامل"><input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} style={inputStyle} /></Field>
              <Field label="البريد الإلكتروني"><input type="email" dir="ltr" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} style={inputStyle} /></Field>
              <Field label={form.id ? 'كلمة مرور جديدة' : 'كلمة المرور'} hint={form.id ? 'اتركها فاضية لو ما تبي تغيّرها' : '8 أحرف على الأقل'}>
                <input type="password" dir="ltr" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} style={inputStyle} />
              </Field>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: A.text2, marginBottom: 8 }}>الصلاحيات</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {Object.entries(PERMS).map(([k, l]) => (
                    <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 13,
                      border: `1px solid ${form.permissions[k] ? A.primary + '66' : A.border}`, background: form.permissions[k] ? A.primarySoft : A.surface }}>
                      <input type="checkbox" checked={!!form.permissions[k]} onChange={e => setForm({ ...form, permissions: { ...form.permissions, [k]: e.target.checked } })} />
                      {l}
                    </label>
                  ))}
                </div>
              </div>
              {error && <div style={{ fontSize: 12.5, color: A.danger, fontWeight: 600 }}>{error}</div>}
              <Btn kind="primary" full loading={saving} onClick={save}>{form.id ? 'حفظ التعديلات' : 'إضافة المشرف'}</Btn>
            </div>
          </Card>
        )}
      </Drawer>
    </>
  )
}
