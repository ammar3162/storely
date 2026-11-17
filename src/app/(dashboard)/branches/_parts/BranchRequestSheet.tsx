'use client'
// طلب فرع إضافي بخطوة وحدة («باقتك المخصصة»): اسم الفرع + خدماته + التكلفة قدامه، وطلب واحد يوافق عليه الأدمن
import { useState, useEffect, useRef } from 'react'
import { StorelyButton } from '@/components/ui/button'
import { storelyTokens as T } from '@/components/ui/design-tokens'
import { api } from '@/lib/api-client'
import { toast } from '@/components/toast'
import { Check, X } from 'lucide-react'
import { proratedCharge } from '@/lib/planPricing'
import { defaultServices, chosenServices, branchMonthly, type BranchService } from '@/lib/branchServices'

export type BranchRequestOffer = { services: BranchService[]; periodEnd: string; staff: number; suppliers: number }

const daysAr = (n: number) => (n === 1 ? 'يوم واحد' : n === 2 ? 'يومين' : n <= 10 ? `${n} أيام` : `${n} يوماً`)
const field: React.CSSProperties = { width: '100%', minWidth: 0, height: 44, padding: '0 12px', border: `1px solid ${T.color.controlBorder}`, borderRadius: T.radius.control, background: T.color.surface, color: T.color.text, fontFamily: 'inherit', fontSize: 17, boxSizing: 'border-box', outline: 'none' }
const label: React.CSSProperties = { display: 'block', fontSize: 15, fontWeight: 600, color: T.color.text, marginBottom: 6 }

