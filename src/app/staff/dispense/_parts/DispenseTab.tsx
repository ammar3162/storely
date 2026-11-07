'use client'
import { Search, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react'
import { iconFor } from './categories'
import { T } from './strings'
import type { StaffDispense, PageVals } from './useStaffDispense'

// تصميم «كاونتر»: كل شي قوائم بيضاء بخطوط فاصلة، والأيقونات رمادية، والكمية رقم واضح على الطرف
const label: React.CSSProperties = { fontSize:13, fontWeight:500, color:'#4b5565', margin:'0 4px 8px' }
const iconBox: React.CSSProperties = { width:36, height:36, borderRadius:10, background:'#eceef1', color:'#4b5565', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }

export default function DispenseTab({ m, v }: { m: StaffDispense; v: PageVals }) {
  const { lang, tab, loading, search, setSearch, activeCategory, setActiveCategory, mostUsed, todayCount, setSelected, categoriesMap, categories, searchResults, categoryProducts, tx } = m
  const { session, isRTL } = v
  const Chev = () => <ChevronLeft size={16} strokeWidth={1.75} color="#6b7487" style={{flexShrink:0,transform:isRTL?'none':'scaleX(-1)'}}/>
  const Qty = ({ p }: { p: any }) => {
    const low = Number(p.qty) <= Number(p.reorder_point)
    return (
      <span style={{textAlign:'end' as const,flexShrink:0}}>
        <span style={{fontSize:16,fontWeight:500,color:low?'#dc2626':'#111827',fontVariantNumeric:'tabular-nums'}}>{p.qty}</span>
        <span style={{fontSize:12,color:'#6b7487',marginInlineStart:4}}>{p.unit}</span>
      </span>
    )
  }
  const productRows = (list: any[]) => (
    <div className="card" style={{overflow:'hidden'}}>
      {list.map(p=>(
        <button key={p.id} className="list-row" onClick={()=>setSelected(p)}>
          <span style={{flex:1,minWidth:0}}>
            <span style={{display:'block',fontSize:15,fontWeight:500,color:'#111827',lineHeight:'22px'}}>{tx(p.name)}</span>
            {lang!=='ar'&&<span style={{display:'block',fontSize:13,color:'#6b7487'}}>{p.name}</span>}
          </span>
          <Qty p={p}/>
        </button>
      ))}
    </div>
  )
  return (
    <>
      {/* ═══ DISPENSE TAB ═══ */}
      <div style={{display:tab==='dispense'&&session.permissions?.dispense?'block':'none',padding:'16px 16px 32px',maxWidth:560,margin:'0 auto'}}>
        <div style={{position:'relative' as const,marginBottom:16}}>
          <Search size={16} strokeWidth={1.75} style={{position:'absolute',top:'50%',transform:'translateY(-50%)',insetInlineStart:12,color:'#6b7487',pointerEvents:'none'}}/>
          <input value={search} onChange={e=>{setSearch(e.target.value);setActiveCategory(null)}}
            style={{width:'100%',height:44,paddingInlineStart:36,paddingInlineEnd:12,border:'1px solid #e5e7eb',borderRadius:10,fontSize:16,background:'white',color:'#111827',fontFamily:'inherit',boxSizing:'border-box' as const}}
            placeholder={T('search',lang)}/>
        </div>

        {loading ? (
          <div style={{textAlign:'center',padding:60,color:'#4b5565',fontSize:15}}>{T('loading',lang)}</div>
        ) : search.trim() ? (
          searchResults.length===0
            ? <div className="card" style={{padding:32,textAlign:'center',color:'#4b5565',fontSize:14}}>{T('noResults',lang)}</div>
            : productRows(searchResults)
        ) : !activeCategory ? (
          <div>
            {todayCount>0 && (
              <div style={{display:'flex',alignItems:'center',gap:6,color:'#15803d',margin:'0 4px 16px',fontSize:13,fontWeight:500}}>
                <CheckCircle2 size={16} strokeWidth={1.75}/> {T('todayCount',lang,{n:todayCount})}
              </div>
            )}
            {mostUsed.length>0 && (
              <div style={{marginBottom:24}}>
                <div style={label}>{T('mostUsed',lang)} <span style={{color:'#6b7487',fontWeight:400}}>· {T('last14',lang)}</span></div>
                <div style={{display:'flex',gap:8,overflowX:'auto',paddingBottom:4,scrollbarWidth:'none' as const}}>
                  {mostUsed.map((p:any)=>(
                    <button key={p.id} onClick={()=>setSelected(p)} style={{flexShrink:0,background:'white',border:'1px solid #e5e7eb',borderRadius:10,padding:'10px 12px',cursor:'pointer',fontFamily:'inherit',minWidth:120,maxWidth:160,textAlign:'start' as const}}>
                      <div style={{fontSize:14,fontWeight:500,color:'#111827',whiteSpace:'nowrap' as const,overflow:'hidden',textOverflow:'ellipsis'}}>{tx(p.name)}</div>
                      <div style={{fontSize:12,color:'#6b7487',marginTop:2,whiteSpace:'nowrap' as const}}>{lang==='ar'?`صُرف ${p.dispense_count} ${p.dispense_count>=3&&p.dispense_count<=10?'مرات':'مرة'}`:T('timesUsed',lang,{n:p.dispense_count})}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div style={label}>{T('categories',lang)}</div>
            <div className="card" style={{overflow:'hidden'}}>
              {categories.map(cat=>(
                <button key={cat} className="list-row" onClick={()=>setActiveCategory(cat)}>
                  <span style={iconBox}>{iconFor(cat)}</span>
                  <span style={{flex:1,minWidth:0}}>
                    <span style={{display:'block',fontSize:15,fontWeight:500,color:'#111827',lineHeight:'22px'}}>{tx(cat)}</span>
                    {lang!=='ar'&&<span style={{display:'block',fontSize:12,color:'#6b7487'}}>{cat}</span>}
                  </span>
                  <span style={{fontSize:13,color:'#6b7487',flexShrink:0}}><span style={{fontVariantNumeric:'tabular-nums'}}>{categoriesMap[cat]}</span> {T('items',lang)}</span>
                  <Chev/>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
              <button onClick={()=>setActiveCategory(null)} aria-label={T('back',lang)} style={{width:36,height:36,flexShrink:0,background:'#eceef1',border:'none',borderRadius:10,color:'#111827',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <ChevronRight size={18} strokeWidth={1.75} style={{transform:isRTL?'none':'scaleX(-1)'}}/>
              </button>
              <div style={{minWidth:0}}>
                <div style={{fontSize:16,fontWeight:600,color:'#111827'}}>{tx(activeCategory)}</div>
                <div style={{fontSize:13,color:'#6b7487'}}>{lang!=='ar'?`${activeCategory} · `:''}{categoryProducts.length} {T('items',lang)}</div>
              </div>
            </div>
            {productRows(categoryProducts)}
          </div>
        )}
      </div>
    </>
  )
}
