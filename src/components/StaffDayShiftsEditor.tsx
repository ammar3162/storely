'use client'
import { useState } from 'react'
import { CalendarClock, ChevronDown, X, Plus, CalendarDays } from 'lucide-react'
import { colors, font, inp } from '@/lib/ds'
import { toast } from '@/components/toast'
import { WEEKDAYS_AR, weekdayOf } from '@/lib/daysOff'

// شفت مختلف لأيام معيّنة: أيام الأسبوع (مثل الجمعة) + تواريخ محددة. الفاضي = الشفت الأساسي.
export type SchedulePatch = { weekday_shifts?: Record<string, string>; date_shifts?: Record<string, string> }

const saudiToday = () => new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 10)
const t12 = (t?: string | null) => {
  if (!t) return '—'
  const [h, m] = t.slice(0, 5).split(':').map(Number)
  return `${h % 12 === 0 ? 12 : h % 12}${m ? `:${String(m).padStart(2, '0')}` : ''} ${h < 12 ? 'ص' : 'م'}`
}
const shiftLabel = (sh: any) => sh ? `${sh.name}${sh.is_24h ? ' (24 ساعة)' : ` (${t12(sh.start_time)} – ${t12(sh.end_time)})`}` : 'وردية محذوفة'
const dateLabel = (d: string) => `${WEEKDAYS_AR[weekdayOf(d)]} ${Number(d.slice(8))}/${Number(d.slice(5, 7))}`

