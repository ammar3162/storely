'use client'
import NumberInput from '@/components/NumberInput'
import { colors, card, btnPrimary, inp } from '@/lib/ds'
import StaffDaysOffEditor from '@/components/StaffDaysOffEditor'
import StaffDayShiftsEditor from '@/components/StaffDayShiftsEditor'
import { Pencil, Trash2 } from 'lucide-react'
import type { AttendancePage } from './useAttendance'

export default function SettingsTab({ m }: { m: AttendancePage }) {
  const { editShift, setEditShift, savingEditShift, startEditShift, saveEditShift, tab, shifts, newShiftName, setNewShiftName, newShiftStart, setNewShiftStart, newShiftEnd, setNewShiftEnd, newShift24h, setNewShift24h, savingShift, staffList, late, setLate, savingLate, ot, setOt, savingOt, saveOvertime, patchOff, addShift, deleteShift, assignShift, saveLate } = m
  return (
    <>
      {tab === 'settings' && (() => {
        // ── مساعدات العرض ──
        const t12 = (t?: string | null) => {
          if (!t) return '—'
          const [h, m] = t.slice(0, 5).split(':').map(Number)
          const suffix = h < 12 ? 'ص' : 'م'
          const h12 = h % 12 === 0 ? 12 : h % 12
          return `${h12}:${String(m).padStart(2, '0')} ${suffix}`
        }
        const durMin = (st?: string | null, en?: string | null) => {
          if (!st || !en) return 0
          const toM = (x: string) => { const [h, m] = x.slice(0, 5).split(':').map(Number); return h * 60 + m }
          const S = toM(st), E = toM(en)
          return E > S ? E - S : 1440 - S + E
        }
        const durLabel = (min: number) => { const h = Math.floor(min / 60), m = min % 60; return h && m ? `${h} ساعة و${m} دقيقة` : h ? `${h} ${h <= 10 && h > 2 ? 'ساعات' : 'ساعة'}` : `${m} دقيقة` }
        // ينتهي بعد 12 الليل (اللي ينتهي 12:00 بالضبط ما نعتبره «اليوم الثاني»)
        const crossesMidnight = (st?: string | null, en?: string | null) => !!st && !!en && en.slice(0, 5) !== '00:00' && en.slice(0, 5) <= st.slice(0, 5)
        const staffOn = (shiftId: string) => staffList.filter((x: any) => x.shift_id === shiftId).length
        const withoutShift = staffList.filter((x: any) => !x.shift_id).length

        const step = (n: number, title: string, desc: string, status?: React.ReactNode) => (
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 16, flexWrap: 'wrap' as const }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', minWidth: 0, flex: '1 1 260px' }}>
              <span style={{ width: 30, height: 30, borderRadius: 10, background: colors.primaryLight, color: colors.primary, fontWeight: 900, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{n}</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: colors.text }}>{title}</div>
                <div style={{ fontSize: 12, color: colors.text3, marginTop: 3, lineHeight: 1.7 }}>{desc}</div>
              </div>
            </div>
            {status}
          </div>
        )
        const pill = (txt: React.ReactNode, tone: 'ok' | 'warn' | 'muted') => {
          const c = tone === 'ok' ? { fg: colors.primary, bg: colors.primaryLight, bd: colors.primaryBorder } : tone === 'warn' ? { fg: '#b45309', bg: '#fffbeb', bd: '#fde68a' } : { fg: colors.text3, bg: colors.bg, bd: colors.border }
          return <span style={{ fontSize: 11.5, fontWeight: 700, color: c.fg, background: c.bg, border: `1px solid ${c.bd}`, borderRadius: 99, padding: '5px 11px', whiteSpace: 'nowrap' as const }}>{txt}</span>
        }
        const fieldLabel: React.CSSProperties = { fontSize: 11.5, fontWeight: 700, color: colors.text3, display: 'block', marginBottom: 6 }
        const box: React.CSSProperties = { ...card, padding: '20px 22px' }

        const newDur = durMin(newShiftStart, newShiftEnd)
        return (
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 16 }}>

          {/* 1) الشفتات */}
          <div style={box}>
            {step(1, 'الورديات', 'أوقات الدوام لديك. يحسب النظام التأخير من بداية الوردية، والانصراف والعمل الإضافي من نهايتها.',
              shifts.length ? pill(`${shifts.length} ${shifts.length === 1 ? 'وردية' : 'ورديات'}`, 'ok') : pill('لا توجد ورديات', 'warn'))}

            {shifts.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 10, marginBottom: 14 }}>
                {shifts.map((sh: any) => {
                  const n = staffOn(sh.id)
                  if (editShift && editShift.id === sh.id) {
                    const es = editShift
                    const eDur = durMin(es.start, es.end)
                    return (
                      <div key={sh.id} style={{ border: `1.5px solid ${colors.primary}`, borderRadius: 14, padding: 14, background: colors.surface }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: colors.text, marginBottom: 10 }}>تعديل الوردية</div>
                        <label style={fieldLabel}>اسم الوردية</label>
                        <input value={es.name} onChange={e => setEditShift({ ...es, name: e.target.value })} style={inp()} />
                        {!es.is24h && (
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
                            <div>
                              <label style={fieldLabel}>يبدأ الساعة</label>
                              <input type="time" value={es.start} onChange={e => setEditShift({ ...es, start: e.target.value })} style={inp()} />
                            </div>
                            <div>
                              <label style={fieldLabel}>ينتهي الساعة</label>
                              <input type="time" value={es.end} onChange={e => setEditShift({ ...es, end: e.target.value })} style={inp()} />
                            </div>
                          </div>
                        )}
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: colors.text2, cursor: 'pointer', fontWeight: 600, marginTop: 10 }}>
                          <input type="checkbox" checked={es.is24h} onChange={e => setEditShift({ ...es, is24h: e.target.checked })} style={{ width: 16, height: 16, accentColor: colors.primary }} />
                          دوام 24 ساعة
                        </label>
                        {!es.is24h && eDur > 0 && (
                          <div style={{ fontSize: 12, color: colors.text3, marginTop: 8 }}>من {t12(es.start)} إلى {t12(es.end)} · {durLabel(eDur)}{crossesMidnight(es.start, es.end) ? ' · ينتهي اليوم الثاني' : ''}</div>
                        )}
                        <div style={{ fontSize: 11.5, color: colors.text3, background: colors.bg, borderRadius: 8, padding: '8px 10px', marginTop: 10, lineHeight: 1.7 }}>
                          يُطبَّق التعديل بدءاً من الحضور القادم{n ? ` على ${n} موظف` : ''}، ولا يتغيّر الحضور والتأخير المسجّل سابقاً.
                        </div>
                        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                          <button onClick={saveEditShift} disabled={savingEditShift} style={{ ...btnPrimary, flex: 2, padding: '9px 12px' }}>{savingEditShift ? 'جاري الحفظ...' : 'حفظ التعديل'}</button>
                          <button onClick={() => setEditShift(null)} disabled={savingEditShift}
                            style={{ flex: 1, padding: '9px 12px', borderRadius: 10, border: `1px solid ${colors.border2}`, background: colors.surface, color: colors.text2, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>إلغاء</button>
                        </div>
                      </div>
                    )
                  }
                  return (
                    <div key={sh.id} style={{ border: `1px solid ${colors.border}`, borderRadius: 14, padding: '14px 14px 12px', background: colors.surface, position: 'relative' as const }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                        <div style={{ fontSize: 14, fontWeight: 800, color: colors.text }}>{sh.name}</div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => startEditShift(sh)} aria-label={`تعديل ${sh.name}`} title="تعديل الوردية"
                            style={{ width: 28, height: 28, borderRadius: 8, border: `1px solid ${colors.border}`, background: colors.surface, color: colors.text3, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Pencil size={13} strokeWidth={2.25}/></button>
                          <button onClick={() => deleteShift(sh.id)} aria-label={`حذف ${sh.name}`} title="حذف الوردية"
                            style={{ width: 28, height: 28, borderRadius: 8, border: `1px solid ${colors.border}`, background: colors.surface, color: colors.text4, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={13} strokeWidth={2.25}/></button>
                        </div>
                      </div>
                      {sh.is_24h ? (
                        <div style={{ fontSize: 13, color: colors.text2, marginTop: 6, fontWeight: 600 }}>دوام 24 ساعة</div>
                      ) : (
                        <>
                          <div style={{ fontSize: 13.5, color: colors.text2, marginTop: 6, fontWeight: 600 }}>من {t12(sh.start_time)} إلى {t12(sh.end_time)}</div>
                          <div style={{ fontSize: 11.5, color: colors.text4, marginTop: 3 }}>
                            {durLabel(durMin(sh.start_time, sh.end_time))}{crossesMidnight(sh.start_time, sh.end_time) ? ' · ينتهي اليوم الثاني' : ''}
                          </div>
                        </>
                      )}
                      <div style={{ marginTop: 10, fontSize: 11.5, fontWeight: 700, color: n ? colors.primary : colors.text4 }}>{n ? `${n} موظف على هذه الوردية` : 'لا يوجد موظفون عليها'}</div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* إضافة شفت */}
            <div style={{ border: `1.5px dashed ${colors.border2}`, borderRadius: 14, padding: 14, background: colors.bg }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: colors.text, marginBottom: 10 }}>وردية جديدة</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10, alignItems: 'end' }}>
                <div style={{ gridColumn: 'span 2' as const, minWidth: 0 }}>
                  <label style={fieldLabel}>اسم الوردية</label>
                  <input value={newShiftName} onChange={e => setNewShiftName(e.target.value)} placeholder="مثال: الوردية الصباحية" style={inp()} />
                </div>
                {!newShift24h && (
                  <>
                    <div>
                      <label style={fieldLabel}>يبدأ الساعة</label>
                      <input type="time" value={newShiftStart} onChange={e => setNewShiftStart(e.target.value)} style={inp()} />
                    </div>
                    <div>
                      <label style={fieldLabel}>ينتهي الساعة</label>
                      <input type="time" value={newShiftEnd} onChange={e => setNewShiftEnd(e.target.value)} style={inp()} />
                    </div>
                  </>
                )}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginTop: 12, flexWrap: 'wrap' as const }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: colors.text2, cursor: 'pointer', fontWeight: 600 }}>
                  <input type="checkbox" checked={newShift24h} onChange={e => setNewShift24h(e.target.checked)} style={{ width: 16, height: 16, accentColor: colors.primary }} />
                  دوام 24 ساعة (دون تأخير أو عمل إضافي)
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {!newShift24h && newShiftStart && newShiftEnd && newDur > 0 && (
                    <span style={{ fontSize: 12, color: colors.text3 }}>من {t12(newShiftStart)} إلى {t12(newShiftEnd)} · {durLabel(newDur)}{crossesMidnight(newShiftStart, newShiftEnd) ? ' · ينتهي اليوم الثاني' : ''}</span>
                  )}
                  <button onClick={addShift} disabled={savingShift} style={{ ...btnPrimary, padding: '10px 18px' }}>{savingShift ? 'جاري الإضافة...' : 'إضافة الوردية'}</button>
                </div>
              </div>
            </div>
          </div>

          {/* 2) شفت كل موظف */}
          <div style={box}>
            {step(2, 'وردية كل موظف وإجازته', 'اختر لكل موظف ورديته الأساسية، وإذا كانت له وردية مختلفة في يوم معيّن (مثل الجمعة) فحدّدها من «وردية مختلفة لأيام معيّنة». ونظام إجازته: أيام ثابتة، أو أسبوع بعد أسبوع، أو أيام تحددها، أو رصيد شهري. لا يُحتسب يوم إجازته غياباً، وإذا حضر فيه يُحتسب يوماً إضافياً. وتغيير الوردية أثناء دوامه يُطبَّق من دوامه التالي.',
              staffList.length === 0 ? null : withoutShift ? pill(`${withoutShift} بدون وردية`, 'warn') : pill('جميع الموظفين مرتبطون بوردية', 'ok'))}
            {staffList.length === 0 ? (
              <div style={{ fontSize: 13, color: colors.text4, textAlign: 'center' as const, padding: 16 }}>لا يوجد موظفون نشطون في هذا الفرع</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
                {shifts.length === 0 && <div style={{ fontSize: 12.5, color:'#b45309', background:'#fffbeb', border:'1px solid #fde68a', borderRadius: 10, padding: '9px 12px' }}>أضف وردية في الخطوة 1 أولاً، ثم يمكنك ربط الموظفين بها.</div>}
                {staffList.map((x: any) => (
                  <div key={x.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', border:`1px solid ${x.shift_id ? colors.border : '#fde68a'}`, background: x.shift_id ? colors.surface : '#fffdf5', borderRadius: 12, flexWrap: 'wrap' as const }}>
                    <span style={{ width: 34, height: 34, borderRadius: 10, background: colors.primaryLight, color: colors.primary, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{(x.name || '?').trim()[0]}</span>
                    <div style={{ flex: 1, minWidth: 120 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: colors.text }}>{x.name}</div>
                      {!x.shift_id && <div style={{ fontSize: 11.5, color:'#b45309', marginTop: 2 }}>بدون وردية — لا يُحتسب له تأخير أو عمل إضافي، ويمكنه الانصراف في أي وقت</div>}
                    </div>
                    <select value={x.shift_id || ''} onChange={e => assignShift(x.id, e.target.value)} disabled={shifts.length === 0} style={{ ...inp(), width: 250, maxWidth: '100%' }}>
                      <option value="">بدون وردية</option>
                      {shifts.map((sh: any) => (<option key={sh.id} value={sh.id}>{sh.name}{sh.is_24h ? ' (24 ساعة)' : ` (${t12(sh.start_time)} – ${t12(sh.end_time)})`}</option>))}
                    </select>
                    <StaffDayShiftsEditor staff={x} shifts={shifts} onPatch={p => patchOff(x.id, p)} />
                    <StaffDaysOffEditor staff={x} onPatch={p => patchOff(x.id, p)} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 3) التأخير والخصم */}
          {late && (() => {
            const g = Number(late.grace || 0), rate = Number(late.perHour || 0)
            const exLate = Math.max(g + 4, 14)
            const exAmount = Math.round(rate * exLate / 60 * 100) / 100
            return (
              <div style={box}>
                {step(3, 'التأخير والخصم', 'لا يُسجَّل التأخير ضمن وقت السماح، وإذا تجاوزه يُحتسب التأخير كاملاً من بداية الوردية، ويُخصم من الراتب بالنسبة والتناسب. ويمكنك إلغاء خصم أي يوم من تبويب التقرير.',
                  rate > 0 ? pill(`${rate} ⃁ للساعة`, 'ok') : pill('بدون خصم', 'muted'))}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12 }}>
                  <div>
                    <label style={fieldLabel}>وقت السماح</label>
                    <div style={{ position: 'relative' as const }}>
                      <NumberInput min={0} max={120} inputMode="numeric" value={late.grace} onChange={e => setLate({ ...late, grace: e.target.value })} placeholder="0" style={{ ...inp(), paddingInlineEnd: 60 }} />
                      <span style={{ position: 'absolute' as const, insetInlineEnd: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: colors.text4 }}>دقيقة</span>
                    </div>
                  </div>
                  <div>
                    <label style={fieldLabel}>الخصم لكل ساعة تأخير</label>
                    <div style={{ position: 'relative' as const }}>
                      <NumberInput min={0} step="0.5" inputMode="decimal" value={late.perHour} onChange={e => setLate({ ...late, perHour: e.target.value })} placeholder="فارغ = دون خصم" style={{ ...inp(), paddingInlineEnd: 50 }} />
                      <span style={{ position: 'absolute' as const, insetInlineEnd: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: colors.text4 }}>⃁</span>
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: 12.5, color: colors.text2, background: colors.bg, borderRadius: 10, padding: '11px 14px', marginTop: 12, lineHeight: 1.8 }}>
                  {g > 0 ? <>لا يُسجَّل التأخير حتى <b>{g} دقيقة</b>. </> : <>يُسجَّل أي تأخير من الدقيقة الأولى. </>}
                  {rate > 0
                    ? <>مثال: تأخر <b>{exLate} دقيقة</b> ← خصم <b style={{ color: colors.danger }}>{exAmount} ⃁</b> ({rate} × {exLate} ÷ 60).</>
                    : <>دون مبلغ للساعة: يُسجَّل التأخير دون خصم.</>}
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
                  <button onClick={saveLate} disabled={savingLate} style={{ ...btnPrimary, padding: '10px 22px' }}>{savingLate ? 'جاري الحفظ...' : 'حفظ'}</button>
                </div>
              </div>
            )
          })()}

          {/* 4) العمل الإضافي */}
          {ot && (
          <div style={box}>
            {step(4, 'العمل الإضافي', 'يُحتسب من وقت انصراف الموظف بعد نهاية ورديته، ويظهر في كشف راتبه وفي تقرير الموظفين لديك.',
              ot.mode === 'off' ? pill('موقّف', 'muted') : ot.mode === 'fixed' ? pill(ot.fixedRate ? `${ot.fixedRate} ⃁ للساعة` : 'مبلغ ثابت', 'ok') : pill(`تلقائي × ${ot.multiplier}`, 'ok'))}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 8, marginBottom: 14 }}>
              {([
                ['auto', 'تلقائي من الراتب', 'أجر الساعة = الراتب الأساسي ÷ 30 ÷ ساعات الوردية × المضاعف'],
                ['fixed', 'مبلغ ثابت للساعة', 'نفس المبلغ لكل ساعة إضافية لكل الموظفين'],
                ['off', 'بدون عمل إضافي', 'لا يُحتسب أي وقت إضافي'],
              ] as const).map(([v, title, sub]) => (
                <label key={v} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '12px 14px', borderRadius: 12, cursor: 'pointer', border: `1.5px solid ${ot.mode === v ? colors.primary : colors.border}`, background: ot.mode === v ? colors.primaryLight : colors.surface }}>
                  <input type="radio" name="ot-mode" checked={ot.mode === v} onChange={() => setOt({ ...ot, mode: v })} style={{ marginTop: 3, accentColor: colors.primary }} />
                  <span>
                    <span style={{ display: 'block', fontSize: 13.5, fontWeight: 700, color: colors.text }}>{title}</span>
                    <span style={{ display: 'block', fontSize: 11.5, color: colors.text3, marginTop: 3, lineHeight: 1.6 }}>{sub}</span>
                  </span>
                </label>
              ))}
            </div>

            {ot.mode !== 'off' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12, marginBottom: 12 }}>
                {ot.mode === 'auto' ? (
                  <div>
                    <label style={fieldLabel}>المضاعف</label>
                    <select value={ot.multiplier} onChange={e => setOt({ ...ot, multiplier: e.target.value })} style={inp()}>
                      {['1', '1.25', '1.5', '1.75', '2'].map(m => <option key={m} value={m}>× {m}{m === '1.5' ? ' (نظام العمل)' : ''}</option>)}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label style={fieldLabel}>مبلغ الساعة</label>
                    <div style={{ position: 'relative' as const }}>
                      <NumberInput min="0" step="0.5" value={ot.fixedRate} onChange={e => setOt({ ...ot, fixedRate: e.target.value })} placeholder="مثلاً 25" style={{ ...inp(), paddingInlineEnd: 50 }} />
                      <span style={{ position: 'absolute' as const, insetInlineEnd: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: colors.text4 }}>⃁</span>
                    </div>
                  </div>
                )}
                <div>
                  <label style={fieldLabel}>أقل مدة تُحتسب في اليوم</label>
                  <div style={{ position: 'relative' as const }}>
                    <NumberInput min="0" max="240" value={ot.minMinutes} onChange={e => setOt({ ...ot, minMinutes: e.target.value })} style={{ ...inp(), paddingInlineEnd: 60 }} />
                    <span style={{ position: 'absolute' as const, insetInlineEnd: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: colors.text4 }}>دقيقة</span>
                  </div>
                </div>
              </div>
            )}

            {ot.mode === 'auto' && (
              <div style={{ fontSize: 12.5, color: colors.text2, background: colors.bg, borderRadius: 10, padding: '11px 14px', marginBottom: 12, lineHeight: 1.8 }}>
                مثال: راتب أساسي 3,000 ووردية 8 ساعات ← أجر الساعة {Math.round(3000 / 30 / 8 * 100) / 100} ⃁ ← الساعة الإضافية <b>{Math.round(3000 / 30 / 8 * (Number(ot.multiplier) || 1.5) * 100) / 100} ⃁</b>
              </div>
            )}
            {ot.mode !== 'off' && (
              <div style={{ fontSize: 12, color: colors.text3, marginBottom: 12 }}>إذا انصرف الموظف بعد نهاية ورديته بأقل من {ot.minMinutes || 0} دقيقة، فلا يُحتسب له عمل إضافي في ذلك اليوم.</div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={saveOvertime} disabled={savingOt} style={{ ...btnPrimary, padding: '10px 22px' }}>{savingOt ? 'جاري الحفظ...' : 'حفظ'}</button>
            </div>
          </div>
          )}

        </div>
        )
      })()}
    </>
  )
}
