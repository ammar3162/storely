'use client'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export type Lang = 'ar' | 'en'

const translations = {
  ar: {
    dashboard: 'الرئيسية',
    inventory: 'المخزون',
    dispense: 'الصرف',
    purchases: 'مشتريات',
    staff: 'الموظفون',
    suppliers: 'الموردين',
    reports: 'التقارير',
    settings: 'الإعدادات',
    notifications: 'الإشعارات',
    branches: 'إدارة الفروع',
    aiTools: 'أدوات الذكاء',
    products: 'الأصناف',
    lowStock: 'ناقص',
    todayPurchases: 'شراء اليوم',
    todayDispenses: 'صرف اليوم',
    welcome: 'مرحباً',
    logout: 'خروج',
    save: 'حفظ',
    cancel: 'إلغاء',
    add: 'إضافة',
    edit: 'تعديل',
    delete: 'حذف',
    search: 'بحث',
    loading: 'جاري التحميل...',
    selectLanguage: 'اختر اللغة',
    arabic: 'العربية',
    english: 'English',
    confirm: 'تأكيد',
  },
  en: {
    dashboard: 'Dashboard',
    inventory: 'Inventory',
    dispense: 'Dispense',
    purchases: 'Purchases',
    staff: 'Staff',
    suppliers: 'Suppliers',
    reports: 'Reports',
    settings: 'Settings',
    notifications: 'Notifications',
    branches: 'Branches',
    aiTools: 'AI Tools',
    products: 'Products',
    lowStock: 'Low Stock',
    todayPurchases: "Today's Purchases",
    todayDispenses: "Today's Dispenses",
    welcome: 'Welcome',
    logout: 'Logout',
    save: 'Save',
    cancel: 'Cancel',
    add: 'Add',
    edit: 'Edit',
    delete: 'Delete',
    search: 'Search',
    loading: 'Loading...',
    selectLanguage: 'Select Language',
    arabic: 'العربية',
    english: 'English',
    confirm: 'Confirm',
  },
} as const

export type TranslationKey = keyof typeof translations.ar

interface LangContextType {
  lang: Lang
  setLang: (l: Lang) => void
  t: (key: TranslationKey) => string
  dir: 'rtl' | 'ltr'
}

const LangContext = createContext<LangContextType | null>(null)

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('ar')

  useEffect(() => {
    const saved = localStorage.getItem('storely_lang') as Lang | null
    if (saved === 'ar' || saved === 'en') setLangState(saved)
  }, [])

  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
  }, [lang])

  function setLang(l: Lang) {
    setLangState(l)
    localStorage.setItem('storely_lang', l)
  }

  function t(key: TranslationKey): string {
    return translations[lang][key] || translations.ar[key] || key
  }

  const dir = lang === 'ar' ? 'rtl' : 'ltr'

  return (
    <LangContext.Provider value={{ lang, setLang, t, dir }}>
      {children}
    </LangContext.Provider>
  )
}

export function useLang() {
  const ctx = useContext(LangContext)
  if (!ctx) throw new Error('useLang يجب أن يُستخدم داخل LangProvider')
  return ctx
}
