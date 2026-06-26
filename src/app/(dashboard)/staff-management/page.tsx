'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { colors, radius, shadow, font, card, btnPrimary, btnSecondary, inp, pageTitle, pageSub } from '@/lib/ds'
import { toast } from '@/components/toast'

function generatePin() { return String(Math.floor(1000 + Math.random() * 9000)) }

function Avatar({ name, active }: { name:string; active:boolean }) {
  const initials = name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()
  return (
    <div style={{
      width:44,height:44,borderRadius:14,
      background:active?`linear-gradient(135deg,${colors.primary},#15803d)`:'linear-gradient(135deg,#94a3b8,#64748b)',
      display:'flex',alignItems:'center',justifyContent:'center',
      fontSize:14,fontWeight:900,color:'white',flexShrink:0,
      boxShadow:active?`0 4px 12px ${colors.primary}33`:'none',
    }}>
      {initials||'؟'}
    </div>
  )
}

export default function StaffManagementPage() {
  const [staff, setStaff]           = useState<any[]>([])
  const [branches, setBranches]     = useState<any[]>([])
  const [orgId, setOrgId]           = useState('')
  const [loading, setLoading]       = useState(true)
  const [showAdd, setShowAdd]       = useState(false)
  const [newName, setNewName]       = useState('')
  const [newPhone, setNewPhone]     = useState('')
  const [newBranch, setNewBranch]   = useState('')
  const [revealedPin, setRevealedPin] = useState<{name:string,phone:string,pin:string}|null>(null)
  const [expandedId, setExpandedId] = useState<string|null>(null)
  const [visible, setVisible]       = useState(false)
  const [maxStaff, setMaxStaff]     = useState(999)
  const sb = createClient()

  useEffect(() => { init() }, [])

  async function init() {
    setLoading(true)
    const{data:{user}}=await sb.auth.getUser(); if(!user) return
    const{data:profile}=await sb.from('profiles').select('org_id').eq('id',user.id).single(); if(!profile?.org_id) return
    setOrgId(profile.org_id)
    const{data:org}=await (sb.from('organizations') as any).select('max_staff').eq('id',profile.org_id).single()
    if((org as any)?.max_staff) setMaxStaff((org as any).max_staff)
    await Promise.all([loadStaff(profile.org_id),loadBranches(profile.org_id)])
    setLoading(false); setTimeout(()=>setVisible(true),50)
  }

  async function loadStaff(oid:string) {
    const{data}=await (sb.from('staff_members' as any) as any).select('*,branches(name)').eq('org_id',oid).order('created_at',{ascending:false})
    setStaff(data||[])
  }

  async function loadBranches(oid:string) {
    const{data}=await sb.from('branches').select('id,name').eq('org_id',oid).eq('is_active',true).order('created_at')
    setBranches(data||[])
    if(data&&data.length>0) setNewBranch(data[0].id)
  }

  async function addStaff() {
    if(!newName.trim()||!newPhone.trim()){toast('أدخل اسم الموظف ورقم جواله','warning');return}
    if(staff.length>=maxStaff){toast(`باقتك تسمح بـ ${maxStaff} موظف فقط — يرجى الترقية`,'error');return}
    const cleanPhone=newPhone.trim().replace(/\s/g,'')
    const pin=generatePin()
    const{error}=await (sb.from('staff_members' as any) as any).insert({org_id:orgId,branch_id:newBranch||null,name:newName.trim(),phone:cleanPhone,pin})
    if(error){
      if(error.code==='23505') toast('رقم الجوال هذا مسجّل لموظف آخر','error')
      else toast('خطأ: '+error.message,'error')
      return
    }
    setRevealedPin({name:newName.trim(),phone:cleanPhone,pin})
    setNewName('');setNewPhone('');setShowAdd(false)
    loadStaff(orgId)
  }

  async function toggleActive(id:string,current:boolean) {
    await (sb.from('staff_members' as any) as any).update({is_active:!current}).eq('id',id)
    toast(current?'تم إيقاف الموظف':'تم تفعيل الموظف')
    loadStaff(orgId)
  }

  async function deleteStaff(id:string) {
    if(!confirm('حذف هذا الموظف نهائياً؟')) return
    await (sb.from('staff_members' as any) as any).delete().eq('id',id)
    toast('تم الحذف'); loadStaff(orgId)
  }

  async function regeneratePin(id:string,name:string,phone:string) {
    const pin=generatePin()
    await (sb.from('staff_members' as any) as any).update({pin}).eq('id',id)
    setRevealedPin({name,phone,pin}); loadStaff(orgId)
  }

  const activeCount   = staff.filter(s=>s.is_active).length
  const inactiveCount = staff.filter(s=>!s.is_active).length

  if(loading) return (
    <div style={{fontFamily:font.family,direction:'rtl',maxWidth:900,margin:'0 auto'}}>
      <style>{`@keyframes sk{0%,100%{opacity:1}50%{opacity:.3}}.sk{animation:sk 1.6s ease-in-out infinite}`}</style>
      <div style={{height:20,width:120,background:colors.border2,borderRadius:6,marginBottom:8}} className="sk"/>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:20}}>
        {[1,2,3].map(i=>(<div key={i} className="sk" style={{height:80,borderRadius:radius.lg,background:colors.border}}/>))}
      </div>
      <div style={{display:'flex',flexDirection:'column' as const,gap:10}}>
        {[1,2,3].map(i=>(<div key={i} className="sk" style={{height:80,borderRadius:radius.lg,background:colors.border}}/>))}
      </div>
    </div>
  )

  return (
    <div style={{fontFamily:font.family,direction:'rtl',maxWidth:900,margin:'0 auto',opacity:visible?1:0,transition:'opacity .4s ease'}}>
      <style>{`
        @keyframes slideUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
        @keyframes modalIn{from{opacity:0;transform:scale(.96) translateY(10px)}to{opacity:1;transform:none}}
        .su{animation:slideUp .4s ease both}
        input:focus,select:focus{border-color:${colors.primary}!important;box-shadow:0 0 0 3px ${colors.primaryLight}!important}
        .staff-card{transition:all .2s cubic-bezier(.4,0,.2,1)}
        .staff-card:hover{box-shadow:${shadow.md}!important}
        .act-btn{border:none;border-radius:8px;padding:6px 12px;font-size:${font.xs};font-weight:700;cursor:pointer;font-family:inherit;transition:all .15s}
        .act-btn:hover{transform:scale(1.05)}
      `}</style>

      {/* Header */}
      <div style={{marginBottom:20,display:'flex',justifyContent:'space-between',alignItems:'flex-start'}} className="su">
        <div>
          <h1 style={pageTitle}>الموظفون</h1>
          <p style={pageSub}>أضف موظفين بصلاحيات صرف فقط — يدخلون برقم جوالهم ورمز PIN</p>
        </div>
        <button onClick={()=>setShowAdd(true)} style={{...btnPrimary,padding:'10px 18px',fontSize:font.sm,display:'flex',alignItems:'center',gap:6}}>
          <svg width="14" height="14" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4"/></svg>
          موظف جديد
        </button>
      </div>

      {/* Stats */}
      <div className="su" style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:20,animationDelay:'.05s'}}>
        {[
          {label:'إجمالي الموظفين',value:staff.length,      color:colors.info,    bg:colors.infoLight,    border:colors.infoBorder,    icon:'👥'},
          {label:'موظفون نشطون',   value:activeCount,         color:colors.primary, bg:colors.primaryLight, border:colors.primaryBorder, icon:'✅'},
          {label:'موقوفون',        value:inactiveCount,       color:colors.danger,  bg:colors.dangerLight,  border:colors.dangerBorder,  icon:'⏸'},
        ].map((s,i)=>(
          <div key={i} style={{background:s.bg,borderRadius:radius.lg,padding:'16px',border:`1.5px solid ${s.border}`}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
              <div style={{fontSize:10,fontWeight:700,color:s.color,textTransform:'uppercase' as const,letterSpacing:'.06em'}}>{s.label}</div>
              <span style={{fontSize:18}}>{s.icon}</span>
            </div>
            <div style={{fontSize:28,fontWeight:900,color:s.color}}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Revealed PIN card */}
      {revealedPin && (
        <div className="su" style={{...card,padding:20,marginBottom:18,background:colors.primaryLight,border:`1.5px solid ${colors.primaryBorder}`,animationDelay:'.08s'}}>
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14}}>
            <div style={{width:40,height:40,borderRadius:12,background:colors.primary,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>✅</div>
            <div>
              <div style={{fontSize:font.base,fontWeight:800,color:colors.text}}>تم إضافة {revealedPin.name}</div>
              <div style={{fontSize:font.xs,color:colors.text3}}>شارك هذي البيانات مع الموظف</div>
            </div>
          </div>
          <div style={{background:'white',borderRadius:radius.md,padding:'14px 16px',marginBottom:14,border:`1px solid ${colors.primaryBorder}`}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:12}}>
              <div>
                <div style={{fontSize:font.xs,color:colors.text4,fontWeight:700,marginBottom:4}}>رقم الجوال</div>
                <div style={{fontSize:font.lg,fontWeight:800,color:colors.text,direction:'ltr',textAlign:'right' as const}}>{revealedPin.phone}</div>
              </div>
              <div>
                <div style={{fontSize:font.xs,color:colors.text4,fontWeight:700,marginBottom:4}}>رمز PIN</div>
                <div style={{fontSize:32,fontWeight:900,color:colors.primary,letterSpacing:8}}>{revealedPin.pin}</div>
              </div>
            </div>
            <div>
              <div style={{fontSize:font.xs,color:colors.text4,fontWeight:700,marginBottom:6}}>رابط الدخول</div>
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                <div style={{fontSize:font.xs,color:colors.text,background:colors.bg,padding:'8px 12px',borderRadius:8,border:`1px solid ${colors.border}`,flex:1,direction:'ltr',textAlign:'left' as const,overflowX:'auto',whiteSpace:'nowrap' as const}}>https://storely.dev/staff</div>
                <button onClick={()=>{navigator.clipboard.writeText('https://storely.dev/staff');toast('تم نسخ الرابط ✓')}} style={{background:colors.primary,color:'white',border:'none',borderRadius:8,padding:'8px 14px',fontSize:font.xs,fontWeight:700,cursor:'pointer',fontFamily:font.family,whiteSpace:'nowrap' as const}}>
                  📋 نسخ الكل
                </button>
              </div>
            </div>
          </div>
          <button onClick={()=>setRevealedPin(null)} style={{...btnSecondary,padding:'8px 16px',fontSize:font.xs}}>إخفاء ✓</button>
        </div>
      )}

      {/* Add staff modal */}
      {showAdd && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:500,display:'flex',alignItems:'center',justifyContent:'center',padding:20,backdropFilter:'blur(6px)'}}>
          <div style={{background:colors.surface,borderRadius:radius.xl,padding:26,width:'100%',maxWidth:440,animation:'modalIn .2s ease',boxShadow:shadow.lg}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
              <div>
                <div style={{fontSize:font.md,fontWeight:800,color:colors.text}}>إضافة موظف جديد</div>
                <div style={{fontSize:font.xs,color:colors.text4,marginTop:2}}>سيتم توليد رمز PIN تلقائياً</div>
              </div>
              <button onClick={()=>setShowAdd(false)} style={{width:32,height:32,borderRadius:radius.sm,border:`1.5px solid ${colors.border2}`,background:colors.bg,cursor:'pointer',fontSize:18,display:'flex',alignItems:'center',justifyContent:'center',color:colors.text3}}>×</button>
            </div>
            <div style={{display:'flex',flexDirection:'column' as const,gap:12,marginBottom:18}}>
              <div>
                <label style={{fontSize:font.xs,fontWeight:700,color:colors.text3,display:'block',marginBottom:5,textTransform:'uppercase' as const,letterSpacing:'.05em'}}>اسم الموظف *</label>
                <input value={newName} onChange={e=>setNewName(e.target.value)} style={inp()} placeholder="مثال: أحمد محمد"/>
              </div>
              <div>
                <label style={{fontSize:font.xs,fontWeight:700,color:colors.text3,display:'block',marginBottom:5,textTransform:'uppercase' as const,letterSpacing:'.05em'}}>رقم الجوال *</label>
                <input value={newPhone} onChange={e=>setNewPhone(e.target.value)} style={{...inp(),direction:'ltr' as const}} placeholder="05xxxxxxxx"/>
              </div>
              {branches.length>1&&(
                <div>
                  <label style={{fontSize:font.xs,fontWeight:700,color:colors.text3,display:'block',marginBottom:5,textTransform:'uppercase' as const,letterSpacing:'.05em'}}>الفرع</label>
                  <select value={newBranch} onChange={e=>setNewBranch(e.target.value)} style={inp()}>
                    {branches.map((b:any)=>(<option key={b.id} value={b.id}>{b.name}</option>))}
                  </select>
                </div>
              )}
            </div>
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>setShowAdd(false)} style={{...btnSecondary,flex:1,padding:'12px',fontSize:font.sm}}>إلغاء</button>
              <button onClick={addStaff} style={{...btnPrimary,flex:2,padding:'12px',fontSize:font.sm}}>✓ إضافة وتوليد PIN</button>
            </div>
          </div>
        </div>
      )}

      {/* Staff list */}
      {staff.length===0 ? (
        <div style={{...card,padding:56,textAlign:'center'}} className="su">
          <div style={{fontSize:52,marginBottom:14}}>👥</div>
          <div style={{fontSize:font.base,fontWeight:700,color:colors.text2,marginBottom:6}}>لا يوجد موظفين بعد</div>
          <div style={{fontSize:font.sm,color:colors.text4,marginBottom:20}}>أضف أول موظف وشارك معه بيانات الدخول</div>
          <button onClick={()=>setShowAdd(true)} style={{...btnPrimary,padding:'10px 24px',fontSize:font.sm}}>+ إضافة أول موظف</button>
        </div>
      ) : (
        <div style={{display:'flex',flexDirection:'column' as const,gap:10}}>
          {staff.map((s:any,i)=>(
            <div key={s.id} className="staff-card su" style={{...card,padding:'16px 18px',animationDelay:`${i*0.05}s`}}>
              <div onClick={()=>setExpandedId(expandedId===s.id?null:s.id)} style={{display:'flex',justifyContent:'space-between',alignItems:'center',cursor:'pointer'}}>
                <div style={{display:'flex',alignItems:'center',gap:12}}>
                  <Avatar name={s.name} active={s.is_active}/>
                  <div>
                    <div style={{fontSize:font.base,fontWeight:700,color:colors.text,display:'flex',alignItems:'center',gap:8}}>
                      {s.name}
                      {!s.is_active&&<span style={{fontSize:10,color:colors.danger,background:colors.dangerLight,padding:'2px 8px',borderRadius:20,fontWeight:700,border:`1px solid ${colors.dangerBorder}`}}>موقوف</span>}
                    </div>
                    <div style={{fontSize:font.xs,color:colors.text4,marginTop:2,direction:'ltr',textAlign:'right' as const}}>
                      {s.phone}{s.branches?.name?` · ${s.branches.name}`:''}
                    </div>
                  </div>
                </div>
                <div style={{display:'flex',gap:6,alignItems:'center'}}>
                  <button onClick={e=>{e.stopPropagation();regeneratePin(s.id,s.name,s.phone)}} className="act-btn" style={{background:colors.infoLight,color:colors.info}}>PIN جديد</button>
                  <button onClick={e=>{e.stopPropagation();toggleActive(s.id,s.is_active)}} className="act-btn" style={{background:colors.bg,color:colors.text2,border:`1.5px solid ${colors.border2}`}}>{s.is_active?'إيقاف':'تفعيل'}</button>
                  <button onClick={e=>{e.stopPropagation();deleteStaff(s.id)}} className="act-btn" style={{background:colors.dangerLight,color:colors.danger}}>حذف</button>
                  <svg width={14} height={14} fill="none" stroke={colors.text3} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" style={{transition:'transform .2s',transform:expandedId===s.id?'rotate(180deg)':'none',marginRight:4}}>
                    <path d="M6 9l6 6 6-6"/>
                  </svg>
                </div>
              </div>

              {expandedId===s.id&&(
                <div style={{marginTop:16,paddingTop:16,borderTop:`1px solid ${colors.border}`,animation:'slideUp .2s ease'}}>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14}}>
                    <div style={{background:colors.bg,borderRadius:radius.md,padding:'12px 14px',border:`1px solid ${colors.border}`}}>
                      <div style={{fontSize:10,fontWeight:700,color:colors.text4,marginBottom:6,textTransform:'uppercase' as const}}>رقم الجوال</div>
                      <div style={{fontSize:font.base,fontWeight:800,color:colors.text,direction:'ltr',textAlign:'right' as const}}>{s.phone}</div>
                    </div>
                    <div style={{background:colors.primaryLight,borderRadius:radius.md,padding:'12px 14px',border:`1px solid ${colors.primaryBorder}`}}>
                      <div style={{fontSize:10,fontWeight:700,color:colors.primary,marginBottom:6,textTransform:'uppercase' as const}}>رمز PIN الحالي</div>
                      <div style={{fontSize:28,fontWeight:900,color:colors.primary,letterSpacing:8}}>{s.pin}</div>
                    </div>
                  </div>
                  <div>
                    <div style={{fontSize:10,fontWeight:700,color:colors.text4,marginBottom:6,textTransform:'uppercase' as const}}>رابط دخول الموظف</div>
                    <div style={{display:'flex',gap:8,alignItems:'center'}}>
                      <div style={{fontSize:font.xs,color:colors.text,background:colors.bg,padding:'9px 12px',borderRadius:8,border:`1px solid ${colors.border}`,flex:1,direction:'ltr',textAlign:'left' as const,overflowX:'auto',whiteSpace:'nowrap' as const}}>https://storely.dev/staff</div>
                      <button onClick={()=>{navigator.clipboard.writeText('https://storely.dev/staff');toast('تم نسخ الرابط ✓')}} style={{background:colors.primary,color:'white',border:'none',borderRadius:8,padding:'9px 14px',fontSize:font.xs,fontWeight:700,cursor:'pointer',fontFamily:font.family,whiteSpace:'nowrap' as const}}>
                        📋 نسخ الكل
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
