'use client'
import { useEffect, useState } from 'react'
import { X, Bike, Plus, Check } from 'lucide-react'
import { api } from '@/lib/api-client'
import { colors, font, inp } from '@/lib/ds'
import { toast } from '@/components/toast'
import { DELIVERY_APP_PRESETS, MAX_DELIVERY_APPS } from '@/lib/deliveryApps'

// المالك يختار تطبيقات التوصيل اللي يشتغل معها — تطلع للكاشير خانة لكل تطبيق بالإقفال
export default function DeliveryAppsSettings({ orgId, onClose, onSaved }: { orgId: string; onClose: () => void; onSaved?: (apps: string[]) => void }) {
  const [apps, setApps] = useState<string[] | null>(null)
  const [custom, setCustom] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    api.get('/api/org-settings', { org_id: orgId }).then(j => setApps(Array.isArray(j?.settings?.delivery_apps) ? j.settings.delivery_apps : []))
  }, [orgId])

  const list = apps || []
  const options = [...new Set([...DELIVERY_APP_PRESETS, ...list])]
  const full = list.length >= MAX_DELIVERY_APPS
  const toggle = (name: string) => setApps(list.includes(name) ? list.filter(x => x !== name) : full ? list : [...list, name])
  function addCustom() {
    const name = custom.replace(/\s+/g, ' ').trim().slice(0, 40)
    if (!name) return
    if (!list.includes(name) && !full) setApps([...list, name])
    setCustom('')
  }
  async function save() {
    setBusy(true)
    const r = await api.patch('/api/org-settings', { org_id: orgId, delivery_apps: list })
    setBusy(false)
    if (!r.success) { toast(r.error || 'تعذر الحفظ', 'error'); return }
    toast(list.length ? 'تم حفظ تطبيقات التوصيل — تطلع للكاشير بالإقفال الجاي' : 'تم إلغاء تطبيقات التوصيل من الإقفال')
    onSaved?.(list)
    onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, fontFamily: font.family }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,.45)', backdropFilter: 'blur(6px)' }} onClick={() => !busy && onClose()} />
      <div style={{ background: colors.surface, borderRadius: 18, width: '100%', maxWidth: 480, maxHeight: '92vh', overflowY: 'auto', position: 'relative', boxShadow: '0 24px 60px rgba(0,0,0,.25)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 20px', borderBottom: `1px solid ${colors.border}` }}>
          <span style={{ width: 36, height: 36, borderRadius: 10, background: colors.primaryLight, color: colors.primary, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Bike size={18} /></span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: colors.text }}>تطبيقات التوصيل</div>
            <div style={{ fontSize: 12, color: colors.text3 }}>اختر التطبيقات اللي تشتغل معها</div>
          </div>
          <button onClick={() => !busy && onClose()} aria-label="إغلاق" style={{ background: colors.bg, border: 'none', borderRadius: 9, padding: 7, cursor: 'pointer', display: 'inline-flex', color: colors.text2 }}><X size={18} /></button>
        </div>

        <div style={{ padding: 20, display: 'grid', gap: 14 }}>
          <div style={{ fontSize: 12.5, color: colors.text2, lineHeight: 1.8, background: colors.bg, borderRadius: 10, padding: '10px 12px' }}>
            الكاشير يكتب بالإقفال مبلغ كل تطبيق من تقرير نظام المبيعات. فلوس التطبيقات ما تدخل الدرج، فتنخصم من الكاش المتوقع مثل الشبكة، وما يطلع عجز غلط.
          </div>
          {apps === null ? (
            <div style={{ fontSize: 13, color: colors.text4, textAlign: 'center', padding: 20 }}>جاري التحميل...</div>
          ) : (
            <>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {options.map(name => {
                  const on = list.includes(name)
                  return (
                    <button key={name} type="button" onClick={() => toggle(name)} disabled={!on && full}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 999, border: `1.5px solid ${on ? colors.primary : colors.border}`,
                        background: on ? colors.primaryLight : colors.surface, color: on ? colors.primary : colors.text2, fontSize: 13, fontWeight: 700, cursor: !on && full ? 'not-allowed' : 'pointer', fontFamily: font.family, opacity: !on && full ? .5 : 1 }}>
                      {on && <Check size={14} strokeWidth={2.5} />}{name}
                    </button>
                  )
                })}
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: colors.text3, marginBottom: 5 }}>تطبيق ثاني مو موجود بالقائمة</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input value={custom} onChange={e => setCustom(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustom() } }}
                    maxLength={40} placeholder="اسم التطبيق" style={{ ...inp(), flex: 1, minWidth: 0 }} />
                  <button type="button" onClick={addCustom} disabled={!custom.trim() || full}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '0 14px', borderRadius: 10, border: `1px solid ${colors.border2}`, background: colors.surface, color: colors.text2, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: font.family }}>
                    <Plus size={15} /> إضافة
                  </button>
                </div>
                {full && <div style={{ fontSize: 11.5, color: colors.text4, marginTop: 5 }}>أقصى عدد {MAX_DELIVERY_APPS} تطبيقات</div>}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => !busy && onClose()} style={{ flex: 1, padding: 12, background: colors.bg, color: colors.text3, border: 'none', borderRadius: 11, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: font.family }}>إلغاء</button>
                <button onClick={save} disabled={busy} style={{ flex: 2, padding: 12, background: busy ? colors.border2 : colors.primary, color: '#fff', border: 'none', borderRadius: 11, fontSize: 14, fontWeight: 800, cursor: busy ? 'default' : 'pointer', fontFamily: font.family }}>{busy ? 'جاري الحفظ...' : 'حفظ'}</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
