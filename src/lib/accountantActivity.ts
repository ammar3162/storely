// آخر نشاط المحاسب: نفس الشخص ونفس العملية ونفس الفترة = سطر واحد فيه عدد المرات وآخر وقت
export type AccLog = { action: string; period_start: string; period_end: string; created_at: string; accountant_users?: { name?: string | null; email?: string | null } | null }
export type AccLogGroup = AccLog & { count: number }

export function groupLogs(logs: AccLog[]): AccLogGroup[] {
  const out = new Map<string, AccLogGroup>()
  for (const l of logs) {
    const who = l.accountant_users?.email || l.accountant_users?.name || ''
    const key = `${who}|${l.action}|${l.period_start}|${l.period_end}`
    const g = out.get(key)
    if (!g) out.set(key, { ...l, count: 1 })
    else {
      g.count++
      if (l.created_at > g.created_at) g.created_at = l.created_at
    }
  }
  return [...out.values()].sort((a, b) => b.created_at.localeCompare(a.created_at))
}

/** العدد بالعربي: مرتين، 3 مرات، 11 مرة */
export const timesAr = (n: number) => n === 2 ? 'مرتين' : n >= 3 && n <= 10 ? `${n} مرات` : `${n} مرة`
