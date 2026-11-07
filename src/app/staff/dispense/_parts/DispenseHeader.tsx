'use client'
import { Globe, LogOut, ChevronLeft } from 'lucide-react'
import { LANGUAGES, T } from './strings'
import type { StaffDispense, PageVals } from './useStaffDispense'

export default function DispenseHeader({ m, v }: { m: StaffDispense; v: PageVals }) {
  const { lang, setLang, showLangMenu, setShowLangMenu, translating, orgLogo, router, fetchTranslation, logout } = m
  const { session, isRTL } = v
  return (
    <>
      {/* Header */}
      <div style={{background:'#ffffff',position:'sticky',top:0,zIndex:100,borderBottom:'1px solid #E6E8EC',boxShadow:'0 1px 2px rgba(16,24,40,.04)'}}>
        <div style={{maxWidth:560,margin:'0 auto',padding:'14px 16px',display:'flex',alignItems:'center',gap:10}}>
          <button onClick={()=>router.push('/staff/choose')} aria-label={T('back',lang)}
            style={{height:38,padding:'0 12px 0 10px',flexShrink:0,background:'#F6F7F9',border:'1px solid #E6E8EC',borderRadius:12,color:'#101828',display:'flex',alignItems:'center',gap:4,cursor:'pointer',fontFamily:'inherit',fontSize:13,fontWeight:700}}>
            <ChevronLeft size={18} strokeWidth={2.25} style={{transform:isRTL?'scaleX(-1)':'none'}}/>{T('back',lang)}
          </button>
          <div style={{flex:1,minWidth:0,display:'flex',alignItems:'center',gap:10}}>
            {orgLogo && <img src={orgLogo} alt="" style={{width:36,height:36,borderRadius:10,objectFit:'cover',background:'white',border:'1px solid #E6E8EC',flexShrink:0}}/>}
            <div style={{minWidth:0}}>
              <div style={{fontSize:15,fontWeight:800,color:'#101828',whiteSpace:'nowrap' as const,overflow:'hidden',textOverflow:'ellipsis'}}>{session.name}</div>
              <div style={{fontSize:12,color:'#475569',marginTop:1,whiteSpace:'nowrap' as const,overflow:'hidden',textOverflow:'ellipsis'}}>{session.org_name}{session.branch_name?` · ${session.branch_name}`:''}</div>
            </div>
          </div>
          <div style={{position:'relative' as const,flexShrink:0}}>
            <button onClick={()=>setShowLangMenu(v=>!v)} disabled={translating}
              style={{height:38,padding:'0 11px',background:'#F6F7F9',border:'1px solid #E6E8EC',borderRadius:12,color:'#101828',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',gap:6,opacity:translating?0.6:1}}>
              <Globe size={15} strokeWidth={2.25}/>{LANGUAGES.find(l=>l.code===lang)?.label || 'العربية'}
            </button>
            {showLangMenu && (
              <div style={{position:'absolute' as const,top:'100%',insetInlineEnd:0,marginTop:6,background:'white',borderRadius:12,border:'1px solid #e8ecf1',boxShadow:'0 12px 28px rgba(15,23,42,.16)',overflow:'hidden',minWidth:150,zIndex:50}}>
                {LANGUAGES.map(l=>(
                  <button key={l.code}
                    onClick={()=>{setLang(l.code as any);if(l.code!=='ar'&&session)fetchTranslation(session,l.code);setShowLangMenu(false)}}
                    style={{width:'100%',padding:'11px 14px',border:'none',borderBottom:'1px solid #f1f5f9',background:lang===l.code?'#f0fdfa':'white',color:lang===l.code?'#0f766e':'#1e293b',fontSize:13,fontWeight:lang===l.code?700:500,cursor:'pointer',fontFamily:'inherit',textAlign:'start' as const,display:'block'}}>
                    {l.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={logout} aria-label={T('logout',lang)}
            style={{width:38,height:38,flexShrink:0,background:'#F6F7F9',border:'1px solid #E6E8EC',borderRadius:12,color:'#101828',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>
            <LogOut size={16} strokeWidth={2.25}/>
          </button>
        </div>
      </div>
    </>
  )
}
