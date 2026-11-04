import { NextResponse } from 'next/server'
import { isCronRequest } from '@/lib/cronAuth'
import { createClient } from '@supabase/supabase-js'

// نسخة احتياطية يومية لصور الفواتير: invoices → invoices-backup (نفس المسار)
// الصور محفوظة بمجلد لكل منشأة (org_id/...) من بعد قفل التخزين 2026-10 — نمشي على كل المجلدات، مو الجذر بس.
// لو الملفات كثيرة يوقف قبل حد وقت الدالة ويكمل الباقي باليوم الثاني (الموجود بالنسخة يتخطاه).
export const maxDuration = 300
const TIME_BUDGET_MS = 240_000
const PAGE = 1000
const MAX_DEPTH = 3

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
type Db = ReturnType<typeof sb>
type Stats = { copied: number; skipped: number; failed: number; folders: number; done: boolean }

async function listAll(db: Db, bucket: string, folder: string) {
  const out: { name: string; id: string | null }[] = []
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await db.storage.from(bucket).list(folder, { limit: PAGE, offset, sortBy: { column: 'name', order: 'asc' } })
    if (error) throw new Error(`${bucket}/${folder}: ${error.message}`)
    out.push(...(data || []).map(f => ({ name: f.name, id: f.id })))
    if (!data || data.length < PAGE) return out
  }
}

async function backupFolder(db: Db, folder: string, depth: number, deadline: number, s: Stats) {
  s.folders++
  const files = await listAll(db, 'invoices', folder)
  const existing = new Set((await listAll(db, 'invoices-backup', folder)).filter(f => f.id).map(f => f.name))
  for (const f of files) {
    if (Date.now() > deadline) { s.done = false; return }
    const path = folder ? `${folder}/${f.name}` : f.name
    if (!f.id) {
      // مجلد (منشأة أو logos) — ننزل له
      if (depth < MAX_DEPTH) await backupFolder(db, path, depth + 1, deadline, s)
      if (!s.done) return
      continue
    }
    if (existing.has(f.name)) { s.skipped++; continue }
    const { data: blob, error: dlErr } = await db.storage.from('invoices').download(path)
    if (dlErr || !blob) { s.failed++; continue }
    const { error: upErr } = await db.storage.from('invoices-backup').upload(path, blob, { upsert: true, contentType: blob.type || undefined })
    if (upErr) { s.failed++; continue }
    s.copied++
  }
}

export async function POST(req: Request) {
  try {
    if (!isCronRequest(req)) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    const stats: Stats = { copied: 0, skipped: 0, failed: 0, folders: 0, done: true }
    await backupFolder(sb(), '', 0, Date.now() + TIME_BUDGET_MS, stats)
    if (stats.failed || !stats.done) console.warn('storage-backup partial:', JSON.stringify(stats))
    return NextResponse.json({ success: true, ...stats })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('storage-backup failed:', message)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
export async function GET(req: Request) { return POST(new Request('http://localhost',{method:'POST',body:'{}',headers:req.headers})) }
