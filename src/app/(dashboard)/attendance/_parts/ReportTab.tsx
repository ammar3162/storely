'use client'
import { FeatureIcon } from '@/components/ui/feature-icon'
import { colors, font, card, btnPrimary, inp } from '@/lib/ds'
import { ListSkeleton } from '@/components/PageSkeleton'
import { fmtTime, fmtDay, fmtMinutes } from './format'
import type { AttendancePage } from './useAttendance'

export default function ReportTab({ m }: { m: AttendancePage }) {
  const { tab, periodMode, setPeriodMode, date, setDate, rangeFrom, setRangeFrom, rangeTo, setRangeTo, staffFilter, setStaffFilter, rows, rangeRows, loading, exporting, staffList, presentCount, absentCount, offCount, statusColor, statusBg, exportRangePdf, checkOutCell, penaltyCell } = m
  return (
    <>
      {tab === 'report' && (
        <>
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' as const, gap: 10 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const, alignItems: 'center', width: '100%' }}>
              <div style={{ display: 'flex', gap: 2, padding: 3, background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 10 }}>
              {[{ id: 'day', label: 'يوم واحد' }, { id: 'range', label: 'فترة مخصصة' }].map(m => (
                <button key={m.id} onClick={() => setPeriodMode(m.id as any)} aria-pressed={periodMode === m.id}
                  style={{ padding: '7px 14px', whiteSpace: 'nowrap', borderRadius: 8, border: 'none', background: periodMode === m.id ? colors.surface : 'transparent', boxShadow: periodMode === m.id ? '0 1px 2px rgba(15,23,42,.08)' : 'none', color: periodMode === m.id ? colors.text : colors.text3, fontSize: 13, fontWeight: periodMode === m.id ? 800 : 600, cursor: 'pointer', fontFamily: font.family }}>
                  {m.label}
                </button>
              ))}
              </div>
              <select value={staffFilter} onChange={e => setStaffFilter(e.target.value)} style={{ ...inp(), flex: '1 1 150px', width: 'auto', minWidth: 0, padding: '7px 10px', fontSize: 13 }}>
                <option value="">كل الموظفين</option>
                {staffList.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            {periodMode === 'day' ? (
              <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ ...inp(), width: 170, textAlign: 'center' as const }} />
            ) : (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' as const }}>
                <input type="date" value={rangeFrom} onChange={e => setRangeFrom(e.target.value)} style={{ ...inp(), width: 140, textAlign: 'center' as const }} />
                <span style={{ color: colors.text4, fontSize: 12 }}>إلى</span>
                <input type="date" value={rangeTo} onChange={e => setRangeTo(e.target.value)} style={{ ...inp(), width: 140, textAlign: 'center' as const }} />
                <button onClick={exportRangePdf} disabled={exporting || rangeRows.length===0} style={{ ...btnPrimary, padding: '9px 16px', fontSize: 13 }}>
                  {exporting ? '...' : 'تصدير PDF'}
                </button>
              </div>
            )}
          </div>

          {periodMode === 'day' ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${offCount ? 3 : 2},1fr)`, gap: 8, marginBottom: 16 }}>
                <div style={{ ...card, padding: '12px', textAlign: 'center' as const }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: presentCount ? '#047857' : colors.text }}>{presentCount}</div>
                  <div style={{ fontSize: 12, color: colors.text3, fontWeight: 600, marginTop: 2 }}>حضروا اليوم</div>
                </div>
                <div style={{ ...card, padding: '12px', textAlign: 'center' as const }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: absentCount ? colors.danger : colors.text }}>{absentCount}</div>
                  <div style={{ fontSize: 12, color: colors.text3, fontWeight: 600, marginTop: 2 }}>لم يحضروا</div>
                </div>
                {offCount > 0 && (
                  <div style={{ ...card, padding: '12px', textAlign: 'center' as const }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: colors.text }}>{offCount}</div>
                    <div style={{ fontSize: 12, color: colors.text3, fontWeight: 600, marginTop: 2 }}>بإجازة</div>
                  </div>
                )}
              </div>

              <div style={{ ...card, overflow: 'hidden' }}>
                {loading ? (
                  <ListSkeleton/>
                ) : rows.length === 0 ? (
                  <div style={{ padding: 40, textAlign: 'center' as const, color: colors.text4, fontSize: 12 }}>لا يوجد موظفون نشطون في هذا الفرع</div>
                ) : (
                  <div style={{ overflowX: 'auto' as const }}>
                    <table className="m-cards" style={{ width: '100%', borderCollapse: 'collapse' as const, fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: colors.bg, borderBottom: `1px solid ${colors.border2}` }}>
                          <th style={{ padding: '10px 14px', textAlign: 'right' as const, color: colors.text3, fontWeight: 700, fontSize: 11 }}>الموظف</th>
                          <th style={{ padding: '10px 14px', textAlign: 'right' as const, color: colors.text3, fontWeight: 700, fontSize: 11 }}>الحالة</th>
                          <th style={{ padding: '10px 14px', textAlign: 'right' as const, color: colors.text3, fontWeight: 700, fontSize: 11 }}>وقت الحضور</th>
                          <th style={{ padding: '10px 14px', textAlign: 'right' as const, color: colors.text3, fontWeight: 700, fontSize: 11 }}>وقت الانصراف</th>
                          <th style={{ padding: '10px 14px', textAlign: 'right' as const, color: colors.text3, fontWeight: 700, fontSize: 11 }}>إجمالي الساعات</th>
                          <th style={{ padding: '10px 14px', textAlign: 'right' as const, color: colors.text3, fontWeight: 700, fontSize: 11 }}>التأخير</th>
                          <th style={{ padding: '10px 14px', textAlign: 'right' as const, color: colors.text3, fontWeight: 700, fontSize: 11 }}>الخصم</th>
                          <th style={{ padding: '10px 14px', textAlign: 'right' as const, color: colors.text3, fontWeight: 700, fontSize: 11 }}>العمل الإضافي</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r, i) => (
                          <tr key={r.staff_id} className={(!r.check_in && !(r.penalty_original ?? r.penalty_amount) ? 'm-off' : undefined)} style={{ borderBottom: i < rows.length - 1 ? `1px solid ${colors.border}` : 'none' }}>
                            <td style={{ padding: '11px 14px', fontWeight: 700, color: colors.text }}>{r.name}{r.shift_warning && <span title={r.shift_warning === 'none' ? 'الموظف غير مرتبط بوردية — لا يُحتسب له تأخير أو عمل إضافي' : 'وردية 24 ساعة — لا يُحتسب تأخير أو عمل إضافي'} style={{ marginRight: 6, fontSize: 10, fontWeight: 700, color:'#b45309', background:'#fffbeb', border:'1px solid #fde68a', borderRadius: 99, padding: '2px 8px', whiteSpace: 'nowrap' as const }}>{r.shift_warning === 'none' ? 'بدون وردية' : 'وردية 24 ساعة'}</span>}</td>
                            <td data-label="الحالة" style={{ padding: '11px 14px' }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: statusColor(r.status), background: statusBg(r.status), padding: '3px 10px', borderRadius: 99 }}>{r.status}</span>
                            </td>
                            <td data-label="وقت الحضور" style={{ padding: '11px 14px', color: colors.text2 }}>
                              {fmtTime(r.check_in)}
                            </td>
                            <td data-label="وقت الانصراف" style={{ padding: '11px 14px', color: colors.text2 }}>
                              {checkOutCell(r, r.name)}
                            </td>
                            <td data-label="إجمالي الساعات" style={{ padding: '11px 14px', color: colors.text2, fontWeight: 600 }}>
                              {r.hours_worked !== null ? `${r.hours_worked} ساعة` : '—'}
                            </td>
                            <td data-label="التأخير" style={{ padding: '11px 14px', color: r.late_minutes ? colors.warning : colors.text4 }}>
                              {r.late_minutes ? `${r.late_minutes} دقيقة` : '—'}
                            </td>
                            <td data-label="الخصم" style={{ padding: '11px 14px', fontWeight: 700 }}>
                              {penaltyCell(r)}
                            </td>
                            <td data-label="العمل الإضافي" style={{ padding: '11px 14px', color: r.overtime_minutes ? colors.primary : colors.text4, fontWeight: 700 }}>
                              {r.overtime_minutes ? <>{fmtMinutes(r.overtime_minutes)}{r.overtime_pay ? <span style={{ fontSize: 11, fontWeight: 600, color: colors.text3 }}> · {r.overtime_pay} ⃁</span> : null}</> : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div style={{ ...card, overflow: 'hidden' }}>
              {loading ? (
                <ListSkeleton/>
              ) : rangeRows.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center' as const, color: colors.text4, fontSize: 12 }}>لا توجد بيانات لهذه الفترة</div>
              ) : (
                <div style={{ overflowX: 'auto' as const }}>
                  <table className="m-cards" style={{ width: '100%', borderCollapse: 'collapse' as const, fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: colors.bg, borderBottom: `1px solid ${colors.border2}` }}>
                        <th style={{ padding: '10px 14px', textAlign: 'right' as const, color: colors.text3, fontWeight: 700, fontSize: 11 }}>الموظف</th>
                        <th style={{ padding: '10px 14px', textAlign: 'center' as const, color: colors.text3, fontWeight: 700, fontSize: 11 }}>أيام الحضور</th>
                        <th style={{ padding: '10px 14px', textAlign: 'center' as const, color: colors.text3, fontWeight: 700, fontSize: 11 }}>أيام الغياب</th>
                        <th style={{ padding: '10px 14px', textAlign: 'center' as const, color: colors.text3, fontWeight: 700, fontSize: 11 }}>إجازات</th>
                        <th style={{ padding: '10px 14px', textAlign: 'center' as const, color: colors.text3, fontWeight: 700, fontSize: 11 }}>إجمالي التأخير</th>
                        <th style={{ padding: '10px 14px', textAlign: 'center' as const, color: colors.text3, fontWeight: 700, fontSize: 11 }}>إجمالي الخصومات</th>
                        <th style={{ padding: '10px 14px', textAlign: 'center' as const, color: colors.text3, fontWeight: 700, fontSize: 11 }}>العمل الإضافي</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rangeRows.map((r, i) => (
                        <tr key={r.staff_id} style={{ borderBottom: i < rangeRows.length - 1 ? `1px solid ${colors.border}` : 'none' }}>
                          <td style={{ padding: '11px 14px', fontWeight: 700, color: colors.text }}>{r.name}{r.shift_warning && <span title={r.shift_warning === 'none' ? 'الموظف غير مرتبط بوردية — لا يُحتسب له تأخير أو عمل إضافي' : 'وردية 24 ساعة — لا يُحتسب تأخير أو عمل إضافي'} style={{ marginRight: 6, fontSize: 10, fontWeight: 700, color:'#b45309', background:'#fffbeb', border:'1px solid #fde68a', borderRadius: 99, padding: '2px 8px', whiteSpace: 'nowrap' as const }}>{r.shift_warning === 'none' ? 'بدون وردية' : 'وردية 24 ساعة'}</span>}</td>
                          <td data-label="أيام الحضور" style={{ padding: '11px 14px', textAlign: 'center' as const, color: colors.primary, fontWeight: 700 }}>{r.days_present}</td>
                          <td data-label="أيام الغياب" style={{ padding: '11px 14px', textAlign: 'center' as const, color: r.days_absent ? colors.danger : colors.text4, fontWeight: 700 }}>{r.days_absent || '—'}</td>
                          <td data-label="إجازات" style={{ padding: '11px 14px', textAlign: 'center' as const, color: r.days_off ? '#1d4ed8' : colors.text4, fontWeight: 700 }}>
                            {r.days_off || '—'}{r.extra_days ? <div style={{ fontSize: 10.5, color: colors.primary, fontWeight: 700 }}>+{r.extra_days} يوم إضافي</div> : null}
                          </td>
                          <td data-label="إجمالي التأخير" style={{ padding: '11px 14px', textAlign: 'center' as const, color: r.total_late_minutes ? colors.warning : colors.text4 }}>{r.total_late_minutes ? `${r.total_late_minutes} دقيقة` : '—'}</td>
                          <td data-label="إجمالي الخصومات" style={{ padding: '11px 14px', textAlign: 'center' as const, color: r.total_penalty ? colors.danger : colors.text4, fontWeight: 700 }}>{r.total_penalty ? `${r.total_penalty} ⃁` : '—'}</td>
                          <td data-label="العمل الإضافي" style={{ padding: '11px 14px', textAlign: 'center' as const, color: r.total_overtime_minutes ? colors.primary : colors.text4, fontWeight: 700 }}>
                            {r.total_overtime_minutes ? <>{fmtMinutes(r.total_overtime_minutes)}{r.total_overtime_pay ? <div style={{ fontSize: 11, fontWeight: 600, color: colors.text3 }}>{r.total_overtime_pay} ⃁</div> : null}</> : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {!loading && rangeRows[0]?.days && (
                <div style={{ borderTop: `1px solid ${colors.border2}` }}>
                  <div style={{ padding: '12px 14px', fontWeight: 800, fontSize: 13, color: colors.text }}><span style={{display:"inline-flex",alignItems:"center",gap:6}}><FeatureIcon name="📅" size={15} /></span> السجل اليومي — {rangeRows[0].name}{rangeRows[0].shift_warning && <span style={{ marginRight: 8, fontSize: 11, fontWeight: 600, color:'#b45309' }}>⚠️ {rangeRows[0].shift_warning === 'none' ? 'غير مرتبط بوردية' : 'وردية 24 ساعة'} — لا يُحتسب له تأخير أو عمل إضافي. اربطه بوردية من تبويب الإعدادات.</span>}</div>
                  <div style={{ overflowX: 'auto' as const }}>
                    <table className="m-cards" style={{ width: '100%', borderCollapse: 'collapse' as const, fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: colors.bg, borderBottom: `1px solid ${colors.border2}` }}>
                          {['التاريخ', 'الحالة', 'الحضور', 'الانصراف', 'الساعات', 'التأخير', 'الخصم', 'العمل الإضافي'].map(h => (
                            <th key={h} style={{ padding: '10px 14px', textAlign: 'right' as const, color: colors.text3, fontWeight: 700, fontSize: 11, whiteSpace: 'nowrap' as const }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rangeRows[0].days.map((d: any, i: number) => (
                          <tr key={d.date} className={(!d.check_in && !(d.penalty_original ?? d.penalty_amount) ? 'm-off' : undefined)} style={{ borderBottom: i < rangeRows[0].days.length - 1 ? `1px solid ${colors.border}` : 'none', opacity: d.check_in ? 1 : 0.6 }}>
                            <td style={{ padding: '10px 14px', fontWeight: 700, color: colors.text, whiteSpace: 'nowrap' as const }}>{fmtDay(d.date)}</td>
                            <td data-label="الحالة" style={{ padding: '10px 14px' }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: statusColor(d.status), background: statusBg(d.status), padding: '3px 10px', borderRadius: 99, whiteSpace: 'nowrap' as const }}>{d.status === 'لم يحضر' ? 'غياب' : d.status}</span>
                            </td>
                            <td data-label="الحضور" style={{ padding: '10px 14px', color: colors.text2 }}>{fmtTime(d.check_in)}</td>
                            <td data-label="الانصراف" style={{ padding: '10px 14px', color: colors.text2 }}>
                              {checkOutCell(d, rangeRows[0].name)}
                            </td>
                            <td data-label="الساعات" style={{ padding: '10px 14px', color: colors.text2, fontWeight: 600 }}>{d.hours_worked !== null ? `${d.hours_worked} ساعة` : '—'}</td>
                            <td data-label="التأخير" style={{ padding: '10px 14px', color: d.late_minutes ? colors.warning : colors.text4 }}>{d.late_minutes ? `${d.late_minutes} دقيقة` : '—'}</td>
                            <td data-label="الخصم" style={{ padding: '10px 14px', fontWeight: 700 }}>{penaltyCell(d)}</td>
                            <td data-label="العمل الإضافي" style={{ padding: '10px 14px', color: d.overtime_minutes ? colors.primary : colors.text4, fontWeight: 700 }}>
                              {d.overtime_minutes ? <>{fmtMinutes(d.overtime_minutes)}{d.overtime_pay ? <span style={{ fontSize: 11, fontWeight: 600, color: colors.text3 }}> · {d.overtime_pay} ⃁</span> : null}</> : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {!loading && !staffFilter && rangeRows.length > 0 && (
                <div style={{ padding: '10px 14px', fontSize: 11, color: colors.text4, borderTop: `1px solid ${colors.border}` }}><span style={{display:"inline-flex",alignItems:"center",gap:6}}><FeatureIcon name="💡" size={15} /></span> اختر موظفاً من القائمة أعلاه لعرض سجله يوماً بيوم</div>
              )}
            </div>
          )}
        </>
      )}
    </>
  )
}
