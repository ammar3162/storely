// رقم واتساب المنشأة بصيغة واحدة ثابتة: +<مفتاح الدولة><الرقم>
// يعالج: 05xxxxxxxx، 5xxxxxxxx، 9665xxxxxxxx، 00966…، +966…، والمفتاح المكرر (+966966…) اللي كان يوقف رسايل الواتساب
export function normalizeWhatsapp(input: string | null | undefined, countryCode = '+966'): string {
  const raw = String(input || '').trim()
  if (!raw) return ''
  const cc = countryCode.replace(/\D/g, '') || '966'
  let d = raw.replace(/\D/g, '')
  const international = raw.startsWith('+') || raw.startsWith('00')
  if (raw.startsWith('00')) d = d.slice(2)
  if (!international) {
    d = d.replace(/^0+/, '')
    if (!d.startsWith(cc)) d = cc + d
  }
  // مفتاح الدولة مكرر (966966…): نشيل واحد
  while (d.startsWith(cc + cc) && d.length - cc.length >= cc.length + 8) d = d.slice(cc.length)
  return '+' + d
}
