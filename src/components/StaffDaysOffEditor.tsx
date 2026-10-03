'use client'
import { useState } from 'react'
import { colors, font, inp } from '@/lib/ds'
import { toast } from '@/components/toast'
import { WEEKDAYS_AR, weekdayOf, scheduledOffDates, isScheduledOff } from '@/lib/daysOff'

// إعداد إجازة موظف واحد: أيام ثابتة / أسبوع وأسبوع / تواريخ يحددها المالك / رصيد مرن بالشهر
export type OffPatch = { days_off_mode?: string; weekly_off_days?: number[]; biweekly_anchor?: string; off_dates?: string[]; monthly_off_days?: number }

const SHORT = ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت']
const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
const saudiToday = () => new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 10)
const addDays = (d: string, n: number) => new Date(Date.parse(`${d}T12:00:00Z`) + n * 86400e3).toISOString().slice(0, 10)
const weekStart = (d: string) => addDays(d, -weekdayOf(d))
const shiftMonth = (m: string, n: number) => { const [y, mo] = m.split('-').map(Number); const t = new Date(Date.UTC(y, mo - 1 + n, 1)); return t.toISOString().slice(0, 7) }
const dayLabel = (d: string) => `${WEEKDAYS_AR[weekdayOf(d)]} ${Number(d.slice(8))}`

const chip = (on: boolean) => ({ padding: '5px 10px', borderRadius: 99, fontSize: 11.5, fontWeight: 700, cursor: 'pointer', fontFamily: font.family,
  border: `1.5px solid ${on ? '#3b82f6' : colors.border}`, background: on ? '#eff6ff' : colors.surface, color: on ? '#1d4ed8' : colors.text3 })

