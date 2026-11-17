import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyOrgAccess, enforcedBranchId } from '@/lib/verifyOrgAccess'
import { orgFeatures } from '@/lib/planFeatures'
import { allowedTools } from '@/lib/assistantTools'
import { buildSuggestions, loadSuggestionFacts } from '@/lib/assistantSuggestions'

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
    // بدون ميزة الذكاء: المساعد ما يحلل البيانات، فتطلع الأسئلة الثابتة (شرح الاستخدام والاشتراك)
    if (!features.ai) return NextResponse.json({ success: true, ai: false, suggestions: [] })
    const tools = allowedTools(features, access as any).map(t => t.name)
    const facts = await loadSuggestionFacts(db, { orgId: org_id, branchId: branchId || null, tools, owner: (access as any).role === 'owner' })
    return NextResponse.json({ success: true, ai: true, suggestions: buildSuggestions(facts) }, { headers: { 'Cache-Control': 'private, max-age=60' } })
  } catch {
    return NextResponse.json({ success: false, suggestions: [] }, { status: 500 })
  }
}
