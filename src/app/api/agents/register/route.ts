import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { clientIp } from '@/lib/loginThrottle'
import { formatPhone } from '@/lib/whatsapp'
import { normalizeEmail, isEmail } from '@/lib/accountantPortalAuth'
import { encryptIban } from '@/lib/agentAuth'
import { newAgentCode, normalizeIban, isValidSaIban, AGENT_TERMS_VERSION } from '@/lib/agentRewards'
import { notifyAgent } from '@/lib/agentNotify'
import { siteUrl } from '@/lib/accountantSend'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// تسجيل مندوب جديد — مفتوح لأي أحد، وياخذ رابطه على طول
export async function POST(req: Request) {
  try {
    const b = await req.json()
    const name = String(b.name || '').trim().replace(/\s+/g, ' ').slice(0, 80)
    if (name.length < 2) return NextResponse.json({ error: 'اكتب اسمك' }, { status: 400 })
    const phone = formatPhone(String(b.phone || '')).replace(/\D/g, '')
    if (!/^[0-9]{8,15}$/.test(phone)) return NextResponse.json({ error: 'رقم الجوال غير صحيح' }, { status: 400 })
    const email = normalizeEmail(b.email)
    if (!isEmail(email)) return NextResponse.json({ error: 'الإيميل غير صحيح' }, { status: 400 })
    const payout_method = b.payout_method === 'transfer' ? 'transfer' : b.payout_method === 'cash' ? 'cash' : null
    if (!payout_method) return NextResponse.json({ error: 'اختر طريقة استلام المكافأة' }, { status: 400 })
    let iban: string | null = null
    if (payout_method === 'transfer') {
      iban = normalizeIban(b.iban)
      if (!isValidSaIban(iban)) return NextResponse.json({ error: 'رقم الآيبان غير صحيح — ٢٤ خانة يبدأ بـ SA' }, { status: 400 })
    }
    if (b.accept_terms !== true) return NextResponse.json({ error: 'لازم توافق على الشروط والأحكام' }, { status: 400 })

    const db = sb(), ip = clientIp(req)
    const { count } = await db.from('sales_agents').select('id', { count: 'exact', head: true }).eq('created_ip', ip).gte('created_at', new Date(Date.now() - 3600e3).toISOString())
    if ((count || 0) >= 5) return NextResponse.json({ error: 'تسجيلات كثيرة — جرّب بعد ساعة' }, { status: 429 })
    const [{ data: byPhone }, { data: byEmail }] = await Promise.all([
      db.from('sales_agents').select('id').eq('phone', phone).maybeSingle(),
      db.from('sales_agents').select('id').eq('email', email).maybeSingle(),
    ])
    if (byPhone || byEmail) return NextResponse.json({ error: 'هذا الجوال أو الإيميل مسجّل من قبل — ادخل محفظتك', exists: true }, { status: 409 })

    // كود فريد (نعيد المحاولة لو تكرر)
    let row: any = null
    for (let i = 0; i < 5 && !row; i++) {
      const { data, error } = await db.from('sales_agents').insert({
        code: newAgentCode(), name, phone, email, payout_method,
        iban_enc: iban ? encryptIban(iban) : null, iban_last4: iban ? iban.slice(-4) : null,
        terms_version: AGENT_TERMS_VERSION, created_ip: ip,
      } as any).select('id,code').single()
      if (data) row = data
      else if (error && !/code/.test(error.message)) return NextResponse.json({ error: 'هذا الجوال أو الإيميل مسجّل من قبل — ادخل محفظتك', exists: true }, { status: 409 })
    }
    if (!row) return NextResponse.json({ error: 'تعذر التسجيل، حاول مرة ثانية' }, { status: 500 })

    const link = `${siteUrl()}/r/${row.code}`
    await notifyAgent(db, row.id, { title: 'أهلاً بك في برنامج مناديب Storely',
      lines: [`رابطك الخاص: ${link}`, `كودك: ${row.code}`, 'أي منشأة تسجّل من رابطك أو تكتب كودك وتشترك، تنضاف مكافأتك في محفظتك ويوصلك إشعار.'],
      whatsapp: `🎉 أهلاً ${name} في برنامج مناديب Storely\n\nرابطك: ${link}\nكودك: *${row.code}*\n\nكل منشأة تشترك عن طريقك = مكافأة في محفظتك.` })
    return NextResponse.json({ success: true, code: row.code, link })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ، حاول مرة ثانية' }, { status: 500 })
  }
}
