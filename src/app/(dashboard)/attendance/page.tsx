'use client'
import { StorelyMetricStrip } from '@/components/ui'
import { FeatureIcon } from '@/components/ui/feature-icon'
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
          <FeatureIcon name="🔒" size={20} />
          <div>
            <div style={{fontSize:13,fontWeight:800,color:colors.text}}>وضع قراءة فقط — ميزة «الحضور والرواتب» غير مفعّلة</div>
            <div style={{fontSize:12,color:colors.text3}}>سجلاتك السابقة محفوظة ويمكنك الاطلاع عليها، لكن لا يمكنك تسجيل حضور جديد أو تعديل الورديات إلا بعد تجديد الاشتراك</div>
          </div>
        </div>
      )}

      {monthStats && (
        <StorelyMetricStrip className="mb-4" metrics={[
          { label: 'معدّل الحضور', value: monthStats.attendanceRate !== null ? `${monthStats.attendanceRate}%` : '—', helper: 'هذا الشهر' },
          { label: 'إجمالي الخصومات', value: monthStats.totalPenalty > 0 ? `${monthStats.totalPenalty} ⃁` : '—', helper: 'هذا الشهر', tone: monthStats.totalPenalty > 0 ? 'danger' : 'neutral' },
          { label: 'الأكثر تأخيراً', value: monthStats.mostLate ? monthStats.mostLate.name : '—', helper: monthStats.mostLate ? `${monthStats.mostLate.minutes} دقيقة هذا الشهر` : 'هذا الشهر', tone: monthStats.mostLate ? 'warning' : 'neutral' },
        ]} />
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[{ id: 'report', label: 'التقرير' }, { id: 'settings', label: 'الورديات والغرامات' }].map(t => (
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
