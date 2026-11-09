'use client'
import { colors as dsColors } from '@/lib/ds'
import { pageToneFor } from '@/lib/pageTones'

// موحّد مع نظام التصميم المشترك (@/lib/ds)
export const C = {
  primary: dsColors.primary, primaryD: dsColors.primaryDark, primaryL: dsColors.primaryLight, primaryB: dsColors.primaryBorder,
  danger:  dsColors.danger, dangerL:  dsColors.dangerLight,
  text:    dsColors.text, text2: dsColors.text2, text3: dsColors.text3, text4: dsColors.text4,
  bg:      dsColors.bg, surface: dsColors.surface, border: dsColors.border, border2: dsColors.border2,
}

export const NAV_GROUPS = [
  {
    label: 'راقب أداءك', labelKey: 'nav.groupPerformance',
    items: [
      { href:'/dashboard', label:'الرئيسية', labelKey:'nav.dashboard', icon:'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
      { href:'/reports',    label:'التقارير', labelKey:'nav.reports', icon:'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
      { href:'/notifications', label:'الإشعارات', labelKey:'nav.notifications', icon:'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
    ]
  },
  {
    label: 'إدارة المخزون', labelKey: 'nav.groupInventory',
    items: [
      { href:'/inventory',  label:'المخزون',  labelKey:'nav.inventory', icon:'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
      { href:'/dispense',   label:'الصرف',   labelKey:'nav.dispense', icon:'M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z' },
      { href:'/purchases',  label:'مشتريات', labelKey:'nav.purchases', icon:'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z' },
      { href:'/transfer-stock', label:'نقل بين الفروع', labelKey:'nav.transferStock', icon:'M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5' },
    ]
  },
  {
    label: 'إدارة الفريق', labelKey: 'nav.groupTeam',
    items: [
      { href:'/staff-management', label:'الموظفون', labelKey:'nav.staffManagement', icon:'M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 100-8 4 4 0 000 8zm6 0a4 4 0 11-8 0' },
      { href:'/hr-management', label:'إدارة الموظفين', labelKey:'nav.hrManagement', icon:'M12 8c-1.657 0-3 1.567-3 3.5S10.343 15 12 15s3-1.567 3-3.5S13.657 8 12 8zM3 21c0-3.314 3.582-6 8-6s8 2.686 8 6H3zm14-11h4m-2-2v4' },
      { href:'/attendance', label:'الحضور والانصراف', labelKey:'nav.attendance', icon:'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
      { href:'/branch-managers', label:'مديرو الفروع', labelKey:'nav.branchManagers', icon:'M12 4.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7zM5.5 20a6.5 6.5 0 0113 0' },
    ]
  },
  {
    label: 'المتجر', labelKey: 'nav.groupStore',
    items: [
      { href:'/addons-market', label:'الإضافات', labelKey:'nav.addonsMarket', icon:'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
    ]
  },
  {
    label: 'الفروع والموردين', labelKey: 'nav.groupBranchesSuppliers',
    items: [
      { href:'/branches', label:'إدارة الفروع', labelKey:'nav.branches', icon:'M3 21h18M5 21V7l8-4v18M19 21V11l-6-4' },
      { href:'/branch-compare', label:'مقارنة الفروع', labelKey:'nav.branchCompare', icon:'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
      { href:'/suppliers',  label:'الموردين', labelKey:'nav.suppliers', icon:'M3 7h13l3 5v5h-3m-10 0H3v-7m13-3v10m-13 0a2 2 0 104 0m-4 0a2 2 0 114 0m9 0a2 2 0 104 0m-4 0a2 2 0 114 0' },
      { href:'/marketplace', label:'موردون معتمدون', labelKey:'nav.marketplace', icon:'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
    ]
  },
  {
    label: 'أدوات متقدمة', labelKey: 'nav.groupAdvancedTools',
    items: [
      { href:'/ai-tools',   label:'أدوات الذكاء', labelKey:'nav.aiTools', icon:'M4 5h16M4 12h16M4 19h16M9 3v4M15 10v4M8 17v4' },
      { href:'/profitability', label:'الربحية', labelKey:'nav.profitability', icon:'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
    ]
  },
  {
    label: 'إدارة حسابك', labelKey: 'nav.groupAccount',
    items: [
      { href:'/settings',   label:'الإعدادات', labelKey:'nav.settings', icon:'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
      { href:'https://wa.me/966594351667?text=أحتاج مساعدة في Storely', label:'الدعم الفني', labelKey:'nav.support', icon:'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347' },
    ]
  },
]

export const NAV_MAIN = NAV_GROUPS.flatMap(g=>g.items)
// لون صفحة العنصر — يظهر لما يكون مفتوح أو عند تمرير الماوس
export function navTone(href: string) {
  const tone = pageToneFor(href)?.tone
  return tone ? ({ '--nt': tone.fg, '--nb': tone.bg, '--ns': tone.soft } as React.CSSProperties) : undefined
}

export const NAV_MORE: {href:string;label:string;labelKey:string;icon:string}[] = []

export function Icon({ d, size=20, stroke='currentColor', width=2 }: { d:string; size?:number; stroke?:string; width?:number }) {
  return (
    <svg width={size} height={size} fill="none" stroke={stroke} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      {d.split(' M').map((p,i)=><path key={i} d={(i===0?'':' M')+p}/>)}
    </svg>
  )
}
