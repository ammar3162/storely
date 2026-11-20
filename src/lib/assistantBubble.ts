// متى تطلع فقاعة Soul (طلب المالك 2026-11-18/19: «القرارات تطلع كإعلان كل ما دخلت»).
// السجل محفوظ بالجهاز لكل منشأة، والفقاعة تطلع بس لشي جديد:
//   - قرار جديد (عجز، طلب موظف، فاتورة مستحقة…): مرة وحدة لكل قرار. أكثر من قرار جديد = فقاعة وحدة تجمعها
//   - تنبيه عاجل (اشتراك ينتهي، موعد الإقرار، إقفال ناقص بالليل): مرة باليوم
//   - المعلومات (من داوم، إقفالات اليوم…): ما تطلع كفقاعة أبداً، تلقاها لما تفتح Soul
//   - فتح Soul = شاف كل اللي فيه
// والرقم الأحمر على Soul يبقى لين تنحل القرارات، فالتذكير موجود بدون ما يقاطع.
import type { Suggestion } from '@/lib/assistantSuggestions'

export type BubbleLog = { keys: string[] }
export type BubblePick = { type: 'decisions'; keys: string[] } | { type: 'urgent'; id: string } | null

export const urgentKey = (id: string, day: string) => `${id}:${day}`

/** وش يطلع كفقاعة الحين: القرارات الجديدة أول، وإلا أول تنبيه عاجل ما طلع اليوم */
export function pickBubble(decisionKeys: string[], sugs: Suggestion[], log: BubbleLog, day: string, skip: string[] = []): BubblePick {
  const fresh = decisionKeys.filter(k => !log.keys.includes(k))
  if (fresh.length) return { type: 'decisions', keys: fresh }
  const u = sugs.find(s => s.urgent && !skip.includes(s.id) && !log.keys.includes(urgentKey(s.id, day)))
  return u ? { type: 'urgent', id: u.id } : null
}

/** نسجل اللي طلع أو انشاف (آخر 300 مفتاح) */
export function remember(log: BubbleLog, keys: string[]): BubbleLog {
  const all = [...log.keys]
  for (const k of keys) if (!all.includes(k)) all.push(k)
  return { keys: all.slice(-300) }
}

export function parseBubbleLog(raw: string | null): BubbleLog {
  try {
    const v = JSON.parse(raw || 'null')
    if (v && Array.isArray(v.keys)) return { keys: v.keys.filter((k: unknown) => typeof k === 'string') }
  } catch {}
  return { keys: [] }
}
