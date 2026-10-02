// غرامة التأخير: وقت سماح + مبلغ لكل ساعة.
// التأخير ضمن وقت السماح ما يتسجّل أبداً. لو تعدّاه ينحسب التأخير كامل من بداية الشفت،
// والغرامة = المبلغ للساعة × دقائق التأخير ÷ 60.
export type LateSettings = { graceMinutes: number; perHour: number | null }

export function applyLateRules(rawLateMinutes: number, s: LateSettings): { lateMinutes: number; penalty: number | null } {
  const late = Math.max(0, Math.floor(rawLateMinutes || 0))
  if (late === 0 || late <= Math.max(0, s.graceMinutes || 0)) return { lateMinutes: 0, penalty: null }
  const rate = Number(s.perHour || 0)
  return { lateMinutes: late, penalty: rate > 0 ? Math.round((rate * late / 60) * 100) / 100 : null }
}
