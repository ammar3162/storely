'use client'
import { colors, font, card, btnPrimary, inp } from '@/lib/ds'
import { fmtTime } from './format'
import type { AttendancePage } from './useAttendance'

export default function ManualCheckoutModal({ m }: { m: AttendancePage }) {
  const { checkoutFor, setCheckoutFor, coTime, setCoTime, coExcused, setCoExcused, savingCo, submitManualCheckout } = m
  return (
    <>
      {checkoutFor && (
        <div onClick={() => !savingCo && setCheckoutFor(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onClick={e => e.stopPropagation()} role="dialog" aria-label="تسجيل انصراف" style={{ ...card, width: '100%', maxWidth: 380, padding: 20 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: colors.text }}>تسجيل انصراف {checkoutFor.name}</div>
            <div style={{ fontSize: 12, color: colors.text3, marginTop: 6, lineHeight: 1.8 }}>
              حضر الساعة {fmtTime(checkoutFor.check_in)} وطلع بدون ما يسجّل انصرافه. اختر وقت انصرافه، وينسجّل إنه من المالك.
            </div>
            <label style={{ fontSize: 11.5, fontWeight: 700, color: colors.text3, display: 'block', margin: '14px 0 6px' }}>وقت الانصراف</label>
            <input type="time" value={coTime} onChange={e => setCoTime(e.target.value)} style={inp()} />
            <div style={{ fontSize: 11, color: colors.text4, marginTop: 5 }}>لو الوقت قبل وقت حضوره، ينحسب على اليوم اللي بعده (الشفت الليلي).</div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: colors.text2, cursor: 'pointer', fontWeight: 600, marginTop: 12 }}>
              <input type="checkbox" checked={coExcused} onChange={e => setCoExcused(e.target.checked)} style={{ width: 16, height: 16, accentColor: colors.primary }} />
              مستأذن (انصراف مبكر بإذنك — بدون أوفر تايم)
            </label>
            <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
              <button onClick={submitManualCheckout} disabled={savingCo || !coTime} style={{ ...btnPrimary, flex: 2, padding: '10px 14px' }}>{savingCo ? 'جاري التسجيل...' : 'تسجيل الانصراف'}</button>
              <button onClick={() => setCheckoutFor(null)} disabled={savingCo} style={{ flex: 1, padding: '10px 14px', borderRadius: 10, border: `1px solid ${colors.border2}`, background: colors.surface, color: colors.text2, fontWeight: 700, cursor: 'pointer', fontFamily: font.family }}>إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
