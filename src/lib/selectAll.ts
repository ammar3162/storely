// Supabase يرجّع 1000 صف بالكثير لكل طلب، والباقي ينقطع بدون أي خطأ.
// هذي الدالة تجيب كل الصفوف على دفعات — `build` لازم يرجّع استعلام جديد بترتيب ثابت
// (مثلاً .order('created_at').order('id')) عشان الدفعات ما تتكرر ولا يطيح منها شي.
export const PAGE_SIZE = 1000

export async function selectAll<T = any>(
  build: () => any,
  opts: { pageSize?: number; max?: number } = {},
): Promise<{ data: T[]; error: any }> {
  const pageSize = opts.pageSize ?? PAGE_SIZE
  const max = opts.max ?? 100_000
  const out: T[] = []
  for (let from = 0; from < max; from += pageSize) {
    const { data, error } = await build().range(from, from + pageSize - 1)
    if (error) return { data: out, error }
    const rows = (data || []) as T[]
    out.push(...rows)
    if (rows.length < pageSize) break
  }
  return { data: out, error: null }
}
