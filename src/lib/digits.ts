// أرقام عربية/فارسية → 0-9 (المستخدم يكتب ١٢٣ وتتحول 123)
const AR = /[٠-٩۰-۹]/g
export const hasArabicDigits = (s: string) => /[٠-٩۰-۹٫]/.test(s)
export function toLatinDigits(s: string) {
  return s.replace(AR, d => String((d.charCodeAt(0) & 0xf) % 10)).replace(/٫/g, '.')   // ٫ الفاصلة العشرية العربية
}

/** ينظّف نص رقم أثناء الكتابة: أرقام لاتينية، فاصلة عشرية وحدة، وسالب بأوله لو مسموح */
export function cleanNumberText(raw: string, o: { decimal?: boolean; negative?: boolean } = {}) {
  let s = toLatinDigits(raw).replace(/[,،]/g, '.')
  const neg = !!o.negative && s.trim().startsWith('-')
  s = s.replace(o.decimal === false ? /[^0-9]/g : /[^0-9.]/g, '')
  const i = s.indexOf('.')
  if (i >= 0) s = s.slice(0, i + 1) + s.slice(i + 1).replace(/\./g, '')
  return (neg ? '-' : '') + s
}
