'use client'
import { useEffect, useState } from 'react'
import { confirmDialog } from '@/components/ConfirmDialog'
import { toast } from '@/components/toast'
import { A, Badge, Btn, Card, Field, Loading, Notice, PageHeader, adminFetch, inputStyle, useAdmin } from '../_admin/kit'

export default function SettingsPage() {
  const { admin, setAdmin } = useAdmin()
  const isSuper = admin.role === 'super_admin'
  const [loading, setLoading] = useState(true)
  const [maint, setMaint] = useState(false)
  const [maintMsg, setMaintMsg] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [qr, setQr] = useState('')
  const [code, setCode] = useState('')

  useEffect(() => {
    fetch('/api/platform-settings').then(r => r.json()).then(d => {
      setMaint(!!d.maintenanceMode); setMaintMsg(d.maintenanceMessage || '')
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  async function saveSettings(body: Record<string, unknown>, key: string, ok: string) {
    setBusy(key)
    const j = await adminFetch('/api/platform-settings', { method: 'POST', body })
    setBusy(null)
    toast(j.ok ? ok : 'حدث خطأ', j.ok ? 'success' : 'error')
    return j.ok
  }

  async function toggleMaintenance() {
    const next = !maint
    if (next && !(await confirmDialog({ title: 'تفعيل وضع الصيانة', message: 'العملاء والموظفين يشوفون شاشة الصيانة ويتوقف استخدامهم للنظام. العمليات الخلفية (واتساب، المهام المجدولة) تستمر.' }))) return
    if (await saveSettings({ maintenanceMode: next, maintenanceMessage: maintMsg }, 'maint', next ? 'تم تفعيل الصيانة' : 'الموقع رجع يشتغل عادي')) setMaint(next)
  }

  async function start2FA() {
    setBusy('2fa')
    const j = await adminFetch('/api/admin/2fa-setup', { method: 'POST' })
    setBusy(null)
    if (j.qrDataUrl) { setQr(j.qrDataUrl); setCode('') } else toast(j.error || 'تعذّر البدء', 'error')
  }
  async function confirm2FA() {
    setBusy('2fa')
    const j = await adminFetch('/api/admin/2fa-confirm', { method: 'POST', body: { code } })
    setBusy(null)
    if (!j.success) { toast(j.error || 'الرمز غير صحيح', 'error'); return }
    const updated = { ...admin, totp_enabled: true }
    setAdmin(updated); sessionStorage.setItem('storely_admin_info', JSON.stringify(updated))
    setQr(''); toast('تم تفعيل التحقق بخطوتين', 'success')
  }
  async function disable2FA() {
    const c = prompt('أدخل الرمز الحالي من تطبيق المصادقة لتأكيد الإلغاء')
    if (!c) return
    const j = await adminFetch('/api/admin/2fa-disable', { method: 'POST', body: { code: c } })
    if (!j.success) { toast(j.error || 'فشل الإلغاء', 'error'); return }
    const updated = { ...admin, totp_enabled: false }
    setAdmin(updated); sessionStorage.setItem('storely_admin_info', JSON.stringify(updated))
    toast('تم إلغاء التحقق بخطوتين', 'success')
  }

  if (loading) return <Loading />

  return (
    <>
      <PageHeader title="إعدادات المنصة" subtitle="إعدادات تأثر على كل العملاء، وأمان حسابك" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 760 }}>

        {isSuper && (
          <Card title="وضع الصيانة" subtitle="يوقف واجهة العملاء مؤقتاً — العمليات الخلفية تستمر"
            actions={<Badge tone={maint ? 'danger' : 'primary'}>{maint ? 'مفعّل' : 'الموقع شغّال'}</Badge>}>
            {maint && <div style={{ marginBottom: 14 }}><Notice tone="danger">العملاء يشوفون شاشة الصيانة الحين</Notice></div>}
            <Field label="الرسالة اللي يشوفها العملاء" hint="اختياري">
              <input value={maintMsg} onChange={e => setMaintMsg(e.target.value)} placeholder="نعمل على تحسينات، نرجع خلال دقائق" style={inputStyle} />
            </Field>
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <Btn kind={maint ? 'primary' : 'danger'} loading={busy === 'maint'} onClick={toggleMaintenance}>{maint ? 'إيقاف الصيانة' : 'تفعيل الصيانة'}</Btn>
              {maint && <Btn disabled={!!busy} onClick={() => saveSettings({ maintenanceMode: true, maintenanceMessage: maintMsg }, 'msg', 'تم حفظ الرسالة')}>حفظ الرسالة</Btn>}
            </div>
          </Card>
        )}

        <Card title="التحقق بخطوتين" subtitle="رمز من تطبيق المصادقة مع كلمة المرور عند الدخول"
          actions={<Badge tone={admin.totp_enabled ? 'primary' : 'warning'}>{admin.totp_enabled ? 'مفعّل' : 'غير مفعّل'}</Badge>}>
          {admin.totp_enabled ? (
            <Btn kind="danger" onClick={disable2FA}>إلغاء التحقق بخطوتين</Btn>
          ) : qr ? (
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
              <img src={qr} alt="رمز QR" width={168} height={168} style={{ borderRadius: 8, border: `1px solid ${A.border}` }} />
              <div style={{ flex: '1 1 220px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ fontSize: 13, color: A.text2, lineHeight: 1.7 }}>امسح الرمز بتطبيق المصادقة (مثل Google Authenticator)، وبعدها أدخل الرمز المكوّن من 6 أرقام.</div>
                <input value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} maxLength={6} inputMode="numeric" dir="ltr" placeholder="000000"
                  style={{ ...inputStyle, fontSize: 20, letterSpacing: 8, textAlign: 'center', maxWidth: 220 }} />
                <div><Btn kind="primary" loading={busy === '2fa'} disabled={code.length !== 6} onClick={confirm2FA}>تأكيد وتفعيل</Btn></div>
              </div>
            </div>
          ) : (
            <Btn kind="primary" loading={busy === '2fa'} onClick={start2FA}>تفعيل الآن</Btn>
          )}
        </Card>
      </div>
    </>
  )
}
