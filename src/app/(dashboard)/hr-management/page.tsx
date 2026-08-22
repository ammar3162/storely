'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { colors, radius, shadow, font, card, btnPrimary, btnSecondary, inp, pageTitle, pageSub } from '@/lib/ds'
import { toast } from '@/components/toast'
import { Wallet, ThumbsUp, ThumbsDown, ClipboardList, ChevronDown, Plus, Camera } from 'lucide-react'

export default function HRManagementPage() {
  const [orgId, setOrgId] = useState('')
  const [curr, setCurr] = useState('ر.س')
  const [orgPlan, setOrgPlan] = useState('basic')
  const [staff, setStaff] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string|null>(null)

  const [salaryForm, setSalaryForm] = useState<{base:string,housing:string,transport:string,food:string}>({base:'',housing:'',transport:'',food:''})
  const [savingSalary, setSavingSalary] = useState(false)

  const [adjustments, setAdjustments] = useState<any[]>([])
  const [loadingAdjustments, setLoadingAdjustments] = useState(false)
  const [newAdjAmount, setNewAdjAmount] = useState('')
  const [newAdjReason, setNewAdjReason] = useState('')
  const [savingAdj, setSavingAdj] = useState(false)

  const [tasks, setTasks] = useState<any[]>([])
  const [loadingTasks, setLoadingTasks] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskDesc, setNewTaskDesc] = useState('')
  const [newTaskPhoto, setNewTaskPhoto] = useState(false)
  const [savingTask, setSavingTask] = useState(false)

  const sb = createClient()

  useEffect(()=>{ init() },[])

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
    const{data:org}=await sb.from('organizations' as any).select('plan,currency').eq('id',oid!).single()
    setOrgPlan((org as any)?.plan || 'basic')

    const bid = sessionStorage.getItem('s_branch_id')
    let q = (sb.from('staff_members' as any) as any).select('*').eq('org_id',oid!)
    if (bid) q = q.eq('branch_id', bid)
    const{data}=await q.order('created_at',{ascending:false})
    setStaff(data||[])
    setLoading(false)
  }

  function toggleExpand(s:any) {
    if (expandedId === s.id) { setExpandedId(null); return }
    setExpandedId(s.id)
    setSalaryForm({
      base: String(s.monthly_salary || 0),
      housing: String(s.housing_allowance || 0),
      transport: String(s.transport_allowance || 0),
      food: String(s.food_allowance || 0),
    })
    loadAdjustments(s.id)
    loadTasks(s.id)
  }

  const totalSalary = (Number(salaryForm.base)||0) + (Number(salaryForm.housing)||0) + (Number(salaryForm.transport)||0) + (Number(salaryForm.food)||0)

  async function saveSalary(staffId:string) {
    setSavingSalary(true)
    const res = await fetch('/api/staff-salary', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        org_id: orgId, staff_id: staffId,
        monthly_salary: Number(salaryForm.base)||0,
        housing_allowance: Number(salaryForm.housing)||0,
        transport_allowance: Number(salaryForm.transport)||0,
        food_allowance: Number(salaryForm.food)||0,
      }),
    })
    const j = await res.json()
    setSavingSalary(false)
    if (!j.success) { toast(j.error || 'خطأ', 'error'); return }
    toast('✅ تم حفظ الراتب والبدلات')
    setStaff(prev => prev.map((s:any)=> s.id===staffId ? {...s, monthly_salary:Number(salaryForm.base)||0, housing_allowance:Number(salaryForm.housing)||0, transport_allowance:Number(salaryForm.transport)||0, food_allowance:Number(salaryForm.food)||0} : s))
  }

  async function loadAdjustments(staffId:string) {
    setLoadingAdjustments(true)
    try {
      const res = await fetch(`/api/staff-payroll-adjustments?org_id=${orgId}&staff_id=${staffId}`)
      const j = await res.json()
      setAdjustments(j.success ? (j.adjustments||[]) : [])
    } catch { setAdjustments([]) }
    setLoadingAdjustments(false)
  }

  async function addDeduction(staffId:string) {
    const amt = Number(newAdjAmount)
    if (!(amt>0)) { toast('أدخل مبلغ صحيح','warning'); return }
    setSavingAdj(true)
    const res = await fetch('/api/staff-payroll-adjustments', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ org_id: orgId, staff_id: staffId, type:'deduction', amount: amt, reason: newAdjReason || null }),
    })
    const j = await res.json()
    setSavingAdj(false)
    if (!j.success) { toast(j.error||'خطأ','error'); return }
    toast('✅ تم إضافة الخصم')
    setNewAdjAmount(''); setNewAdjReason('')
    loadAdjustments(staffId)
  }

  async function reviewAdvance(staffId:string, adjustmentId:string, decision:'approved'|'rejected') {
    const res = await fetch('/api/staff-payroll-adjustments', {
      method:'PATCH', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ org_id: orgId, adjustment_id: adjustmentId, decision }),
    })
    const j = await res.json()
    if (!j.success) { toast(j.error||'خطأ','error'); return }
    toast(decision==='approved' ? '✅ تم قبول طلب السلفة' : 'تم رفض الطلب')
    loadAdjustments(staffId)
  }

  async function loadTasks(staffId:string) {
    setLoadingTasks(true)
    try {
      const res = await fetch(`/api/staff-tasks?org_id=${orgId}&staff_id=${staffId}`)
      const j = await res.json()
      setTasks(j.success ? (j.tasks||[]) : [])
    } catch { setTasks([]) }
    setLoadingTasks(false)
  }

  async function createTask(staffId:string) {
    if (!newTaskTitle.trim()) { toast('اكتب عنوان المهمة','warning'); return }
    setSavingTask(true)
    const res = await fetch('/api/staff-tasks', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ org_id: orgId, staff_ids:[staffId], title:newTaskTitle.trim(), description:newTaskDesc||null, requires_photo:newTaskPhoto }),
    })
    const j = await res.json()
    setSavingTask(false)
    if (!j.success) { toast(j.error||'خطأ','error'); return }
    toast('✅ تم إنشاء المهمة')
    setNewTaskTitle(''); setNewTaskDesc(''); setNewTaskPhoto(false)
    loadTasks(staffId)
  }

  async function reviewTask(staffId:string, taskId:string, decision:'confirmed'|'rejected') {
    const res = await fetch('/api/staff-tasks', {
      method:'PATCH', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ org_id: orgId, task_id: taskId, decision }),
    })
    const j = await res.json()
    if (!j.success) { toast(j.error||'خطأ','error'); return }
    toast(decision==='confirmed' ? '✅ تم تأكيد اكتمال المهمة' : 'تم رفض المهمة')
    loadTasks(staffId)
  }

  const TASK_STATUS_LABEL:Record<string,{label:string,color:string,bg:string}> = {
    pending:   {label:'قيد الانتظار', color: colors.text3,   bg: colors.bg},
    completed: {label:'بانتظار تأكيدك', color: colors.warning, bg: colors.warningLight},
    confirmed: {label:'مؤكدة ✓',       color: colors.primary, bg: colors.primaryLight},
    rejected:  {label:'مرفوضة',        color: colors.danger,  bg: colors.dangerLight},
  }

  if (loading) return (
    <div style={{minHeight:'50vh',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{width:32,height:32,border:'3px solid #e5e5e2',borderTopColor:colors.primary,borderRadius:'50%',animation:'spin .7s linear infinite'}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (orgPlan === 'basic') return (
    <div style={{minHeight:'50vh',display:'flex',alignItems:'center',justifyContent:'center',textAlign:'center' as const,padding:20}}>
      <div>
        <div style={{fontSize:44,marginBottom:12}}>🔒</div>
        <div style={{fontSize:16,fontWeight:800,color:colors.text,marginBottom:8}}>إدارة الموظفين متاحة بالباقة المتوسطة أو المتقدمة</div>
        <div style={{fontSize:13,color:colors.text3}}>رقّي باقتك عشان تفعّل إدارة الرواتب والمهام لفريقك</div>
      </div>
    </div>
  )

  return (
    <div style={{fontFamily:font.family,direction:'rtl',maxWidth:900,margin:'0 auto'}}>
      <div style={{marginBottom:20,display:'flex',alignItems:'center',gap:12}}>
        <div style={{width:44,height:44,borderRadius:radius.md,background:'#fdf4ff',border:'1px solid #f5d0fe',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
          <Wallet size={20} color="#a21caf" strokeWidth={1.75}/>
        </div>
        <div>
          <h1 style={pageTitle}>إدارة الموظفين</h1>
          <p style={pageSub}>الرواتب والبدلات، الخصومات والسلف، والمهام لكل موظف</p>
        </div>
      </div>

      {staff.length===0 ? (
        <div style={{...card,padding:56,textAlign:'center' as const}}>
          <div style={{fontSize:13,color:colors.text4}}>ما فيه موظفين بعد — أضفهم من صفحة "الموظفون" أول</div>
        </div>
      ) : (
        <div style={{display:'flex',flexDirection:'column' as const,gap:10}}>
          {staff.map((s:any)=>{
            const isOpen = expandedId===s.id
            const pendingAdvances = adjustments.filter((a:any)=>a.type==='advance'&&a.status==='pending')
            const totalDeducted = adjustments.filter((a:any)=>a.status==='approved').reduce((sum:number,a:any)=>sum+Number(a.amount),0)
            const savedTotal = (Number(s.monthly_salary)||0)+(Number(s.housing_allowance)||0)+(Number(s.transport_allowance)||0)+(Number(s.food_allowance)||0)
            return (
              <div key={s.id} style={{...card,padding:'16px 18px'}}>
                <div onClick={()=>toggleExpand(s)} style={{display:'flex',justifyContent:'space-between',alignItems:'center',cursor:'pointer'}}>
                  <div>
                    <div style={{fontSize:font.base,fontWeight:700,color:colors.text}}>{s.name}</div>
                    <div style={{fontSize:11,color:colors.text4,marginTop:2}}>إجمالي الراتب: {savedTotal.toLocaleString('ar-SA',{numberingSystem:'latn'})} {curr}</div>
                  </div>
                  <ChevronDown size={16} color={colors.text3} strokeWidth={2.25} style={{transition:'transform .2s',transform:isOpen?'rotate(180deg)':'none'}}/>
                </div>

                {isOpen && (
                  <div style={{marginTop:18,paddingTop:18,borderTop:`1px solid ${colors.border}`,display:'flex',flexDirection:'column' as const,gap:22}}>

                    {/* الراتب والبدلات */}
                    <div>
                      <div style={{fontSize:12,fontWeight:700,color:colors.text3,marginBottom:10}}>الراتب الأساسي والبدلات</div>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
                        <div>
                          <label style={{fontSize:10,fontWeight:700,color:colors.text4,display:'block',marginBottom:4}}>الراتب الأساسي</label>
                          <input type="number" value={salaryForm.base} onChange={e=>setSalaryForm({...salaryForm,base:e.target.value})} style={{...inp(),fontSize:13}} placeholder="0"/>
                        </div>
                        <div>
                          <label style={{fontSize:10,fontWeight:700,color:colors.text4,display:'block',marginBottom:4}}>بدل السكن</label>
                          <input type="number" value={salaryForm.housing} onChange={e=>setSalaryForm({...salaryForm,housing:e.target.value})} style={{...inp(),fontSize:13}} placeholder="0"/>
                        </div>
                        <div>
                          <label style={{fontSize:10,fontWeight:700,color:colors.text4,display:'block',marginBottom:4}}>بدل المواصلات</label>
                          <input type="number" value={salaryForm.transport} onChange={e=>setSalaryForm({...salaryForm,transport:e.target.value})} style={{...inp(),fontSize:13}} placeholder="0"/>
                        </div>
                        <div>
                          <label style={{fontSize:10,fontWeight:700,color:colors.text4,display:'block',marginBottom:4}}>بدل الأكل</label>
                          <input type="number" value={salaryForm.food} onChange={e=>setSalaryForm({...salaryForm,food:e.target.value})} style={{...inp(),fontSize:13}} placeholder="0"/>
                        </div>
                      </div>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',background:colors.primaryLight,border:`1px solid ${colors.primaryBorder}`,borderRadius:radius.md,padding:'10px 14px',marginBottom:10}}>
                        <span style={{fontSize:12,fontWeight:700,color:colors.primary}}>الإجمالي الشهري</span>
                        <span style={{fontSize:18,fontWeight:900,color:colors.primary}}>{totalSalary.toLocaleString('ar-SA',{numberingSystem:'latn'})} {curr}</span>
                      </div>
                      <button onClick={()=>saveSalary(s.id)} disabled={savingSalary} style={{...btnPrimary,width:'100%',padding:'10px',fontSize:13,opacity:savingSalary?0.6:1}}>{savingSalary?'...':'حفظ الراتب والبدلات'}</button>
                    </div>

                    {/* السلف والخصومات */}
                    <div>
                      <div style={{fontSize:12,fontWeight:700,color:colors.text3,marginBottom:10}}>الخصومات والسلف</div>
                      {loadingAdjustments ? (
                        <div style={{fontSize:12,color:colors.text4}}>جاري التحميل...</div>
                      ) : (
                        <>
                          {pendingAdvances.length>0 && (
                            <div style={{marginBottom:14}}>
                              <div style={{fontSize:11,fontWeight:700,color:colors.warning,marginBottom:8}}>طلبات سلفة بانتظار الموافقة</div>
                              <div style={{display:'flex',flexDirection:'column' as const,gap:8}}>
                                {pendingAdvances.map((a:any)=>(
                                  <div key={a.id} style={{background:colors.warningLight,border:`1.5px solid ${colors.warningBorder}`,borderRadius:radius.md,padding:'12px 14px'}}>
                                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                                      <span style={{fontSize:15,fontWeight:800,color:colors.warning}}>{a.amount} {curr}</span>
                                      <span style={{fontSize:10,color:colors.text4}}>{new Date(a.created_at).toLocaleDateString('ar-SA',{numberingSystem:'latn'})}</span>
                                    </div>
                                    {a.reason && <div style={{fontSize:12,color:colors.text3,marginBottom:10}}>{a.reason}</div>}
                                    <div style={{display:'flex',gap:8}}>
                                      <button onClick={()=>reviewAdvance(s.id,a.id,'approved')} style={{flex:1,padding:'7px',background:colors.primary,color:'white',border:'none',borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:5}}><ThumbsUp size={13} strokeWidth={2.25}/> موافقة</button>
                                      <button onClick={()=>reviewAdvance(s.id,a.id,'rejected')} style={{flex:1,padding:'7px',background:colors.dangerLight,color:colors.danger,border:`1px solid ${colors.dangerBorder}`,borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:5}}><ThumbsDown size={13} strokeWidth={2.25}/> رفض</button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          <div style={{background:colors.bg,borderRadius:radius.md,padding:'14px',marginBottom:12}}>
                            <div style={{display:'grid',gridTemplateColumns:'1fr 2fr',gap:8,marginBottom:8}}>
                              <input type="number" value={newAdjAmount} onChange={e=>setNewAdjAmount(e.target.value)} placeholder="المبلغ" style={{...inp(),fontSize:13}}/>
                              <input value={newAdjReason} onChange={e=>setNewAdjReason(e.target.value)} placeholder="السبب (اختياري)" style={{...inp(),fontSize:13}}/>
                            </div>
                            <button onClick={()=>addDeduction(s.id)} disabled={savingAdj||!newAdjAmount} style={{...btnSecondary,width:'100%',padding:'9px',fontSize:13,opacity:(savingAdj||!newAdjAmount)?0.6:1}}>{savingAdj?'...':'+ إضافة خصم'}</button>
                          </div>
                          {adjustments.length>0 && (
                            <div style={{display:'flex',flexDirection:'column' as const,gap:6}}>
                              {adjustments.map((a:any)=>(
                                <div key={a.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'9px 12px',background:colors.bg,borderRadius:radius.sm,opacity:a.status==='rejected'?0.5:1}}>
                                  <div>
                                    <span style={{fontSize:12,fontWeight:700,color:colors.text}}>{a.type==='advance'?'سلفة':'خصم'}</span>
                                    {a.reason && <span style={{fontSize:11,color:colors.text4,marginRight:6}}>— {a.reason}</span>}
                                    {a.status==='pending' && <span style={{fontSize:9,color:colors.warning,marginRight:6,fontWeight:700}}>(معلّق)</span>}
                                  </div>
                                  <span style={{fontSize:12,fontWeight:700,color:colors.danger}}>-{a.amount} {curr}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* المهام */}
                    <div>
                      <div style={{fontSize:12,fontWeight:700,color:colors.text3,marginBottom:10,display:'flex',alignItems:'center',gap:6}}><ClipboardList size={14} strokeWidth={2.25}/> المهام</div>
                      <div style={{background:colors.bg,borderRadius:radius.md,padding:'14px',marginBottom:12}}>
                        <input value={newTaskTitle} onChange={e=>setNewTaskTitle(e.target.value)} placeholder="عنوان المهمة" style={{...inp(),fontSize:13,marginBottom:8}}/>
                        <input value={newTaskDesc} onChange={e=>setNewTaskDesc(e.target.value)} placeholder="تفاصيل إضافية (اختياري)" style={{...inp(),fontSize:13,marginBottom:8}}/>
                        <label style={{display:'flex',alignItems:'center',gap:8,marginBottom:10,cursor:'pointer'}}>
                          <input type="checkbox" checked={newTaskPhoto} onChange={e=>setNewTaskPhoto(e.target.checked)} style={{accentColor:colors.primary,width:14,height:14}}/>
                          <span style={{fontSize:12,color:colors.text2,display:'flex',alignItems:'center',gap:5}}><Camera size={13} strokeWidth={2.25}/> تتطلب صورة إثبات عند الإكمال</span>
                        </label>
                        <button onClick={()=>createTask(s.id)} disabled={savingTask||!newTaskTitle.trim()} style={{...btnSecondary,width:'100%',padding:'9px',fontSize:13,opacity:(savingTask||!newTaskTitle.trim())?0.6:1,display:'flex',alignItems:'center',justifyContent:'center',gap:6}}><Plus size={14} strokeWidth={2.25}/> إنشاء مهمة</button>
                      </div>
                      {loadingTasks ? (
                        <div style={{fontSize:12,color:colors.text4}}>جاري التحميل...</div>
                      ) : tasks.length===0 ? (
                        <div style={{fontSize:12,color:colors.text4,textAlign:'center' as const,padding:12}}>ما فيه مهام بعد</div>
                      ) : (
                        <div style={{display:'flex',flexDirection:'column' as const,gap:8}}>
                          {tasks.map((t:any)=>{
                            const st = TASK_STATUS_LABEL[t.status] || TASK_STATUS_LABEL.pending
                            return (
                              <div key={t.id} style={{background:st.bg,border:`1px solid ${colors.border2}`,borderRadius:radius.md,padding:'12px 14px'}}>
                                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:4}}>
                                  <span style={{fontSize:13,fontWeight:700,color:colors.text}}>{t.title}</span>
                                  <span style={{fontSize:10,fontWeight:700,color:st.color}}>{st.label}</span>
                                </div>
                                {t.description && <div style={{fontSize:12,color:colors.text3,marginBottom:8}}>{t.description}</div>}
                                {t.photo_url && (
                                  <a href={t.photo_url} target="_blank" rel="noreferrer" style={{fontSize:11,color:colors.info,textDecoration:'underline',display:'inline-block',marginBottom:8}}>عرض صورة الإثبات</a>
                                )}
                                {t.status==='completed' && (
                                  <div style={{display:'flex',gap:8,marginTop:6}}>
                                    <button onClick={()=>reviewTask(s.id,t.id,'confirmed')} style={{flex:1,padding:'7px',background:colors.primary,color:'white',border:'none',borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>تأكيد الإتمام</button>
                                    <button onClick={()=>reviewTask(s.id,t.id,'rejected')} style={{flex:1,padding:'7px',background:colors.dangerLight,color:colors.danger,border:`1px solid ${colors.dangerBorder}`,borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>رفض</button>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>

                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
