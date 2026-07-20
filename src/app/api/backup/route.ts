import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyOrgAccess } from '@/lib/verifyOrgAccess'

function toCSV(headers: string[], rows: any[][]): string {
  return '\ufeff' + [headers, ...rows]
    .map(r => r.map(c => '"' + String(c ?? '').replace(/"/g, '""') + '"').join(','))
    .join('\n')
}

export async function POST(req: Request) {
  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    let body: any = {}; try { body = await req.json() } catch {}
    const orgIds: string[] = []
    if (body.org_id) {
      // نسخة احتياطية لحساب واحد — يتطلب تحقق ملكية الحساب
      const access = await verifyOrgAccess(body.org_id)
      if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status })
      orgIds.push(body.org_id)
    } else {
      // نسخة احتياطية شاملة لكل الحسابات — تقبل إما مفتاح يدوي أو معيار Vercel Cron الرسمي
      const cronSecret = req.headers.get('x-cron-secret')
      const authHeader = req.headers.get('authorization')
      const isManualAuth = cronSecret === process.env.ADMIN_PASSWORD
      const isVercelCron = authHeader === `Bearer ${process.env.CRON_SECRET}`
      if (!isManualAuth && !isVercelCron) {
        return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
      }
      const { data: orgs } = await supabase.from('organizations').select('id')
      orgs?.forEach((o: any) => orgIds.push(o.id))
    }
    const results = []
    for (const org_id of orgIds) {
      const { data: org } = await supabase.from('organizations').select('*').eq('id', org_id).single()
      if (!org) continue
      const [{ data: products },{ data: purchases },{ data: movements },{ data: profiles }] = await Promise.all([
        supabase.from('products').select('*').eq('org_id', org_id),
        supabase.from('purchases').select('*').eq('org_id', org_id),
        supabase.from('stock_movements').select('*,products!inner(name,unit,org_id)').eq('products.org_id', org_id),
        supabase.from('profiles').select('id,full_name,phone,role,status,created_at').eq('org_id', org_id),
      ])
      const date = new Date().toISOString().split('T')[0]
      const productsCsv  = toCSV(['اسم المنتج','الباركود','الكمية','الوحدة','الحد الأدنى','الفئة','الحالة','تاريخ الإنشاء'],(products||[]).map(p=>[p.name,p.sku||'',p.qty,p.unit,p.reorder_point,p.category||'',p.is_active?'نشط':'محذوف',new Date(p.created_at).toLocaleDateString('ar-SA')]))
      const purchasesCsv = toCSV(['التاريخ','الصنف','النوع','بدون ضريبة','الضريبة 15%','الإجمالي','المورد','ملاحظة'],(purchases||[]).map(p=>[new Date(p.created_at).toLocaleDateString('ar-SA'),p.name||'',p.category||'',Number(p.amount||0).toFixed(2),Number(p.vat_amount||0).toFixed(2),Number(p.total_amount||0).toFixed(2),p.supplier||'',p.note||'']))
      const movementsCsv = toCSV(['التاريخ','المنتج','النوع','الكمية','الوحدة','الملاحظة'],(movements||[]).map(m=>[new Date(m.created_at).toLocaleDateString('ar-SA'),(m.products as any)?.name||'',m.type==='in'?'وارد':'صادر',Math.abs(m.qty_change),(m.products as any)?.unit||'',m.note||'']))
      const files = [
        { name:`${org_id}/${date}_products.csv`,  content:productsCsv  },
        { name:`${org_id}/${date}_purchases.csv`, content:purchasesCsv },
        { name:`${org_id}/${date}_movements.csv`, content:movementsCsv },
      ]
      let success = true
      for (const file of files) {
        const { error } = await supabase.storage.from('backups').upload(file.name, file.content, { contentType:'text/csv;charset=utf-8', upsert:true })
        if (error) { success = false; break }
      }
      if (success) await supabase.from('organizations').update({ last_backup_at:new Date().toISOString() } as any).eq('id', org_id)
      results.push({ org:org.name, success, files:files.map(f=>f.name), summary:{ products:(products||[]).length, purchases:(purchases||[]).length, movements:(movements||[]).length } })
    }
    return NextResponse.json({ success:true, results })
  } catch (err: any) { return NextResponse.json({ success:false, error:err.message }, { status:500 }) }
}
export async function GET(req: Request) { return POST(new Request('http://localhost',{method:'POST',body:'{}',headers:req.headers})) }
