import { NextResponse } from 'next/server'

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!

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
    const { productNames, targetLang } = await req.json()

    if (!Array.isArray(productNames) || productNames.length === 0) {
      return NextResponse.json({ translations: {} })
    }
    if (!targetLang) {
      return NextResponse.json({ error: 'حدد اللغة المطلوبة' }, { status: 400 })
    }

    const langName = LANG_NAMES[targetLang] || targetLang
    const names = productNames.slice(0, 300)

    const prompt = `ترجم أسماء المنتجات العربية التالية إلى ${langName}. أعطني فقط كائن JSON بدون أي نص إضافي، حيث المفتاح هو الاسم العربي بالضبط كما ورد، والقيمة هي الترجمة المختصرة (كلمة أو كلمتين كحد أقصى).

أسماء المنتجات:
${names.map((n: string) => `- ${n}`).join('\n')}

أعطني فقط كائن JSON بهذا الشكل بدون أي شرح أو نص إضافي:
{"الاسم العربي 1": "Translated Name 1", "الاسم العربي 2": "Translated Name 2"}`

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!res.ok) {
      return NextResponse.json({ translations: {} })
    }

    const data = await res.json()
    const text = data.content?.[0]?.text || '{}'

    const jsonMatch = text.match(/\{[\s\S]*\}/)
    const translations = jsonMatch ? JSON.parse(jsonMatch[0]) : {}

    return NextResponse.json({ translations })
  } catch (err: any) {
    return NextResponse.json({ translations: {} })
  }
}
