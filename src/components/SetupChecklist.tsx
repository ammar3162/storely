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
  { key: 'products', need: 'inventory', title: 'أضف منتجاتك', hint: 'ابدأ بالأصناف الأكثر نفاداً', href: '/inventory', cta: 'المخزون' },
  { key: 'staff', title: 'أضف موظف', hint: 'يدخل من جواله برقمه ورمز سري تعطيه إياه', href: '/staff-management', cta: 'الموظفين' },
  { key: 'dispense', need: 'inventory', title: 'أول صرف من جوال الموظف', hint: 'يسجّل الموظف ما استخدمه، ويُخصم من المخزون تلقائياً', href: '/staff-management', cta: 'الموظفين' },
  { key: 'closing', need: 'cashier', title: 'أول إقفال كاشير', hint: 'يُقفل الكاشير من جواله، ويصلك العجز أو الزيادة فوراً', href: '/staff-management', cta: 'عيّن كاشير' },
  { key: 'purchase', need: 'purchases', title: 'سجّل أول فاتورة مشتريات', hint: 'صوّر الفاتورة ونقرأ أصنافها لك', href: '/purchases', cta: 'المشتريات' },
  { key: 'attendance', need: 'hr', title: 'أول تسجيل حضور', hint: 'حدّد الورديات، والموظف يسجّل حضوره من جواله', href: '/attendance', cta: 'الحضور' },
  { key: 'whatsapp', title: 'رقم واتساب للتقرير الصباحي', hint: 'يصلك ملخص يومك كل صباح', href: '/settings', cta: 'الإعدادات' },
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
    <section style={{ background: 'white', border: '1px solid var(--storely-border)', borderRadius:20, padding: '18px 18px 8px', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize:17, fontWeight: 600, color: 'var(--storely-text)' }}>جهّز حسابك</div>
          <div style={{ fontSize:15, color: 'var(--storely-muted)', marginTop: 2 }}>خطوات قليلة لتلمس فائدة Storely من الأسبوع الأول</div>
        </div>
        <span style={{ fontSize:15, color: 'var(--storely-muted)', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{doneCount} من {steps.length}</span>
        <button type="button" onClick={hide} aria-label="إخفاء" style={{ width: 28, height: 28, border: 'none', background: 'transparent', color: 'var(--storely-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: -4 }}><X size={16} strokeWidth={1.75} /></button>
      </div>
      <div style={{ height: 4, borderRadius: 2, background: 'var(--storely-fill)', margin: '12px 0 6px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${(doneCount / steps.length) * 100}%`, background: 'var(--storely-navy)', borderRadius: 2, transition: 'width .4s cubic-bezier(.22,1,.36,1)' }} />
      </div>
      {steps.map((s, i) => {
        const ok = !!state.done[s.key], isNext = s.key === next
        return (
          <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderTop: i ? '1px solid #eef0f2' : 'none' }}>
            <span style={{ width: 24, height: 24, borderRadius:20, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize:13, background: ok ? 'var(--storely-fill)' : isNext ? 'var(--storely-navy)' : 'var(--storely-fill)', color: ok ? 'var(--storely-navy)' : isNext ? 'white' : 'var(--storely-muted)' }}>
              {ok ? <Check size={14} strokeWidth={2.5} /> : i + 1}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize:17, fontWeight: ok ? 400 : 500, color: ok ? 'var(--storely-muted)' : 'var(--storely-text)', textDecoration: ok ? 'line-through' : 'none' }}>{s.title}</div>
              {!ok && <div style={{ fontSize:13, color: 'var(--storely-muted)', marginTop: 1 }}>{s.hint}</div>}
            </div>
            {!ok && (
              <button type="button" onClick={() => router.push(s.href)}
                style={{ height: 34, padding: '0 12px', borderRadius:999, border: 'none', background: isNext ? 'var(--storely-navy)' : 'var(--storely-fill)', color: isNext ? 'white' : 'var(--storely-text)', fontSize:15, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                {s.cta}<ArrowLeft size={14} strokeWidth={1.75} />
              </button>
            )}
          </div>
        )
      })}
    </section>
  )
}
