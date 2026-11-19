'use client'
// تنفيذ قرارات Soul مع «تراجع» لمدة 10 ثوانٍ (ضغطة بالغلط على خصم واردة بالجوال).
// المؤقت خارج React: قفل نافذة Soul أو الفقاعة ما يلغي القرار، ولو المستخدم صغّر التطبيق أو طلع من الصفحة قبل
// انتهاء المهلة ينفّذ فوراً عشان ما يضيع القرار.
import { useEffect, useState } from 'react'

export const UNDO_MS = 10_000
export type DecisionResult = { ok: boolean; error?: string; done?: string }
export type DecisionRun = () => Promise<DecisionResult>
export type DecisionPhase = { phase: 'undo' | 'running' | 'done' | 'error'; msg: string; until?: number }

const phases = new Map<string, DecisionPhase>()
const jobs = new Map<string, { timer: ReturnType<typeof setTimeout>; run: DecisionRun; msg: string }>()
const subs = new Set<() => void>()
const emit = () => { for (const f of subs) f() }
const announce = (name: string, key: string, ok = true) => {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(name, { detail: { key, ok } }))
}

async function fire(key: string) {
  const j = jobs.get(key)
  if (!j) return
  jobs.delete(key); clearTimeout(j.timer)
  phases.set(key, { phase: 'running', msg: j.msg }); emit()
  let r: DecisionResult
  try { r = await j.run() } catch { r = { ok: false, error: 'تعذر الاتصال — حاول مرة ثانية' } }
  phases.set(key, r.ok ? { phase: 'done', msg: r.done || j.msg } : { phase: 'error', msg: r.error || 'تعذر حفظ القرار' })
  emit()
  announce('soul:decided', key, r.ok)
}

/** يبدأ القرار بعد مهلة التراجع */
export function scheduleDecision(key: string, msg: string, run: DecisionRun, delay = UNDO_MS) {
  if (jobs.has(key)) return
  jobs.set(key, { timer: setTimeout(() => { void fire(key) }, delay), run, msg })
  phases.set(key, { phase: 'undo', msg, until: Date.now() + delay }); emit()
}
export function undoDecision(key: string) {
  const j = jobs.get(key)
  if (!j) return
  clearTimeout(j.timer); jobs.delete(key); phases.delete(key); emit()
}
/** «لاحقاً»: سطر تأكيد قصير، والبطاقة تختفي من هذا الجهاز لين بكرة */
export function markLater(key: string) {
  phases.set(key, { phase: 'done', msg: 'أُجّل إلى الغد' }); emit()
  announce('soul:later', key)
}
export function clearPhase(key: string) { if (phases.delete(key)) emit() }
export const decisionPhase = (key: string) => phases.get(key)
/** القرار انأخذ أو جاري (ما ينحسب بالرقم الأحمر) */
export const isHandled = (key: string) => { const p = phases.get(key); return !!p && p.phase !== 'error' }
export function flushDecisions() { for (const k of [...jobs.keys()]) void fire(k) }

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', flushDecisions)
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushDecisions() })
}

/** يعيد الرسم كل ما تغيرت حالة قرار */
export function useDecisionPhases() {
  const [, setT] = useState(0)
  useEffect(() => { const f = () => setT(t => t + 1); subs.add(f); return () => { subs.delete(f) } }, [])
  return phases
}
