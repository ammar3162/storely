'use client'
export const dynamic = 'force-dynamic'
import PageIcon from '@/components/PageIcon'
import { colors, font, card, pageTitle, pageSub } from '@/lib/ds'
import { useAttendance } from './_parts/useAttendance'
import ReportTab from './_parts/ReportTab'
import SettingsTab from './_parts/SettingsTab'
import ManualCheckoutModal from './_parts/ManualCheckoutModal'

export default function AttendancePage() {
  const m = useAttendance()
  const { tab, setTab, locked, monthStats } = m

  return (
    <div style={{ fontFamily: font.family, direction: 'rtl' }}>
      <div style={{ marginBottom: 16 }}>
        <h1 style={pageTitle}><PageIcon/>الحضور والانصراف</h1>
        <p style={pageSub}>سجل حضور الفريق اليومي — يتحقق تلقائياً من موقعهم الجغرافي ويحسب التأخير</p>
      </div>

      {locked && (
        <div style={{...card,padding:14,marginBottom:18,background:colors.warningLight,border:`1px solid ${colors.warningBorder}`,display:'flex',alignItems:'center',gap:10}}>
          <span style={{fontSize:20}}>🔒</span>
          <div>
            <div style={{fontSize:13,fontWeight:800,color:colors.text}}>وضع قراءة فقط — انتهى اشتراك ميزة "إدارة الموظفين الكاملة"</div>
            <div style={{fontSize:12,color:colors.text3}}>سجلاتك القديمة محفوظة وتقدر تشوفها، بس ما تقدر تسجّل حضور جديد أو تعدّل الشفتات إلا بعد تجديد الاشتراك</div>
          </div>
        </div>
      )}

      {monthStats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 18 }}>
          <div style={{ ...card, padding: '14px', textAlign: 'center' as const }}>
            <div style={{ fontSize: 10, color: colors.text4, fontWeight: 600, marginBottom: 4 }}>معدّل الحضور — هذا الشهر</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: colors.text }}>{monthStats.attendanceRate !== null ? `${monthStats.attendanceRate}%` : '—'}</div>
          </div>
          <div style={{ ...card, padding: '14px', textAlign: 'center' as const, background: monthStats.totalPenalty>0?colors.dangerLight:undefined, border: monthStats.totalPenalty>0?`1px solid ${colors.dangerBorder}`:undefined }}>
            <div style={{ fontSize: 10, color: monthStats.totalPenalty>0?colors.danger:colors.text4, fontWeight: 600, marginBottom: 4 }}>إجمالي الخصومات — هذا الشهر</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: monthStats.totalPenalty>0?colors.danger:colors.text }}>{monthStats.totalPenalty>0?`${monthStats.totalPenalty} ⃁`:'—'}</div>
          </div>
          <div style={{ ...card, padding: '14px', textAlign: 'center' as const, background: monthStats.mostLate?colors.warningLight:undefined, border: monthStats.mostLate?`1px solid ${colors.warningBorder}`:undefined }}>
            <div style={{ fontSize: 10, color: monthStats.mostLate?colors.warning:colors.text4, fontWeight: 600, marginBottom: 4 }}>الأكثر تأخيراً — هذا الشهر</div>
            <div style={{ fontSize: monthStats.mostLate?15:22, fontWeight: 900, color: monthStats.mostLate?colors.warning:colors.text }}>{monthStats.mostLate ? `${monthStats.mostLate.name} (${monthStats.mostLate.minutes} د)` : '—'}</div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[{ id: 'report', label: '📋 التقرير' }, { id: 'settings', label: '⚙️ الشفتات والغرامات' }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            style={{ padding: '9px 16px', borderRadius: 99, border: `1.5px solid ${tab === t.id ? colors.primary : colors.border2}`, background: tab === t.id ? colors.primaryLight : colors.surface, color: tab === t.id ? colors.primary : colors.text3, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: font.family }}>
            {t.label}
          </button>
        ))}
      </div>

      <ReportTab m={m}/>
      <SettingsTab m={m}/>
      <ManualCheckoutModal m={m}/>
    </div>
  )
}
