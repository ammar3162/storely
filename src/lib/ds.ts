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
// زوايا أبل: الحقول 12، البطاقات 20، النوافذ 22، والأزرار حبوب كاملة
export const radius = {
  xs:  '8px',   // صفوف الجداول، الوسوم الصغيرة، عناصر داخل الجدول
  sm:  '12px',  // الحقول
  md:  '14px',
  lg:  '20px',  // البطاقات
  xl:  '22px',  // النوافذ المنبثقة
  full:'999px', // الأزرار
}

export const shadow = {
  sm: storelyTokens.shadow.surface, md: storelyTokens.shadow.surface,
  card: storelyTokens.shadow.surface, lg: storelyTokens.shadow.panel, green:'none',
}

// أرقام مصفوفة بعرض ثابت -- مهم فعلياً بتطبيق مخزون/مبيعات (أعمدة كميات وأسعار تترصّ بدقة بالجداول والتقارير)، مو ديكور
export const numeric: React.CSSProperties = {
  fontVariantNumeric: 'tabular-nums',
}

// خط أبل من النظام (الآيفون والماك) ثم خط ستورلي، ومقاسات أبل: 12 تعليق، 13 ملاحظة، 17 نص، 20 قسم، 28 عنوان، 34 عنوان كبير
export const font = {
  family: storelyTokens.typography.family,
  xs:  '12px',
  sm:  '13px',
  base:'17px',
  md:  '17px',
  lg:  '20px',
  xl:  '28px',
  xxl: '34px',
}

// Common styles
export const inp = (extra?: object): React.CSSProperties => ({
  width:'100%', padding:'11px 16px', minHeight:44,
  border:`1px solid ${storelyTokens.color.controlBorder}`,
  borderRadius:radius.sm, fontSize:font.base,
  outline:'none', boxSizing:'border-box',
  background:colors.surface, color:colors.text,
  fontFamily:font.family, transition:'border .15s',
  ...extra,
})

export const card: React.CSSProperties = {
  background: colors.surface,
  borderRadius: radius.lg,
  border: 'none',
  boxShadow: storelyTokens.shadow.surface,
  overflow: 'hidden',
}

export const btnPrimary: React.CSSProperties = {
  display:'flex', alignItems:'center', justifyContent:'center', gap:8,
  padding:'11px 22px', minHeight:44,
  background:colors.primary,
  color:'white', border:'none', borderRadius:radius.full,
  fontSize:font.base, fontWeight:500, cursor:'pointer',
  fontFamily:font.family,
  transition:'background .15s',
}

export const btnSecondary: React.CSSProperties = {
  display:'flex', alignItems:'center', justifyContent:'center', gap:8,
  padding:'11px 22px', minHeight:44,
  background:storelyTokens.color.fill, color:colors.text2,
  border:'none',
  borderRadius:radius.full, fontSize:font.base,
  fontWeight:500, cursor:'pointer', fontFamily:font.family,
  transition:'background-color .15s',
}

export const btnDanger: React.CSSProperties = {
  display:'flex', alignItems:'center', justifyContent:'center', gap:8,
  padding:'11px 22px', minHeight:44,
  background:colors.dangerLight, color:colors.danger,
  border:`1px solid ${colors.dangerBorder}`,
  borderRadius:radius.full, fontSize:font.base,
  fontWeight:500, cursor:'pointer', fontFamily:font.family,
}

export const tag = (color:string, bg:string, border:string): React.CSSProperties => ({
  display:'inline-flex', alignItems:'center', gap:4,
  padding:'3px 10px', borderRadius:radius.full,
  fontSize:font.xs, fontWeight:600,
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
  fontSize:font.xl, fontWeight:600,
  color:colors.text, letterSpacing:0,
  marginBottom:3,
}

export const pageSub: React.CSSProperties = {
  fontSize:'15px', color:colors.text3,
}
