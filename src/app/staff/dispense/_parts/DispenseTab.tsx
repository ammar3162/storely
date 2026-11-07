'use client'
import { Search, ChevronLeft, CheckCircle2, Zap } from 'lucide-react'
import { colorFor, iconFor } from './categories'
import { T } from './strings'
import type { StaffDispense, PageVals } from './useStaffDispense'

export default function DispenseTab({ m, v }: { m: StaffDispense; v: PageVals }) {
  const { lang, tab, loading, search, setSearch, activeCategory, setActiveCategory, mostUsed, todayCount, setSelected, categoriesMap, categories, searchResults, categoryProducts, tx } = m
  const { session, isRTL } = v
  return (
    <>
      {/* ═══ DISPENSE TAB ═══ */}
      <div style={{display:tab==='dispense'&&session.permissions?.dispense?'block':'none',padding:'14px 16px 28px',maxWidth:560,margin:'0 auto'}}>
        <div style={{position:'relative' as const,marginBottom:14}}>
          <Search size={18} strokeWidth={2} style={{position:'absolute',top:'50%',transform:'translateY(-50%)',insetInlineStart:14,color:'#475569',pointerEvents:'none'}}/>
          <input value={search} onChange={e=>{setSearch(e.target.value);setActiveCategory(null)}}
            style={{width:'100%',height:48,paddingInlineStart:42,paddingInlineEnd:14,border:'1px solid #e2e8f0',borderRadius:14,fontSize:15,background:'white',color:'#1e293b',fontFamily:'inherit',fontWeight:500,boxSizing:'border-box' as const}}
            placeholder={T('search',lang)}/>
        </div>

        {loading ? (
          <div style={{textAlign:'center',padding:60,color:'#475569',fontSize:15}}>{T('loading',lang)}</div>
        ) : search.trim() ? (
          <div style={{display:'flex',flexDirection:'column',gap:8,animation:'fadeIn .3s'}}>
            {searchResults.length===0 ? (
              <div className="card" style={{padding:32,textAlign:'center',color:'#475569'}}>{T('noResults',lang)}</div>
            ) : searchResults.map(p=>(
              <button key={p.id} className="prod-btn" onClick={()=>setSelected(p)}>
                <div>
                  <div style={{fontSize:15,fontWeight:700,color:'#0f172a'}}>{tx(p.name)}</div>
                  {lang!=='ar'&&<div style={{fontSize:11,color:'#475569',marginTop:2}}>{p.name}</div>}
                </div>
                <span style={{fontSize:13,fontWeight:800,color:p.qty<=p.reorder_point?'#ef4444':'#0f766e',background:p.qty<=p.reorder_point?'#fef2f2':'#f0fdfa',padding:'5px 12px',borderRadius:10}}>{p.qty} {p.unit}</span>
              </button>
            ))}
          </div>
        ) : !activeCategory ? (
          <div style={{animation:'fadeIn .3s'}}>
            {todayCount>0 && (
              <div style={{display:'inline-flex',alignItems:'center',gap:7,background:'#ecfdf5',color:'#047857',borderRadius:99,padding:'7px 13px',marginBottom:16,fontSize:12.5,fontWeight:700}}>
                <CheckCircle2 size={15} strokeWidth={2.25}/> {T('todayCount',lang,{n:todayCount})}
              </div>
            )}
            {mostUsed.length>0 && (
              <div style={{marginBottom:16}}>
                <div style={{display:'flex',alignItems:'center',gap:6,fontSize:12,fontWeight:700,color:'#475569',margin:'0 2px 10px'}}><Zap size={14} strokeWidth={2.25} color="#f59e0b"/> {T('mostUsed',lang)} <span style={{fontWeight:500,color:'#475569'}}>· {T('last14',lang)}</span></div>
                <div style={{display:'flex',gap:8,overflowX:'auto',paddingBottom:4,scrollbarWidth:'none' as const}}>
                  {mostUsed.map((p:any,i:number)=>(
                    <button key={p.id} className="mu-btn" onClick={()=>setSelected(p)} style={{animationDelay:`${i*0.06}s`,flexShrink:0,background:'white',border:'1px solid #e8ecf1',borderRadius:14,padding:'11px 14px',cursor:'pointer',fontFamily:'inherit',minWidth:118,maxWidth:160,textAlign:'start' as const,boxShadow:'0 1px 2px rgba(16,24,40,.04)'}}>
                      <div style={{fontSize:13.5,fontWeight:700,color:'#0f172a',whiteSpace:'nowrap' as const,overflow:'hidden',textOverflow:'ellipsis'}}>{tx(p.name)}</div>
                      <div style={{fontSize:11,color:'#475569',marginTop:3,whiteSpace:'nowrap' as const}}>{lang==='ar'?`صُرف ${p.dispense_count} ${p.dispense_count>=3&&p.dispense_count<=10?'مرات':'مرة'}`:T('timesUsed',lang,{n:p.dispense_count})}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div style={{fontSize:12,fontWeight:700,color:'#475569',margin:'0 2px 10px'}}>{T('categories',lang)}</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              {categories.map((cat,i)=>(
                <button key={cat} className="cat-card" onClick={()=>setActiveCategory(cat)}
                  style={{animationDelay:`${i*0.05}s`,gridColumn:categories.length%2===1&&i===categories.length-1?'1 / -1':undefined,background:'white',border:'1px solid #e8ecf1',borderRadius:16,padding:'16px 14px',cursor:'pointer',fontFamily:'inherit',display:'flex',flexDirection:'column',alignItems:'flex-start',gap:12,boxShadow:'0 1px 2px rgba(16,24,40,.04)',minHeight:112,textAlign:'start' as const}}>
                  <span style={{width:42,height:42,borderRadius:12,background:`${colorFor(cat)}14`,color:colorFor(cat),display:'flex',alignItems:'center',justifyContent:'center'}}>{iconFor(cat)}</span>
                  <span style={{display:'flex',alignItems:'flex-end',justifyContent:'space-between',width:'100%',gap:6}}>
                    <span style={{minWidth:0}}>
                      <span style={{display:'block',fontSize:15,fontWeight:800,color:'#0f172a'}}>{tx(cat)}</span>
                      {lang!=='ar'&&<span style={{display:'block',fontSize:11,color:'#475569'}}>{cat}</span>}
                      <span style={{display:'block',fontSize:12,color:'#475569',marginTop:2}}>{categoriesMap[cat]} {T('items',lang)}</span>
                    </span>
                    <ChevronLeft size={18} strokeWidth={2} color="#cbd5e1" style={{flexShrink:0,transform:isRTL?'none':'scaleX(-1)'}}/>
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div style={{animation:'fadeIn .3s'}}>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14}}>
              <button onClick={()=>setActiveCategory(null)} aria-label={T('back',lang)} style={{width:38,height:38,flexShrink:0,background:'white',border:'1px solid #e2e8f0',borderRadius:12,color:'#334155',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <ChevronLeft size={18} strokeWidth={2.25} style={{transform:isRTL?'scaleX(-1)':'none'}}/>
              </button>
              <span style={{width:38,height:38,borderRadius:11,background:`${colorFor(activeCategory)}14`,color:colorFor(activeCategory),display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{iconFor(activeCategory,18)}</span>
              <div style={{minWidth:0}}>
                <div style={{fontSize:17,fontWeight:800,color:'#0f172a'}}>{tx(activeCategory)}</div>
                <div style={{fontSize:12,color:'#475569'}}>{lang!=='ar'?`${activeCategory} · `:''}{categoryProducts.length} {T('items',lang)}</div>
              </div>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {categoryProducts.map(p=>(
                <button key={p.id} className="prod-btn" onClick={()=>setSelected(p)}>
                  <div>
                    <div style={{fontSize:15,fontWeight:700,color:'#0f172a'}}>{tx(p.name)}</div>
                    {lang!=='ar'&&<div style={{fontSize:11,color:'#475569',marginTop:2}}>{p.name}</div>}
                  </div>
                  <span style={{fontSize:13,fontWeight:800,color:p.qty<=p.reorder_point?'#ef4444':'#0f766e',background:p.qty<=p.reorder_point?'#fef2f2':'#f0fdfa',padding:'5px 12px',borderRadius:10}}>{p.qty} {p.unit}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
