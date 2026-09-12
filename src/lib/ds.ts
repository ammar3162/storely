// ═══════════════════════════════════════
// Storely Design System — Single Source of Truth
// ═══════════════════════════════════════

export const colors = {
  // Brand — أخضر غامق
  primary:      '#0f766e',
  primaryDark:  '#134e4a',
  primaryLight: '#f0fdfa',
  primaryBorder:'#99f6e4',

  // Semantic
  // موحّد مع صفحة الهبوط التسويقية (LandingPageClient.tsx) — نفس القيم بالضبط
  danger:       '#dc2626',
  dangerLight:  '#fef2f2',
  dangerBorder: '#fecaca',
  warning:      '#f59e0b',
  warningLight: '#fffbeb',
  warningBorder:'#fde68a',
  info:         '#2563eb',
  infoLight:    '#eff6ff',
  infoBorder:   '#dbeafe',

  // Neutral — درجة رمادية دافئة مخصصة (مو رمادي Tailwind الافتراضي) — تناسب طابع "دفتر/سجل" لتطبيق مخزون وبيع
  bg:           '#F7F6F3',
  surface:      '#FFFFFF',
  border:       '#EDEBE4',
  border2:      '#DEDACF',
  text:         '#1C1A16',
  text2:        '#4A453C',
  text3:        '#79736A',
  text4:        '#A39C8F',
  text5:        '#D2CCBF',
}

// زوايا متدرجة حسب كثافة العنصر -- مو زاوية واحدة موحّدة على كل شي
export const radius = {
  xs:  '6px',   // صفوف الجداول، الوسوم الصغيرة، عناصر داخل الجدول
  sm:  '8px',   // الأزرار والحقول
  md:  '10px',
  lg:  '14px',  // البطاقات
  xl:  '18px',  // النوافذ المنبثقة
  full:'999px',
}

export const shadow = {
  sm:  '0 1px 2px rgba(28,26,22,.05)',
  md:  '0 2px 10px rgba(28,26,22,.06)',
  lg:  '0 10px 28px rgba(28,26,22,.10)',
  green:'0 4px 14px rgba(15,118,110,.22)',
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
  border:`1.5px solid ${colors.border2}`,
  borderRadius:radius.md, fontSize:font.base,
  outline:'none', boxSizing:'border-box',
  background:colors.surface, color:colors.text,
  fontFamily:font.family, transition:'border .15s',
  ...extra,
})

export const card: React.CSSProperties = {
  background: colors.surface,
  borderRadius: radius.lg,
  border: `1px solid ${colors.border2}`,
  overflow: 'hidden',
}

export const btnPrimary: React.CSSProperties = {
  display:'flex', alignItems:'center', justifyContent:'center', gap:8,
  padding:'11px 20px',
  background:colors.primary,
  color:'white', border:'none', borderRadius:radius.md,
  fontSize:font.base, fontWeight:700, cursor:'pointer',
  fontFamily:font.family,
  transition:'background .15s',
}

export const btnSecondary: React.CSSProperties = {
  display:'flex', alignItems:'center', justifyContent:'center', gap:8,
  padding:'10px 18px',
  background:colors.surface, color:colors.text2,
  border:`1.5px solid ${colors.border2}`,
  borderRadius:radius.md, fontSize:font.base,
  fontWeight:600, cursor:'pointer', fontFamily:font.family,
  transition:'all .15s',
}

export const btnDanger: React.CSSProperties = {
  display:'flex', alignItems:'center', justifyContent:'center', gap:8,
  padding:'10px 18px',
  background:colors.dangerLight, color:colors.danger,
  border:`1.5px solid ${colors.dangerBorder}`,
  borderRadius:radius.md, fontSize:font.base,
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
  fontSize:font.xl, fontWeight:800,
  color:colors.text, letterSpacing:'-0.4px',
  marginBottom:3,
}

export const pageSub: React.CSSProperties = {
  fontSize:font.sm, color:colors.text4,
}
