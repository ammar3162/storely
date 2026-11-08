'use client'
import { FeatureIcon } from '@/components/ui/feature-icon'
import { colors, radius, font, btnSecondary, inp } from '@/lib/ds'
import type { SettingsState } from './useSettings'

export default function DeleteAccountModal({ m }: { m: SettingsState }) {
  const { showDelete, setShowDelete, deleteConfirm, setDeleteConfirm, deleting, deleteMsg, setDeleteMsg, form, deleteAccount } = m
  return (
    <>
    {showDelete&&(
      <div style={{position:'fixed',inset:0,zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
        <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,.6)',backdropFilter:'blur(6px)'}} onClick={()=>{setShowDelete(false);setDeleteConfirm('');setDeleteMsg(null)}}/>
        <div style={{background:colors.surface,borderRadius:radius.xl,padding:28,width:'100%',maxWidth:420,position:'relative',boxShadow:'0 20px 60px rgba(0,0,0,.3)',fontFamily:font.family,direction:'rtl'}}>
          <div style={{textAlign:'center',marginBottom:20}}>
            <div style={{display:'flex',justifyContent:'center',marginBottom:10,color:'var(--storely-muted)'}}><FeatureIcon name="⚠️" size={40} /></div>
            <div style={{fontSize:font.lg,fontWeight:900,color:colors.text,marginBottom:8}}>تأكيد حذف الحساب</div>
            <p style={{fontSize:font.sm,color:colors.text3,lineHeight:1.7}}>بعد التأكيد، تحصل على <b style={{color:colors.text}}>15 يوم فترة سماح</b> — إذا سجّلت الدخول خلالها، يُلغى الحذف تلقائياً. بعد انتهاء المهلة، <b style={{color:colors.danger}}>تُحذف جميع البيانات نهائياً دون إمكانية الاسترجاع</b>.</p>
          </div>
          {deleteMsg&&<div style={{background:colors.dangerLight,border:`1px solid ${colors.dangerBorder}`,borderRadius:radius.md,padding:'10px 14px',marginBottom:14,fontSize:font.sm,color:colors.danger,fontWeight:600}}>{deleteMsg.text}</div>}
          <div style={{marginBottom:18}}>
            <label style={{fontSize:font.xs,fontWeight:700,color:colors.text3,display:'block',marginBottom:6}}>اكتب اسم المنشأة للتأكيد: <b style={{color:colors.danger}}>{form.name}</b></label>
            <input value={deleteConfirm} onChange={e=>setDeleteConfirm(e.target.value)} style={{...inp(),borderColor:colors.dangerBorder}} placeholder={form.name}/>
          </div>
          <div style={{display:'flex',gap:10}}>
            <button onClick={()=>{setShowDelete(false);setDeleteConfirm('');setDeleteMsg(null)}} style={{...btnSecondary,flex:1,padding:'12px',fontSize:font.sm}}>إلغاء</button>
            <button onClick={deleteAccount} disabled={deleting||deleteConfirm!==form.name}
              style={{flex:2,padding:'12px',background:deleteConfirm===form.name?colors.danger:'#94a3b8',color:'white',border:'none',borderRadius:radius.md,fontSize:font.sm,fontWeight:700,cursor:deleteConfirm===form.name?'pointer':'not-allowed',fontFamily:font.family}}>
              {deleting?'⏳ جاري الجدولة...':'جدولة الحذف (15 يوم)'}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}
