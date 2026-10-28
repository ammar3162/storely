import { NextResponse } from 'next/server'
import { orgHasFeature, lockedMessage } from '@/lib/planFeatures'
import { lockedFor, lockedFromError } from '@/lib/periodLock'
import { createClient } from '@supabase/supabase-js'
import { WHATSAPP_PAUSED } from '@/lib/whatsappPause'
import { sendPushToOrg } from '@/lib/push'
import { verifyOrgAccess, enforcedBranchId } from '@/lib/verifyOrgAccess'
import { verifyOwnerPassword } from '@/lib/ownerPassword'
import { canCloseCashier } from '@/lib/staffRoles'
import { editClosing, deleteClosing } from '@/lib/cashierClosingEdit'
import { verifyStaffToken, extractStaffToken } from '@/lib/staffAuth'
import { computeBusinessDate } from '@/lib/businessDate'
import { selectAll } from '@/lib/selectAll'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// صور الإقفال لازم تكون مرفوعة على تخزين Supabase حقنا — نرفض أي رابط ثاني
function safeImageUrl(v: unknown): string | null {
  const s = typeof v === 'string' ? v.trim() : ''
  if (!s) return null
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '')
  return base && s.startsWith(`${base}/storage/v1/`) ? s.slice(0, 1000) : null
}

function formatPhone(raw: string): string {
  const clean = (raw || '').replace(/\s/g, '')
  if (clean.startsWith('+')) return clean.slice(1)
  if (clean.startsWith('00')) return clean.slice(2)
  if (clean.startsWith('966')) return clean
  if (clean.startsWith('05')) return '966' + clean.slice(1)
  if (clean.startsWith('5')) return '966' + clean
  return clean
}

