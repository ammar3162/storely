import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyStaffToken, extractStaffToken } from '@/lib/staffAuth'

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const LANG_NAMES: Record<string, string> = {
  en: 'الإنجليزية',
  ur: 'الأردية',
  hi: 'الهندية',
  tl: 'الفلبينية (تاغالوغ)',
  bn: 'البنغالية',
  fr: 'الفرنسية',
}

export async function POST(req: Request) {
  try {
    const auth = verifyStaffToken(extractStaffToken(req))
    if (!auth.valid) return NextResponse.json({ error: auth.error }, { status: 401 })
    const { org_id: orgId, staff_id: staffId } = auth.data!

    const { targetLang } = await req.json()
    if (!targetLang) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })

    const supabase = sb()

    const { data: tasks, error: fetchErr } = await supabase
      .from('staff_tasks').select('id,title,description,translations')
      .eq('org_id', orgId).eq('staff_id', staffId)

    if (fetchErr || !tasks) return NextResponse.json({ error: 'تعذر جلب المهام' }, { status: 500 })

    const needsTranslation = tasks.filter((t: any) => {
      const existing = t.translations || {}
      return !existing[targetLang]
    })

    if (needsTranslation.length === 0) {
      const dict: Record<string, { title: string; description: string | null }> = {}
      tasks.forEach((t: any) => {
        const existing = t.translations || {}
        if (existing[targetLang]) dict[t.id] = existing[targetLang]
      })
      return NextResponse.json({ translations: dict, fromCache: true })
    }

    const langName = LANG_NAMES[targetLang] || targetLang
    const itemsToTranslate = needsTranslation.map((t: any) => ({ id: t.id, title: t.title, description: t.description || '' }))

    const prompt = `ترجم عناوين ووصف المهام التالية من العربية إلى ${langName}. أعطني فقط كائن JSON بدون أي نص إضافي، حيث المفتاح هو الـid كما ورد بالضبط، والقيمة كائن فيه title وdescription مترجمين (لو description فاضي خلّيه فاضي بالترجمة برضه).

المهام:
${itemsToTranslate.map((t: any) => `- id: ${t.id}\n  title: ${t.title}\n  description: ${t.description}`).join('\n')}

أعطني فقط كائن JSON بهذا الشكل بدون أي شرح:
{"task_id_1": {"title": "Translated title", "description": "Translated description or empty string"}}`

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 2000, messages: [{ role: 'user', content: prompt }] }),
    })

    let newTranslations: Record<string, { title: string; description: string }> = {}
    if (res.ok) {
      const data = await res.json()
      const text = data.content?.[0]?.text || '{}'
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      newTranslations = jsonMatch ? JSON.parse(jsonMatch[0]) : {}
    }

    for (const t of needsTranslation as any[]) {
      const translated = newTranslations[t.id]
      if (!translated) continue
      const existing = t.translations || {}
      const updated = { ...existing, [targetLang]: translated }
      await supabase.from('staff_tasks').update({ translations: updated } as any).eq('id', t.id)
    }

    const dict: Record<string, { title: string; description: string | null }> = {}
    tasks.forEach((t: any) => {
      const existing = t.translations || {}
      dict[t.id] = existing[targetLang] || newTranslations[t.id] || { title: t.title, description: t.description }
    })

    return NextResponse.json({ translations: dict, fromCache: false })
  } catch (err: any) {
    return NextResponse.json({ translations: {}, error: String(err) })
  }
}
