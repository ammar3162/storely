// ═══════════════════════════════════════
// Storely Design System — Single Source of Truth
// ═══════════════════════════════════════

export const colors = {
  // Brand
  primary:      '#16a34a',
  primaryDark:  '#15803d',
  primaryLight: '#f0fdf4',
  primaryBorder:'#bbf7d0',

  // Semantic
  danger:       '#ef4444',
  dangerLight:  '#fef2f2',
  dangerBorder: '#fecaca',
  warning:      '#f59e0b',
  warningLight: '#fffbeb',
  warningBorder:'#fde68a',
  info:         '#3b82f6',
  infoLight:    '#eff6ff',
  infoBorder:   '#bfdbfe',

  // Neutral
  bg:           '#f5f7fa',
  surface:      '#ffffff',
  border:       '#f1f5f9',
  border2:      '#e2e8f0',
  text:         '#0f172a',
  text2:        '#334155',
  text3:        '#64748b',
  text4:        '#94a3b8',
  text5:        '#cbd5e1',
}

export const radius = {
  sm:  '8px',
  md:  '12px',
  lg:  '16px',
  xl:  '20px',
  full:'999px',
}

export const shadow = {
  sm:  '0 1px 3px rgba(0,0,0,.06)',
  md:  '0 4px 16px rgba(0,0,0,.08)',
  lg:  '0 8px 32px rgba(0,0,0,.12)',
  green:'0 4px 14px rgba(22,163,74,.25)',
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
  border: `1px solid ${colors.border}`,
  boxShadow: shadow.sm,
  overflow: 'hidden',
}

export const btnPrimary: React.CSSProperties = {
  display:'flex', alignItems:'center', justifyContent:'center', gap:8,
  padding:'11px 20px',
  background:`linear-gradient(135deg,${colors.primary},${colors.primaryDark})`,
  color:'white', border:'none', borderRadius:radius.md,
  fontSize:font.base, fontWeight:700, cursor:'pointer',
  fontFamily:font.family,
  boxShadow:shadow.green, transition:'all .15s',
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
