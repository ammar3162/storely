// كاش بسيط في الذاكرة — يستمر بين التنقلات ويتجدد كل دقيقتين
const store = new Map<string, { data: any; ts: number }>()
const TTL = 2 * 60 * 1000 // دقيقتين

export const cache = {
  get(key: string) {
    const entry = store.get(key)
    if (!entry) return null
    if (Date.now() - entry.ts > TTL) { store.delete(key); return null }
    return entry.data
  },
  set(key: string, data: any) {
    store.set(key, { data, ts: Date.now() })
  },
  invalidate(prefix: string) {
    store.forEach((_, key) => { if (key.startsWith(prefix)) store.delete(key) })
  },
  clear() { store.clear() }
}