export default function StaffDaysOffEditor({ staff, onPatch }: { staff: any; onPatch: (p: OffPatch) => void }) {
  const today = saudiToday()
  const thisMonth = today.slice(0, 7)
  const [calMonth, setCalMonth] = useState(thisMonth)
  const mode: string = staff.days_off_mode || 'weekly'
  const days: number[] = staff.weekly_off_days || []
  const offDates: string[] = staff.off_dates || []

  function toggleDay(di: number) {
    const next = days.includes(di) ? days.filter(d => d !== di) : [...days, di].sort((a, b) => a - b)
    if (next.length > 6) { toast('لازم يبقى يوم دوام واحد على الأقل', 'warning'); return }
    onPatch({ weekly_off_days: next })
  }
  function toggleDate(d: string) {
    onPatch({ off_dates: offDates.includes(d) ? offDates.filter(x => x !== d) : [...offDates, d].sort() })
  }
  function changeMode(m: string) {
    // أسبوع وأسبوع بدون بداية؟ نبدأ من هالأسبوع
    onPatch(m === 'biweekly' && !staff.biweekly_anchor ? { days_off_mode: m, biweekly_anchor: weekStart(today) } : { days_off_mode: m })
  }

  // معاينة: إجازاته هالشهر بالتواريخ
  const preview = mode === 'monthly' ? null : scheduledOffDates(thisMonth, staff)

  // أسبوع وأسبوع: هل إجازته هالأسبوع أو الجاي؟
  const thisWeek = weekStart(today), nextWeek = addDays(thisWeek, 7)
  const anchorIsThis = !staff.biweekly_anchor || days.length === 0 ? true
    : days.some(di => isScheduledOff(addDays(thisWeek, di), staff))
  const firstDay = days[0] ?? 2

  // تقويم الشهر للتواريخ
  const calDays = (() => {
    const [y, m] = calMonth.split('-').map(Number)
    const n = new Date(Date.UTC(y, m, 0)).getUTCDate()
    const lead = weekdayOf(`${calMonth}-01`)
    return [...Array(lead).fill(null), ...Array.from({ length: n }, (_, i) => `${calMonth}-${String(i + 1).padStart(2, '0')}`)] as (string | null)[]
  })()
  const calCount = offDates.filter(d => d.startsWith(calMonth)).length

  return (
    <div style={{ flexBasis: '100%', display: 'flex', flexDirection: 'column' as const, gap: 8, paddingTop: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' as const }}>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: colors.text3, marginInlineEnd: 4 }}>الإجازة:</span>
        <select value={mode} onChange={e => changeMode(e.target.value)} style={{ ...inp(), width: 'auto', padding: '5px 10px', fontSize: 12 }}>
          <option value="weekly">أيام ثابتة كل أسبوع</option>
          <option value="biweekly">أسبوع وأسبوع</option>
          <option value="dates">أيام أحددها بالتقويم</option>
          <option value="monthly">رصيد مرن بالشهر</option>
        </select>

        {(mode === 'weekly' || mode === 'biweekly') && WEEKDAYS_AR.map((dn, di) => (
          <button key={di} onClick={() => toggleDay(di)} aria-pressed={days.includes(di)} style={chip(days.includes(di))}>{dn}</button>
        ))}

        {mode === 'monthly' && (
          <>
            <input type="number" min={0} max={15} defaultValue={staff.monthly_off_days ?? 0} key={staff.monthly_off_days ?? 0}
              onBlur={e => { const n = Math.max(0, Math.min(15, Math.round(Number(e.target.value) || 0))); if (n !== Number(staff.monthly_off_days || 0)) onPatch({ monthly_off_days: n }) }}
              style={{ ...inp(), width: 70, padding: '5px 10px', fontSize: 12 }} />
            <span style={{ fontSize: 11.5, color: colors.text3 }}>أيام بالشهر — أي يوم ما يداوم فيه ينحسب إجازة لين يخلص رصيده، وبعدها غياب</span>
          </>
        )}
      </div>

      {mode === 'biweekly' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' as const }}>
          <span style={{ fontSize: 11.5, color: colors.text3 }}>أول إجازة:</span>
          <button onClick={() => onPatch({ biweekly_anchor: thisWeek })} aria-pressed={anchorIsThis} style={chip(anchorIsThis)}>
            هالأسبوع ({dayLabel(addDays(thisWeek, firstDay))})
          </button>
          <button onClick={() => onPatch({ biweekly_anchor: nextWeek })} aria-pressed={!anchorIsThis} style={chip(!anchorIsThis)}>
            الأسبوع الجاي ({dayLabel(addDays(nextWeek, firstDay))})
          </button>
          <span style={{ fontSize: 11.5, color: colors.text4 }}>وبعدها أسبوع دوام وأسبوع إجازة</span>
        </div>
      )}

      {mode === 'dates' && (
        <div style={{ border: `1px solid ${colors.border}`, borderRadius: 12, padding: 10, maxWidth: 320, background: colors.surface }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <button onClick={() => setCalMonth(shiftMonth(calMonth, -1))} aria-label="الشهر السابق" style={{ ...chip(false), padding: '3px 10px' }}>→</button>
            <span style={{ fontSize: 12.5, fontWeight: 800, color: colors.text }}>
              {MONTHS[Number(calMonth.slice(5)) - 1]} {calMonth.slice(0, 4)}
              <span style={{ fontWeight: 600, color: colors.text4 }}> · {calCount ? `${calCount} أيام إجازة` : 'بدون إجازة'}</span>
            </span>
            <button onClick={() => setCalMonth(shiftMonth(calMonth, 1))} aria-label="الشهر الجاي" style={{ ...chip(false), padding: '3px 10px' }}>←</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, textAlign: 'center' as const }}>
            {SHORT.map(s => <div key={s} style={{ fontSize: 10, fontWeight: 700, color: colors.text4 }}>{s}</div>)}
            {calDays.map((d, i) => {
              if (!d) return <div key={`e${i}`} />
              const on = offDates.includes(d), isToday = d === today
              return (
                <button key={d} onClick={() => toggleDate(d)} aria-pressed={on} aria-label={dayLabel(d)}
                  style={{ height: 32, borderRadius: 8, fontSize: 12, fontWeight: on ? 800 : 600, cursor: 'pointer', fontFamily: font.family,
                    border: `1.5px solid ${on ? '#3b82f6' : isToday ? colors.text4 : 'transparent'}`, background: on ? '#eff6ff' : 'transparent',
                    color: on ? '#1d4ed8' : d < today ? colors.text4 : colors.text }}>
                  {Number(d.slice(8))}
                </button>
              )
            })}
          </div>
          <div style={{ fontSize: 11, color: colors.text4, marginTop: 6 }}>اضغط على اليوم عشان تخليه إجازة، واضغط مرة ثانية تلغيه.</div>
        </div>
      )}

      {preview && (
        <div style={{ fontSize: 11.5, color: preview.length ? colors.text3 : colors.text4 }}>
          {preview.length
            ? <>إجازاته هالشهر ({preview.length === 1 ? 'يوم واحد' : preview.length === 2 ? 'يومين' : `${preview.length} أيام`}): <b style={{ color: colors.text2 }}>{preview.map(dayLabel).join('، ')}</b></>
            : mode === 'dates' ? 'ما حددت له إجازة هالشهر' : mode === 'biweekly' ? 'اختر يوم الإجازة' : 'بدون إجازة أسبوعية'}
        </div>
      )}
    </div>
  )
}
