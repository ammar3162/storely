import { useEffect, useRef } from 'react'

export function useVisibilityRefresh(onRefresh: () => void, intervalMs = 20 * 60 * 1000) {
  const lastRefresh = useRef(Date.now())
  const callbackRef = useRef(onRefresh)
  callbackRef.current = onRefresh

  useEffect(() => {
    // عند العودة للتطبيق فقط إذا مضى 5 دقائق على الأقل
    function handleVisibility() {
      if (!document.hidden) {
        const elapsed = Date.now() - lastRefresh.current
        if (elapsed > 5 * 60 * 1000) {
          lastRefresh.current = Date.now()
          callbackRef.current()
        }
      }
    }

    // تحديث دوري كل 20 دقيقة فقط
    const interval = setInterval(() => {
      lastRefresh.current = Date.now()
      callbackRef.current()
    }, intervalMs)

    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [intervalMs])
}
