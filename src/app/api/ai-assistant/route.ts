import { reportAiFailure, aiFailureKind } from '@/lib/aiAlert'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyOrgAccess, enforcedBranchId } from '@/lib/verifyOrgAccess'
import { buildAssistantContext } from '@/lib/assistantContext'
import { runTool } from '@/lib/assistantTools'
import { classifyTopic, OFF_TOPIC_REPLY, GREETING_REPLY } from '@/lib/assistantTopic'
import { fetchExternal } from '@/lib/fetchExternal'
import { guard, limit } from '@/lib/rateLimit'

// المساعد الذكي: متاح للكل لأسئلة الاشتراك وطريقة الاستخدام، وبيانات المنشأة بالأدوات (lib/assistantTools)
// مع ميزة الذكاء الاصطناعي — الأداة المقفلة ما تنعرض على النموذج أصلاً
// جولات الأدوات تاخذ عدة ثواني
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '')
  const { message, org_id, branch_id: requestedBranch, history: rawHistory } = await req.json()
  // آخر رسائل المحادثة من المتصفح (نصوص بس، محدودة) — تتحقق وتتنظف قبل ما تنرسل للنموذج
  const history = (Array.isArray(rawHistory) ? rawHistory : []).slice(-6)
    .filter((h: any) => h && (h.role === 'user' || h.role === 'assistant') && typeof h.text === 'string' && h.text.trim())
    .map((h: any) => ({ role: h.role as 'user' | 'assistant', content: String(h.text).slice(0, 1500) }))
  if (!message || !org_id) return NextResponse.json({ error: 'missing' }, { status: 400 })
  const access = await verifyOrgAccess(org_id)
  if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })
  const limited = await guard([limit('aiChatOrg', org_id), limit('aiChatOrgDay', org_id)])
  if (limited) return limited
  const branch_id = enforcedBranchId(access, requestedBranch)   // مدير الفرع: فرعه بس مهما أرسل الطلب

  // سؤال خارج المنشأة أو تحية: رد جاهز بدون بيانات المنشأة (ما ينصرف توكن كامل)
  const lastReply = [...history].reverse().find(h => h.role === 'assistant')?.content
  const topic = await classifyTopic(String(message), lastReply)
  if (topic !== 'business') {
    const reply = topic === 'greeting' ? GREETING_REPLY : OFF_TOPIC_REPLY
    try {
      await sb.from('assistant_questions').insert({ org_id, user_id: (access as any).userId || null, role: (access as any).role || null, branch_id: branch_id || null,
        question: String(message).slice(0, 2000), reply, sections: [topic === 'greeting' ? 'greeting' : 'off_topic'] } as any)
    } catch {}
    return NextResponse.json({ reply })
  }

  const ctx = await buildAssistantContext(sb, org_id, branch_id || null, access as any)

  // حلقة الأدوات: المساعد يطلب أداة ← النظام يجيب البيانات ← يكمل (أقصى 4 جولات)
  // المحادثة لازم تبدأ بالمستخدم وتتناوب — نشيل أي رسالة مساعد بالبداية ونجمع المتتالية
  const turns: { role: 'user' | 'assistant'; content: string }[] = []
  for (const h of [...history, { role: 'user' as const, content: String(message).slice(0, 2000) }]) {
    if (!turns.length && h.role !== 'user') continue
    const last = turns[turns.length - 1]
    if (last && last.role === h.role) last.content += '\n' + h.content
    else turns.push({ ...h })
  }
  const messages: any[] = turns
  const used: string[] = []
  let data: any = null
  for (let round = 0; round < 5; round++) {
    const response = await fetchExternal('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY!, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001', max_tokens: 1000, system: ctx.prompt, messages,
        // آخر جولة: الأدوات تبقى معرّفة (الرسائل فيها نتائج أدوات) بس نمنع طلب أدوات جديدة عشان يرد
        ...(ctx.tools.length ? { tools: ctx.tools, ...(round === 4 ? { tool_choice: { type: 'none' } } : {}) } : {}),
      }),
    })
    data = await response.json()
    if (!response.ok) {
      await reportAiFailure(response.status, JSON.stringify(data), 'المساعد الذكي')
      if (aiFailureKind(response.status, JSON.stringify(data))) return NextResponse.json({ reply: 'المساعد متوقف مؤقتاً — جرّب بعد شوي' })
      break
    }
    if (data.stop_reason !== 'tool_use') break
    const calls = (data.content || []).filter((b: any) => b.type === 'tool_use')
    messages.push({ role: 'assistant', content: data.content })
    const results = []
    // كل طلب أداة لازم له رد — ننفذ أول 4 بس بكل جولة والباقي يرجع خطأ
    for (const [k, c] of calls.entries()) {
      const out = k < 4 ? (used.push(c.name), await runTool(c.name, c.input, ctx.toolCtx, ctx.features, access as any)) : { error: 'أدوات كثيرة بنفس الطلب' }
      results.push({ type: 'tool_result', tool_use_id: c.id, content: JSON.stringify(out).slice(0, 12000) })
    }
    messages.push({ role: 'user', content: results })
  }

  const reply = (data?.content || []).filter((b: any) => b.type === 'text').map((b: any) => b.text).join('\n').trim() || 'عذراً، حدث خطأ'
  // سجل الأسئلة (يطلع للأدمن) — فشل التسجيل ما يوقف الرد
  try {
    await sb.from('assistant_questions').insert({
      org_id, user_id: (access as any).userId || null, role: (access as any).role || null, branch_id: branch_id || null,
      question: String(message).slice(0, 2000), reply: String(reply).slice(0, 4000),
      sections: used.length ? [...new Set(used)] : ctx.sections.filter(x => x.on && x.key === 'subscription').map(x => x.key),
    } as any)
  } catch {}
  return NextResponse.json({ reply })
}
