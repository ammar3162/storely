'use client'
// يشغّل الترجمة التلقائية للإنجليزية إذا اختارها المستخدم، ويضبط اتجاه الصفحة.
// نضعه في لوحة المالك وصفحات الدخول والإعداد فقط (تطبيق الموظفين له لغاته الخاصة).
import { useEffect } from 'react'
import { savedLang, startAutoTranslate } from '@/lib/i18n/autoTranslate'

export default function AutoTranslate() {
  useEffect(() => {
    const apply = () => {
      const en = savedLang() === 'en'
      document.documentElement.lang = en ? 'en' : 'ar'
      document.documentElement.dir = en ? 'ltr' : 'rtl'
      if (en) startAutoTranslate()
    }
    apply()
    window.addEventListener('storely-lang', apply)
    return () => window.removeEventListener('storely-lang', apply)
  }, [])
  return null
}

/** تبديل اللغة: للإنجليزي نترجم فوراً، وللعربي نعيد تحميل الصفحة لترجع النصوص الأصلية */
export function switchLang(to: 'ar' | 'en') {
  try { localStorage.setItem('storely_lang', to) } catch {}
  if (to === 'ar') { window.location.reload(); return }
  window.dispatchEvent(new Event('storely-lang'))
}
