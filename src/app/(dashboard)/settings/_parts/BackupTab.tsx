'use client'
import { colors, radius, font, card, btnPrimary, btnSecondary } from '@/lib/ds'
import type { SettingsState } from './useSettings'

export default function BackupTab({ m }: { m: SettingsState }) {
  const { lastBackup, backups, backupLoading, backupMsg, activeTab, loadBackups, runBackup } = m
  return (
    <>
          {/* BACKUP TAB */}
          {activeTab==='backup'&&(
            <div>
              {lastBackup&&(
                <div style={{...card,padding:'12px 16px',marginBottom:16,display:'flex',alignItems:'center',gap:10,background:colors.primaryLight,border:`1px solid ${colors.primaryBorder}`}}>
                  <span style={{fontSize:18}}>💾</span>
                  <div>
                    <div style={{fontSize:font.xs,color:colors.primary,fontWeight:700}}>آخر نسخة احتياطية</div>
                    <div style={{fontSize:font.xs,color:colors.primary,opacity:.8,marginTop:1}}>{new Date(lastBackup).toLocaleDateString('ar-SA', {numberingSystem:'latn',weekday:'long',year:'numeric',month:'long',day:'numeric'})}</div>
                  </div>
                </div>
              )}
              {backupMsg&&(
                <div style={{background:backupMsg.ok?colors.primaryLight:colors.dangerLight,border:`1.5px solid ${backupMsg.ok?colors.primaryBorder:colors.dangerBorder}`,borderRadius:radius.md,padding:'10px 14px',marginBottom:14,fontSize:font.sm,fontWeight:600,color:backupMsg.ok?colors.primary:colors.danger,display:'flex',alignItems:'center',gap:8}}>
                  {backupMsg.ok?'✅':'❌'} {backupMsg.text}
                </div>
              )}
              <p style={{fontSize:font.sm,color:colors.text3,marginBottom:18,lineHeight:1.8}}>يتم إنشاء نسخة احتياطية تلقائياً كل أسبوع. يمكنك إنشاء نسخة يدوياً وتحميلها في أي وقت.</p>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12}}>
                <button type="button" onClick={runBackup} disabled={backupLoading}
                  style={{...btnPrimary,padding:'13px',opacity:backupLoading?0.7:1,cursor:backupLoading?'not-allowed':'pointer'}}>
                  {backupLoading?'⏳ جاري الإنشاء...':'💾 نسخة احتياطية الآن'}
                </button>
                <button type="button" onClick={loadBackups} style={{...btnSecondary,padding:'13px',fontSize:font.sm}}>
                  📋 عرض النسخ السابقة
                </button>
              </div>
              {backups.length>0&&(
                <div style={{...card,overflow:'hidden'}}>
                  <div style={{padding:'10px 16px',borderBottom:`1px solid ${colors.border}`,fontSize:font.xs,fontWeight:700,color:colors.text4}}>النسخ الاحتياطية ({backups.length})</div>
                  {backups.map((b,i)=>(
                    <div key={i} style={{padding:'12px 16px',borderBottom:i<backups.length-1?`1px solid ${colors.border}`:'none',display:'flex',justifyContent:'space-between',alignItems:'center',gap:10}}>
                      <div>
                        <div style={{fontSize:font.sm,fontWeight:600,color:colors.text}}>{b.name?.replace('_backup.json','')}</div>
                        <div style={{fontSize:font.xs,color:colors.text4,marginTop:2}}>{Math.round((b.size||0)/1024)} KB</div>
                      </div>
                      {b.url&&(<a href={b.url} download style={{...btnPrimary,padding:'7px 14px',fontSize:font.xs,textDecoration:'none'}}>⬇ تحميل</a>)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
    </>
  )
}
