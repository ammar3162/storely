'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface StaffSession {
  id: string; name: string; org_id: string; branch_id: string | null
  org_name: string; branch_name: string
}

const STATUS_LABEL: Record<string, {label:string; color:string; bg:string}> = {
  pending:   { label: 'بانتظارك',     color: '#d97706', bg: '#fffbeb' },
  completed: { label: 'بانتظار تأكيد المدير', color: '#2563eb', bg: '#eff6ff' },
  confirmed: { label: 'مؤكدة ✓',      color: '#16a34a', bg: '#f0fdf4' },
  rejected:  { label: 'مرفوضة',       color: '#dc2626', bg: '#fef2f2' },
}

export default function StaffTasksPage() {
  const router = useRouter()
  const [session, setSession] = useState<StaffSession|null>(null)
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [completingId, setCompletingId] = useState<string|null>(null)
  const [uploadingId, setUploadingId] = useState<string|null>(null)

  useEffect(()=>{
    const saved = localStorage.getItem('staff_session')
    if(!saved){ router.push('/staff'); return }
    const s = JSON.parse(saved) as StaffSession
    setSession(s)
    loadTasks()
  },[])

  async function loadTasks() {
    setLoading(true)
    try {
      const token = localStorage.getItem('staff_token')
      const res = await fetch('/api/staff-tasks', { headers: { 'Authorization': `Bearer ${token}` } })
      const j = await res.json()
      setTasks(j.success ? (j.tasks||[]) : [])
    } catch { setTasks([]) }
    setLoading(false)
  }

  async function completeTask(taskId: string, requiresPhoto: boolean) {
    if (requiresPhoto) {
      document.getElementById(`photo-input-${taskId}`)?.click()
      return
    }
    setCompletingId(taskId)
    const token = localStorage.getItem('staff_token')
    const res = await fetch('/api/staff-tasks', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ task_id: taskId }),
    })
    const j = await res.json()
    setCompletingId(null)
    if (!j.success) { alert(j.error || 'حدث خطأ'); return }
    loadTasks()
  }

  async function handlePhotoSelected(taskId: string, file: File) {
    setUploadingId(taskId)
    try {
      const token = localStorage.getItem('staff_token')
      const fd = new FormData()
      fd.append('file', file)
      const upRes = await fetch('/api/staff-upload-task-photo', { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: fd })
      const upJ = await upRes.json()
      if (!upJ.success) { alert(upJ.error || 'فشل رفع الصورة'); setUploadingId(null); return }

      const res = await fetch('/api/staff-tasks', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ task_id: taskId, photo_url: upJ.url }),
      })
      const j = await res.json()
      setUploadingId(null)
      if (!j.success) { alert(j.error || 'حدث خطأ'); return }
      loadTasks()
    } catch {
      setUploadingId(null)
      alert('حدث خطأ')
    }
  }

  const pendingTasks = tasks.filter((t:any)=>t.status==='pending')
  const otherTasks = tasks.filter((t:any)=>t.status!=='pending')

  if (!session) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#f5f5f4',fontFamily:"'IBM Plex Sans Arabic',system-ui"}}>
      <div style={{width:32,height:32,border:'3px solid #e5e5e2',borderTopColor:'#16a34a',borderRadius:'50%',animation:'spin .7s linear infinite'}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{minHeight:'100vh',background:'#f7f7f5',fontFamily:"'IBM Plex Sans Arabic',system-ui",direction:'rtl',paddingBottom:40}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      <div style={{background:'white',borderBottom:'1px solid #ece8e2',padding:'16px 20px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div>
          <div style={{fontSize:16,fontWeight:800,color:'#1c1c1a'}}>مهامي</div>
          <div style={{fontSize:12,color:'#888780',marginTop:2}}>{session.name}</div>
        </div>
        <button onClick={()=>router.back()} style={{background:'#f5f5f4',border:'none',borderRadius:8,padding:'8px 14px',fontSize:12,fontWeight:700,color:'#5f5e5a',cursor:'pointer',fontFamily:'inherit'}}>رجوع</button>
      </div>

      <div style={{maxWidth:520,margin:'0 auto',padding:'20px 16px'}}>
        {loading ? (
          <div style={{textAlign:'center' as const,padding:40,fontSize:13,color:'#888780'}}>جاري التحميل...</div>
        ) : tasks.length===0 ? (
          <div style={{textAlign:'center' as const,padding:'60px 20px'}}>
            <div style={{fontSize:44,marginBottom:12,opacity:0.5}}>📋</div>
            <div style={{fontSize:14,color:'#888780'}}>ما فيه مهام لك حالياً</div>
          </div>
        ) : (
          <>
            {pendingTasks.length>0 && (
              <div style={{marginBottom:24}}>
                <div style={{fontSize:12,fontWeight:700,color:'#d97706',marginBottom:10}}>مهام بانتظارك ({pendingTasks.length})</div>
                <div style={{display:'flex',flexDirection:'column' as const,gap:10}}>
                  {pendingTasks.map((t:any)=>(
                    <div key={t.id} style={{background:'white',border:'1.5px solid #fde68a',borderRadius:14,padding:'16px'}}>
                      <div style={{fontSize:15,fontWeight:800,color:'#1c1c1a',marginBottom:6}}>{t.title}</div>
                      {t.description && <div style={{fontSize:13,color:'#6b7280',marginBottom:12,lineHeight:1.6}}>{t.description}</div>}
                      <input id={`photo-input-${t.id}`} type="file" accept="image/*" capture="environment" style={{display:'none'}}
                        onChange={e=>{ const f=e.target.files?.[0]; if(f) handlePhotoSelected(t.id, f) }}/>
                      <button onClick={()=>completeTask(t.id, t.requires_photo)} disabled={completingId===t.id||uploadingId===t.id}
                        style={{width:'100%',padding:'12px',background:'#16a34a',color:'white',border:'none',borderRadius:10,fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'inherit',opacity:(completingId===t.id||uploadingId===t.id)?0.6:1}}>
                        {uploadingId===t.id ? 'جاري رفع الصورة...' : completingId===t.id ? 'جاري التأكيد...' : t.requires_photo ? '📷 التقط صورة وأكمل المهمة' : '✓ تم إنجاز المهمة'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {otherTasks.length>0 && (
              <div>
                <div style={{fontSize:12,fontWeight:700,color:'#888780',marginBottom:10}}>مهام سابقة</div>
                <div style={{display:'flex',flexDirection:'column' as const,gap:8}}>
                  {otherTasks.map((t:any)=>{
                    const st = STATUS_LABEL[t.status] || STATUS_LABEL.pending
                    return (
                      <div key={t.id} style={{background:st.bg,border:'1px solid #ece8e2',borderRadius:12,padding:'12px 14px'}}>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                          <span style={{fontSize:13,fontWeight:700,color:'#1c1c1a'}}>{t.title}</span>
                          <span style={{fontSize:10,fontWeight:700,color:st.color}}>{st.label}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
