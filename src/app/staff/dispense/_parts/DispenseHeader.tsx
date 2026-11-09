'use client'
import { Globe, LogOut, ChevronRight } from 'lucide-react'
import { LANGUAGES, T } from './strings'
import type { StaffDispense, PageVals } from './useStaffDispense'

export default function DispenseHeader({ m, v }: { m: StaffDispense; v: PageVals }) {
  const { lang, setLang, showLangMenu, setShowLangMenu, translating, router, fetchTranslation, logout, tab } = m
  const { session, isRTL, tabs } = v
  return (
    <>
      {/* Header */}
      <div style={{background:'#ffffff',position:'sticky',top:0,zIndex:100,borderBottom:'1px solid var(--storely-border)'}}>
        <div style={{maxWidth:560,margin:'0 auto',padding:'12px 16px',display:'flex',alignItems:'center',gap:8}}>
          <button onClick={()=>router.push('/staff/choose')} aria-label={T('back',lang)}
            style={{height:36,minWidth:36,padding:'0 4px',flexShrink:0,background:'transparent',border:'none',borderRadius:10,color:'var(--storely-text)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>
            <ChevronRight size={20} strokeWidth={1.75} style={{transform:isRTL?'none':'scaleX(-1)'}}/>
          </button>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:17,fontWeight:600,lineHeight:'24px',color:'var(--storely-text)',whiteSpace:'nowrap' as const,overflow:'hidden',textOverflow:'ellipsis'}}>{tabs.find(t=>t.key===tab)?.label || session.name}</div>
            <div style={{fontSize:13,lineHeight:'20px',color:'#4b5565',whiteSpace:'nowrap' as const,overflow:'hidden',textOverflow:'ellipsis'}}>{session.branch_name || session.org_name}</div>
          </div>
          <div style={{position:'relative' as const,flexShrink:0}}>
            <button onClick={()=>setShowLangMenu(v=>!v)} disabled={translating}
              style={{height:36,padding:'0 10px',background:'#eceef1',border:'none',borderRadius:10,color:'var(--storely-text)',fontSize:13,fontWeight:500,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',gap:4,opacity:translating?0.6:1}}>
              <Globe size={16} strokeWidth={1.75}/>{LANGUAGES.find(l=>l.code===lang)?.label || 'العربية'}
            </button>
            {showLangMenu && (
              <div style={{position:'absolute' as const,top:'100%',insetInlineEnd:0,marginTop:6,background:'white',borderRadius:12,border:'1px solid var(--storely-border)',boxShadow:'0 12px 28px rgba(15,23,42,.16)',overflow:'hidden',minWidth:150,zIndex:50}}>
                {LANGUAGES.map(l=>(
                  <button key={l.code}
                    onClick={()=>{setLang(l.code as any);if(l.code!=='ar'&&session)fetchTranslation(session,l.code);setShowLangMenu(false)}}
                    style={{width:'100%',padding:'11px 14px',border:'none',borderBottom:'1px solid #eceef1',background:lang===l.code?'#e7f3f1':'white',color:lang===l.code?'#203640':'#111827',fontSize:13,fontWeight:lang===l.code?600:400,cursor:'pointer',fontFamily:'inherit',textAlign:'start' as const,display:'block'}}>
                    {l.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={logout} aria-label={T('logout',lang)}
            style={{width:36,height:36,flexShrink:0,background:'#eceef1',border:'none',borderRadius:10,color:'var(--storely-text)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>
            <LogOut size={16} strokeWidth={1.75}/>
          </button>
        </div>
      </div>
    </>
  )
}