export default function StaffDayShiftsEditor({ staff, shifts, onPatch }: { staff: any; shifts: any[]; onPatch: (p: SchedulePatch) => void }) {
  const weekday: Record<string, string> = staff.weekday_shifts || {}
  const dates: Record<string, string> = staff.date_shifts || {}
  const today = saudiToday()
  const upcoming = Object.keys(dates).filter(d => d >= today).sort()
  const count = Object.keys(weekday).length + upcoming.length
  const [open, setOpen] = useState(false)
  const [newDate, setNewDate] = useState('')
  const [newDateShift, setNewDateShift] = useState('')
  const byId = (id: string) => shifts.find(s => s.id === id)
  const base = staff.shift_id ? byId(staff.shift_id) : null

  function setWeekday(di: number, id: string) {
    const next = { ...weekday }
    if (id) next[String(di)] = id; else delete next[String(di)]
    onPatch({ weekday_shifts: next })
  }
  // التواريخ اللي فاتت ما لها داعي تنحفظ — تعرض وتنحفظ القادمة بس
  const futureOnly = (o: Record<string, string>) => Object.fromEntries(Object.entries(o).filter(([d]) => d >= today))
  function addDate() {
    if (!newDate || !newDateShift) { toast('اختر التاريخ والوردية', 'warning'); return }
    if (newDate < today) { toast('اختر تاريخ اليوم أو بعده', 'warning'); return }
    onPatch({ date_shifts: { ...futureOnly(dates), [newDate]: newDateShift } })
    setNewDate(''); setNewDateShift('')
  }
  function removeDate(d: string) {
    const next = futureOnly(dates); delete next[d]
    onPatch({ date_shifts: next })
  }

  const summary = [
    ...Object.keys(weekday).sort().map(di => `${WEEKDAYS_AR[Number(di)]}: ${byId(weekday[di])?.name || 'وردية محذوفة'}`),
    ...(upcoming.length ? [upcoming.length === 1 ? 'تاريخ محدد' : upcoming.length === 2 ? 'تاريخين محددين' : `${upcoming.length} تواريخ محددة`] : []),
  ]
  const small: React.CSSProperties = { ...inp(), width: 'auto', padding: '5px 10px', fontSize: 12 }

  return (
    <div style={{ flexBasis: '100%', display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
      <button onClick={() => setOpen(!open)} aria-expanded={open} disabled={shifts.length === 0}
        style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 99, fontSize: 11.5, fontWeight: 700,
          cursor: shifts.length ? 'pointer' : 'not-allowed', fontFamily: font.family, maxWidth: '100%', textAlign: 'start' as const,
          border: `1.5px solid ${count ? '#3b82f6' : colors.border}`, background: count ? '#eff6ff' : colors.surface, color: count ? '#1d4ed8' : colors.text3 }}>
        <CalendarClock size={14} style={{ flexShrink: 0 }} />
        <span>{count ? `وردية مختلفة حسب اليوم · ${summary.join('، ')}` : 'وردية مختلفة لأيام معيّنة'}</span>
        <ChevronDown size={14} style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
      </button>

      {open && (
        <div style={{ border: `1px solid ${colors.border}`, borderRadius: 12, padding: 12, background: colors.bg, display: 'flex', flexDirection: 'column' as const, gap: 12 }}>
          <div style={{ fontSize: 11.5, color: colors.text3, lineHeight: 1.7 }}>
            أي يوم تتركه على «الوردية الأساسية» يتبع {base ? <b style={{ color: colors.text2 }}>{shiftLabel(base)}</b> : 'ورديته الأساسية'}. ويُحتسب التأخير والانصراف والعمل الإضافي على وردية ذلك اليوم تلقائياً.
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: colors.text, marginBottom: 6 }}>أيام الأسبوع</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 6 }}>
              {WEEKDAYS_AR.map((dn, di) => {
                const v = weekday[String(di)] || ''
                return (
                  <label key={di} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, color: v ? '#1d4ed8' : colors.text2 }}>
                    <span style={{ width: 58, flexShrink: 0 }}>{dn}</span>
                    <select value={v} onChange={e => setWeekday(di, e.target.value)} aria-label={`وردية يوم ${dn}`}
                      style={{ ...small, flex: 1, minWidth: 0, borderColor: v ? '#3b82f6' : undefined }}>
                      <option value="">الوردية الأساسية</option>
                      {shifts.map(sh => <option key={sh.id} value={sh.id}>{shiftLabel(sh)}</option>)}
                    </select>
                  </label>
                )
              })}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: colors.text, marginBottom: 6 }}>تاريخ محدد <span style={{ fontWeight: 600, color: colors.text4 }}>— لمرة واحدة، مثل عيد أو مناسبة، ويتقدّم على إعداد يوم الأسبوع</span></div>
            {upcoming.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6, marginBottom: 8 }}>
                {upcoming.map(d => (
                  <span key={d} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 6px 4px 10px', borderRadius: 99, fontSize: 11.5, fontWeight: 700, border: '1.5px solid #3b82f6', background: '#eff6ff', color: '#1d4ed8' }}>
                    {dateLabel(d)}: {byId(dates[d])?.name || 'وردية محذوفة'}
                    <button onClick={() => removeDate(d)} aria-label={`إلغاء وردية ${dateLabel(d)}`} title="إلغاء"
                      style={{ width: 20, height: 20, borderRadius: 99, border: 'none', background: 'transparent', color: '#1d4ed8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                      <X size={13} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6, alignItems: 'center' }}>
              {/* حقل التاريخ: عرض ثابت + نص «اختر التاريخ» لما يكون فاضي (الآيفون يعرضه مربعاً فارغاً صغيراً) */}
              <label style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', flex: '1 1 150px', minWidth: 150, maxWidth: 220 }}>
                <input type="date" value={newDate} min={today} onChange={e => setNewDate(e.target.value)} aria-label="التاريخ"
                  style={{ ...small, width: '100%', minHeight: 36, color: newDate ? colors.text : 'transparent' }} />
                {!newDate && <span style={{ position: 'absolute', insetInlineStart: 10, fontSize: 12, color: colors.text3, pointerEvents: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}><CalendarDays size={14} /> اختر التاريخ</span>}
              </label>
              <select value={newDateShift} onChange={e => setNewDateShift(e.target.value)} aria-label="وردية التاريخ" style={{ ...small, minHeight: 36, flex: '1 1 150px', maxWidth: '100%' }}>
                <option value="">اختر الوردية</option>
                {shifts.map(sh => <option key={sh.id} value={sh.id}>{shiftLabel(sh)}</option>)}
              </select>
              <button onClick={addDate} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: font.family, border: `1px solid ${colors.primary}`, background: colors.primary, color: '#fff' }}>
                <Plus size={14} /> إضافة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
