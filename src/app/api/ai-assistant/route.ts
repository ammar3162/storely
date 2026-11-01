import { reportAiFailure, aiFailureKind } from '@/lib/aiAlert'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyOrgAccess, enforcedBranchId } from '@/lib/verifyOrgAccess'
import { buildAssistantContext } from '@/lib/assistantContext'
import { classifyTopic, OFF_TOPIC_REPLY, GREETING_REPLY } from '@/lib/assistantTopic'

// المساعد الذكي: متاح للكل لأسئلة الاشتراك والباقات، وبيانات كل قسم بس لو ميزته مفعّلة
// (الأقسام المقفلة ما تنرسل للنموذج أصلاً — lib/assistantContext)
export async function POST(req: NextRequest) {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '')
  const { message, org_id, branch_id: requestedBranch } = await req.json()
  if (!message || !org_id) return NextResponse.json({ error: 'missing' }, { status: 400 })
  const access = await verifyOrgAccess(org_id)
  if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })
  const branch_id = enforcedBranchId(access, requestedBranch)   // مدير الفرع: فرعه بس مهما أرسل الطلب

  // سؤال خارج المنشأة أو تحية: رد جاهز بدون بيانات المنشأة (ما ينصرف توكن كامل)
  const topic = await classifyTopic(String(message))
  if (topic !== 'business') {
    const reply = topic === 'greeting' ? GREETING_REPLY : OFF_TOPIC_REPLY
    try {
      await sb.from('assistant_questions').insert({ org_id, user_id: (access as any).userId || null, role: (access as any).role || null, branch_id: branch_id || null,
        question: String(message).slice(0, 2000), reply, sections: [topic === 'greeting' ? 'greeting' : 'off_topic'] } as any)
    } catch {}
    return NextResponse.json({ reply })
  }

  const ctx = await buildAssistantContext(sb, org_id, branch_id || null, access as any)

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1000,
      system: ctx.prompt,
      messages: [{ role: 'user', content: String(message).slice(0, 2000) }],
    }),
  })

  const data = await response.json()
  if (!response.ok) {
    await reportAiFailure(response.status, JSON.stringify(data), 'المساعد الذكي')
    if (aiFailureKind(response.status, JSON.stringify(data))) return NextResponse.json({ reply: 'المساعد متوقف مؤقتاً — جرّب بعد شوي' })
  }
  const reply = data.content?.[0]?.text || 'عذراً، حدث خطأ'
  // سجل الأسئلة (يطلع للأدمن) — فشل التسجيل ما يوقف الرد
  try {
    await sb.from('assistant_questions').insert({
      org_id, user_id: (access as any).userId || null, role: (access as any).role || null, branch_id: branch_id || null,
      question: String(message).slice(0, 2000), reply: String(reply).slice(0, 4000),
      sections: ctx.sections.filter(x => x.on).map(x => x.key),
    } as any)
  } catch {}
  return NextResponse.json({ reply })
}
