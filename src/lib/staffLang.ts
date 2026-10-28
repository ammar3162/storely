'use client'
// لغة واجهة الموظف — وحدة لكل الصفحات (الرئيسية، الصرف، الكاشير، المشتريات، المهام، الطلبات، الراتب).
// تنحفظ بالجهاز (staff_lang) وبحساب الموظف، وأي صفحة مفتوحة تتحدث على طول لما تتغير.
import { useCallback, useEffect, useState } from 'react'
import { PAYSLIP_LANGS, normalizeLang, type PayslipLang } from '@/lib/payslipI18n'

export type StaffLang = PayslipLang
export const STAFF_LANGS = PAYSLIP_LANGS
export type Dict = Record<string, Partial<Record<StaffLang, string>> & { ar: string }>

const KEY = 'staff_lang'
const EVENT = 'staff-lang-change'

export const isRtlLang = (l: StaffLang) => !!STAFF_LANGS.find(x => x.code === l)?.rtl
export const localeOf = (l: StaffLang) => STAFF_LANGS.find(x => x.code === l)?.locale || 'ar-SA'

/** نص من القاموس باللغة المختارة — لو ناقص: الإنجليزي ثم العربي */
export function pick(dict: Dict, key: string, lang: StaffLang, vars?: Record<string, string | number>) {
  const e = dict[key]
  let s = e ? (e[lang] ?? e.en ?? e.ar) : key
  if (vars) for (const k in vars) s = s.split(`{${k}}`).join(String(vars[k]))
  return s
}

function read(): StaffLang {
  try { return normalizeLang(localStorage.getItem(KEY)) } catch { return 'ar' }
}

export function setStaffLang(code: StaffLang) {
  try { localStorage.setItem(KEY, code) } catch {}
  window.dispatchEvent(new CustomEvent(EVENT, { detail: code }))
  // نحفظها بحساب الموظف عشان إشعارات الواتساب توصله بنفس اللغة
  let token = ''
  try { token = localStorage.getItem('staff_token') || '' } catch {}
  if (token) fetch('/api/staff-set-lang', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ lang: code }) }).catch(() => {})
}

/** اللغة الحالية + دالة ترجمة لقاموس الصفحة. تتحدث لو تغيّرت من صفحة أو تبويب ثاني */
export function useStaffLang(dict?: Dict) {
  const [lang, setLang] = useState<StaffLang>('ar')
  useEffect(() => {
    setLang(read())
    const onChange = (e: Event) => setLang(normalizeLang((e as CustomEvent).detail))
    const onStorage = (e: StorageEvent) => { if (e.key === KEY) setLang(read()) }
    window.addEventListener(EVENT, onChange)
    window.addEventListener('storage', onStorage)
    return () => { window.removeEventListener(EVENT, onChange); window.removeEventListener('storage', onStorage) }
  }, [])
  const t = useCallback((key: string, vars?: Record<string, string | number>) => dict ? pick(dict, key, lang, vars) : key, [dict, lang])
  const rtl = isRtlLang(lang)
  return { lang, setLang: setStaffLang, t, rtl, dir: (rtl ? 'rtl' : 'ltr') as 'rtl' | 'ltr', locale: localeOf(lang) }
}
