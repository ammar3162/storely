'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { colors, font, card, btnPrimary, inp, pageTitle, pageSub } from '@/lib/ds'
import { toast } from '@/components/toast'
import { confirmDialog } from '@/components/ConfirmDialog'

const PERMS = [
  { key:'inventory', label:'المخزون' },
  { key:'dispense', label:'الصرف' },
  { key:'purchases', label:'المشتريات' },
  { key:'reports', label:'التقارير' },
  { key:'profitability', label:'الربحية' },
  { key:'suppliers', label:'الموردين' },
  { key:'staff', label:'الموظفون' },
]

export default function BranchManagersPage() {
  const [orgId, setOrgId] = useState('')
  const [branches, setBranches] = useState<any[]>([])
  const [managers, setManagers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [branchId, setBranchId] = useState('')
  const [perms, setPerms] = useState<Record<string,boolean>>({})
  const [saving, setSaving] = useState(false)

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
    const{data:bList}=await sb.from('branches').select('id,name').eq('org_id',oid!).eq('is_active',true).order('created_at')
    setBranches(bList||[])
    await loadManagers(oid!)
  }

  async function loadManagers(oid:string) {
    setLoading(true)
    try {
      const res = await fetch(`/api/branch-managers?org_id=${oid}`)
      const j = await res.json()
      if(!res.ok || j.error){
        toast(j.error||'تعذر تحميل قائمة المديرين','error')
        setManagers([])
      } else {
        setManagers(j.managers||[])
      }
    } catch {
      toast('خطأ بالاتصال — حاول تحدّث الصفحة','error')
      setManagers([])
    }
    setLoading(false)
  }

  async function addManager() {
    if(!name.trim()||!email.trim()||!password.trim()||!branchId){ toast('عبّي كل الحقول المطلوبة','warning'); return }
    setSaving(true)
    const res = await fetch('/api/branch-managers',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
      org_id:orgId, full_name:name.trim(), email:email.trim(), password, branch_id:branchId, permissions:perms,
    })})
    const j = await res.json()
    setSaving(false)
    if(j.success){
      toast('✅ تم إضافة مدير الفرع')
      setName(''); setEmail(''); setPassword(''); setBranchId(''); setPerms({})
      loadManagers(orgId)
    } else toast(j.error||'خطأ','error')
  }

  async function togglePerm(managerId:string, key:string, current:any) {
    const updated = { ...(current||{}), [key]: !current?.[key] }
    await fetch('/api/branch-managers',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:managerId,org_id:orgId,permissions:updated})})
    loadManagers(orgId)
  }

  async function deleteManager(id:string) {
    if(!(await confirmDialog({ title: 'حذف مدير الفرع', message: 'حذف حساب مدير الفرع هذا نهائياً؟ لن يقدر يدخل النظام بعدها.' }))) return
    const res = await fetch(`/api/branch-managers?id=${id}&org_id=${orgId}`,{method:'DELETE'})
    const j = await res.json()
    if(j.success){ toast('🗑️ تم الحذف'); loadManagers(orgId) }
    else toast(j.error||'خطأ','error')
  }

  return (
    <div style={{fontFamily:font.family,direction:'rtl',maxWidth:1000,margin:'0 auto'}}>
      <div style={{marginBottom:20}}>
        <h1 style={{...pageTitle}}>مديرو الفروع</h1>
        <p style={{...pageSub}}>أضف حساب مدير لكل فرع، وحدد بالضبط أي الصفحات يقدر يشوفها — يدخل بإيميله وكلمة مروره الخاصة، ويشوف فرعه بس</p>
      </div>

      <div style={{...card,padding:'18px 20px',marginBottom:20}}>
        <div style={{fontSize:font.base,fontWeight:800,color:colors.text,marginBottom:14}}>➕ إضافة مدير فرع جديد</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
          <div>
            <label style={{fontSize:11,fontWeight:700,color:colors.text4,display:'block',marginBottom:4}}>اسم المدير</label>
            <input value={name} onChange={e=>setName(e.target.value)} style={inp()} placeholder="مثال: أحمد محمد"/>
          </div>
          <div>
            <label style={{fontSize:11,fontWeight:700,color:colors.text4,display:'block',marginBottom:4}}>الفرع</label>
            <select value={branchId} onChange={e=>setBranchId(e.target.value)} style={inp()}>
              <option value="">اختر الفرع</option>
              {branches.map((b:any)=>(<option key={b.id} value={b.id}>{b.name}</option>))}
            </select>
          </div>
          <div>
            <label style={{fontSize:11,fontWeight:700,color:colors.text4,display:'block',marginBottom:4}}>الإيميل</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} style={inp()} placeholder="manager@example.com"/>
          </div>
          <div>
            <label style={{fontSize:11,fontWeight:700,color:colors.text4,display:'block',marginBottom:4}}>كلمة المرور</label>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} style={inp()} placeholder="6 أحرف على الأقل"/>
          </div>
        </div>
        <label style={{fontSize:11,fontWeight:700,color:colors.text4,display:'block',marginBottom:8}}>الصفحات المسموح له يشوفها</label>
        <div style={{display:'flex',flexWrap:'wrap' as const,gap:8,marginBottom:14}}>
          {PERMS.map(p=>(
            <label key={p.key} style={{display:'flex',alignItems:'center',gap:6,padding:'7px 12px',background:perms[p.key]?colors.primaryLight:colors.bg,border:`1px solid ${perms[p.key]?colors.primaryBorder:colors.border}`,borderRadius:8,cursor:'pointer',fontSize:12,fontWeight:600,color:perms[p.key]?colors.primary:colors.text2}}>
              <input type="checkbox" checked={!!perms[p.key]} onChange={()=>setPerms(prev=>({...prev,[p.key]:!prev[p.key]}))} style={{width:14,height:14}}/>
              {p.label}
            </label>
          ))}
        </div>
        <button onClick={addManager} disabled={saving} style={{...btnPrimary,padding:'11px 20px'}}>
          {saving?'⏳ جاري الإضافة...':'إضافة مدير الفرع'}
        </button>
      </div>

      <div style={{...card,padding:'18px 20px'}}>
        <div style={{fontSize:font.base,fontWeight:800,color:colors.text,marginBottom:14}}>مديرو الفروع الحاليون ({managers.length})</div>
        {loading ? <div style={{color:colors.text4,fontSize:13}}>جاري التحميل...</div> :
          managers.length===0 ? <div style={{color:colors.text4,fontSize:13,textAlign:'center' as const,padding:20}}>ما فيه مديرو فروع مضافين بعد</div> :
          <div style={{display:'flex',flexDirection:'column' as const,gap:12}}>
            {managers.map((m:any)=>(
              <div key={m.id} style={{padding:'14px',background:colors.bg,borderRadius:10,border:`1px solid ${colors.border}`}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                  <div>
                    <span style={{fontSize:14,fontWeight:700,color:colors.text}}>{m.full_name}</span>
                    <span style={{fontSize:11,color:colors.text4,marginRight:8}}>🏪 {(m.branches as any)?.name||'—'}</span>
                  </div>
                  <button onClick={()=>deleteManager(m.id)} style={{background:'none',border:`1px solid ${colors.dangerBorder}`,color:colors.danger,borderRadius:6,padding:'5px 12px',fontSize:11,fontWeight:700,cursor:'pointer'}}>
                    🗑️ حذف
                  </button>
                </div>
                <div style={{display:'flex',flexWrap:'wrap' as const,gap:6}}>
                  {PERMS.map(p=>(
                    <button key={p.key} onClick={()=>togglePerm(m.id,p.key,m.permissions)}
                      style={{padding:'4px 10px',borderRadius:99,border:`1px solid ${m.permissions?.[p.key]?colors.primaryBorder:colors.border2}`,background:m.permissions?.[p.key]?colors.primaryLight:'white',color:m.permissions?.[p.key]?colors.primary:colors.text4,fontSize:10,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        }
      </div>
    </div>
  )
}
