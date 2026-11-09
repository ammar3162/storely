'use client'
import { FeatureIcon } from '@/components/ui/feature-icon'
import { C, TOOLS, planAllows } from './config'
import { Lock } from 'lucide-react'
import type { AiToolsPage } from './useAiTools'

export default function ToolsList({ m }: { m: AiToolsPage }) {
  const { plan, hasAiAddon, router, aiKnown } = m
  return (
    <>
      {/* Tools */}
      <div style={{display:'flex',flexDirection:'column',gap:12}}>
        {TOOLS.map((tool,i)=>(
          <div key={i} className="fu" style={{animationDelay:`${i*.08}s`}}>
            <button onClick={()=>planAllows(plan,tool.minPlan,!!hasAiAddon)?(tool.href.startsWith('#')?document.getElementById(tool.href.slice(1))?.scrollIntoView({behavior:'smooth',block:'start'}):router.push(tool.href)):router.push('/settings')}
              style={{width:'100%',background:'white',border:`1px solid ${tool.border}`,borderRadius:14,padding:'20px',cursor:'pointer',fontFamily:'inherit',textAlign:'right',transition:'all .2s',boxShadow:`0 2px 8px ${tool.color}10`,opacity:planAllows(plan,tool.minPlan,!!hasAiAddon)?1:.6,position:'relative'}}
              onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.transform='translateY(-2px)';(e.currentTarget as HTMLElement).style.boxShadow=`0 8px 24px ${tool.color}20`}}
              onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.transform='none';(e.currentTarget as HTMLElement).style.boxShadow=`0 2px 8px ${tool.color}10`}}>
              {aiKnown && !planAllows(plan,tool.minPlan,!!hasAiAddon) && (
                <div style={{position:'absolute',top:12,left:12,background:'#1c1c1a',color:'white',fontSize:10,fontWeight:700,padding:'4px 10px',borderRadius:99,display:'flex',alignItems:'center',gap:4,zIndex:1}}>
                  <Lock size={11} strokeWidth={2.5}/> أدوات الذكاء
                </div>
              )}
              <div style={{display:'flex',alignItems:'flex-start',gap:14}}>
                <div style={{width:52,height:52,borderRadius:14,background:tool.bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,flexShrink:0,border:`1px solid ${tool.border}`}}>
                  <FeatureIcon name={tool.icon} size={22} />
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:16,fontWeight:800,color:C.text,marginBottom:6}}>{tool.title}</div>
                  <div style={{fontSize:13,color:C.text3,lineHeight:1.6,marginBottom:12}}>{tool.desc}</div>
                  <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                    {tool.features.map((f,j)=>(
                      <span key={j} style={{background:tool.bg,color:tool.color,fontSize:10,fontWeight:700,padding:'3px 10px',borderRadius:99,border:`1px solid ${tool.border}`}}>
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
                <svg width="16" height="16" fill="none" stroke={tool.color} strokeWidth="2.5" strokeLinecap="round" viewBox="0 0 24 24" style={{flexShrink:0,marginTop:4}}>
                  <path d="M15 19l-7-7 7-7"/>
                </svg>
              </div>
            </button>
          </div>
        ))}
      </div>
    </>
  )
}
