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
    const orgId = auth.data!.org_id

    const { branchId, targetLang } = await req.json()

    if (!orgId || !targetLang) {
      return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
    }

    const supabase = sb()

    // جلب كل منتجات المؤسسة (أو الفرع) النشطة
    let q = supabase.from('products').select('id,name,category,translations').eq('org_id', orgId).eq('is_active', true)
    if (branchId) q = q.eq('branch_id', branchId)
    const { data: products, error: fetchErr } = await q

    if (fetchErr || !products) {
      return NextResponse.json({ error: 'تعذر جلب المنتجات' }, { status: 500 })
    }

    // تحديد أي المنتجات تنقصها ترجمة لهذي اللغة تحديداً
    const needsTranslation = products.filter(p => {
      const existing = (p.translations as any) || {}
      return !existing[targetLang]
    })

    const categoriesNeedingTranslation = new Set<string>()
    products.forEach(p => {
      const existing = (p.translations as any) || {}
      const cat = p.category?.trim() || 'أخرى'
      if (!existing[`cat_${targetLang}`]) categoriesNeedingTranslation.add(cat)
    })

    if (needsTranslation.length === 0 && categoriesNeedingTranslation.size === 0) {
      // كله مترجم مسبقاً، نرجع القاموس الكامل من قاعدة البيانات مباشرة
      const dict: Record<string, string> = {}
      products.forEach(p => {
        const existing = (p.translations as any) || {}
        if (existing[targetLang]) dict[p.name] = existing[targetLang]
        const cat = p.category?.trim() || 'أخرى'
        if (existing[`cat_${targetLang}`]) dict[cat] = existing[`cat_${targetLang}`]
      })
      return NextResponse.json({ translations: dict, fromCache: true })
    }

    const langName = LANG_NAMES[targetLang] || targetLang
    const namesToTranslate = Array.from(new Set([
      ...needsTranslation.map(p => p.name),
      ...Array.from(categoriesNeedingTranslation),
    ])).slice(0, 300)

    const prompt = `ترجم أسماء المنتجات العربية التالية إلى ${langName}. أعطني فقط كائن JSON بدون أي نص إضافي، حيث المفتاح هو الاسم العربي بالضبط كما ورد، والقيمة هي الترجمة المختصرة (كلمة أو كلمتين كحد أقصى).

أسماء المنتجات:
${namesToTranslate.map((n: string) => `- ${n}`).join('\n')}

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

    let newTranslations: Record<string, string> = {}
    if (res.ok) {
      const data = await res.json()
      const text = data.content?.[0]?.text || '{}'
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      newTranslations = jsonMatch ? JSON.parse(jsonMatch[0]) : {}
    }

    // حفظ الترجمات الجديدة بقاعدة البيانات لكل منتج
    for (const p of needsTranslation) {
      const translated = newTranslations[p.name]
      if (!translated) continue
      const existing = (p.translations as any) || {}
      const updated = { ...existing, [targetLang]: translated }
      await supabase.from('products').update({ translations: updated }).eq('id', p.id)
    }

    // حفظ ترجمات الفئات: نخزنها داخل كل منتج ينتمي لتلك الفئة تحت مفتاح cat_<lang>
    for (const cat of Array.from(categoriesNeedingTranslation)) {
      const translatedCat = newTranslations[cat]
      if (!translatedCat) continue
      const productsInCat = products.filter(p => (p.category?.trim() || 'أخرى') === cat)
      for (const p of productsInCat) {
        const existing = (p.translations as any) || {}
        const updated = { ...existing, [`cat_${targetLang}`]: translatedCat }
        await supabase.from('products').update({ translations: updated }).eq('id', p.id)
      }
    }

    // بناء القاموس الكامل للإرجاع (القديم + الجديد)
    const dict: Record<string, string> = {}
    products.forEach(p => {
      const existing = (p.translations as any) || {}
      const cat = p.category?.trim() || 'أخرى'
      dict[p.name] = existing[targetLang] || newTranslations[p.name] || p.name
      dict[cat] = existing[`cat_${targetLang}`] || newTranslations[cat] || cat
    })

    return NextResponse.json({ translations: dict, fromCache: false })
  } catch (err: any) {
    return NextResponse.json({ translations: {}, error: String(err) })
  }
}
