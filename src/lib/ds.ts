import { storelyTokens } from '@/components/ui/design-tokens'

// ═══════════════════════════════════════
// Storely Design System — Single Source of Truth
// ═══════════════════════════════════════

export const colors = {
  // Brand — أخضر غامق
  primary:      storelyTokens.color.navy,
  primaryDark:  storelyTokens.color.navyHover,
  primaryLight: storelyTokens.color.background,
  primaryBorder:storelyTokens.color.border,

  // Semantic
  // موحّد مع صفحة الهبوط التسويقية (LandingPageClient.tsx) — نفس القيم بالضبط
  danger:       storelyTokens.color.danger,
  dangerLight:  storelyTokens.color.dangerBg,
  dangerBorder: storelyTokens.color.dangerBorder,
  warning:      storelyTokens.color.warning,
  warningLight: storelyTokens.color.warningBg,
  warningBorder:storelyTokens.color.warningBorder,
  info:         storelyTokens.color.info,
  infoLight:    storelyTokens.color.infoBg,
  infoBorder:   storelyTokens.color.infoBorder,

  // Neutral — درجة رمادية دافئة مخصصة (مو رمادي Tailwind الافتراضي) — تناسب طابع "دفتر/سجل" لتطبيق مخزون وبيع
  bg:           storelyTokens.color.background,
  surface:      storelyTokens.color.surface,
  border:       storelyTokens.color.border,
  border2:      storelyTokens.color.border,
  text:         storelyTokens.color.text,
  text2:        storelyTokens.color.text,
  text3:        storelyTokens.color.textMuted,
  text4:        storelyTokens.color.textMuted,
  text5:        storelyTokens.color.border,
  secondary:    storelyTokens.color.textMuted,
  sage:         storelyTokens.color.accent,
  olive:        storelyTokens.color.textMuted,
  taupe:        storelyTokens.color.accent,
}

// زوايا متدرجة حسب كثافة العنصر -- مو زاوية واحدة موحّدة على كل شي
export const radius = {
  xs: storelyTokens.radius.control, sm: storelyTokens.radius.control,
  md: storelyTokens.radius.card, lg: storelyTokens.radius.card,
  xl: storelyTokens.radius.panel, full: storelyTokens.radius.pill,
}

export const shadow = {
  sm: storelyTokens.shadow.surface, md: storelyTokens.shadow.surface,
  card: storelyTokens.shadow.surface, lg: storelyTokens.shadow.panel, green:'none',
}

// أرقام مصفوفة بعرض ثابت -- مهم فعلياً بتطبيق مخزون/مبيعات (أعمدة كميات وأسعار تترصّ بدقة بالجداول والتقارير)، مو ديكور
export const numeric: React.CSSProperties = {
  fontVariantNumeric: 'tabular-nums',
}

export const font = {
  family: storelyTokens.typography.family,
  xs: '12px', sm: '14px', base: '14px', md: '16px',
  lg: '18px', xl: '26px', xxl: '28px',
}

// Common styles
export const inp = (extra?: object): React.CSSProperties => ({
  width:'100%', minWidth:0, minHeight:storelyTokens.control.medium, padding:'8px 12px',
  border:`1px solid ${colors.border2}`,
  borderRadius:radius.sm, fontSize:font.base,
  outline:'none', boxSizing:'border-box',
  background:colors.surface, color:colors.text, lineHeight:1.5,
  fontFamily:font.family, transition:'border .15s',
  ...extra,
})

export const card: React.CSSProperties = {
  background: colors.surface,
  borderRadius: radius.lg,
  border: `1px solid ${colors.border}`,
  boxShadow: storelyTokens.shadow.surface,
  overflow: 'hidden',
}

export const btnPrimary: React.CSSProperties = {
  display:'flex', alignItems:'center', justifyContent:'center', gap:8,
  minHeight:storelyTokens.control.medium, padding:'8px 16px',
  background:colors.primary,
  color:'white', border:`1px solid ${colors.primary}`, borderRadius:radius.sm,
  fontSize:font.base, fontWeight:600, lineHeight:1.5, cursor:'pointer',
  fontFamily:font.family,
  transition:'background .15s',
}

export const btnSecondary: React.CSSProperties = {
  display:'flex', alignItems:'center', justifyContent:'center', gap:8,
  minHeight:storelyTokens.control.medium, padding:'8px 16px',
  background:colors.surface, color:colors.text2,
  border:`1px solid ${colors.border2}`,
  borderRadius:radius.sm, fontSize:font.base,
  fontWeight:600, lineHeight:1.5, cursor:'pointer', fontFamily:font.family,
  transition:'all .15s',
}

export const btnDanger: React.CSSProperties = {
  display:'flex', alignItems:'center', justifyContent:'center', gap:8,
  minHeight:storelyTokens.control.medium, padding:'8px 16px',
  background:colors.surface, color:colors.danger,
  border:`1px solid ${colors.dangerBorder}`,
  borderRadius:radius.sm, fontSize:font.base,
  fontWeight:600, lineHeight:1.5, cursor:'pointer', fontFamily:font.family,
}

export const tag = (color:string, bg:string, border:string): React.CSSProperties => ({
  display:'inline-flex', alignItems:'center', gap:4,
  minHeight:28, padding:`${storelyTokens.spacing[1]}px ${storelyTokens.spacing[2]}px`, borderRadius:radius.sm,
  fontSize:font.xs, fontWeight:600, lineHeight:1.5,
  color, background:bg, border:`1px solid ${border}`,
  whiteSpace:'nowrap',
})

export const pageHeader: React.CSSProperties = {
  display:'flex', justifyContent:'space-between',
  alignItems:'flex-start', marginBottom:20,
  flexWrap:'wrap', gap:12,
}

// العنوان صف مرن عشان أيقونة الصفحة (<PageIcon/>) تجي بجانبه
export const pageTitle: React.CSSProperties = {
  display:'flex', alignItems:'center', gap:12,
  fontSize:font.xl, fontWeight:700,
  color:colors.text, letterSpacing:'-0.2px',
  marginBottom:3,
}

export const pageSub: React.CSSProperties = {
  fontSize:'13px', color:colors.text3,
}
