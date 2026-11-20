import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyOrgAccess, enforcedBranchId } from '@/lib/verifyOrgAccess'
import { orgFeatures } from '@/lib/planFeatures'
import { allowedTools } from '@/lib/assistantTools'
import { buildSuggestions, loadSuggestionFacts } from '@/lib/assistantSuggestions'
import { loadDecisions } from '@/lib/assistantDecisions'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// اقتراحات المساعد من بيانات المنشأة الحين (بدون ذكاء اصطناعي) — نفس صلاحيات المساعد: الأدوات المسموحة لهذا المستخدم بس
export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const org_id = url.searchParams.get('org_id') || ''
    const access = await verifyOrgAccess(org_id)
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })
    const branchId = enforcedBranchId(access, url.searchParams.get('branch_id'))   // مدير الفرع: فرعه بس
    const db = sb()
    const { data: org } = await db.from('organizations').select('plan').eq('id', org_id).maybeSingle()
    const features = await orgFeatures(db, org_id, (org as any)?.plan || 'basic')
    // قرارات تنتظر هذا المستخدم (عجز، طلبات الموظفين، فواتير مستحقة، توريد) — أزرار بدون ذكاء، فتطلع للكل حسب الصلاحية
    const decisionsP = loadDecisions(db, { orgId: org_id, branchId: branchId || null, user: access as any, features }).catch(() => [])
    // بلا تخزين بالمتصفح: بعد القرار لازم يرجع الجديد مباشرة
    const headers = { 'Cache-Control': 'private, no-store' }
    // بدون ميزة الذكاء: المساعد ما يحلل البيانات، فتطلع الأسئلة الثابتة (شرح الاستخدام والاشتراك)
    if (!features.ai) return NextResponse.json({ success: true, ai: false, suggestions: [], decisions: await decisionsP }, { headers })
    const tools = allowedTools(features, access as any).map(t => t.name)
    const [decisions, facts] = await Promise.all([decisionsP, loadSuggestionFacts(db, { orgId: org_id, branchId: branchId || null, tools, owner: (access as any).role === 'owner' })])
    return NextResponse.json({ success: true, ai: true, suggestions: buildSuggestions(facts), decisions }, { headers })
  } catch {
    return NextResponse.json({ success: false, suggestions: [] }, { status: 500 })
  }
}
