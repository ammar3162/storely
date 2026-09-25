// ═══════════════════════════════════════
// Storely Design System — Single Source of Truth
// ═══════════════════════════════════════

export const colors = {
  // Brand — أخضر غامق
  primary:      '#0f766e',
  primaryDark:  '#115e59',
  primaryLight: '#f0fdfa',
  primaryBorder:'#b2e3df',

  // Semantic
  // موحّد مع صفحة الهبوط التسويقية (LandingPageClient.tsx) — نفس القيم بالضبط
  danger:       '#dc2626',
  dangerLight:  '#fef2f2',
  dangerBorder: '#fecdca',
  warning:      '#b54708',
  warningLight: '#fffbeb',
  warningBorder:'#fedf89',
  info:         '#175cd3',
  infoLight:    '#eff6ff',
  infoBorder:   '#b2ddff',

  // Neutral — درجة رمادية دافئة مخصصة (مو رمادي Tailwind الافتراضي) — تناسب طابع "دفتر/سجل" لتطبيق مخزون وبيع
  bg:           '#F6F7F9',
  surface:      '#FFFFFF',
  border:       '#E6E8EC',
  border2:      '#D5D9DF',
  text:         '#101828',
  text2:        '#344054',
  text3:        '#667085',
  text4:        '#98A2B3',
  text5:        '#D0D5DD',
}

// زوايا متدرجة حسب كثافة العنصر -- مو زاوية واحدة موحّدة على كل شي
export const radius = {
  xs:  '6px',   // صفوف الجداول، الوسوم الصغيرة، عناصر داخل الجدول
  sm:  '8px',   // الأزرار والحقول
  md:  '10px',
  lg:  '12px',  // البطاقات
  xl:  '14px',  // النوافذ المنبثقة
  full:'999px',
}

export const shadow = {
  sm:  '0 1px 2px rgba(16,24,40,.05)',
  md:  '0 1px 3px rgba(16,24,40,.08)',
  lg:  '0 12px 24px rgba(16,24,40,.10)',
  green:'none',
}

// أرقام مصفوفة بعرض ثابت -- مهم فعلياً بتطبيق مخزون/مبيعات (أعمدة كميات وأسعار تترصّ بدقة بالجداول والتقارير)، مو ديكور
export const numeric: React.CSSProperties = {
  fontVariantNumeric: 'tabular-nums',
}

export const font = {
  family: "'IBM Plex Sans Arabic', system-ui, sans-serif",
  xs:  '10px',
  sm:  '12px',
  base:'14px',
  md:  '15px',
  lg:  '18px',
  xl:  '22px',
  xxl: '26px',
}

// Common styles
export const inp = (extra?: object): React.CSSProperties => ({
  width:'100%', padding:'11px 14px',
  border:`1px solid ${colors.border2}`,
  borderRadius:radius.sm, fontSize:font.base,
  outline:'none', boxSizing:'border-box',
  background:colors.surface, color:colors.text,
  fontFamily:font.family, transition:'border .15s',
  ...extra,
})

export const card: React.CSSProperties = {
  background: colors.surface,
  borderRadius: radius.lg,
  border: `1px solid ${colors.border}`,
  overflow: 'hidden',
}

export const btnPrimary: React.CSSProperties = {
  display:'flex', alignItems:'center', justifyContent:'center', gap:8,
  padding:'10px 18px',
  background:colors.primary,
  color:'white', border:'none', borderRadius:radius.sm,
  fontSize:font.base, fontWeight:700, cursor:'pointer',
  fontFamily:font.family,
  transition:'background .15s',
}

export const btnSecondary: React.CSSProperties = {
  display:'flex', alignItems:'center', justifyContent:'center', gap:8,
  padding:'10px 18px',
  background:colors.surface, color:colors.text2,
  border:`1px solid ${colors.border2}`,
  borderRadius:radius.sm, fontSize:font.base,
  fontWeight:600, cursor:'pointer', fontFamily:font.family,
  transition:'all .15s',
}

export const btnDanger: React.CSSProperties = {
  display:'flex', alignItems:'center', justifyContent:'center', gap:8,
  padding:'10px 18px',
  background:colors.dangerLight, color:colors.danger,
  border:`1px solid ${colors.dangerBorder}`,
  borderRadius:radius.sm, fontSize:font.base,
  fontWeight:700, cursor:'pointer', fontFamily:font.family,
}

export const tag = (color:string, bg:string, border:string): React.CSSProperties => ({
  display:'inline-flex', alignItems:'center', gap:4,
  padding:'3px 10px', borderRadius:radius.full,
  fontSize:font.xs, fontWeight:700,
  color, background:bg, border:`1px solid ${border}`,
  whiteSpace:'nowrap',
})

export const pageHeader: React.CSSProperties = {
  display:'flex', justifyContent:'space-between',
  alignItems:'flex-start', marginBottom:20,
  flexWrap:'wrap', gap:12,
}

export const pageTitle: React.CSSProperties = {
  fontSize:font.xl, fontWeight:700,
  color:colors.text, letterSpacing:'-0.2px',
  marginBottom:3,
}

export const pageSub: React.CSSProperties = {
  fontSize:'13px', color:colors.text3,
}