export async function POST(req: Request) {
  try {
    // الكاشير لازم يكون مسجّل دخول بالـPIN — المنشأة والموظف والفرع من التوكن الموقّع، مو من الطلب
    const auth = await verifyStaffToken(extractStaffToken(req))
    if (!auth.valid || !auth.data) return NextResponse.json({ error: auth.error, reason: auth.reason }, { status: 401 })
    const { org_id, staff_id } = auth.data

    const {
      total_sales, network_amount, mada_amount, visa_amount, mastercard_amount,
      cash_amount, purchases, network_image, sales_image, deficit_reason,
    } = await req.json()

    // الاسم والفرع والدور من قاعدة البيانات — وما يقفل الصندوق إلا كاشير فعّال
    const { data: staffRow } = await sb().from('staff_members')
      .select('name,branch_id,role,is_active,permissions').eq('id', staff_id).eq('org_id', org_id).maybeSingle()
    if (!staffRow || (staffRow as any).is_active === false) return NextResponse.json({ error: 'الحساب غير فعّال' }, { status: 403 })
    if (!canCloseCashier(staffRow as any)) return NextResponse.json({ error: 'إقفال الصندوق للكاشير أو لموظف عنده صلاحية إقفال الكاشير' }, { status: 403 })
    const staff_name: string = (staffRow as any).name
    const branch_id: string | null = (staffRow as any).branch_id ?? auth.data.branch_id ?? null

    const { data: orgCheck } = await sb().from('organizations').select('plan').eq('id', org_id).single()
    if (!(await orgHasFeature(sb(), org_id, 'cashier', (orgCheck as any)?.plan))) {
      return NextResponse.json({ error: lockedMessage('cashier') }, { status: 403 })
    }

    // مبالغ موجبة ومعقولة بس — أي قيمة غريبة تنرفض
    const money = (v: unknown) => { const n = Number(v); return Number.isFinite(n) && n >= 0 && n < 1e9 ? Math.round(n * 100) / 100 : NaN }
    const sales = money(total_sales || 0)
    const mada = money(mada_amount || 0)
    const visa = money(visa_amount || 0)
    const mastercard = money(mastercard_amount || 0)
    const cash = money(cash_amount || 0)
    const network = network_amount ? money(network_amount) : Math.round((mada + visa + mastercard) * 100) / 100
    if ([sales, mada, visa, mastercard, cash, network].some(Number.isNaN)) {
      return NextResponse.json({ error: 'مبالغ غير صالحة' }, { status: 400 })
    }
    // المسحوبات: مبلغ وسبب فقط (ما نخزّن أي حقول ثانية من الطلب)
    const purchasesList = (Array.isArray(purchases) ? purchases : []).slice(0, 50)
      .map((p: any) => ({ amount: money(p?.amount), reason: String(p?.reason ?? '').trim().slice(0, 200) }))
      .filter(p => p.amount > 0)
    const totalPurchases = purchasesList.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0)

    const expectedCash = sales - network
    // المسحوبات لا تؤثر على حساب العجز/الزيادة إطلاقاً — الكاشير عدّ الكاش الفعلي بعد ما سحب المبلغ أصلاً
    const cashAfterWithdrawal = cash - totalPurchases // للعرض/التقرير فقط
    const difference = cash - expectedCash
    const status = Math.abs(difference) < 0.01 ? 'balanced' : (difference < 0 ? 'deficit' : 'surplus')

    // العجز لازم له سبب — ما ينقبل التقفيل بدونه
    const deficitReason = status === 'deficit' ? String(deficit_reason || '').trim().slice(0, 500) : ''
    if (status === 'deficit' && deficitReason.length < 3) {
      return NextResponse.json({ error: 'فيه عجز — اكتب سبب العجز قبل التقفيل' }, { status: 400 })
    }

    const supabase = sb()
    // تاريخ يوم العمل — قاعدة وحدة: أي تقفيل قبل ساعة بداية اليوم الجديد ينحسب على اليوم اللي قبل
    // (ما نقبل تاريخ من الطلب — التاريخ يحدده السيرفر بس)
    const { data: orgDay } = await supabase.from('organizations').select('business_day_start_hour').eq('id', org_id).single()
    const businessDate = computeBusinessDate({ startHour: (orgDay as any)?.business_day_start_hour })
    const locked = await lockedFor(supabase, org_id, [businessDate])
    if (locked) return NextResponse.json({ error: locked }, { status: 423 })
    const { data, error } = await supabase
      .from('cashier_closings')
      .insert({
        org_id,
        branch_id: branch_id || null,
        staff_id,
        staff_name,
        closing_date: businessDate,
        total_sales: sales,
        network_amount: network,
        mada_amount: mada,
        visa_amount: visa,
        mastercard_amount: mastercard,
        cash_amount: cash,
        purchases: purchasesList,
        total_purchases: totalPurchases,
        expected_cash: expectedCash,
        difference,
        status,
        deficit_reason: deficitReason || null,
        // العجز ما ينخصم من راتب الكاشير إلا لو المالك اعتمده
        deficit_decision: status === 'deficit' ? 'pending' : null,
        network_image: safeImageUrl(network_image),
        sales_image: safeImageUrl(sales_image),
      })
      .select()
      .single()

    if (error && lockedFromError(error)) return NextResponse.json({ error: lockedFromError(error) }, { status: 423 })
    if (error) {
      return NextResponse.json({ error: 'حدث خطأ أثناء حفظ التقرير' }, { status: 500 })
    }

    // إرسال إشعار واتساب فوري للمالك
    try {
      const { data: org } = await supabase.from('organizations').select('name,whatsapp_number,notify_cashier_closing_wa').eq('id', org_id).single()
      const { data: ownerProfile } = await supabase.from('profiles').select('whatsapp_consent').eq('org_id', org_id).eq('role', 'owner').maybeSingle()
      const ownerConsented = (ownerProfile as any)?.whatsapp_consent === true

      // إشعار داخل النظام — يصل دائماً بغض النظر عن موافقة واتساب
      const closingStatusText = status === 'balanced' ? 'مطابق تماماً' : status === 'deficit' ? `يوجد عجز: ${Math.abs(difference).toFixed(2)} ر.س — السبب: ${deficitReason}` : `يوجد زيادة: ${Math.abs(difference).toFixed(2)} ر.س`
      await (supabase as any).from('notifications').insert({
        org_id, branch_id: branch_id || null, title: `إقفال كاشير: ${staff_name}`, message: `إجمالي المبيعات: ${sales.toFixed(2)} ⃁ — ${closingStatusText}`, type: 'info', read: false
      })
      // قرار العجز — إشعار داخل النظام فقط، فيه زر اعتماد الخصم أو رفضه
      if (status === 'deficit' && data) {
        await (supabase as any).from('notifications').insert({
          org_id, branch_id: branch_id || null, type: 'warning', read: false,
          title: `عجز بانتظار قرارك: ${staff_name}`,
          message: `عجز ${Math.abs(difference).toFixed(2)} ⃁ بإقفال ${businessDate} — السبب: ${deficitReason}. تخصمه من راتب الكاشير؟`,
          ref_type: 'cashier_deficit', ref_id: (data as any).id,
        })
      }
      // إشعار فوري بالمتصفح/الجوال — لا يعتمد على واتساب إطلاقاً
      sendPushToOrg(org_id, `إقفال كاشير: ${staff_name}`, `إجمالي المبيعات: ${sales.toFixed(2)} ر.س — ${closingStatusText}`, '/reports').catch(()=>{})
      const { data: allBranches } = await supabase.from('branches').select('id,name,whatsapp_number').eq('org_id', org_id).eq('is_active', true)
      const isMultiBranch = (allBranches || []).length > 1
      const currentBranch = branch_id ? (allBranches || []).find((b: any) => b.id === branch_id) : null
      const branchName = currentBranch?.name || null
      // رقم الفرع المخصص له الأولوية على رقم المؤسسة الرئيسي
      const whatsappNumber = (currentBranch as any)?.whatsapp_number || (org as any)?.whatsapp_number
      const { data: staffPrefs } = await supabase.from('staff_members').select('send_closing_whatsapp').eq('id', staff_id).maybeSingle()
      const sendFullDetails = WHATSAPP_PAUSED ? false : ((staffPrefs as any)?.send_closing_whatsapp !== false)

      // احترام تفضيل العميل: يرسل بس لو مفعّل بالإعدادات
      const notifyEnabled = (org as any)?.notify_cashier_closing_wa !== false
      const shouldSendNow = notifyEnabled

      if (whatsappNumber && shouldSendNow && ownerConsented) {
        const now = new Date()
        const effectiveDate = now
        const timeStr = effectiveDate.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Riyadh' })
        const dateStr = effectiveDate.toLocaleDateString('ar-SA', {numberingSystem:'latn', weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Riyadh' })
        const branchLine = (isMultiBranch && branchName) ? `🏪 الفرع: *${branchName}*\n` : ''

        let msg: string
        if (!sendFullDetails) {
          // موقّف: إشعار بسيط بدون تفاصيل مالية
          msg = `🟢 *Storely — إقفال كاشير*\n\n` +
            `👤 الموظف *${staff_name}* أقفل الصندوق\n` +
            branchLine +
            `🕐 ${timeStr} · ${dateStr}`
        } else {
          const statusLine = status === 'balanced'
            ? '✅ *مطابق تماماً*'
            : status === 'deficit'
              ? `⚠️ *يوجد عجز: ${Math.abs(difference).toFixed(2)} ر.س*\n📝 السبب: ${deficitReason}`
              : `📈 *يوجد زيادة: ${Math.abs(difference).toFixed(2)} ر.س*`

          let networkLines = ''
          if (mada > 0) networkLines += `  • مدى: ${mada.toFixed(2)} ر.س\n`
          if (visa > 0) networkLines += `  • فيزا: ${visa.toFixed(2)} ر.س\n`
          if (mastercard > 0) networkLines += `  • ماستركارد: ${mastercard.toFixed(2)} ر.س\n`

          let purchasesLine = ''
          if (totalPurchases > 0) {
            const itemsList = purchasesList.map((p: any) => `  • ${p.reason || 'بدون سبب'}: ${Number(p.amount).toFixed(2)} ر.س`).join('\n')
            purchasesLine = `\n🧾 مسحوبات:\n${itemsList}\n  الإجمالي: *${totalPurchases.toFixed(2)} ر.س*`
          }

          msg = `🟢 *Storely — إقفال كاشير*\n\n` +
            `👤 الموظف: *${staff_name}*\n` +
            branchLine +
            `🕐 ${timeStr} · ${dateStr}\n\n` +
            `📊 إجمالي المبيعات: *${sales.toFixed(2)} ر.س*\n\n` +
            `💳 الشبكة:\n${networkLines}  إجمالي: *${network.toFixed(2)} ر.س*\n\n` +
            `💵 الكاش الفعلي: *${cash.toFixed(2)} ر.س*` +
            purchasesLine +
            `\n\n${statusLine}`
        }

        await fetch('https://www.wasenderapi.com/api/send-message', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.WASENDER_API_KEY}`,
            'X-Session-Id': process.env.WASENDER_SESSION_ID!,
          },
          body: JSON.stringify({ to: formatPhone(whatsappNumber), text: msg }),
        })
      }
    } catch {}

    return NextResponse.json({ success: true, closing: data })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const org_id = searchParams.get('org_id')
    const branch_id = searchParams.get('branch_id')
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    if (!org_id) {
      return NextResponse.json({ error: 'org_id مطلوب' }, { status: 400 })
    }

    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })
    const effectiveBranchId = enforcedBranchId(access, branch_id)

    const supabase = sb()
    const { data, error } = await selectAll(() => {
      let query = supabase
        .from('cashier_closings')
        .select('id,branch_id,staff_id,closing_date,created_at,staff_name,total_sales,network_amount,mada_amount,visa_amount,mastercard_amount,cash_amount,edited_at,edited_by,edit_count,total_purchases,difference,status,deficit_reason,deficit_decision,deficit_decided_at,sales_image,network_image,purchases')
        .eq('org_id', org_id)
        .order('closing_date', { ascending: false })
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
      if (effectiveBranchId) query = query.eq('branch_id', effectiveBranchId)
      if (from) query = query.gte('closing_date', from)
      if (to) query = query.lte('closing_date', to)
      return query
    })

    if (error) {
      return NextResponse.json({ error: 'حدث خطأ أثناء جلب التقارير' }, { status: 500 })
    }

    return NextResponse.json({ success: true, closings: data || [] })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

// تعديل أو حذف إقفال كاشير — للمالك بس وبكلمة مرور حسابه (يتحقق منها الخادم)، وكل شي يتحدث معه
async function ownerWithPassword(org_id: unknown, password: unknown) {
  if (typeof org_id !== 'string' || !/^[0-9a-f-]{36}$/i.test(org_id)) return { error: NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 }) }
  const access = await verifyOrgAccess(org_id)
  if (!access.authorized) return { error: NextResponse.json({ error: access.error }, { status: access.status }) }
  if (access.role !== 'owner') return { error: NextResponse.json({ error: 'تعديل وحذف الإقفال لمالك الحساب بس' }, { status: 403 }) }
  const v = await verifyOwnerPassword(sb(), org_id, access.userId!, password)
  if (!v.ok) return { error: NextResponse.json({ error: v.error }, { status: v.status }) }
  return { editor: (await sb().from('profiles').select('full_name').eq('id', access.userId!).maybeSingle()).data?.full_name || 'المالك' }
}

export async function PATCH(req: Request) {
  try {
    const b = await req.json()
    const g = await ownerWithPassword(b.org_id, b.password); if (g.error) return g.error
    if (!/^[0-9a-f-]{36}$/i.test(String(b.id || ''))) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
    const r = await editClosing(sb(), b.org_id, b.id, {
      closing_date: b.closing_date, total_sales: b.total_sales, mada_amount: b.mada_amount, visa_amount: b.visa_amount,
      mastercard_amount: b.mastercard_amount, cash_amount: b.cash_amount, purchases: b.purchases, deficit_reason: b.deficit_reason,
    }, g.editor!)
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status })
    return NextResponse.json({ success: true, closing: r.closing })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const org_id = searchParams.get('org_id'), id = searchParams.get('id') || ''
    const body = await req.json().catch(() => ({}))
    const g = await ownerWithPassword(org_id, (body as any).password); if (g.error) return g.error
    if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
    const r = await deleteClosing(sb(), org_id!, id, g.editor!)
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
