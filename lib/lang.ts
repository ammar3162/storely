export const ar = {
  dashboard:    'الرئيسية',
  inventory:    'المخزون',
  purchases:    'المشتريات',
  dispenses:    'الصرف',
  settings:     'الإعدادات',
  reports:      'التقارير',
  logout:       'تسجيل الخروج',
  connected:    'متصل',
  goodMorning:  'صباح الخير',
  goodAfternoon:'مساء الخير',
  goodEvening:  'مساء النور',
  plan:         'الباقة الأساسية',
}

export const en = {
  dashboard:    'Dashboard',
  inventory:    'Inventory',
  purchases:    'Purchases',
  dispenses:    'Dispenses',
  settings:     'Settings',
  reports:      'Reports',
  logout:       'Logout',
  connected:    'Connected',
  goodMorning:  'Good Morning',
  goodAfternoon:'Good Afternoon',
  goodEvening:  'Good Evening',
  plan:         'Basic Plan',
}

export type Lang = 'ar' | 'en'
export function t(lang: Lang, key: keyof typeof ar) {
  return lang === 'ar' ? ar[key] : en[key]
}