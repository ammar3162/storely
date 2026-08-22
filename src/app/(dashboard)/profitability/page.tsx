'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { currencySymbol } from '@/lib/currencySymbol'
import { colors, radius, font, card, inp, pageTitle, pageSub } from '@/lib/ds'
import { toast } from '@/components/toast'
import { cache } from '@/lib/cache'
import { exportReportPdf } from '@/lib/pdfExport'
import { confirmDialog } from '@/components/ConfirmDialog'

const ARABIC_MONTHS = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']

function currentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`
}

function prevMonthOf(m: string) {
  const [y, mo] = m.split('-').map(Number)
  const d = new Date(y, mo-1-1, 1)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
}

function pctChange(curr: number, prev: number): number | null {
  if (!prev) return null
  return Math.round(((curr - prev) / Math.abs(prev)) * 100)
}

function monthLabel(m: string) {
  const [y, mo] = m.split('-').map(Number)
  return `${ARABIC_MONTHS[mo-1]} ${y}`
}

export default function ProfitabilityPage() {
  const [month, setMonth] = useState(currentMonth())
  const [orgId, setOrgId] = useState('')
  const [curr, setCurr] = useState('ر.س')
  const [loading, setLoading] = useState(true)
  const [locked, setLocked] = useState(false)
  const [data, setData] = useState<any>(null)
  const [prevData, setPrevData] = useState<any>(null)
  const [closing, setClosing] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [closedMonths, setClosedMonths] = useState<any[]>([])

  const [newTplName, setNewTplName] = useState('')
  const [newTplAmount, setNewTplAmount] = useState('')
  const [savingTpl, setSavingTpl] = useState(false)

  const [newVarName, setNewVarName] = useState('')
  const [newVarAmount, setNewVarAmount] = useState('')
  const [savingVar, setSavingVar] = useState(false)

  const [hasDelivery, setHasDelivery] = useState(false)
  const [newDeliveryPlatform, setNewDeliveryPlatform] = useState('')
  const [newDeliveryAmount, setNewDeliveryAmount] = useState('')
  const [savingDelivery, setSavingDelivery] = useState(false)

  const sb = createClient()

  useEffect(()=>{ init() },[])
  useEffect(()=>{ if(orgId) { loadAll(); loadClosedMonths() } },[orgId, month])

  async function init() {
    let oid = sessionStorage.getItem('s_org_id')
    if(!oid){
      const{data:{user}}=await sb.auth.getUser()
      if(!user) return
      const{data:p}=await sb.from('profiles').select('org_id').eq('id',user.id).single()
      if(!p) return
      oid=p.org_id; sessionStorage.setItem('s_org_id',oid!)
    }
    setOrgId(oid!)
    sb.from('organizations').select('currency').eq('id',oid!).single().then(({data}:any)=>{ if(data?.currency) setCurr(currencySymbol(data.currency)) })
  }

  async function loadClosedMonths() {
    const bid = sessionStorage.getItem('s_branch_id')
    const res = await fetch(`/api/profitability/closed-months?org_id=${orgId}${bid?`&branch_id=${bid}`:''}`)
    const j = await res.json()
    if(j.success) setClosedMonths(j.months||[])
  }

  async function loadAll() {
    const bid = sessionStorage.getItem('s_branch_id')
    const cacheKey = `profitability:${orgId}:${month}:${bid||''}`
    const cached = cache.get(cacheKey)
    if(cached){ setData(cached); setLocked(false); setLoading(false) }
    else setLoading(true)

    const url = `/api/profitability?org_id=${orgId}&month=${month}${bid?`&branch_id=${bid}`:''}`
    const res = await fetch(url)
    const json = await res.json()
    if(json.error === 'upgrade_required'){ setLocked(true); setData(null); setLoading(false); return }
    setLocked(false)
    if(json.success){ setData(json); cache.set(cacheKey, json); setHasDelivery((json.deliveryIncomeList||[]).length > 0) }
    else if(!cached) { toast(json.error||'تعذر تحميل البيانات','error'); setData(null) }
    setLoading(false)

    const pm = prevMonthOf(month)
    fetch(`/api/profitability?org_id=${orgId}&month=${pm}${bid?`&branch_id=${bid}`:''}`)
      .then(r=>r.json()).then(pj=>{ if(pj.success) setPrevData(pj); else setPrevData(null) })
      .catch(()=>setPrevData(null))
  }

  async function closeMonth() {
    if(!(await confirmDialog({ title: 'إقفال الشهر', message: `تأكيد إقفال شهر ${monthLabel(month)}؟\n\nبعد الإقفال ما راح تقدر تضيف أو تحذف مصروفات لهذا الشهر، وأرقامه بتصير ثابتة حتى لو تغيّرت بيانات المشتريات لاحقاً.`, type: 'warning' }))) return
    setClosing(true)
    const res = await fetch('/api/profitability', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ org_id: orgId, branch_id: sessionStorage.getItem('s_branch_id'), month })
    })
    const j = await res.json()
    setClosing(false)
    if(j.success){ toast('🔒 تم إقفال الشهر بنجاح'); cache.invalidate('profitability:'); loadAll(); loadClosedMonths() }
    else toast(j.error||'خطأ','error')
  }

  async function exportPdf() {
    if(!data) return
    setExporting(true)
    try {
      const rows = [
        {name:`المبيعات (${data.closingsCount} إقفال كاشير)`, type:'إيرادات', amount: Math.round(data.totalIn).toLocaleString('en-US')+' '+curr},
        ...(data.deliveryIncomeList||[]).map((e:any)=>({name:`دخل توصيل — ${e.platform}`, type:'إيرادات', amount: Number(e.amount).toFixed(0)+' '+curr})),
        {name:'الضريبة على المبيعات (تقديري)', type:'إيرادات', amount: Math.round(vatAmount).toLocaleString('en-US')+' '+curr},
        {name:'مشتريات المخزون', type:'مشتريات', amount: Math.round(data.inventoryPurchases).toLocaleString('en-US')+' '+curr},
        {name:'مشتريات أخرى', type:'مشتريات', amount: Math.round(data.otherPurchases).toLocaleString('en-US')+' '+curr},
        ...fixedList.map((e:any)=>({name:e.name, type:'مصروف ثابت', amount: Number(e.amount).toFixed(0)+' '+curr})),
        ...variableList.map((e:any)=>({name:e.name, type:'مصروف متغيّر', amount: Number(e.amount).toFixed(0)+' '+curr})),
      ]
      await exportReportPdf({
        title: 'تقرير الربحية الشهرية',
        subtitle: `${monthLabel(month)}${data.closed?' — مقفل '+new Date(data.closedAt).toLocaleDateString('ar-SA',{numberingSystem:'latn',day:'numeric',month:'long',year:'numeric'}):''}`,
        orgName: '',
        columns: [
          {header:'البند', key:'name', align:'right'},
          {header:'التصنيف', key:'type', align:'center'},
          {header:'المبلغ', key:'amount', align:'left'},
        ],
        rows,
        summaryStats: [
          {label:'المبيعات', value: Math.round(data.totalIn).toLocaleString('en-US')+' '+curr},
          {label:'إجمالي المشتريات', value: Math.round(data.totalPurchases).toLocaleString('en-US')+' '+curr},
          {label:'إجمالي المصروفات', value: Math.round(fixedTotal+variableTotal).toLocaleString('en-US')+' '+curr},
          {label:'الضريبة (تقديري)', value: Math.round(vatAmount).toLocaleString('en-US')+' '+curr},
          {label:'صافي الربح', value: Math.round(data.netProfit).toLocaleString('en-US')+' '+curr, color: data.netProfit>=0?'#16a34a':'#dc2626'},
        ],
        totalsRow: {name:'الصافي', type:'', amount: Math.round(data.netProfit).toLocaleString('en-US')+' '+curr},
        fileName: `الربحية_${month}.pdf`,
      })
    } finally { setExporting(false) }
  }

  function exportCsv() {
    if(!data) return
    const rows: string[][] = [
      ['البند','التصنيف','المبلغ'],
      [`المبيعات (${data.closingsCount} إقفال كاشير)`,'إيرادات', Math.round(data.totalIn).toString()],
      ...(data.deliveryIncomeList||[]).map((e:any)=>[`دخل توصيل — ${e.platform}`,'إيرادات', Number(e.amount).toFixed(0)]),
      ['الضريبة على المبيعات (تقديري)','إيرادات', Math.round(vatAmount).toString()],
      ['مشتريات المخزون','مشتريات', Math.round(data.inventoryPurchases).toString()],
      ['مشتريات أخرى','مشتريات', Math.round(data.otherPurchases).toString()],
      ...fixedList.map((e:any)=>[e.name,'مصروف ثابت', Number(e.amount).toFixed(0)]),
      ...variableList.map((e:any)=>[e.name,'مصروف متغيّر', Number(e.amount).toFixed(0)]),
      ['صافي الربح','—', Math.round(data.netProfit).toString()],
    ]
    const csv = '\ufeff' + rows.map(r=>r.map((c:string)=>'"'+c+'"').join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}))
    Object.assign(document.createElement('a'),{href:url,download:`الربحية_${month}.csv`}).click()
    URL.revokeObjectURL(url)
  }

  async function addTemplate() {
    if(!newTplName.trim()||!newTplAmount) return
    setSavingTpl(true)
    const res = await fetch('/api/fixed-expenses',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({org_id:orgId,branch_id:sessionStorage.getItem('s_branch_id'),name:newTplName.trim(),amount:Number(newTplAmount),month:`${month}-01`})})
    const j = await res.json()
    setSavingTpl(false)
    if(j.success){ setNewTplName(''); setNewTplAmount(''); toast('✅ تمت الإضافة'); cache.invalidate('profitability:'); loadAll() }
    else toast(j.error||'خطأ','error')
  }

  async function deleteTemplate(fixedExpenseId:string) {
    if(!(await confirmDialog({ title: 'حذف المصروف الثابت', message: 'حذف هذا المصروف الثابت نهائياً؟ (لن يتكرر بالشهور القادمة)' }))) return
    const res = await fetch(`/api/fixed-expenses?id=${fixedExpenseId}`,{method:'DELETE'})
    const j = await res.json()
    if(j.success){ toast('🗑️ تم الحذف'); cache.invalidate('profitability:'); loadAll() }
    else toast(j.error||'خطأ','error')
  }

  async function addVariable() {
    if(!newVarName.trim()||!newVarAmount) return
    setSavingVar(true)
    const res = await fetch('/api/monthly-fixed-expenses',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({org_id:orgId,branch_id:sessionStorage.getItem('s_branch_id'),month:`${month}-01`,name:newVarName.trim(),amount:Number(newVarAmount)})})
    const j = await res.json()
    setSavingVar(false)
    if(j.success){ setNewVarName(''); setNewVarAmount(''); toast('✅ تمت الإضافة'); cache.invalidate('profitability:'); loadAll() }
    else toast(j.error||'خطأ','error')
  }

  async function deleteVariable(id:string) {
    if(!(await confirmDialog({ title: 'حذف المصروف', message: 'حذف هذا المصروف؟' }))) return
    const res = await fetch(`/api/monthly-fixed-expenses?id=${id}`,{method:'DELETE'})
    const j = await res.json()
    if(j.success){ toast('🗑️ تم الحذف'); cache.invalidate('profitability:'); loadAll() }
    else toast(j.error||'خطأ','error')
  }

  async function addDeliveryIncome(platform?: string) {
    const p = (platform || newDeliveryPlatform).trim()
    if(!p || !newDeliveryAmount) return
    setSavingDelivery(true)
    const res = await fetch('/api/delivery-income',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({org_id:orgId,branch_id:sessionStorage.getItem('s_branch_id'),month:`${month}-01`,platform:p,amount:Number(newDeliveryAmount)})})
    const j = await res.json()
    setSavingDelivery(false)
    if(j.success){ setNewDeliveryPlatform(''); setNewDeliveryAmount(''); toast('✅ تمت الإضافة'); cache.invalidate('profitability:'); loadAll() }
    else toast(j.error||'خطأ','error')
  }

  async function deleteDeliveryIncome(id:string) {
    if(!(await confirmDialog({ title: 'حذف دخل التوصيل', message: 'حذف هذا السجل؟' }))) return
    const res = await fetch(`/api/delivery-income?id=${id}`,{method:'DELETE'})
    const j = await res.json()
    if(j.success){ toast('🗑️ تم الحذف'); cache.invalidate('profitability:'); loadAll() }
    else toast(j.error||'خطأ','error')
  }

  if(locked) return (
    <div style={{fontFamily:font.family,direction:'rtl',maxWidth:680,margin:'40px auto',textAlign:'center' as const}}>
      <div style={{fontSize:44,marginBottom:12}}>🔒</div>
      <div style={{fontSize:16,fontWeight:800,color:colors.text,marginBottom:8}}>ميزة الربحية متاحة بالباقة المتوسطة أو المتقدمة</div>
      <div style={{fontSize:13,color:colors.text3}}>رقّي باقتك عشان تتابع مبيعاتك ومصروفاتك وأرباحك الشهرية</div>
    </div>
  )

  const fixedList = (data?.fixedExpensesList||[]).filter((e:any)=>e.fixed_expense_id)
  const variableList = (data?.fixedExpensesList||[]).filter((e:any)=>!e.fixed_expense_id)
  const fixedTotal = fixedList.reduce((s:number,e:any)=>s+Number(e.amount||0),0)
  const variableTotal = variableList.reduce((s:number,e:any)=>s+Number(e.amount||0),0)
  const vatAmount = data ? data.totalIn - (data.totalIn/1.15) : 0
  const totalExpenses = fixedTotal + variableTotal
  const netColor = data && data.netProfit>=0 ? '#16a34a' : '#dc2626'

  return (
    <div style={{fontFamily:font.family,direction:'rtl',maxWidth:1000,margin:'0 auto'}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} .pf-scroll::-webkit-scrollbar{height:0}`}</style>
      <div style={{marginBottom:16}}>
        <h1 style={{...pageTitle}}>الربحية الشهرية</h1>
        <p style={{...pageSub}}>المبيعات، المشتريات، والمصروفات — تتحدّث تلقائياً</p>
      </div>

      {/* شريط الأشهر المقفلة */}
      <div className="pf-scroll" style={{display:'flex',gap:8,overflowX:'auto',marginBottom:16,paddingBottom:2}}>
        {closedMonths.map((cm:any)=>{
          const cmMonth = cm.month.slice(0,7)
          const active = cmMonth === month
          const positive = cm.net_profit >= 0
          return (
            <button key={cm.month} onClick={()=>setMonth(cmMonth)}
              style={{background: active ? '#14140f' : colors.surface, border:`1px solid ${active?'#14140f':colors.border2}`,borderRadius:14,padding:'10px 16px',flexShrink:0,minWidth:110,textAlign:'right' as const,cursor:'pointer',fontFamily:font.family}}>
              <div style={{fontSize:11,color:active?'rgba(255,255,255,.55)':colors.text4}}>{monthLabel(cmMonth)}</div>
              <div style={{fontSize:14,fontWeight:700,color:active?'white':(positive?colors.primary:colors.danger),marginTop:4}}>
                {Math.round(cm.net_profit).toLocaleString('en-US')} {curr}
              </div>
              <div style={{fontSize:9,color:active?'rgba(255,255,255,.45)':colors.text4,marginTop:2}}>🔒 مقفل</div>
            </button>
          )
        })}
        <div>
          <label style={{fontSize:9,color:colors.text4,display:'block',marginBottom:2}}>اختر شهر آخر</label>
          <input type="month" value={month} onChange={e=>setMonth(e.target.value)} style={{...inp(),padding:'9px 10px',fontSize:12,minWidth:130}}/>
        </div>
      </div>

      {loading ? (
        <div style={{padding:48,textAlign:'center' as const}}>
          <div style={{width:32,height:32,border:`3px solid ${colors.border}`,borderTopColor:colors.primary,borderRadius:'50%',animation:'spin .8s linear infinite',margin:'0 auto'}}/>
        </div>
      ) : data && (
        <>
        {/* بطاقة صافي الربح الرئيسية */}
        <div style={{...card,padding:20,marginBottom:10,display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap' as const,gap:14}}>
          <div>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6,flexWrap:'wrap' as const}}>
              <span style={{fontSize:13,color:colors.text3}}>صافي الربح — {monthLabel(month)}</span>
              {data.closed ? (
                <span style={{fontSize:10,fontWeight:700,color:colors.danger,background:colors.dangerLight,padding:'2px 8px',borderRadius:99}}>
                  🔒 مقفل {new Date(data.closedAt).toLocaleDateString('ar-SA', {numberingSystem:'latn',day:'numeric',month:'long'})}
                </span>
              ) : (
                <button onClick={closeMonth} disabled={closing} style={{fontSize:10,fontWeight:700,color:colors.text2,background:colors.bg,border:`1px solid ${colors.border2}`,padding:'3px 10px',borderRadius:99,cursor:'pointer',fontFamily:font.family}}>
                  {closing?'⏳ جاري الإقفال...':'🔒 إقفال الشهر'}
                </button>
              )}
            </div>
            <div style={{fontSize:30,fontWeight:800,color:netColor,letterSpacing:'-0.5px'}}>
              {Math.round(data.netProfit).toLocaleString('en-US')} {curr}
            </div>
          </div>
          <div style={{display:'flex',gap:8}}>
            <button onClick={exportPdf} disabled={exporting} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 16px',background:colors.surface,border:`1px solid ${colors.border2}`,borderRadius:99,fontSize:12,fontWeight:600,color:colors.text2,cursor:'pointer',fontFamily:font.family}}>
              📄 PDF
            </button>
            <button onClick={exportCsv} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 16px',background:colors.surface,border:`1px solid ${colors.border2}`,borderRadius:99,fontSize:12,fontWeight:600,color:colors.text2,cursor:'pointer',fontFamily:font.family}}>
              📊 CSV
            </button>
          </div>
        </div>

        {/* صف المقاييس */}
        <div style={{display:'grid',gridTemplateColumns:`repeat(${hasDelivery?6:5},1fr)`,gap:8,marginBottom:16,alignItems:'start'}}>
          {[
            {label:'المبيعات',value:data.totalIn,prev:prevData?.totalIn},
            ...(hasDelivery?[{label:'دخل التوصيل',value:data.deliveryIncomeTotal||0,prev:prevData?.deliveryIncomeTotal}]:[]),
            {label:'المشتريات',value:data.totalPurchases,prev:prevData?.totalPurchases},
            {label:'إجمالي المصروفات',value:totalExpenses,prev:prevData?(prevData.fixedExpensesTotal):undefined},
            {label:'تكلفة الرواتب',value:data.salaryExpenseTotal||0,prev:prevData?.salaryExpenseTotal},
            {label:'الضريبة (تقديري)',value:vatAmount,prev:prevData?(prevData.totalIn-(prevData.totalIn/1.15)):undefined},
          ].map((s,i)=>{
            const change = (prevData && s.prev!==undefined) ? pctChange(s.value, s.prev) : null
            return (
              <div key={i} style={{...card,padding:14}}>
                <div style={{fontSize:11,color:colors.text3,marginBottom:6}}>{s.label}</div>
                <div style={{fontSize:17,fontWeight:700,color:colors.text}}>{Math.round(s.value).toLocaleString('en-US')} {curr}</div>
                {change!==null && (
                  <div style={{fontSize:10,fontWeight:600,marginTop:5,color:change>=0?colors.primary:colors.danger}}>
                    {change>=0?'▲':'▼'} {Math.abs(change)}% عن {monthLabel(prevMonthOf(month))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* المصروفات */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,alignItems:'start'}}>
          <div style={{...card,padding:'16px 18px'}}>
            <div style={{fontSize:font.base,fontWeight:700,color:colors.text,marginBottom:2}}>المصروفات الثابتة</div>
            <div style={{fontSize:11,color:colors.text4,marginBottom:14}}>رواتب، إيجار... تتكرر تلقائياً كل شهر</div>
            {!data.closed && (
            <div style={{display:'flex',gap:6,marginBottom:12}}>
              <input value={newTplName} onChange={e=>setNewTplName(e.target.value)} placeholder="اسم المصروف" style={{...inp(),flex:1}}/>
              <input type="number" value={newTplAmount} onChange={e=>setNewTplAmount(e.target.value)} placeholder="المبلغ" style={{...inp(),width:100}}/>
              <button onClick={addTemplate} disabled={savingTpl} style={{padding:'0 16px',background:colors.primary,color:'white',border:'none',borderRadius:radius.md,fontSize:14,fontWeight:700,cursor:'pointer'}}>{savingTpl?'...':'+'}</button>
            </div>
            )}
            {fixedList.length===0 ? (
              <div style={{fontSize:12,color:colors.text4,textAlign:'center' as const,padding:16}}>ما فيه مصروفات ثابتة مسجّلة</div>
            ) : (
              <div style={{display:'flex',flexDirection:'column' as const,gap:6}}>
                {fixedList.map((e:any)=>(
                  <div key={e.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 10px',background:colors.bg,borderRadius:8}}>
                    <span style={{fontSize:12,fontWeight:600,color:colors.text}}>{e.name}</span>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <span style={{fontSize:12,fontWeight:700,color:colors.text2}}>{Number(e.amount).toFixed(0)} {curr}</span>
                      {!data.closed && <button onClick={()=>deleteTemplate(e.fixed_expense_id)} style={{background:'none',border:'none',color:colors.danger,cursor:'pointer',fontSize:12}}>🗑️</button>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{...card,padding:'16px 18px'}}>
            <div style={{fontSize:font.base,fontWeight:700,color:colors.text,marginBottom:2}}>مصروفات متغيّرة</div>
            <div style={{fontSize:11,color:colors.text4,marginBottom:14}}>كهرباء، صيانة... تُدخل يدوياً كل شهر لحاله</div>
            {!data.closed && (
            <div style={{display:'flex',gap:6,marginBottom:12}}>
              <input value={newVarName} onChange={e=>setNewVarName(e.target.value)} placeholder="اسم المصروف" style={{...inp(),flex:1}}/>
              <input type="number" value={newVarAmount} onChange={e=>setNewVarAmount(e.target.value)} placeholder="المبلغ" style={{...inp(),width:100}}/>
              <button onClick={addVariable} disabled={savingVar} style={{padding:'0 16px',background:colors.primary,color:'white',border:'none',borderRadius:radius.md,fontSize:14,fontWeight:700,cursor:'pointer'}}>{savingVar?'...':'+'}</button>
            </div>
            )}
            {variableList.length===0 ? (
              <div style={{fontSize:12,color:colors.text4,textAlign:'center' as const,padding:16}}>ما فيه مصروفات متغيرة هالشهر</div>
            ) : (
              <div style={{display:'flex',flexDirection:'column' as const,gap:6}}>
                {variableList.map((e:any)=>(
                  <div key={e.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 10px',background:colors.bg,borderRadius:8}}>
                    <span style={{fontSize:12,fontWeight:600,color:colors.text}}>{e.name}</span>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <span style={{fontSize:12,fontWeight:700,color:colors.text2}}>{Number(e.amount).toFixed(0)} {curr}</span>
                      {!data.closed && <button onClick={()=>deleteVariable(e.id)} style={{background:'none',border:'none',color:colors.danger,cursor:'pointer',fontSize:12}}>🗑️</button>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* مصادر دخل خارجية (تطبيقات توصيل) */}
        <div style={{...card,padding:'16px 18px',marginTop:10}}>
          <label style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer',marginBottom:hasDelivery?14:0}}>
            <input type="checkbox" checked={hasDelivery} onChange={e=>setHasDelivery(e.target.checked)} style={{width:16,height:16,cursor:'pointer'}}/>
            <span style={{fontSize:font.base,fontWeight:700,color:colors.text}}>عندك دخل خارجي من تطبيقات توصيل؟ (هنقرستيشن، جاهز...)</span>
          </label>

          {hasDelivery && (
            <>
              {!data.closed && (
              <div style={{display:'flex',gap:6,marginBottom:10,flexWrap:'wrap' as const}}>
                <input value={newDeliveryPlatform} onChange={e=>setNewDeliveryPlatform(e.target.value)} placeholder="اسم التطبيق" style={{...inp(),flex:1,minWidth:140}}/>
                <input type="number" value={newDeliveryAmount} onChange={e=>setNewDeliveryAmount(e.target.value)} placeholder="المبلغ" style={{...inp(),width:100}}/>
                <button onClick={()=>addDeliveryIncome()} disabled={savingDelivery} style={{padding:'0 16px',background:colors.primary,color:'white',border:'none',borderRadius:radius.md,fontSize:14,fontWeight:700,cursor:'pointer'}}>{savingDelivery?'...':'+'}</button>
              </div>
              )}
              {!data.closed && (
              <div style={{display:'flex',gap:6,marginBottom:14}}>
                <button onClick={()=>setNewDeliveryPlatform('هنقرستيشن')} style={{fontSize:11,fontWeight:600,color:colors.text2,background:colors.bg,border:`1px solid ${colors.border2}`,padding:'5px 12px',borderRadius:99,cursor:'pointer',fontFamily:font.family}}>هنقرستيشن</button>
                <button onClick={()=>setNewDeliveryPlatform('جاهز')} style={{fontSize:11,fontWeight:600,color:colors.text2,background:colors.bg,border:`1px solid ${colors.border2}`,padding:'5px 12px',borderRadius:99,cursor:'pointer',fontFamily:font.family}}>جاهز</button>
              </div>
              )}
              {(data.deliveryIncomeList||[]).length===0 ? (
                <div style={{fontSize:12,color:colors.text4,textAlign:'center' as const,padding:12}}>ما فيه دخل توصيل مسجّل هالشهر</div>
              ) : (
                <div style={{display:'flex',flexDirection:'column' as const,gap:6}}>
                  {(data.deliveryIncomeList||[]).map((e:any)=>(
                    <div key={e.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 10px',background:colors.bg,borderRadius:8}}>
                      <span style={{fontSize:12,fontWeight:600,color:colors.text}}>{e.platform}</span>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <span style={{fontSize:12,fontWeight:700,color:colors.primary}}>{Number(e.amount).toFixed(0)} {curr}</span>
                        {!data.closed && <button onClick={()=>deleteDeliveryIncome(e.id)} style={{background:'none',border:'none',color:colors.danger,cursor:'pointer',fontSize:12}}>🗑️</button>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
        </>
      )}
    </div>
  )
}
