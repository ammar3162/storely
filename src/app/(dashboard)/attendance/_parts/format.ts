// كل الأوقات والتواريخ بالتقرير بتوقيت السعودية
export const saudiToday = () => new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 10)
export const fmtTime = (iso: string | null) => iso ? new Date(iso).toLocaleTimeString('ar-SA', { numberingSystem: 'latn', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Riyadh' }) : '—'
export const fmtDay = (d: string) => new Date(d + 'T12:00:00Z').toLocaleDateString('ar-SA', { numberingSystem: 'latn', weekday: 'short', day: 'numeric', month: 'numeric', calendar: 'gregory', timeZone: 'UTC' })
export const fmtMinutes = (m: number) => { const h = Math.floor(m / 60), r = m % 60; return h ? (r ? `${h}س ${r}د` : `${h} ساعة`) : `${r} دقيقة` }
