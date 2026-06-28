import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const { message, org_id, branch_id } = await req.json()
  if (!message || !org_id) return NextResponse.json({ error: 'missing' }, { status: 400 })

  // جلب كل المنتجات
  let pq = sb.from('products').select('id,name,qty,reorder_point,unit,category').eq('org_id', org_id).eq('is_active', true)
  if (branch_id) pq = pq.eq('branch_id', branch_id)
  const { data: products } = await pq.order('name').limit(200)

  // جلب حركات الصرف آخر 90 يوم
  const since90 = new Date(Date.now() - 90*24*60*60*1000).toISOString()
  const { data: movements } = await sb.from('stock_movements')
    .select('qty_change,type,created_at,products!inner(id,name,unit,org_id,branch_id)')
    .eq('products.org_id', org_id)
    .eq('type', 'out')
    .gte('created_at', since90)
    .order('created_at', { ascending: false })
    .limit(500)

  // جلب المشتريات آخر 90 يوم
  const { data: purchases } = await sb.from('purchases')
    .select('amount,created_at,supplier_name,items')
    .eq('org_id', org_id)
    .gte('created_at', since90)
    .order('created_at', { ascending: false })
    .limit(100)

  // حساب معدل الصرف لكل منتج
  const dispenseMap: Record<string, { name:string; unit:string; total:number; days:Set<string>; weekly:number; monthly:number }> = {}
  
  for (const m of (movements||[])) {
    const prod = m.products as any
    if (!prod) continue
    const key = prod.id || prod.name
    if (!dispenseMap[key]) {
      dispenseMap[key] = { name: prod.name, unit: prod.unit, total: 0, days: new Set(), weekly: 0, monthly: 0 }
    }
    dispenseMap[key].total += Math.abs(m.qty_change)
    dispenseMap[key].days.add(m.created_at.split('T')[0])
  }

  // حساب المعدل الأسبوعي والشهري
  for (const key of Object.keys(dispenseMap)) {
    const d = dispenseMap[key]
    d.weekly  = Math.round((d.total / 90) * 7 * 10) / 10
    d.monthly = Math.round((d.total / 90) * 30 * 10) / 10
  }

  // ترتيب حسب الأكثر صرفاً
  const topDispensed = Object.values(dispenseMap)
    .sort((a,b) => b.total - a.total)
    .slice(0, 20)

  // الأصناف الناقصة مع متوقع نفادها
  const lowProducts = (products||[])
    .filter((p:any) => p.qty <= p.reorder_point)
    .map((p:any) => {
      const stats = Object.values(dispenseMap).find(d => d.name === p.name)
      const dailyRate = stats ? stats.total / 90 : 0
      const daysLeft = dailyRate > 0 ? Math.round(p.qty / dailyRate) : null
      return { ...p, dailyRate: Math.round(dailyRate*10)/10, daysLeft }
    })

  // إحصائيات المشتريات
  const totalSpent = (purchases||[]).reduce((s:number, p:any) => s + Number(p.amount||0), 0)
  const thisMonth = new Date().getMonth()
  const monthlySpent = (purchases||[])
    .filter((p:any) => new Date(p.created_at).getMonth() === thisMonth)
    .reduce((s:number, p:any) => s + Number(p.amount||0), 0)

  // حساب الهدر
  const dispenseMap90: Record<string, number> = {}
  for (const m of (movements||[])) {
    const p = m.products as any
    if (!p) continue
    dispenseMap90[p.name] = (dispenseMap90[p.name]||0) + Math.abs(m.qty_change)
  }
  const wasteItems = (products||[])
    .map((p:any) => ({ ...p, dispensed: dispenseMap90[p.name]||0 }))
    .filter((p:any) => p.qty > p.reorder_point * 3 && (dispenseMap90[p.name]||0) < p.reorder_point)
    .slice(0, 5)
  const neverDispensed = (products||[])
    .filter((p:any) => p.qty > 0 && !dispenseMap90[p.name])
    .slice(0, 5)

  const systemPrompt = `أنت محلل بيانات متخصص لنظام Storely لإدارة المخزون. مهمتك تحليل البيانات الحقيقية وتقديم إجابات دقيقة مبنية على الأرقام فقط.

قواعد مهمة:
- أجب فقط بناءً على البيانات الموجودة أمامك
- لا تتنبأ أو تخمن بدون بيانات حقيقية
- قدم أرقاماً محددة دائماً
- إذا لم تكن البيانات كافية، قل ذلك بوضوح
- اجعل إجاباتك مختصرة وعملية

═══ بيانات المخزون الحالية ═══
إجمالي الأصناف: ${(products||[]).length}
الأصناف الناقصة: ${lowProducts.length}

تفاصيل الأصناف الناقصة:
${lowProducts.map((p:any) => `• ${p.name}: متبقي ${p.qty} ${p.unit} | معدل الصرف اليومي: ${p.dailyRate} ${p.unit}/يوم${p.daysLeft!==null?` | متوقع نفاده خلال: ${p.daysLeft} يوم`:' | لا يوجد بيانات صرف'}`).join('\n')}

═══ معدلات الصرف (آخر 90 يوم) ═══
${topDispensed.map(d => `• ${d.name}: إجمالي ${d.total} ${d.unit} | أسبوعياً: ${d.weekly} | شهرياً: ${d.monthly}`).join('\n')}

═══ جميع المنتجات مع الكميات ═══
${(products||[]).map((p:any) => {
  const stats = Object.values(dispenseMap).find(d => d.name === p.name)
  return `• ${p.name}: ${p.qty} ${p.unit} (حد أدنى: ${p.reorder_point}) | صرف شهري: ${stats?.monthly||0} ${p.unit}`
}).join('\n')}

═══ كشف الهدر ═══
أصناف مشتراة بكثرة لكن صرفها قليل جداً (${wasteItems.length} صنف):
${wasteItems.map((p:any)=>`• ${p.name}: كمية ${p.qty} ${p.unit} — صُرف فقط ${p.dispensed} ${p.unit} في 90 يوم`).join('\n')}

أصناف لم تُصرف أبداً خلال 90 يوم (${neverDispensed.length} صنف):
${neverDispensed.map((p:any)=>`• ${p.name}: كمية ${p.qty} ${p.unit}`).join('\n')}

═══ إحصائيات المشتريات ═══
إجمالي المشتريات (90 يوم): ${totalSpent.toLocaleString()} ر.س
مشتريات هذا الشهر: ${monthlySpent.toLocaleString()} ر.س
عدد الفواتير: ${(purchases||[]).length}

تحدث بالعربية دائماً. كن دقيقاً ومختصراً.`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      system: systemPrompt,
      messages: [{ role: 'user', content: message }],
    }),
  })

  const data = await response.json()
  const reply = data.content?.[0]?.text || 'عذراً، حدث خطأ'
  return NextResponse.json({ reply })
}
