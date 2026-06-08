import { useEffect, useCallback } from 'react'
export function useVisibilityRefresh(onRefresh: () => void, intervalMs = 60000) {
  const refresh = useCallback(onRefresh, [])
  useEffect(() => {
    function handleVisibility() { if (!document.hidden) refresh() }
    const interval = setInterval(refresh, intervalMs)
    document.addEventListener('visibilitychange', handleVisibility)
    return () => { clearInterval(interval); document.removeEventListener('visibilitychange', handleVisibility) }
  }, [refresh, intervalMs])
}
