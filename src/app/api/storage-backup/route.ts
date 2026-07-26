import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function backupFolder(supabase: ReturnType<typeof sb>, folder: string) {
  const { data: files } = await supabase.storage.from('invoices').list(folder, { limit: 1000 })
  if (!files) return { copied: 0, skipped: 0, failed: 0 }

  const { data: existingBackup } = await supabase.storage.from('invoices-backup').list(folder, { limit: 1000 })
  const existingNames = new Set((existingBackup || []).map((f: any) => f.name))

  let copied = 0, skipped = 0, failed = 0
  for (const file of files) {
    if (!file.id) continue // مجلد فرعي، مو ملف — نتجاهله بهذي النسخة (بنيتنا الحالية مسطحة)
    const path = folder ? `${folder}/${file.name}` : file.name
    if (existingNames.has(file.name)) { skipped++; continue }

    const { data: blob, error: dlErr } = await supabase.storage.from('invoices').download(path)
    if (dlErr || !blob) { failed++; continue }

    const { error: upErr } = await supabase.storage.from('invoices-backup').upload(path, blob, { upsert: true })
    if (upErr) { failed++; continue }
    copied++
  }
  return { copied, skipped, failed }
}

export async function POST(req: Request) {
  try {
    const cronSecret = req.headers.get('x-cron-secret')
    const authHeader = req.headers.get('authorization')
    const isManualAuth = cronSecret === process.env.ADMIN_PASSWORD
    const isVercelCron = authHeader === `Bearer ${process.env.CRON_SECRET}`
    if (!isManualAuth && !isVercelCron) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    const supabase = sb()
    const root = await backupFolder(supabase, '')
    const logos = await backupFolder(supabase, 'logos')

    return NextResponse.json({ success: true, root, logos })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
export async function GET(req: Request) { return POST(new Request('http://localhost',{method:'POST',body:'{}',headers:req.headers})) }
