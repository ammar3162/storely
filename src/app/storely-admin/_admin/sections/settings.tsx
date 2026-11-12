'use client'
import { useEffect, useState } from 'react'
import { confirmDialog } from '@/components/ConfirmDialog'
import { toast } from '@/components/toast'
import { Wrench, ShieldCheck } from 'lucide-react'
import { A, Badge, Btn, Card, Field, Loading, Notice, PageHeader, adminFetch, inputStyle, useAdmin } from '../kit'

export default function SettingsPage() {
  const { admin, setAdmin } = useAdmin()
  const isSuper = admin.role === 'super_admin'
  const [loading, setLoading] = useState(true)
  const [maint, setMaint] = useState(false)
  const [maintMsg, setMaintMsg] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [qr, setQr] = useState('')
  const [code, setCode] = useState('')
  const [disabling, setDisabling] = useState(false)
  const [disableCode, setDisableCode] = useState('')

  useEffect(() => {
    fetch('/api/platform-settings').then(r => r.json()).then(d => {
      setMaint(!!d.maintenanceMode); setMaintMsg(d.maintenanceMessage || '')
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  async function saveSettings(body: Record<string, unknown>, key: string, ok: string) {
    setBusy(key)
    const j = await adminFetch('/api/platform-settings', { method: 'POST', body })
    setBusy(null)
    toast(j.ok ? ok : 'حدث خطأ، حاول مرة أخرى', j.ok ? 'success' : 'error')
    return j.ok
  }

  async function toggleMaintenance() {
    const next = !maint
    if (next && !(await confirmDialog({ title: 'تفعيل وضع الصيانة', message: 'ستظهر شاشة الصيانة للعملاء والموظفين ويتوقف استخدامهم للنظام، وتستمر العمليات الخلفية مثل واتساب والمهام المجدولة.' }))) return
    if (await saveSettings({ maintenanceMode: next, maintenanceMessage: maintMsg }, 'maint', next ? 'تم تفعيل وضع الصيانة' : 'عاد الموقع إلى العمل بشكل طبيعي')) setMaint(next)
  }

  async function start2FA() {
    setBusy('2fa')
    const j = await adminFetch('/api/admin/2fa-setup', { method: 'POST' })
    setBusy(null)
    if (j.qrDataUrl) { setQr(j.qrDataUrl); setCode('') } else toast(j.error || 'تعذّر بدء التفعيل', 'error')
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
    if (disableCode.length !== 6) return
    setBusy('2fa-off')
    const j = await adminFetch('/api/admin/2fa-disable', { method: 'POST', body: { code: disableCode } })
    setBusy(null)
    if (!j.success) { toast(j.error || 'تعذّر الإلغاء', 'error'); return }
    setDisabling(false); setDisableCode('')
    const updated = { ...admin, totp_enabled: false }
    setAdmin(updated); sessionStorage.setItem('storely_admin_info', JSON.stringify(updated))
    toast('تم إلغاء التحقق بخطوتين', 'success')
  }

  if (loading) return <Loading />

  return (
    <>
      <PageHeader title="إعدادات المنصة" subtitle="إعدادات تؤثر في جميع العملاء، وأمان حسابك" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 760 }}>

        {isSuper && (
          <Card title="وضع الصيانة" subtitle="يوقف واجهة العملاء مؤقتاً، وتستمر العمليات الخلفية"
            actions={<Badge tone={maint ? 'danger' : 'primary'}><Wrench size={12} /> {maint ? 'مفعّل' : 'الموقع يعمل'}</Badge>}>
            {maint && <div style={{ marginBottom: 14 }}><Notice tone="danger">يرى العملاء شاشة الصيانة الآن</Notice></div>}
            <Field label="الرسالة التي تظهر للعملاء" hint="اختيارية">
              <input value={maintMsg} onChange={e => setMaintMsg(e.target.value)} placeholder="نعمل على تحسينات، وسنعود خلال دقائق" style={inputStyle} />
            </Field>
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <Btn kind={maint ? 'primary' : 'danger'} loading={busy === 'maint'} onClick={toggleMaintenance}>{maint ? 'إيقاف الصيانة' : 'تفعيل الصيانة'}</Btn>
              {maint && <Btn disabled={!!busy} onClick={() => saveSettings({ maintenanceMode: true, maintenanceMessage: maintMsg }, 'msg', 'تم حفظ الرسالة')}>حفظ الرسالة</Btn>}
            </div>
          </Card>
        )}

        <Card title="التحقق بخطوتين" subtitle="رمز من تطبيق المصادقة مع كلمة المرور عند الدخول"
          actions={<Badge tone={admin.totp_enabled ? 'primary' : 'warning'}><ShieldCheck size={12} /> {admin.totp_enabled ? 'مفعّل' : 'غير مفعّل'}</Badge>}>
          {admin.totp_enabled ? (
            disabling ? (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <Field label="الرمز الحالي من تطبيق المصادقة" hint="لتأكيد إلغاء التحقق بخطوتين">
                  <input value={disableCode} onChange={e => setDisableCode(e.target.value.replace(/\D/g, ''))} maxLength={6} inputMode="numeric" dir="ltr" placeholder="000000" autoFocus
                    style={{ ...inputStyle, fontSize: 18, letterSpacing: 6, textAlign: 'center', maxWidth: 200 }} />
                </Field>
                <div style={{ display: 'flex', gap: 8, marginBottom: 23 }}>
                  <Btn kind="danger" loading={busy === '2fa-off'} disabled={disableCode.length !== 6} onClick={disable2FA}>تأكيد الإلغاء</Btn>
                  <Btn kind="ghost" onClick={() => { setDisabling(false); setDisableCode('') }}>تراجع</Btn>
                </div>
              </div>
            ) : <Btn kind="danger" onClick={() => setDisabling(true)}>إلغاء التحقق بخطوتين</Btn>
          ) : qr ? (
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
              <img src={qr} alt="رمز QR" width={168} height={168} style={{ borderRadius: 12, border: `1px solid ${A.border}` }} />
              <div style={{ flex: '1 1 220px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ fontSize: 13.5, color: A.text2, lineHeight: 1.8 }}>امسح الرمز بتطبيق المصادقة (مثل Google Authenticator)، ثم أدخل الرمز المكوّن من 6 أرقام.</div>
                <input value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} maxLength={6} inputMode="numeric" dir="ltr" placeholder="000000"
                  style={{ ...inputStyle, fontSize: 20, letterSpacing: 8, textAlign: 'center', maxWidth: 220 }} />
                <div><Btn kind="primary" loading={busy === '2fa'} disabled={code.length !== 6} onClick={confirm2FA}>تأكيد وتفعيل</Btn></div>
              </div>
            </div>
          ) : (
            <Btn kind="primary" loading={busy === '2fa'} onClick={start2FA}><ShieldCheck size={15} /> تفعيل الآن</Btn>
          )}
        </Card>
      </div>
    </>
  )
}
