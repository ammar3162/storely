import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requirePermission } from '@/lib/adminAuth'
import { summarizeAiUsage, type AiUsageRow } from '@/lib/aiUsageSummary'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// تكلفة الذكاء الاصطناعي: المجموع لكل ميزة ولكل منشأة ولكل يوم (آخر 7 / 30 / 90 يوم)
export async function GET(req: Request) {
  const admin = await requirePermission(req.headers.get('x-admin-key'), 'view_metrics')
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const days = [7, 30, 90].includes(Number(new URL(req.url).searchParams.get('days'))) ? Number(new URL(req.url).searchParams.get('days')) : 30
  const since = new Date(Date.now() - days * 86400000).toISOString()
  const { data, error } = await sb().from('ai_usage')
    .select('org_id,feature,input_tokens,output_tokens,cache_write_tokens,cache_read_tokens,cost_sar,created_at,organizations(name)')
    .gte('created_at', since).order('created_at', { ascending: false }).limit(50000)
  if (error) return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  return NextResponse.json({ success: true, days, ...summarizeAiUsage((data || []) as unknown as AiUsageRow[]) })
}
