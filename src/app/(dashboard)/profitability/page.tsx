'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { colors, radius, shadow, font, card, btnPrimary, btnSecondary, inp, pageTitle, pageSub } from '@/lib/ds'

interface ProfitData {
  month: string
  totalIn: number
  closingsCount: number
  inventoryPurchases: number
  otherPurchases: number
  totalPurchases: number
  fixedExpensesTotal: number
  fixedExpensesList: any[]
  totalOut: number
  netProfit: number
}

const MONTH_NAMES = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function BigCard({ label, value, color, bg, border, icon, sub }: any) {
  return (
    <div style={{...card, padding:'20px', background:bg, border:`1.5px solid ${border}`, textAlign:'center' as const}}>
      <div style={{fontSize:22,marginBottom:6}}>{icon}</div>
      <div style={{fontSize:12,fontWeight:700,color,opacity:.85,marginBottom:6}}>{label}</div>
      <div style={{fontSize:26,fontWeight:900,color,letterSpacing:'-0.5px'}}>{fmt(value)} <span style={{fontSize:13,fontWeight:700}}>ر.س</span></div>
      {sub && <div style={{fontSize:10,color,opacity:.7,marginTop:4}}>{sub}</div>}
    </div>
  )
}

export default function ProfitabilityPage() {
  const [orgId, setOrgId] = useState<string|null>(null)
  const [monthDate, setMonthDate] = useState(() => { const d = new Date(); d.setDate(1); return d })
  const [data, setData] = useState<ProfitData|null>(null)
  const [loading, setLoading] = useState(true)
  const [upgradeRequired, setUpgradeRequired] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newAmount, setNewAmount] = useState('')
  const [newRecurring, setNewRecurring] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  const sb = createClient()

  useEffect(()=>{
    async function init() {
      let oid = sessionStorage.getItem('s_org_id')
      if(!oid){
        const{data:{user}}=await sb.auth.getUser()
        if(user){
          const{data:p}=await sb.from('profiles').select('org_id').eq('id',user.id).single()
          if(p){ oid=(p as any).org_id; sessionStorage.setItem('s_org_id',oid!) }
        }
      }
      setOrgId(oid)
    }
    init()
  },[])

  useEffect(()=>{ if(orgId) load() },[orgId, monthDate])

  function monthParam() {
    return `${monthDate.getFullYear()}-${String(monthDate.getMonth()+1).padStart(2,'0')}`
  }

  async function load() {
    setLoading(true)
    try {
      const res = await fetch(`/api/profitability?org_id=${orgId}&month=${monthParam()}`)
      const json = await res.json()
      if(res.status===403 && json.error==='upgrade_required'){ setUpgradeRequired(true); setLoading(false); return }
      if(res.ok) setData(json)
    } catch {}
    setLoading(false)
  }

  function showToast(msg:string) { setToast(msg); setTimeout(()=>setToast(''),2500) }

  function changeMonth(delta:number) {
    const d = new Date(monthDate)
    d.setMonth(d.getMonth()+delta)
    setMonthDate(d)
  }

  async function addExpense() {
    if(!newName.trim() || !newAmount || !orgId) { showToast('أدخل الاسم والمبلغ'); return }
    setSaving(true)
    try {
      if(newRecurring){
        await fetch('/api/fixed-expenses', {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ org_id:orgId, name:newName.trim(), amount:Number(newAmount), month:`${monthParam()}-01` })
        })
      } else {
        await fetch('/api/monthly-fixed-expenses', {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ org_id:orgId, month:`${monthParam()}-01`, name:newName.trim(), amount:Number(newAmount) })
        })
      }
      setNewName(''); setNewAmount(''); setNewRecurring(true); setShowAdd(false)
      showToast('✅ تمت الإضافة')
      load()
    } catch { showToast('حدث خطأ') }
    setSaving(false)
  }

  async function updateExpenseAmount(id:string, amount:string) {
    if(!amount) return
    await fetch('/api/monthly-fixed-expenses', {
      method:'PUT', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ id, amount:Number(amount) })
    })
    load()
  }

  async function deleteExpense(id:string, isRecurring:boolean) {
    if(!confirm(isRecurring ? 'هذا مصروف متكرر — حذفه هذا الشهر فقط، بيرجع يظهر تلقائياً الشهر الجاي. هل تريد المتابعة؟' : 'حذف هذا المصروف؟')) return
    await fetch(`/api/monthly-fixed-expenses?id=${id}`, { method:'DELETE' })
    showToast('تم الحذف')
    load()
  }

  const monthLabel = `${MONTH_NAMES[monthDate.getMonth()]} ${monthDate.getFullYear()}`
  const isProfit = (data?.netProfit || 0) >= 0

  if(upgradeRequired) return (
    <div style={{fontFamily:font.family,direction:'rtl',maxWidth:560,margin:'80px auto',textAlign:'center' as const}}>
      <div style={{fontSize:52,marginBottom:16}}>🔒</div>
      <h1 style={{...pageTitle,marginBottom:10}}>ميزة الربحية غير متاحة بباقتك الحالية</h1>
      <p style={{...pageSub,marginBottom:28}}>هذي الميزة متوفرة بباقة المتوسطة أو المتقدمة فقط. رقّي باقتك عشان تشوف تقرير الربحية الشهري الكامل.</p>
      <a href="/settings" style={{...btnPrimary,display:'inline-block',padding:'14px 32px',textDecoration:'none'}}>ترقية الباقة الآن</a>
    </div>
  )

  return (
    <div style={{fontFamily:font.family,direction:'rtl',maxWidth:800,margin:'0 auto'}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {toast && (
        <div style={{position:'fixed',top:20,left:'50%',transform:'translateX(-50%)',zIndex:9999,background:colors.primary,color:'white',padding:'10px 22px',borderRadius:40,fontSize:13,fontWeight:700,boxShadow:'0 8px 24px rgba(0,0,0,.2)'}}>{toast}</div>
      )}

      <div style={{marginBottom:20}}>
        <h1 style={{...pageTitle}}>الربحية</h1>
        <p style={{...pageSub}}>دخلت كم، طلع مني كم، والصافي — ببساطة</p>
      </div>

      <div style={{...card, padding:'14px 18px', marginBottom:20, display:'flex', alignItems:'center', justifyContent:'space-between'}}>
        <button onClick={()=>changeMonth(-1)} style={{width:34,height:34,borderRadius:10,border:`1px solid ${colors.border2}`,background:colors.bg,cursor:'pointer',fontSize:16,color:colors.text2}}>‹</button>
        <div style={{fontSize:font.md,fontWeight:800,color:colors.text}}>{monthLabel}</div>
        <button onClick={()=>changeMonth(1)} style={{width:34,height:34,borderRadius:10,border:`1px solid ${colors.border2}`,background:colors.bg,cursor:'pointer',fontSize:16,color:colors.text2}}>›</button>
      </div>

      {loading ? (
        <div style={{padding:60,textAlign:'center'}}><div style={{width:32,height:32,border:`3px solid ${colors.border}`,borderTopColor:colors.primary,borderRadius:'50%',animation:'spin .7s linear infinite',margin:'0 auto'}}/></div>
      ) : data ? (
        <>
          {/* الصافي - بطاقة كبيرة */}
          <div style={{
            ...card, padding:'28px', marginBottom:20, textAlign:'center' as const,
            background: isProfit ? '#f0fdf4' : '#fef2f2',
            border: `2px solid ${isProfit ? '#bbf7d0' : '#fecaca'}`,
          }}>
            <div style={{fontSize:font.sm,fontWeight:700,color:isProfit?colors.primary:colors.danger,marginBottom:8}}>
              {isProfit ? '✅ الصافي هذا الشهر' : '⚠️ سالب هذا الشهر'}
            </div>
            <div style={{fontSize:40,fontWeight:900,color:isProfit?colors.primary:colors.danger,letterSpacing:'-1px'}}>
              {fmt(Math.abs(data.netProfit))} <span style={{fontSize:18}}>ر.س</span>
            </div>
            <div style={{fontSize:font.xs,color:colors.text4,marginTop:6}}>بناءً على {data.closingsCount} تقرير إقفال كاشير هذا الشهر</div>
          </div>

          {/* دخلت / طلع مني */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:20}}>
            <BigCard label="دخلت (الإيرادات)" value={data.totalIn} color={colors.primary} bg={colors.primaryLight} border={colors.primaryBorder} icon="📥"/>
            <BigCard label="طلع مني (كل المصروفات)" value={data.totalOut} color={colors.danger} bg={colors.dangerLight} border={colors.dangerBorder} icon="📤"/>
          </div>

          {/* تفصيل المصروفات */}
          <div style={{...card, padding:'16px 18px', marginBottom:20}}>
            <div style={{fontSize:font.sm,fontWeight:800,color:colors.text,marginBottom:12}}>تفصيل "طلع مني"</div>
            {[
              {label:'مشتريات مخزون',value:data.inventoryPurchases},
              {label:'مشتريات ومصروفات أخرى',value:data.otherPurchases},
              {label:'مصروفات ثابتة (رواتب، إيجار...)',value:data.fixedExpensesTotal},
            ].map((r,i)=>(
              <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',fontSize:font.sm,borderBottom:`1px dashed ${colors.border}`}}>
                <span style={{color:colors.text3}}>{r.label}</span>
                <span style={{color:colors.text,fontWeight:700,direction:'ltr' as const}}>{fmt(r.value)} ر.س</span>
              </div>
            ))}
            <div style={{display:'flex',justifyContent:'space-between',padding:'10px 0 0',fontSize:font.base,fontWeight:800}}>
              <span style={{color:colors.text}}>= إجمالي طلع مني</span>
              <span style={{color:colors.danger,direction:'ltr' as const}}>{fmt(data.totalOut)} ر.س</span>
            </div>
          </div>

          {/* المصروفات الثابتة - إدارة */}
          <div style={{...card, overflow:'hidden', marginBottom:30}}>
            <div style={{padding:'14px 18px', borderBottom:`1px solid ${colors.border}`, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
              <div style={{fontSize:font.sm,fontWeight:800,color:colors.text}}>المصروفات الثابتة — {monthLabel}</div>
              <button onClick={()=>setShowAdd(true)} style={{...btnPrimary, padding:'7px 14px', fontSize:font.xs}}>+ إضافة مصروف</button>
            </div>
            {data.fixedExpensesList.length===0 ? (
              <div style={{padding:40,textAlign:'center',color:colors.text4,fontSize:font.sm}}>لا توجد مصروفات ثابتة مسجّلة بعد</div>
            ) : (
              <div>
                {data.fixedExpensesList.map((e:any)=>(
                  <div key={e.id} style={{display:'flex',alignItems:'center',gap:10,padding:'12px 18px',borderBottom:`1px solid ${colors.border}`}}>
                    <div style={{flex:1}}>
                      <div style={{fontSize:font.sm,fontWeight:700,color:colors.text}}>{e.name}</div>
                      <div style={{fontSize:10,color:colors.text4,marginTop:2}}>{e.fixed_expense_id ? '🔁 متكرر شهرياً' : '📌 هذا الشهر فقط'}</div>
                    </div>
                    <input type="number" defaultValue={e.amount} onBlur={ev=>updateExpenseAmount(e.id, ev.target.value)}
                      style={{width:110,padding:'8px 10px',border:`1px solid ${colors.border2}`,borderRadius:8,fontSize:font.sm,fontWeight:700,textAlign:'center' as const,fontFamily:'inherit',direction:'ltr' as const}}/>
                    <button onClick={()=>deleteExpense(e.id, !!e.fixed_expense_id)} style={{width:32,height:32,borderRadius:8,border:'none',background:colors.dangerLight,color:colors.danger,cursor:'pointer',fontSize:15}}>×</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <div style={{padding:60,textAlign:'center',color:colors.text4}}>تعذّر تحميل البيانات</div>
      )}

      {showAdd && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:500,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
          <div style={{background:colors.surface,borderRadius:radius.xl,padding:24,width:'100%',maxWidth:400,boxShadow:shadow.lg}}>
            <div style={{fontSize:font.md,fontWeight:800,color:colors.text,marginBottom:16}}>إضافة مصروف ثابت</div>
            <div style={{marginBottom:12}}>
              <label style={{fontSize:font.xs,fontWeight:700,color:colors.text3,display:'block',marginBottom:5}}>اسم المصروف</label>
              <input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="مثال: رواتب، إيجار" style={inp()}/>
            </div>
            <div style={{marginBottom:14}}>
              <label style={{fontSize:font.xs,fontWeight:700,color:colors.text3,display:'block',marginBottom:5}}>المبلغ الشهري</label>
              <input type="number" value={newAmount} onChange={e=>setNewAmount(e.target.value)} placeholder="0.00" style={inp()}/>
            </div>
            <label style={{display:'flex',alignItems:'center',gap:8,marginBottom:18,cursor:'pointer'}}>
              <input type="checkbox" checked={newRecurring} onChange={e=>setNewRecurring(e.target.checked)} style={{width:16,height:16,accentColor:colors.primary}}/>
              <span style={{fontSize:font.sm,color:colors.text2,fontWeight:600}}>يتكرر تلقائياً كل شهر (تقدر تعدّله لاحقاً بأي شهر)</span>
            </label>
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>setShowAdd(false)} style={{...btnSecondary,flex:1,padding:'12px'}}>إلغاء</button>
              <button onClick={addExpense} disabled={saving} style={{...btnPrimary,flex:2,padding:'12px'}}>{saving?'جاري الحفظ...':'✓ إضافة'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
