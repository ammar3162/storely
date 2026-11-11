'use client'
import { Plus, Search, Pencil } from 'lucide-react'
import { T } from './strings'
import { OTHER_CATEGORY } from './categories'
import type { StaffDispense } from './useStaffDispense'

const LOW = '__low'

export default function InventoryTab({ m }: { m: StaffDispense }) {
  const { lang, tab, invSearch, setInvSearch, setEditingProduct, setEditQty, setShowAddProduct, filteredInventory, invCategory, setInvCategory, invCategories, tx } = m
  const isLow = (p: any) => Number(p.qty) <= Number(p.reorder_point)
  const lowCount = filteredInventory.filter(isLow).length
  const shown = filteredInventory.filter(p =>
    !invCategory ? true : invCategory === LOW ? isLow(p) : (p.category?.trim() || OTHER_CATEGORY) === invCategory)
  return (
    <>
      {/* ═══ INVENTORY TAB ═══ قائمة: الاسم والفئة، والكمية على الطرف، وزر تعديل صغير */}
      {tab==='inventory' && (
        <div style={{padding:16,maxWidth:560,margin:'0 auto'}}>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <div style={{position:'relative' as const,flex:1}}>
              <Search size={16} strokeWidth={1.75} style={{position:'absolute',top:'50%',transform:'translateY(-50%)',insetInlineStart:12,color:'#6b7487',pointerEvents:'none'}}/>
              <input value={invSearch} onChange={e=>setInvSearch(e.target.value)} placeholder={T('searchProduct',lang)}
                style={{width:'100%',height:44,paddingInlineStart:36,paddingInlineEnd:12,border:'1px solid var(--storely-border)',borderRadius:10,fontSize:16,background:'white',color:'var(--storely-text)',fontFamily:'inherit',boxSizing:'border-box' as const}}/>
            </div>
            <button onClick={()=>setShowAddProduct(true)}
              style={{height:44,padding:'0 14px',background:'#e7f3f1',color:'#0b5d56',border:'none',borderRadius:10,fontSize:14,fontWeight:500,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',gap:4,flexShrink:0}}>
              <Plus size={16} strokeWidth={1.75}/>{T('product',lang)}
            </button>
          </div>

          <div style={{display:'flex',gap:8,margin:'12px 0',overflowX:'auto' as const,scrollbarWidth:'none' as const}}>
            <button className={`chip${!invCategory?' on':''}`} onClick={()=>setInvCategory(null)}>{T('allItems',lang)} <span style={{fontVariantNumeric:'tabular-nums'}}>{filteredInventory.length}</span></button>
            {lowCount>0 && (
              <button className={`chip${invCategory===LOW?' on':''}`} onClick={()=>setInvCategory(invCategory===LOW?null:LOW)}>
                <span style={{width:6,height:6,borderRadius:3,background:invCategory===LOW?'white':'#dc2626'}}/>{T('lowShort',lang)} <span style={{fontVariantNumeric:'tabular-nums'}}>{lowCount}</span>
              </button>
            )}
            {invCategories.length>1 && invCategories.map(c=>(
              <button key={c} className={`chip${invCategory===c?' on':''}`} onClick={()=>setInvCategory(invCategory===c?null:c)}>{tx(c)}</button>
            ))}
          </div>

          {shown.length===0 ? (
            <div className="card" style={{padding:40,textAlign:'center',color:'#4b5565',fontSize:14}}>{T('noProducts',lang)}</div>
          ) : (
            <div className="card" style={{overflow:'hidden'}}>
              {shown.map(p=>(
                <div key={p.id} className="list-row" style={{cursor:'default',minHeight:64}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:15,fontWeight:500,color:'var(--storely-text)',lineHeight:'22px'}}>{tx(p.name)}</div>
                    <div style={{fontSize:13,color:'#6b7487',lineHeight:'18px'}}>{p.category ? tx(p.category) : '—'}</div>
                  </div>
                  <div style={{textAlign:'end' as const,flexShrink:0}}>
                    <span style={{fontSize:18,fontWeight:500,color:'var(--storely-text)',fontVariantNumeric:'tabular-nums'}}>{p.qty}</span>
                    <span style={{fontSize:12,color:'#6b7487',marginInlineStart:4}}>{p.unit}</span>
                    {isLow(p) && <div style={{fontSize:12,color:'#dc2626',display:'flex',alignItems:'center',gap:4,justifyContent:'flex-end'}}><span style={{width:6,height:6,borderRadius:3,background:'#dc2626'}}/>{T('lowShort',lang)}</div>}
                  </div>
                  <button onClick={()=>{setEditingProduct(p);setEditQty(String(p.qty))}} aria-label={T('edit',lang)}
                    style={{width:36,height:36,flexShrink:0,border:'none',background:'transparent',borderRadius:10,color:'#6b7487',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>
                    <Pencil size={16} strokeWidth={1.75}/>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  )
}
