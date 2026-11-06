import { colors as dsColors } from '@/lib/ds'

// موحّد مع نظام التصميم المشترك (@/lib/ds) — نفس أسماء المفاتيح المستخدمة بالملف، قيم موحدة
export const C = {
  primary:dsColors.primary, primaryD:dsColors.primaryDark, primaryL:dsColors.primaryLight, primaryB:dsColors.primaryBorder,
  danger:dsColors.danger,  dangerL:dsColors.dangerLight,  dangerB:dsColors.dangerBorder,
  warning:dsColors.warning, warningL:dsColors.warningLight, warningB:dsColors.warningBorder,
  info:dsColors.info,    infoL:dsColors.infoLight,    infoB:dsColors.infoBorder,
  text:'#0f172a', text2:'#0f172a', text3:'#1e293b', text4:'#334155',   // كتابة سوداء واضحة
  bg:dsColors.bg, surface:dsColors.surface, border:dsColors.border, border2:dsColors.border2,
}

export const CATS = ['مخزون','مشتريات','أخرى']
export const CAT_ICONS: Record<string,string> = {'مخزون':'📦','مشتريات':'🛒','أخرى':'📋'}

export const lbl: React.CSSProperties = {fontSize:12,fontWeight:700,color:'#1e293b',display:'block',marginBottom:6}
export const inp: React.CSSProperties = {width:'100%',padding:'10px 12px',border:`1px solid ${C.border2}`,borderRadius:8,fontSize:13,outline:'none',boxSizing:'border-box',background:'white',color:C.text,fontFamily:'inherit'}