export default function BranchRequestSheet({ orgId, offer, onClose, onSent }: { orgId: string; offer: BranchRequestOffer; onClose: () => void; onSent: () => void }) {
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [picked, setPicked] = useState<string[]>(() => defaultServices(offer.services))
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const nameRef = useRef<HTMLInputElement>(null)
  useEffect(() => { nameRef.current?.focus() }, [])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [busy, onClose])

  const chosen = chosenServices(offer.services, picked)
  const monthly = branchMonthly(offer.services, chosen)
  const end = new Date(offer.periodEnd)
  const due = proratedCharge(monthly, 1, end)
  const endLabel = end.toLocaleDateString('ar-SA-u-ca-gregory', { numberingSystem: 'latn', day: 'numeric', month: 'long' })
  const toggle = (s: BranchService) => { if (s.state !== 'all') setPicked(p => (p.includes(s.slug) ? p.filter(x => x !== s.slug) : [...p, s.slug])) }

  async function send() {
    if (name.trim().length < 2) { setErr('اكتب اسم الفرع الجديد'); nameRef.current?.focus(); return }
    setBusy(true); setErr('')
    const r = await api.post('/api/branches/extra', { org_id: orgId, branch_name: name, location, services: chosen })
    setBusy(false)
    if (!r.success) { setErr(r.error || 'تعذّر إرسال الطلب، حاول مرة أخرى'); return }
    toast('وصلنا طلبك، وسيصلك إشعار فور تجهيز الفرع')
    onSent()
  }

  return (
    <div role="dialog" aria-modal="true" aria-label="طلب فرع إضافي" style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={() => !busy && onClose()} style={{ position: 'absolute', inset: 0, background: T.color.backdrop }} />
      <div style={{ position: 'relative', width: '100%', maxWidth: 480, maxHeight: 'calc(100dvh - 32px)', overflowY: 'auto', background: T.color.surface, borderRadius: T.radius.panel, padding: 20, boxShadow: T.shadow.panel, direction: 'rtl', color: T.color.text }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 20, fontWeight: 600 }}>طلب فرع إضافي</div>
            <div style={{ fontSize: 15, color: T.color.textMuted, marginTop: 4, lineHeight: 1.6 }}>الفرع نفسه بدون رسوم، وتدفع للخدمات التي تختارها له فقط.</div>
          </div>
          <button type="button" onClick={onClose} disabled={busy} aria-label="إغلاق"
            style={{ width: 36, height: 36, borderRadius: 999, border: 'none', background: T.color.fill, color: T.color.text, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>

        <div style={{ display: 'grid', gap: 12, marginBottom: 18 }}>
          <div>
            <label htmlFor="br-req-name" style={label}>اسم الفرع</label>
            <input id="br-req-name" ref={nameRef} value={name} maxLength={60} onChange={e => { setName(e.target.value); if (err) setErr('') }}
              placeholder="مثال: فرع العليا" autoComplete="off" enterKeyHint="next" style={{ ...field, borderColor: err && name.trim().length < 2 ? T.color.danger : T.color.controlBorder }} />
          </div>
          <div>
            <label htmlFor="br-req-loc" style={label}>الموقع <span style={{ fontWeight: 400, color: T.color.textSubtle }}>(اختياري)</span></label>
            <input id="br-req-loc" value={location} maxLength={120} onChange={e => setLocation(e.target.value)} placeholder="مثال: حي النزهة" autoComplete="off" enterKeyHint="done" style={field} />
          </div>
        </div>

        <div style={label}>خدمات الفرع</div>
        <div role="group" aria-label="خدمات الفرع" style={{ display: 'grid', gap: 8 }}>
          {offer.services.map(s => {
            const on = chosen.includes(s.slug), locked = s.state === 'all'
            return (
              <button key={s.slug} type="button" onClick={() => toggle(s)} aria-pressed={on} aria-disabled={locked || undefined}
                style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', minHeight: 52, padding: '10px 14px', borderRadius: 14, border: `1px solid ${on ? T.color.navy : T.color.border}`, background: on ? T.color.fill : T.color.surface, color: T.color.text, cursor: locked ? 'default' : 'pointer', fontFamily: 'inherit', textAlign: 'start' }}>
                <span style={{ width: 22, height: 22, borderRadius: 7, border: `1.5px solid ${on ? T.color.navy : T.color.controlBorder}`, background: on ? T.color.navy : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {on && <Check size={14} color="#fff" strokeWidth={2.5} />}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 16, fontWeight: 600 }}>{s.name}</span>
                  {locked && <span style={{ display: 'block', fontSize: 13, color: T.color.textSubtle, marginTop: 2 }}>مفعّلة لكل فروعك، فتُضاف للفرع الجديد</span>}
                </span>
                <span dir="ltr" style={{ fontSize: 15, fontWeight: 600, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>+{s.price} ⃁</span>
              </button>
            )
          })}
        </div>

        <div style={{ marginTop: 16, padding: '12px 14px', borderRadius: 14, background: T.color.background }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 17, fontWeight: 600 }}>
            <span>يزيد اشتراكك الشهري</span>
            <span dir="ltr" style={{ fontVariantNumeric: 'tabular-nums' }}>{monthly} ⃁</span>
          </div>
          {monthly > 0 && <div style={{ fontSize: 14, color: T.color.textMuted, marginTop: 6, lineHeight: 1.6 }}>المستحق عند التفعيل تقريباً {due.amount} ⃁ عن {daysAr(due.days)} حتى {endLabel}، ثم يتجدد مع اشتراكك.</div>}
          <div style={{ fontSize: 14, color: T.color.textMuted, marginTop: 6, lineHeight: 1.6 }}>يأتي مع الفرع {offer.staff} موظفين و{offer.suppliers} مورداً، ويُجهَّز بعد موافقتنا ويصلك إشعار بذلك.</div>
        </div>

        {err && <div role="alert" style={{ marginTop: 12, fontSize: 15, fontWeight: 600, color: T.color.danger }}>{err}</div>}

        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <StorelyButton variant="primary" onClick={send} disabled={busy} style={{ flex: 2 }}>{busy ? 'جارٍ الإرسال...' : 'إرسال الطلب'}</StorelyButton>
          <StorelyButton onClick={onClose} disabled={busy} style={{ flex: 1 }}>إلغاء</StorelyButton>
        </div>
      </div>
    </div>
  )
}
