import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyStaffToken, extractStaffToken } from '@/lib/staffAuth'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const auth = verifyStaffToken(extractStaffToken(req))
    if (!auth.valid) return NextResponse.json({ error: auth.error }, { status: 401 })
    const { org_id: orgId } = auth.data!

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'ما فيه ملف' }, { status: 400 })

    const ext = file.name.split('.').pop() || 'jpg'
    const path = `invoices/${orgId}-${Date.now()}.${ext}`
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const supabase = sb()
    const { error: upErr } = await supabase.storage.from('invoices').upload(path, buffer, {
      upsert: true,
      contentType: file.type || 'image/jpeg',
    })
    if (upErr) return NextResponse.json({ error: 'فشل رفع الصورة — حاول مرة أخرى' }, { status: 500 })

    const { data: { publicUrl } } = supabase.storage.from('invoices').getPublicUrl(path)
    return NextResponse.json({ success: true, url: publicUrl })
  } catch (err: any) {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
