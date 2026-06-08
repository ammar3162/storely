import { useEffect, useRef } from 'react'

export function useVisibilityRefresh(onRefresh: () => void, intervalMs = 20 * 60 * 1000) {
  const lastRefresh = useRef(Date.now())
  const callbackRef = useRef(onRefresh)
  callbackRef.current = onRefresh

  useEffect(() => {
    // عند العودة للتطبيق بعد إغلاقه
    function handleVisibility() {
      if (!document.hidden) {
        const elapsed = Date.now() - lastRefresh.current
        // حدّث فقط إذا مضى أكثر من دقيقة منذ آخر تحديث
        if (elapsed > 60000) {
          lastRefresh.current = Date.now()
          callbackRef.current()
        }
      }
    }

    // عند العودة للنافذة
    function handleFocus() {
      const elapsed = Date.now() - lastRefresh.current
      if (elapsed > 60000) {
        lastRefresh.current = Date.now()
        callbackRef.current()
      }
    }

    // تحديث دوري كل 20 دقيقة
    const interval = setInterval(() => {
      lastRefresh.current = Date.now()
      callbackRef.current()
    }, intervalMs)

    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('focus', handleFocus)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('focus', handleFocus)
    }
  }, [intervalMs])
}
