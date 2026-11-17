import type { CSSProperties } from 'react'

// تصميم تطبيق الموظف «كاونتر» بألوان نظام Storely الموحّد (الكحلي — src/components/ui/design-tokens): لون ستورلي بس للزر الأساسي والعنصر المختار،
// والإيصالات (الإقفال وكشف الراتب) بأرقام خط الإيصال وخط متقطع.
// بأسلوب أبل (2026-11-17): خلفية #F5F5F7 وبطاقات بيضاء بدون حدود، نص أسود، والكحلي للزر الأساسي والمختار
export const C = {
  bg: '#F5F5F7',        // خلفية الصفحة
  card: '#ffffff',      // البطاقات
  raised: '#E8E8ED',    // أزرار ثانوية، مسار التبويبات، خلفية الأيقونات
  line: '#E3E3E8',      // الخطوط الفاصلة
  t1: '#1D1D1F',        // النص الأساسي
  t2: '#424245',        // النص الثانوي
  t3: '#6E6E73',        // الوصف والأيقونات
  accent: '#203640',    // لون ستورلي: الزر الأساسي والمختار
  accentInk: '#203640', // نص بلون ستورلي على خلفية فاتحة
  accentSoft: '#E8E8ED',
  neg: '#B91C1C', negSoft: '#FEF2F2',
  pos: '#047857', posSoft: '#ECFDF5',
  warn: '#b45309', warnSoft: '#fffbeb',
  cut: '#D2D2D7',       // خط الإيصال المتقطع
} as const

export const MONO = "'IBM Plex Mono', ui-monospace, monospace"

export const card: CSSProperties = { background: C.card, border: 'none', borderRadius: 20 }

export const btnPrimary: CSSProperties = {
  width: '100%', height: 50, background: C.accent, color: '#fff', border: 'none', borderRadius: 999,
  fontSize: 17, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
}

export const btnSecondary: CSSProperties = {
  ...btnPrimary, background: C.raised, color: C.t1, border: 'none', fontWeight: 500,
}

export const sectionLabel: CSSProperties = { fontSize: 13, fontWeight: 500, color: C.t2, margin: '24px 16px 8px' }

export const iconBox: CSSProperties = {
  width: 36, height: 36, borderRadius: 10, background: C.raised, color: C.t1,
  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
}

// أرقام الإيصال: خط ثابت العرض، من اليسار لليمين
export const receiptNum: CSSProperties = { fontFamily: MONO, fontVariantNumeric: 'tabular-nums', direction: 'ltr', unicodeBidi: 'isolate' }
// بقية الأرقام: نفس خط الواجهة بس بعرض ثابت
export const num: CSSProperties = { fontVariantNumeric: 'tabular-nums', direction: 'ltr', unicodeBidi: 'isolate' }

// ورقة الإيصال: بيضاء بحافة سفلية مسننة (الحافة بعنصر مستقل <ReceiptEdge/>)
export const paper: CSSProperties = {
  background: '#fff', padding: '22px 20px 20px', position: 'relative',
  boxShadow: '0 1px 2px rgba(0,0,0,.05), 0 8px 20px rgba(0,0,0,.05)',
}
export const receiptEdge: CSSProperties = {
  height: 8, marginTop: -1,
  background: 'radial-gradient(circle 6px at 8px 8px, transparent 98%, #fff) -8px 0 / 16px 8px repeat-x',
  filter: 'drop-shadow(0 3px 2px rgba(0,0,0,.04))',
}
export const cutLine: CSSProperties = { borderTop: `1.5px dashed ${C.cut}`, margin: '10px 0' }
