'use client'
// الأجهزة الموثوقة (الإعدادات > الأمان): الجهاز اللي يتشال يحتاج رمز الإيميل من جديد
import { useEffect, useState } from 'react'
import { MonitorSmartphone } from 'lucide-react'
import { api } from '@/lib/api-client'
import { confirmDialog } from '@/components/ConfirmDialog'
import { toast } from '@/components/toast'
import { colors, radius, font, card } from '@/lib/ds'

type Device = { id: string; label: string; created_at: string; last_seen_at: string; current: boolean }
const fmt = (d: string) => new Date(d).toLocaleDateString('ar-SA-u-ca-gregory-nu-latn', { year: 'numeric', month: 'short', day: 'numeric' })

export default function TrustedDevices() {
  const [devices, setDevices] = useState<Device[] | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const load = () => api.get('/api/device').then(j => setDevices(j.success ? j.devices : []))
  useEffect(() => { load() }, [])

  async function remove(d: Device) {
    const ok = await confirmDialog({
      title: 'إزالة الجهاز',
      message: d.current
        ? 'هذا هو الجهاز الحالي. بعد الإزالة سيُطلب منك رمز عبر البريد الإلكتروني عند الدخول القادم.'
        : `إزالة «${d.label}»؟ لو أحد دخل منه بيحتاج رمز على إيميلك.`,
    })
    if (!ok) return
    setBusy(d.id)
    const j = await api.del('/api/device', { id: d.id })
    setBusy(null)
    if (!j.success) { toast(j.error || 'تعذّرت الإزالة', 'error'); return }
    toast('تمت إزالة الجهاز', 'success')
    load()
  }

  return (
    <div style={{ ...card, padding: 16, marginTop: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: font.base, fontWeight: 800, color: colors.text, marginBottom: 6 }}>
        <MonitorSmartphone size={18} /> الأجهزة الموثوقة
      </div>
      <div style={{ fontSize: font.sm, color: colors.text, lineHeight: 1.7, marginBottom: 12 }}>
        تدخل من هذه الأجهزة دون رمز، ويحتاج أي جهاز جديد إلى رمز يصل إلى بريدك الإلكتروني.
      </div>
      {devices === null && <div style={{ fontSize: font.sm, color: colors.text }}>جاري التحميل…</div>}
      {devices?.length === 0 && <div style={{ fontSize: font.sm, color: colors.text }}>لا توجد أجهزة مسجّلة.</div>}
      <div style={{ display: 'grid', gap: 8 }}>
        {devices?.map(d => (
          <div key={d.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 12px', border: `1px solid ${colors.border}`, borderRadius: radius.md }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: font.sm, fontWeight: 700, color: colors.text }}>
                {d.label}{d.current && <span style={{ marginRight: 8, fontSize: font.xs, fontWeight: 700, color: colors.primary }}>هذا الجهاز</span>}
              </div>
              <div style={{ fontSize: font.xs, color: colors.text }}>آخر دخول {fmt(d.last_seen_at)} · أضيف {fmt(d.created_at)}</div>
            </div>
            <button onClick={() => remove(d)} disabled={!!busy}
              style={{ flexShrink: 0, padding: '7px 12px', background: 'none', border: `1px solid ${colors.dangerBorder}`, borderRadius: radius.md, color: colors.danger, fontSize: font.xs, fontWeight: 700, fontFamily: font.family, cursor: busy ? 'not-allowed' : 'pointer' }}>
              {busy === d.id ? 'جاري…' : 'إزالة'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
