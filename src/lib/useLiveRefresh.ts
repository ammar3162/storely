'use client'
import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

// تحديث فوري: قاعدة البيانات ترسل «إشارة» على قناة org:<المنشأة> كل ما تغيّر جدول (بدون بيانات)،
// والصفحة المفتوحة تعيد جلب بياناتها من الخادم. قناة وحدة لكل منشأة مشتركة بين كل الصفحات.
type Listener = (table: string) => void
const subs = new Map<string, { listeners: Set<Listener>; close: () => void }>()

function listen(orgId: string, fn: Listener) {
  let s = subs.get(orgId)
  if (!s) {
    const sb = createClient()
    const listeners = new Set<Listener>()
    const ch = sb.channel('org:' + orgId)
      .on('broadcast', { event: 'change' }, ({ payload }: any) => { for (const l of listeners) l(String(payload?.t || '')) })
      .subscribe()
    s = { listeners, close: () => { sb.removeChannel(ch) } }
    subs.set(orgId, s)
  }
  s.listeners.add(fn)
  return () => {
    const cur = subs.get(orgId)
    if (!cur) return
    cur.listeners.delete(fn)
    if (!cur.listeners.size) { cur.close(); subs.delete(orgId) }
  }
}

/**
 * يعيد تحميل بيانات الصفحة لما يتغير أحد الجداول المذكورة.
 * - يجمع التغييرات المتتالية (صرف ١٠ أصناف = تحديث واحد)
 * - لو الصفحة بالخلفية، يحدّث أول ما يرجع لها المستخدم
 */
export function useLiveRefresh(orgId: string | null | undefined, tables: string[], onChange: () => void, delay = 900) {
  const cb = useRef(onChange)
  cb.current = onChange
  const key = tables.join(',')
  useEffect(() => {
    if (!orgId) return
    const want = new Set(key.split(','))
    let timer: ReturnType<typeof setTimeout> | undefined
    let pending = false
    const fire = () => { if (document.visibilityState === 'visible') { pending = false; cb.current() } else pending = true }
    const off = listen(orgId, t => { if (!want.has(t)) return; clearTimeout(timer); timer = setTimeout(fire, delay) })
    const onVis = () => { if (pending && document.visibilityState === 'visible') fire() }
    document.addEventListener('visibilitychange', onVis)
    return () => { off(); clearTimeout(timer); document.removeEventListener('visibilitychange', onVis) }
  }, [orgId, key, delay])
}

/** منشأة الموظف من جلسته (صفحات الموظف بدون حالة جاهزة) */
export const liveStaffOrg = (): string | null => {
  if (typeof window === 'undefined') return null
  try { return JSON.parse(localStorage.getItem('staff_session') || 'null')?.org_id || null } catch { return null }
}
