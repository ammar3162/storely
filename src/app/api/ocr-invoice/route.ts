import { NextResponse } from 'next/server'
import { readInvoice } from '@/lib/invoiceOcr'
import { verifyOrgAccess } from '@/lib/verifyOrgAccess'
import { verifyStaffToken, extractStaffToken } from '@/lib/staffAuth'
import { staffHasPermission, NO_PURCHASES } from '@/lib/staffPermission'
import { createClient } from '@supabase/supabase-js'
import { OCR_TYPES } from '@/lib/invoiceFile'

// قراءة فاتورة مفصّلة تاخذ أكثر من ١٠ ثواني — بدون هذا السيرفر يقطعها قبل ما تخلص
export const maxDuration = 60

/**
 * يستخرج بيانات فاتورة شراء من صورة باستخدام رؤية Claude (Vision).
 * يقبل إما جلسة مالك (Supabase session) أو توكن موظف — نفس نمط
 * notify-low-stock-instant المزدوج.
 */
export async function POST(req: Request) {
  try {
    const { image, mediaType, org_id } = await req.json()
    if (!image || !org_id || typeof image !== 'string') {
      return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
    }
    // صورة (JPEG/PNG/WebP/GIF) أو PDF — النوع لازم يطابق الملف وإلا ترفضه خدمة القراءة
    const type = (OCR_TYPES as readonly string[]).includes(mediaType) ? mediaType as string : 'image/jpeg'

    // تحقق مزدوج: توكن موظف أو جلسة مالك
    const staffAuth = await verifyStaffToken(extractStaffToken(req))
    if (staffAuth.valid) {
      if (staffAuth.data!.org_id !== org_id) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
      // القراءة الذكية لها تكلفة — للموظف اللي عنده صلاحية المشتريات بس
      const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
      if (!(await staffHasPermission(db, staffAuth.data!.staff_id, org_id, 'purchases'))) return NextResponse.json({ error: NO_PURCHASES }, { status: 403 })
    } else {
      const ownerAuth = await verifyOrgAccess(org_id)
      if (!ownerAuth.authorized) return NextResponse.json({ error: ownerAuth.error }, { status: ownerAuth.status })
    }

    const r = await readInvoice(image, type)
    if (!r.ok) return NextResponse.json({ error: r.error, ...(r.unavailable ? { unavailable: true } : {}) }, { status: r.status })
    return NextResponse.json({ success: true, data: r.data })
  } catch (err: any) {
    return NextResponse.json({ error: 'حدث خطأ أثناء معالجة الصورة' }, { status: 500 })
  }
}
