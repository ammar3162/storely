import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyOrgAccess } from '@/lib/verifyOrgAccess'

export async function POST(req: NextRequest) {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  )
  const { org_id, branch_id } = await req.json()
  if (!org_id) return NextResponse.json({ error: 'missing' }, { status: 400 })
  const access = await verifyOrgAccess(org_id)
  if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })

  let pq = sb.from('products').select('id,name,qty,reorder_point,unit,category,branch_id').eq('org_id', org_id).eq('is_active', true)
  if (branch_id) pq = pq.eq('branch_id', branch_id)
  const { data: products } = await pq.order('name').limit(300)

  const now = Date.now()
  const since30 = new Date(now - 30*24*60*60*1000).toISOString()
  const since60 = new Date(now - 60*24*60*60*1000).toISOString()

  const { data: movesCurrent } = await sb.from('stock_movements')
    .select('qty_change,type,created_at,products!inner(id,name,unit,org_id,branch_id)')
    .eq('products.org_id', org_id).eq('type', 'out').gte('created_at', since30).limit(1000)
  const { data: movesPrev } = await sb.from('stock_movements')
    .select('qty_change,type,created_at,products!inner(id,name,unit,org_id,branch_id)')
    .eq('products.org_id', org_id).eq('type', 'out').gte('created_at', since60).lt('created_at', since30).limit(1000)

  const sumByName = (rows: any[]) => {
    const m: Record<string, number> = {}
    for (const r of rows || []) {
      const p = r.products; if (!p) continue
      m[p.name] = (m[p.name] || 0) + Math.abs(r.qty_change)
    }
    return m
  }
  const currentConsumed = sumByName(movesCurrent || [])
  const prevConsumed = sumByName(movesPrev || [])
  const totalCurrent = Object.values(currentConsumed).reduce((s, n) => s + n, 0)
  const totalPrev = Object.values(prevConsumed).reduce((s, n) => s + n, 0)
  const overallTrendPct = totalPrev > 0 ? Math.round(((totalCurrent - totalPrev) / totalPrev) * 1000) / 10 : null

  const risingItems: { name: string; pct: number }[] = []
  const fallingItems: { name: string; pct: number }[] = []
  for (const name of Object.keys(currentConsumed)) {
    const cur = currentConsumed[name]; const prev = prevConsumed[name] || 0
    if (prev < 1) continue
    const pct = Math.round(((cur - prev) / prev) * 1000) / 10
    if (pct >= 30) risingItems.push({ name, pct })
    else if (pct <= -30) fallingItems.push({ name, pct })
  }
  risingItems.sort((a, b) => b.pct - a.pct)
  fallingItems.sort((a, b) => a.pct - b.pct)

  const lowProducts = (products || [])
    .filter((p: any) => p.qty <= p.reorder_point)
    .map((p: any) => {
      const dailyRate = (currentConsumed[p.name] || 0) / 30
      const daysLeft = dailyRate > 0 ? Math.round(p.qty / dailyRate) : null
      return { ...p, dailyRate: Math.round(dailyRate * 10) / 10, daysLeft }
    })
    .sort((a: any, b: any) => (a.daysLeft ?? 999) - (b.daysLeft ?? 999))

  const { data: purchasesCurrent } = await sb.from('purchases').select('amount,created_at,name,qty').eq('org_id', org_id).gte('created_at', since30).limit(300)
  const { data: purchasesPrev } = await sb.from('purchases').select('amount,created_at').eq('org_id', org_id).gte('created_at', since60).lt('created_at', since30).limit(300)
  const spendCurrent = (purchasesCurrent || []).reduce((s: number, p: any) => s + Number(p.amount || 0), 0)
  const spendPrev = (purchasesPrev || []).reduce((s: number, p: any) => s + Number(p.amount || 0), 0)
  const spendTrendPct = spendPrev > 0 ? Math.round(((spendCurrent - spendPrev) / spendPrev) * 1000) / 10 : null

  const wasteItems = (products || [])
    .map((p: any) => ({ ...p, dispensed: currentConsumed[p.name] || 0 }))
    .filter((p: any) => p.qty > p.reorder_point * 3 && (currentConsumed[p.name] || 0) < p.reorder_point)
    .slice(0, 8)
  const neverDispensed = (products || [])
    .filter((p: any) => p.qty > 0 && !currentConsumed[p.name])
    .slice(0, 8)

  const { data: branches } = await sb.from('branches').select('id,name').eq('org_id', org_id).eq('is_active', true)
  let branchSummary = ''
  if (branches && branches.length > 1) {
    const branchConsumed: Record<string, number> = {}
    for (const r of (movesCurrent || []) as any[]) {
      const p = r.products; if (!p?.branch_id) continue
      branchConsumed[p.branch_id] = (branchConsumed[p.branch_id] || 0) + Math.abs(r.qty_change)
    }
    branchSummary = branches.map((b: any) => `• ${b.name}: إجمالي استهلاك آخر 30 يوم = ${Math.round((branchConsumed[b.id] || 0) * 10) / 10}`).join('\n')
  }

  const systemPrompt = `أنت محلل بيانات أعمال محترف لنظام Storely لإدارة المخزون. مهمتك تحليل بيانات منشأة حقيقية وإنتاج تقرير تنفيذي احترافي جداً ومفيد فعلياً لصاحب المنشأة.

قواعد صارمة:
- اعتمد فقط على البيانات المرفقة، لا تخترع أرقام
- لو بيانات فترة معينة ناقصة (مثلاً ما فيه مقارنة سابقة)، وضّح ذلك بدل ما تفترض
- كن مباشراً وعملياً، بدون حشو
- أرقام دقيقة دائماً، مقربة لرقم عشري واحد كحد أقصى

أرجع ردّك بصيغة JSON فقط (بدون أي نص قبله أو بعده)، بالضبط بهذا الشكل:
{
  "status": "صحي" أو "يحتاج انتباه" أو "خطر",
  "summary": "3-4 أسطر تلخّص وضع المنشأة العام",
  "risks": [{"title":"...", "detail":"...", "severity":"عالية أو متوسطة"}],
  "savings": [{"title":"...", "detail":"...", "estimatedImpact":"..."}],
  "trends": [{"title":"...", "detail":"..."}],
  "recommendations": [{"title":"...", "detail":""}]
}
كل مصفوفة تحتوي 3 إلى 5 عناصر بالضبط لو البيانات تسمح، وإلا أقل مع توضيح السبب. رجّع أهم العناصر فقط (مرتّبة حسب الأولوية).

═══ بيانات المخزون الحالية ═══
إجمالي الأصناف: ${(products || []).length}
الأصناف الناقصة (${lowProducts.length}):
${lowProducts.slice(0, 15).map((p: any) => `• ${p.name}: متبقي ${p.qty} ${p.unit} | معدل يومي: ${p.dailyRate}${p.daysLeft !== null ? ` | متوقع نفاده خلال ${p.daysLeft} يوم` : ' | لا بيانات صرف'}`).join('\n')}

═══ الاتجاه العام (آخر 30 يوم مقابل الـ30 يوم قبلها) ═══
${overallTrendPct !== null ? `إجمالي الاستهلاك تغيّر ${overallTrendPct > 0 ? '+' : ''}${overallTrendPct}%` : 'لا توجد بيانات كافية بالفترة السابقة للمقارنة'}
الإنفاق على المشتريات: هذي الفترة ${spendCurrent.toLocaleString()} ر.س ${spendTrendPct !== null ? `(${spendTrendPct > 0 ? '+' : ''}${spendTrendPct}% عن الفترة السابقة)` : '(لا توجد بيانات سابقة للمقارنة)'}

أصناف بارتفاع استهلاك ملحوظ (+30% أو أكثر):
${risingItems.slice(0, 8).map(r => `• ${r.name}: +${r.pct}%`).join('\n') || 'لا يوجد'}

أصناف بانخفاض استهلاك ملحوظ (-30% أو أكثر):
${fallingItems.slice(0, 8).map(r => `• ${r.name}: ${r.pct}%`).join('\n') || 'لا يوجد'}

═══ كشف الهدر المحتمل ═══
أصناف مشتراة بكثرة لكن صرفها قليل جداً:
${wasteItems.map((p: any) => `• ${p.name}: مخزون ${p.qty} ${p.unit} — صُرف فقط ${p.dispensed} خلال 30 يوم`).join('\n') || 'لا يوجد'}
أصناف لم تُصرف إطلاقاً خلال 30 يوم رغم وجود مخزون:
${neverDispensed.map((p: any) => `• ${p.name}: مخزون ${p.qty} ${p.unit}`).join('\n') || 'لا يوجد'}

${branchSummary ? `═══ مقارنة الفروع ═══\n${branchSummary}` : ''}`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 3000,
      system: systemPrompt,
      messages: [{ role: 'user', content: 'حلّل بيانات منشأتي الآن وأعطني التقرير بصيغة JSON المطلوبة، بدون أي نص قبل أو بعد الـJSON.' }],
    }),
  })

  const data = await response.json()
  if (!response.ok) {
    console.error('anthropic api error:', JSON.stringify(data))
    return NextResponse.json({ error: `خطأ من خدمة الذكاء الاصطناعي: ${data.error?.message || response.status}` }, { status: 500 })
  }
  const raw = data.content?.[0]?.text || ''
  try {
    const firstBrace = raw.indexOf('{')
    const lastBrace = raw.lastIndexOf('}')
    if (firstBrace === -1 || lastBrace === -1) throw new Error('no JSON braces found')
    const jsonSlice = raw.slice(firstBrace, lastBrace + 1)
    const parsed = JSON.parse(jsonSlice)
    return NextResponse.json({ success: true, insights: parsed })
  } catch (e) {
    console.error('smart-insights parse error. raw response:', raw)
    return NextResponse.json({ error: 'فشل تحليل رد الذكاء الاصطناعي — جرّب مرة ثانية', raw }, { status: 500 })
  }
}
