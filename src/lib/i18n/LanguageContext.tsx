'use client'
import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { translations, Lang } from './translations'

const STORAGE_KEY = 'storely_lang'

type LanguageContextType = {
  lang: Lang
  dir: 'rtl' | 'ltr'
  setLang: (l: Lang) => void
  t: (path: string) => string
}

const LanguageContext = createContext<LanguageContextType | null>(null)

function getNested(obj: any, path: string): string {
  const result = path.split('.').reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj)
  return typeof result === 'string' ? result : path
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  // نبدأ بالعربي دايماً بالسيرفر لتفادي اختلاف Hydration، ثم نقرأ المحفوظ فور التحميل بالمتصفح
  const [lang, setLangState] = useState<Lang>('ar')
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
    if (saved === 'ar' || saved === 'en') setLangState(saved)
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.lang = lang
  }, [lang, hydrated])

  const setLang = useCallback((l: Lang) => {
    setLangState(l)
    try { localStorage.setItem(STORAGE_KEY, l) } catch {}
  }, [])

  const t = useCallback((path: string) => getNested(translations[lang], path), [lang])

  const dir = lang === 'ar' ? 'rtl' : 'ltr'

  return (
    <LanguageContext.Provider value={{ lang, dir, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useTranslation() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useTranslation must be used within LanguageProvider')
  return ctx
}
