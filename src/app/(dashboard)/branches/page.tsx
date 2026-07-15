'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { colors, radius, font, card, btnPrimary, inp, pageTitle, pageSub } from '@/lib/ds'

export default function BranchesPage() {
  const sb = createClient()
  const [loading, setLoading] = useState(true)
  const [orgId, setOrgId] = useState('')
  const [maxBranches, setMaxBranches] = useState(1)
  const [branches, setBranches] = useState<any[]>([])
  const [inactiveBranches, setInactiveBranches] = useState<any[]>([])
  const [newBranch, setNewBranch] = useState({name:'',location:''})
  const [branchSaving, setBranchSaving] = useState(false)
  const [editingPhoneId, setEditingPhoneId] = useState<string|null>(null)
  const [editPhoneValue, setEditPhoneValue] = useState('')
  const [savingPhone, setSavingPhone] = useState(false)
  const [reactivatingId, setReactivatingId] = useState<string|null>(null)

  useEffect(()=>{ init() },[])

  async function init() {
    const{data:{user}}=await sb.auth.getUser()
    if(!user){setLoading(false);return}
    const{data:profile}=await sb.from('profiles').select('org_id').eq('id',user.id).single()
    if(!profile?.org_id){setLoading(false);return}
    setOrgId(profile.org_id)
    const{data:org}=await (sb.from('organizations' as any) as any).select('max_branches').eq('id',profile.org_id).single()
    setMaxBranches((org as any)?.max_branches||1)
    const{data:bList}=await sb.from('branches').select('*').eq('org_id',profile.org_id).eq('is_active',true).order('created_at')
    setBranches(bList||[])
    const{data:iList}=await sb.from('branches').select('*').eq('org_id',profile.org_id).eq('is_active',false).order('created_at')
    setInactiveBranches(iList||[])
    setLoading(false)
  }

  async function addBranch() {
    if(!newBranch.name.trim()) return
    setBranchSaving(true)
    await sb.from('branches').insert({ org_id:orgId, name:newBranch.name.trim(), location:newBranch.location.trim()||null })
    const{data:bList}=await sb.from('branches').select('*').eq('org_id',orgId).eq('is_active',true).order('created_at')
    setBranches(bList||[]); setNewBranch({name:'',location:''}); setBranchSaving(false)
  }

  async function deleteBranch(id:string) {
    if(branches.length<=1){alert('لا يمكن حذف الفرع الوحيد');return}
    if(!confirm('إيقاف هذا الفرع؟ بياناته تبقى محفوظة ويمكن تفعيله لاحقاً.')) return
    await sb.from('branches').update({is_active:false} as any).eq('id',id)
    const stopped = branches.find((b:any)=>b.id===id)
    setBranches(prev=>prev.filter((b:any)=>b.id!==id))
    if (stopped) setInactiveBranches(prev=>[...prev, stopped])
  }

  async function reactivateBranch(id:string) {
    setReactivatingId(id)
    await sb.from('branches').update({is_active:true} as any).eq('id',id)
    const b = inactiveBranches.find((x:any)=>x.id===id)
    setInactiveBranches(prev=>prev.filter((x:any)=>x.id!==id))
    if (b) setBranches(prev=>[...prev, b])
    setReactivatingId(null)
  }

  async function saveBranchPhone(id:string) {
    setSavingPhone(true)
    await (sb.from('branches' as any) as any).update({ whatsapp_number: editPhoneValue.trim() || null }).eq('id', id)
    setBranches((prev:any[]) => prev.map(b => b.id===id ? {...b, whatsapp_number: editPhoneValue.trim() || null} : b))
    setEditingPhoneId(null); setSavingPhone(false)
  }

  function selectBranch(b:any){
    sessionStorage.setItem('s_branch_id',b.id)
    sessionStorage.setItem('s_branch_name',b.name)
    window.location.href='/dashboard'
  }

  if (loading) return <div style={{padding:40,textAlign:'center',color:colors.text3,fontFamily:font.family}}>جاري التحميل...</div>

  return (
    <div style={{padding:'24px',maxWidth:900,margin:'0 auto',fontFamily:font.family,direction:'rtl'}}>
      <h1 style={pageTitle}>إدارة الفروع</h1>
      <p style={pageSub}>كل فرع له مخزونه المستقل. الباقة الحالية تسمح بـ <b style={{color:colors.primary}}>{maxBranches} فرع</b>.</p>

      {branches.length>0&&(
        <div style={{...card,overflow:'hidden',marginBottom:16,marginTop:20}}>
          {branches.map((b:any,i:number)=>(
            <div key={b.id} style={{padding:'14px 16px',borderBottom:i<branches.length-1?`1px solid ${colors.border}`:'none'}}>
              <div style={{display:'flex',alignItems:'center',gap:12}}>
                <button onClick={()=>selectBranch(b)}
                  style={{width:36,height:36,borderRadius:10,background:i===0?colors.primaryLight:colors.bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0,border:`1px solid ${i===0?colors.primaryBorder:colors.border}`,cursor:'pointer'}}>
                  {i===0?'🏠':'🏪'}
                </button>
                <div style={{flex:1,cursor:'pointer'}} onClick={()=>selectBranch(b)}>
                  <div style={{fontSize:font.sm,fontWeight:700,color:colors.text}}>{b.name}</div>
                  {b.location&&<div style={{fontSize:font.xs,color:colors.text4,marginTop:1}}>📍 {b.location}</div>}
                </div>
                <button onClick={()=>selectBranch(b)} style={{background:colors.primaryLight,color:colors.primary,border:`1px solid ${colors.primaryBorder}`,borderRadius:radius.sm,padding:'6px 12px',fontSize:font.xs,fontWeight:700,cursor:'pointer',fontFamily:font.family}}>
                  دخول ←
                </button>
                {i===0
                  ? <span style={{fontSize:font.xs,color:colors.primary,padding:'4px 10px',background:colors.primaryLight,borderRadius:20,border:`1px solid ${colors.primaryBorder}`,fontWeight:700}}>رئيسي</span>
                  : <button onClick={()=>deleteBranch(b.id)} style={{background:colors.dangerLight,color:colors.danger,border:`1px solid ${colors.dangerBorder}`,borderRadius:radius.sm,padding:'6px 12px',fontSize:font.xs,fontWeight:700,cursor:'pointer',fontFamily:font.family}}>إيقاف</button>}
              </div>
              <div style={{marginTop:10,marginRight:48}}>
                {editingPhoneId===b.id ? (
                  <div style={{display:'flex',gap:6,alignItems:'center'}}>
                    <input value={editPhoneValue} onChange={e=>setEditPhoneValue(e.target.value)} placeholder="5xxxxxxxx" dir="ltr"
                      style={{...inp(),padding:'6px 10px',fontSize:font.xs,flex:1}}/>
                    <button onClick={()=>saveBranchPhone(b.id)} disabled={savingPhone}
                      style={{background:colors.primary,color:'white',border:'none',borderRadius:6,padding:'6px 12px',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:font.family}}>
                      {savingPhone?'...':'حفظ'}
                    </button>
                    <button onClick={()=>setEditingPhoneId(null)}
                      style={{background:colors.bg,color:colors.text3,border:'none',borderRadius:6,padding:'6px 12px',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:font.family}}>
                      إلغاء
                    </button>
                  </div>
                ) : (
                  <button onClick={()=>{setEditingPhoneId(b.id);setEditPhoneValue(b.whatsapp_number||'')}}
                    style={{background:'none',border:'none',color:colors.text4,fontSize:11,cursor:'pointer',fontFamily:font.family,padding:0,display:'flex',alignItems:'center',gap:4}}>
                    📱 {b.whatsapp_number ? `رقم مخصص: ${b.whatsapp_number}` : 'استخدام رقم مخصص لهذا الفرع (اختياري)'}
                    <span style={{textDecoration:'underline'}}>تعديل</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {inactiveBranches.length>0&&(
        <div style={{...card,overflow:'hidden',marginBottom:16,opacity:.8}}>
          <div style={{padding:'10px 16px',borderBottom:`1px solid ${colors.border}`,fontSize:font.xs,fontWeight:700,color:colors.text4}}>فروع موقوفة ({inactiveBranches.length})</div>
          {inactiveBranches.map((b:any,i:number)=>(
            <div key={b.id} style={{padding:'14px 16px',borderBottom:i<inactiveBranches.length-1?`1px solid ${colors.border}`:'none',display:'flex',alignItems:'center',gap:12}}>
              <div style={{width:36,height:36,borderRadius:10,background:colors.bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0,border:`1px solid ${colors.border}`}}>⏸</div>
              <div style={{flex:1}}>
                <div style={{fontSize:font.sm,fontWeight:700,color:colors.text3}}>{b.name}</div>
                {b.location&&<div style={{fontSize:font.xs,color:colors.text4,marginTop:1}}>📍 {b.location}</div>}
              </div>
              <button onClick={()=>reactivateBranch(b.id)} disabled={reactivatingId===b.id || branches.length>=maxBranches}
                style={{background:colors.primaryLight,color:colors.primary,border:`1px solid ${colors.primaryBorder}`,borderRadius:radius.sm,padding:'6px 12px',fontSize:font.xs,fontWeight:700,cursor:(reactivatingId===b.id||branches.length>=maxBranches)?'not-allowed':'pointer',fontFamily:font.family,opacity:branches.length>=maxBranches?.5:1}}>
                {reactivatingId===b.id?'...':branches.length>=maxBranches?'الباقة ممتلئة':'تفعيل'}
              </button>
            </div>
          ))}
        </div>
      )}

      {branches.length < maxBranches ? (
        <div style={{...card,padding:'18px',background:colors.bg}}>
          <div style={{fontSize:font.sm,fontWeight:700,color:colors.text,marginBottom:14}}>➕ إضافة فرع جديد</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12}}>
            <div><label style={{fontSize:font.xs,fontWeight:700,color:colors.text3,display:'block',marginBottom:6}}>اسم الفرع *</label><input value={newBranch.name} onChange={e=>setNewBranch({...newBranch,name:e.target.value})} style={inp()} placeholder="مثال: فرع الرياض"/></div>
            <div><label style={{fontSize:font.xs,fontWeight:700,color:colors.text3,display:'block',marginBottom:6}}>الموقع (اختياري)</label><input value={newBranch.location} onChange={e=>setNewBranch({...newBranch,location:e.target.value})} style={inp()} placeholder="مثال: حي النزهة"/></div>
          </div>
          <button onClick={addBranch} disabled={branchSaving||!newBranch.name.trim()} style={{...btnPrimary,width:'100%',padding:'12px'}}>
            {branchSaving?'جاري الإضافة...':'+ إضافة فرع'}
          </button>
        </div>
      ) : (
        <div style={{...card,padding:'16px',background:colors.warningLight||'#fffbeb',textAlign:'center',fontSize:font.sm,color:colors.text3}}>
          وصلت للحد الأقصى لباقتك ({maxBranches} فرع) — رقّي باقتك لإضافة المزيد
        </div>
      )}
    </div>
  )
}
