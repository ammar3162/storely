'use client'
import { colors, radius, btnPrimary, inp } from '@/lib/ds'
import { Plus, Camera } from 'lucide-react'
import { ListSkeleton } from '@/components/PageSkeleton'
import type { HrPage } from './useHrManagement'
import { fileLink } from '@/lib/invoiceUrl'

export default function TasksTab({ m, s }: { m: HrPage; s: any }) {
  const { tasks, loadingTasks, newTaskTitle, setNewTaskTitle, newTaskDesc, setNewTaskDesc, newTaskPhoto, setNewTaskPhoto, savingTask, hrTab, TASK_STATUS_LABEL, createTask, reviewTask, toggleDaily } = m
  return (
    <>
                    {/* المهام */}
                    {hrTab==='tasks' && <div>
                      <div style={{background:colors.bg,borderRadius:radius.md,padding:10,marginBottom:12,display:'grid',gap:8}}>
                        <div style={{display:'flex',flexWrap:'wrap' as const,gap:8}}>
                          <input value={newTaskTitle} onChange={e=>setNewTaskTitle(e.target.value)} placeholder="المهمة — مثال: تنظيف الثلاجة" style={{...inp(),fontSize:13,flex:'2 1 200px'}}/>
                          <input value={newTaskDesc} onChange={e=>setNewTaskDesc(e.target.value)} placeholder="تفاصيل (اختياري)" style={{...inp(),fontSize:13,flex:'2 1 200px'}}/>
                          <button onClick={()=>createTask(s.id)} disabled={savingTask||!newTaskTitle.trim()} style={{...btnPrimary,padding:'10px 18px',flex:'1 0 auto',justifyContent:'center',fontSize:13,opacity:(savingTask||!newTaskTitle.trim())?0.5:1,display:'flex',alignItems:'center',gap:6,whiteSpace:'nowrap' as const}}><Plus size={14} strokeWidth={2.25}/> أضف مهمة</button>
                        </div>
                        <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer'}}>
                          <input type="checkbox" checked={newTaskPhoto} onChange={e=>setNewTaskPhoto(e.target.checked)} style={{accentColor:colors.primary,width:14,height:14}}/>
                          <span style={{fontSize:12,color:colors.text2,display:'flex',alignItems:'center',gap:5}}><Camera size={13} strokeWidth={2.25}/> يرفق صورة إثبات عند إنجازها</span>
                        </label>
                      </div>
                      {loadingTasks ? (
                        <ListSkeleton/>
                      ) : tasks.length===0 ? (
                        <div style={{fontSize:12,color:colors.text4,textAlign:'center' as const,padding:12}}>لا توجد مهام بعد</div>
                      ) : (
                        <div style={{display:'flex',flexDirection:'column' as const,gap:8}}>
                          {tasks.map((t:any)=>{
                            const st = TASK_STATUS_LABEL[t.status] || TASK_STATUS_LABEL.pending
                            return (
                              <div key={t.id} style={{background:t.is_daily?colors.primaryLight:st.bg,border:`1px solid ${t.is_daily?colors.primaryBorder:colors.border2}`,borderRadius:radius.md,padding:'12px 14px'}}>
                                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:4}}>
                                  <span style={{fontSize:13,fontWeight:700,color:colors.text,display:'flex',alignItems:'center',gap:6}}>
                                    {t.title}
                                    {t.is_daily && <span style={{fontSize:9,fontWeight:800,color:colors.primary,background:'white',padding:'2px 6px',borderRadius:99}}>🔁 يومية</span>}
                                  </span>
                                  {!t.template_id && !t.is_daily && <span style={{fontSize:10,fontWeight:700,color:st.color}}>{st.label}</span>}
                                </div>
                                {t.description && <div style={{fontSize:12,color:colors.text3,marginBottom:8}}>{t.description}</div>}
                                {t.photo_url && (
                                  <a href={fileLink(t.photo_url)} target="_blank" rel="noreferrer" style={{fontSize:11,color:colors.info,textDecoration:'underline',display:'inline-block',marginBottom:8}}>عرض صورة الإثبات</a>
                                )}
                                {t.status==='completed' && (
                                  <div style={{display:'flex',gap:8,marginTop:6,marginBottom:6}}>
                                    <button onClick={()=>reviewTask(s.id,t.id,'confirmed')} style={{flex:1,padding:'7px',background:colors.primary,color:'white',border:'none',borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>تأكيد الإتمام</button>
                                    <button onClick={()=>reviewTask(s.id,t.id,'rejected')} style={{flex:1,padding:'7px',background:colors.dangerLight,color:colors.danger,border:`1px solid ${colors.dangerBorder}`,borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>رفض</button>
                                  </div>
                                )}
                                {!t.template_id && (
                                  <button onClick={()=>toggleDaily(s.id,t.id)} style={{width:'100%',padding:'6px',marginTop:4,background:'transparent',border:`1px dashed ${t.is_daily?colors.primary:colors.border2}`,borderRadius:8,fontSize:11,fontWeight:700,color:t.is_daily?colors.primary:colors.text4,cursor:'pointer',fontFamily:'inherit'}}>
                                    {t.is_daily ? 'إيقاف التكرار اليومي' : 'اجعلها مهمة يومية 🔁'}
                                  </button>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>}
    </>
  )
}
