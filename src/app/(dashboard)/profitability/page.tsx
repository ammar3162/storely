'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { currencySymbol } from '@/lib/currencySymbol'
import { colors, radius, shadow, font, card, btnPrimary, inp, pageTitle, pageSub } from '@/lib/ds'
import { toast } from '@/components/toast'
import { cache } from '@/lib/cache'

function currentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`
}

export default function ProfitabilityPage() {
  const [month, setMonth] = useState(currentMonth())
  const [orgId, setOrgId] = useState('')
  const [curr, setCurr] = useState('ر.س')
  const [loading, setLoading] = useState(true)
  const [locked, setLocked] = useState(false)
  const [data, setData] = useState<any>(null)

  const [newTplName, setNewTplName] = useState('')
  const [newTplAmount, setNewTplAmount] = useState('')
  const [savingTpl, setSavingTpl] = useState(false)

  const [newVarName, setNewVarName] = useState('')
  const [newVarAmount, setNewVarAmount] = useState('')
  const [savingVar, setSavingVar] = useState(false)

  const sb = createClient()

  useEffect(()=>{ init() },[])
  useEffect(()=>{ if(orgId) loadAll() },[orgId, month])

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
    if(json.success){ setData(json); cache.set(cacheKey, json) }
    else if(!cached) { toast(json.error||'تعذر تحميل البيانات','error'); setData(null) }
    setLoading(false)
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
    if(!confirm('حذف هذا المصروف الثابت نهائياً؟ (لن يتكرر بالشهور القادمة)')) return
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
    if(!confirm('حذف هذا المصروف؟')) return
    const res = await fetch(`/api/monthly-fixed-expenses?id=${id}`,{method:'DELETE'})
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

  return (
    <div style={{fontFamily:font.family,direction:'rtl',maxWidth:1000,margin:'0 auto'}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{marginBottom:20}}>
        <h1 style={{...pageTitle}}>الربحية الشهرية</h1>
        <p style={{...pageSub}}>المبيعات، المشتريات، والمصروفات الثابتة والمتغيرة — كلها تتحدّث تلقائياً</p>
      </div>

      <div style={{marginBottom:20}}>
        <label style={{fontSize:12,fontWeight:700,color:colors.text4,display:'block',marginBottom:6}}>الشهر</label>
        <input type="month" value={month} onChange={e=>setMonth(e.target.value)} style={{...inp(),width:200}}/>
      </div>

      {loading ? (
        <div style={{padding:48,textAlign:'center' as const}}>
          <div style={{width:32,height:32,border:`3px solid ${colors.border}`,borderTopColor:colors.primary,borderRadius:'50%',animation:'spin .8s linear infinite',margin:'0 auto'}}/>
        </div>
      ) : data && (
        <>
        <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:10,marginBottom:20}}>
          {[
            {label:'المبيعات',value:data.totalIn,color:colors.primary,bg:colors.primaryLight,border:colors.primaryBorder},
            {label:'الضريبة (تقديري)',value:vatAmount,color:colors.warning,bg:colors.warningLight,border:colors.warningBorder},
            {label:'المشتريات',value:data.totalPurchases,color:colors.info,bg:colors.infoLight,border:colors.infoBorder},
            {label:'إجمالي المصروفات',value:fixedTotal+variableTotal,color:colors.danger,bg:colors.dangerLight,border:colors.dangerBorder},
            {label:'صافي الربح',value:data.netProfit,color:data.netProfit>=0?colors.primary:colors.danger,bg:data.netProfit>=0?colors.primaryLight:colors.dangerLight,border:data.netProfit>=0?colors.primaryBorder:colors.dangerBorder},
          ].map((s,i)=>(
            <div key={i} style={{...card,padding:'14px',textAlign:'center' as const,background:s.bg,border:`1.5px solid ${s.border}`}}>
              <div style={{fontSize:16,fontWeight:900,color:s.color}}>{Math.round(s.value).toLocaleString('ar')} {curr}</div>
              <div style={{fontSize:font.xs,color:s.color,marginTop:4,fontWeight:600,opacity:.8}}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
          <div style={{...card,padding:'16px 18px'}}>
            <div style={{fontSize:font.base,fontWeight:800,color:colors.text,marginBottom:4}}>🏠 المصروفات الثابتة الدائمة</div>
            <div style={{fontSize:11,color:colors.text4,marginBottom:14}}>رواتب، إيجار... تتكرر تلقائياً كل شهر</div>
            <div style={{display:'flex',gap:6,marginBottom:12}}>
              <input value={newTplName} onChange={e=>setNewTplName(e.target.value)} placeholder="اسم المصروف" style={{...inp(),flex:1}}/>
              <input type="number" value={newTplAmount} onChange={e=>setNewTplAmount(e.target.value)} placeholder="المبلغ" style={{...inp(),width:100}}/>
              <button onClick={addTemplate} disabled={savingTpl} style={{...btnPrimary,padding:'0 14px'}}>{savingTpl?'...':'+'}</button>
            </div>
            {fixedList.length===0 ? (
              <div style={{fontSize:12,color:colors.text4,textAlign:'center' as const,padding:12}}>ما فيه مصروفات ثابتة مسجّلة</div>
            ) : (
              <div style={{display:'flex',flexDirection:'column' as const,gap:6}}>
                {fixedList.map((e:any)=>(
                  <div key={e.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 10px',background:colors.bg,borderRadius:8}}>
                    <span style={{fontSize:12,fontWeight:600,color:colors.text}}>{e.name}</span>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <span style={{fontSize:12,fontWeight:700,color:colors.text2}}>{Number(e.amount).toFixed(0)} {curr}</span>
                      <button onClick={()=>deleteTemplate(e.fixed_expense_id)} style={{background:'none',border:'none',color:colors.danger,cursor:'pointer',fontSize:12}}>🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{...card,padding:'16px 18px'}}>
            <div style={{fontSize:font.base,fontWeight:800,color:colors.text,marginBottom:4}}>⚡ مصروفات متغيرة لهذا الشهر</div>
            <div style={{fontSize:11,color:colors.text4,marginBottom:14}}>كهرباء، صيانة... تُدخل يدوياً كل شهر لحاله</div>
            <div style={{display:'flex',gap:6,marginBottom:12}}>
              <input value={newVarName} onChange={e=>setNewVarName(e.target.value)} placeholder="اسم المصروف" style={{...inp(),flex:1}}/>
              <input type="number" value={newVarAmount} onChange={e=>setNewVarAmount(e.target.value)} placeholder="المبلغ" style={{...inp(),width:100}}/>
              <button onClick={addVariable} disabled={savingVar} style={{...btnPrimary,padding:'0 14px'}}>{savingVar?'...':'+'}</button>
            </div>
            {variableList.length===0 ? (
              <div style={{fontSize:12,color:colors.text4,textAlign:'center' as const,padding:12}}>ما فيه مصروفات متغيرة هالشهر</div>
            ) : (
              <div style={{display:'flex',flexDirection:'column' as const,gap:6}}>
                {variableList.map((e:any)=>(
                  <div key={e.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 10px',background:colors.bg,borderRadius:8}}>
                    <span style={{fontSize:12,fontWeight:600,color:colors.text}}>{e.name}</span>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <span style={{fontSize:12,fontWeight:700,color:colors.text2}}>{Number(e.amount).toFixed(0)} {curr}</span>
                      <button onClick={()=>deleteVariable(e.id)} style={{background:'none',border:'none',color:colors.danger,cursor:'pointer',fontSize:12}}>🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        </>
      )}
    </div>
  )
}
