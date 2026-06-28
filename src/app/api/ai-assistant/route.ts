import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const { message, org_id, branch_id } = await req.json()
  if (!message || !org_id) return NextResponse.json({ error: 'missing' }, { status: 400 })

  let pq = sb.from('products').select('name,qty,reorder_point,unit,category').eq('org_id', org_id).eq('is_active', true)
  if (branch_id) pq = pq.eq('branch_id', branch_id)
  const { data: products } = await pq.order('name').limit(100)

  const { data: movements } = await sb.from('stock_movements')
    .select('qty_change,type,created_at,products!inner(name,unit,org_id)')
    .eq('products.org_id', org_id)
    .order('created_at', { ascending: false })
    .limit(30)

  const { data: purchases } = await sb.from('purchases')
    .select('amount,created_at,supplier_name')
    .eq('org_id', org_id)
    .order('created_at', { ascending: false })
    .limit(20)

  const low = (products||[]).filter((p:any) => p.qty <= p.reorder_point)
  const out = (products||[]).filter((p:any) => p.qty === 0)

  const systemPrompt = `أنت مساعد ذكي لنظام Storely لإدارة المخزون. تحدث بالعربية دائماً. كن مختصراً وعملياً ومفيداً.

بيانات المخزون الحالية:
- إجمالي الأصناف: ${(products||[]).length}
- أصناف ناقصة: ${low.length} صنف: ${low.slice(0,8).map((p:any)=>`${p.name} (${p.qty} ${p.unit})`).join(', ')}
- أصناف نفدت: ${out.length} صنف: ${out.slice(0,5).map((p:any)=>p.name).join(', ')}

آخر الحركات:
${(movements||[]).slice(0,10).map((m:any)=>`${m.type==='out'?'صرف':'إضافة'}: ${(m.products as any)?.name} (${Math.abs(m.qty_change)} ${(m.products as any)?.unit}) - ${new Date(m.created_at).toLocaleDateString('ar-SA')}`).join('\n')}

آخر المشتريات:
${(purchases||[]).slice(0,5).map((p:any)=>`${p.supplier_name||'—'}: ${p.amount} ر.س`).join('\n')}

قدم إجابات مفيدة وعملية بناءً على البيانات الحقيقية.`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      system: systemPrompt,
      messages: [{ role: 'user', content: message }],
    }),
  })

  const data = await response.json()
  const reply = data.content?.[0]?.text || 'عذراً، حدث خطأ'
  return NextResponse.json({ reply })
}
