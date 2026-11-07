'use client'
// «جهّز حسابك» — يطلع للمالك في أول 30 يوم (أو التجربة) لين يخلص أول خطوات الاستخدام.
// الخطوات حسب المزايا اللي اختارها، وكل خطوة تتعلّم «تمّت» من بياناته الفعلية (مو ضغطة زر).
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, X, ArrowLeft } from 'lucide-react'
import { api } from '@/lib/api-client'
import { getMe } from '@/lib/session'

type Done = Record<string, boolean>
type Feats = { inventory: boolean; purchases: boolean; cashier: boolean; hr: boolean }
const STEPS: { key: string; need?: keyof Feats; title: string; hint: string; href: string; cta: string }[] = [
  { key: 'products', need: 'inventory', title: 'أضف منتجاتك', hint: 'ابدأ بالأصناف اللي تنقص عليك كثير', href: '/inventory', cta: 'المخزون' },
  { key: 'staff', title: 'أضف موظف', hint: 'يدخل من جواله برقمه ورمز سري تعطيه إياه', href: '/staff-management', cta: 'الموظفين' },
  { key: 'dispense', need: 'inventory', title: 'أول صرف من جوال الموظف', hint: 'الموظف يسجّل اللي استخدمه، والمخزون ينقص لحاله', href: '/staff-management', cta: 'الموظفين' },
  { key: 'closing', need: 'cashier', title: 'أول إقفال كاشير', hint: 'الكاشير يقفل من جواله، ويوصلك العجز أو الزيادة على طول', href: '/staff-management', cta: 'عيّن كاشير' },
  { key: 'purchase', need: 'purchases', title: 'سجّل أول فاتورة مشتريات', hint: 'صوّر الفاتورة ونقرأ أصنافها لك', href: '/purchases', cta: 'المشتريات' },
  { key: 'attendance', need: 'hr', title: 'أول تسجيل حضور', hint: 'حدّد الورديات، والموظف يسجّل حضوره من جواله', href: '/attendance', cta: 'الحضور' },
  { key: 'whatsapp', title: 'رقم واتساب للتقرير الصباحي', hint: 'يوصلك ملخص يومك كل صباح', href: '/settings', cta: 'الإعدادات' },
]

export default function SetupChecklist() {
  const router = useRouter()
  const [state, setState] = useState<{ orgId: string; done: Done; features: Feats } | null>(null)
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    let alive = true
    getMe().then(async me => {
      if (!me?.org_id || me.role !== 'owner') return
      try { if (localStorage.getItem(`setup_hide_${me.org_id}`)) { setHidden(true); return } } catch {}
      const j = await api.get('/api/setup-progress', { org_id: me.org_id })
      if (alive && j?.success && j.show) setState({ orgId: me.org_id, done: j.done, features: j.features })
    }).catch(() => {})
    return () => { alive = false }
  }, [])

  if (!state || hidden) return null
  const steps = STEPS.filter(s => !s.need || state.features[s.need])
  const doneCount = steps.filter(s => state.done[s.key]).length
  if (doneCount === steps.length) return null
  const next = steps.find(s => !state.done[s.key])?.key
  const hide = () => { try { localStorage.setItem(`setup_hide_${state.orgId}`, '1') } catch {} setHidden(true) }

  return (
    <section style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 16, padding: '18px 18px 8px', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#111827' }}>جهّز حسابك</div>
          <div style={{ fontSize: 13, color: '#4b5565', marginTop: 2 }}>خطوات قليلة وتشوف فايدة Storely من أول أسبوع</div>
        </div>
        <span style={{ fontSize: 13, color: '#4b5565', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{doneCount} من {steps.length}</span>
        <button type="button" onClick={hide} aria-label="إخفاء" style={{ width: 28, height: 28, border: 'none', background: 'transparent', color: '#6b7487', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: -4 }}><X size={16} strokeWidth={1.75} /></button>
      </div>
      <div style={{ height: 4, borderRadius: 2, background: '#eceef1', margin: '12px 0 6px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${(doneCount / steps.length) * 100}%`, background: '#0f766e', borderRadius: 2, transition: 'width .4s cubic-bezier(.22,1,.36,1)' }} />
      </div>
      {steps.map((s, i) => {
        const ok = !!state.done[s.key], isNext = s.key === next
        return (
          <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderTop: i ? '1px solid #eef0f2' : 'none' }}>
            <span style={{ width: 24, height: 24, borderRadius: 12, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, background: ok ? '#e7f3f1' : isNext ? '#111827' : '#eceef1', color: ok ? '#0f766e' : isNext ? 'white' : '#4b5565' }}>
              {ok ? <Check size={14} strokeWidth={2.5} /> : i + 1}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: ok ? 400 : 500, color: ok ? '#6b7487' : '#111827', textDecoration: ok ? 'line-through' : 'none' }}>{s.title}</div>
              {!ok && <div style={{ fontSize: 12, color: '#6b7487', marginTop: 1 }}>{s.hint}</div>}
            </div>
            {!ok && (
              <button type="button" onClick={() => router.push(s.href)}
                style={{ height: 34, padding: '0 12px', borderRadius: 8, border: isNext ? 'none' : '1px solid #e5e7eb', background: isNext ? '#0f766e' : 'white', color: isNext ? 'white' : '#111827', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                {s.cta}<ArrowLeft size={14} strokeWidth={1.75} />
              </button>
            )}
          </div>
        )
      })}
    </section>
  )
}
