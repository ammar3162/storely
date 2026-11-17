import { NextResponse } from 'next/server'
import { sniffSafeType, extForSafeType, SAFE_IMAGE_TYPES } from '@/lib/fileSniff'
import { createClient } from '@supabase/supabase-js'
import { verifyStaffToken, extractStaffToken } from '@/lib/staffAuth'

const TASK_PHOTO_MAX_BYTES = 8 * 1024 * 1024

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const auth = await verifyStaffToken(extractStaffToken(req))
    if (!auth.valid) return NextResponse.json({ error: auth.error }, { status: auth.reason==='subscription_expired'?403:401 })
    const { org_id: orgId } = auth.data!

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'لا يوجد ملف' }, { status: 400 })

    // صورة حقيقية فقط (من محتوى الملف) — الامتداد والنوع من المتصفح ما نعتمد عليهم
    if (file.size > TASK_PHOTO_MAX_BYTES) return NextResponse.json({ error: 'الصورة كبيرة — صوّرها مرة ثانية' }, { status: 400 })
    const buffer = Buffer.from(await file.arrayBuffer())
    const type = sniffSafeType(new Uint8Array(buffer.subarray(0, 16)))
    if (!type || !(SAFE_IMAGE_TYPES as readonly string[]).includes(type)) return NextResponse.json({ error: 'يجب أن يكون الملف صورة' }, { status: 400 })
    const path = `task-photos/${orgId}-${Date.now()}.${extForSafeType(type)}`

    const supabase = sb()
    const { error: upErr } = await supabase.storage.from('invoices').upload(path, buffer, {
      upsert: true,
      contentType: type,
    })
    if (upErr) return NextResponse.json({ error: 'فشل رفع الصورة — حاول مرة أخرى' }, { status: 500 })

    const { data: { publicUrl } } = supabase.storage.from('invoices').getPublicUrl(path)
    return NextResponse.json({ success: true, url: publicUrl })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
