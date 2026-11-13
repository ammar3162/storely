// استهلاك البريد في Resend — الباقة المجانية: 100 إيميل باليوم (إرسال + استقبال)، وفوقها يوقف كل الإرسال
export const EMAIL_DAILY_LIMIT = 100
export const EMAIL_WARN_AT = 80

export type UsageLevel = 'ok' | 'warn' | 'stop'
export const usageLevel = (used: number): UsageLevel => used >= EMAIL_DAILY_LIMIT ? 'stop' : used >= EMAIL_WARN_AT ? 'warn' : 'ok'

type Page = { data: { id: string; created_at: string }[]; has_more: boolean }

/** يعدّ العناصر الأحدث من `since` — الصفحات مرتبة من الأحدث، ويوقف أول ما يوصل عنصر أقدم (حد أقصى للصفحات) */
export async function countSince(fetchPage: (after?: string) => Promise<Page | null>, since: number, maxPages = 5): Promise<number> {
  let n = 0, after: string | undefined
  for (let i = 0; i < maxPages; i++) {
    const p = await fetchPage(after)
    if (!p?.data?.length) break
    for (const e of p.data) {
      if (Date.parse(e.created_at.replace(' ', 'T')) < since) return n
      n++
    }
    if (!p.has_more) break
    after = p.data[p.data.length - 1].id
  }
  return n
}
