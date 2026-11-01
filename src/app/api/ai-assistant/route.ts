import { reportAiFailure, aiFailureKind } from '@/lib/aiAlert'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyOrgAccess, enforcedBranchId } from '@/lib/verifyOrgAccess'
import { buildAssistantContext } from '@/lib/assistantContext'

// المساعد الذكي: متاح للكل لأسئلة الاشتراك والباقات، وبيانات كل قسم بس لو ميزته مفعّلة
// (الأقسام المقفلة ما تنرسل للنموذج أصلاً — lib/assistantContext)
export async function POST(req: NextRequest) {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '')
  const { message, org_id, branch_id: requestedBranch } = await req.json()
  if (!message || !org_id) return NextResponse.json({ error: 'missing' }, { status: 400 })
  const access = await verifyOrgAccess(org_id)
  if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })
  const branch_id = enforcedBranchId(access, requestedBranch)   // مدير الفرع: فرعه بس مهما أرسل الطلب

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
  return NextResponse.json({ reply })
}
