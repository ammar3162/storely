'use client'
import { useEffect } from 'react'
import { hasArabicDigits, toLatinDigits } from '@/lib/digits'

// حقول الأرقام النصية (جوال، رقم ضريبي، رمز، باركود…): الأرقام العربية ١٢٣ تتحول 123 قبل ما توصل للصفحة
// نلتقط الإدخال بمرحلة capture على مستوى الصفحة كلها — قبل React — فيقرأ الصفحة الرقم المحوّل مباشرة
const NUMERIC = new Set(['numeric', 'decimal', 'tel'])
const nativeSet = typeof window === 'undefined' ? undefined : Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
export default function DigitNormalizer() {
  useEffect(() => {
    const onInput = (e: Event) => {
      const el = e.target as HTMLInputElement
      if (!(el instanceof HTMLInputElement)) return
      if (!(NUMERIC.has(el.inputMode) || el.type === 'tel' || el.type === 'number' || el.dataset.digits !== undefined)) return
      if (!hasArabicDigits(el.value)) return
      const pos = el.selectionStart
      // نكتب بالـ setter الأصلي (مو el.value =) — عشان متتبّع React يشوف التغيير ويوصل onChange للصفحة
      nativeSet?.call(el, toLatinDigits(el.value))   // نفس الطول — المؤشر يبقى مكانه
      try { if (pos != null) el.setSelectionRange(pos, pos) } catch {}
    }
    document.addEventListener('input', onInput, true)
    return () => document.removeEventListener('input', onInput, true)
  }, [])
  return null
}
