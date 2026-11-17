'use client'
import NumberInput from '@/components/NumberInput'
import SelectOrOther from '@/components/SelectOrOther'
import { unitsFor, catsFor } from '@/lib/businessTypes'
import { T } from './strings'
import { apLbl, apInp } from './styles'
import type { StaffDispense } from './useStaffDispense'
import SheetTop, { sheetStyle, SheetFoot } from './SheetTop'

export default function AddProductModal({ m }: { m: StaffDispense }) {
  const { lang, bizType, showAddProduct, setShowAddProduct, newProduct, setNewProduct, savingProduct, addProduct, addMode, setAddMode, pickSearch, setPickSearch, picked, setPicked, products } = m
  const existing = addMode === 'existing'
  // بحث بالاسم في منتجات الموظف (أول 8 نتائج)
  const q = pickSearch.trim().toLowerCase()
  const matches = (products || []).filter((p: any) => !q || String(p.name || '').toLowerCase().includes(q)).slice(0, 8)
  const canSave = !savingProduct && !!newProduct.qty && (existing ? !!picked : !!newProduct.name.trim())
  const tabBtn = (on: boolean) => ({ flex: 1, padding: '10px', borderRadius:12, border: 'none', fontSize:17, fontWeight:600, cursor: 'pointer', fontFamily: 'inherit',
    background: on ? 'white' : 'transparent', color: on ? '#203640' : '#374151', boxShadow: on ? '0 1px 4px rgba(0,0,0,.08)' : 'none' })
  return (
    <>
      {/* Add product modal */}
      {showAddProduct && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.6)',display:'flex',alignItems:'flex-end',justifyContent:'center',zIndex:200,backdropFilter:'blur(4px)'}} onClick={()=>setShowAddProduct(false)}>
          <div style={sheetStyle} onClick={e=>e.stopPropagation()}>
            <SheetTop lang={lang} onBack={()=>setShowAddProduct(false)} title={T('addToStock',lang)}/>
            {/* منتج موجود (بحث + كمية) أو منتج جديد */}
            <div style={{display:'flex',gap:4,background:'var(--storely-fill)',padding:4,borderRadius:20,marginBottom:16}}>
              <button type="button" onClick={()=>setAddMode('existing')} style={tabBtn(existing)}>{T('existingProd',lang)}</button>
              <button type="button" onClick={()=>{ setAddMode('new'); setPicked(null) }} style={tabBtn(!existing)}>{T('newProdTab',lang)}</button>
            </div>
            {existing ? (
            <div style={{display:'flex',flexDirection:'column' as const,gap:12,marginBottom:22}}>
              {picked ? (
                <div style={{display:'flex',alignItems:'center',gap:10,padding:'12px 14px',borderRadius:20,border:'1.5px solid #203640',background:'var(--storely-fill)'}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:17,fontWeight:600,color:'var(--storely-text)'}}>{picked.name}</div>
                    <div style={{fontSize:15,color:'var(--storely-text)'}}>{T('currentQty',lang)}: {Number(picked.qty) || 0} {picked.unit || ''}</div>
                  </div>
                  <button type="button" onClick={()=>setPicked(null)} style={{border:'1px solid var(--storely-control-border)',background:'white',borderRadius:999,padding:'6px 12px',fontSize:15,fontWeight:600,cursor:'pointer',fontFamily:'inherit',color:'var(--storely-text)'}}>{T('change',lang)}</button>
                </div>
              ) : (
                <>
                  <input value={pickSearch} onChange={e=>setPickSearch(e.target.value)} placeholder={T('findProduct',lang)} autoFocus style={apInp}/>
                  <div style={{maxHeight:240,overflowY:'auto' as const,display:'flex',flexDirection:'column' as const,gap:6}}>
                    {matches.length === 0 ? (
                      <button type="button" onClick={()=>{ setAddMode('new'); setNewProduct(p=>({...p,name:pickSearch.trim()})) }}
                        style={{padding:'12px',borderRadius:999,border:'1px dashed var(--storely-muted)',background:'white',fontSize:17,color:'var(--storely-text)',cursor:'pointer',fontFamily:'inherit'}}>{T('noMatch',lang)}</button>
                    ) : matches.map((p: any) => (
                      <button key={p.id} type="button" onClick={()=>setPicked(p)}
                        style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:10,padding:'11px 14px',borderRadius:12,border:'1px solid var(--storely-border)',background:'white',cursor:'pointer',fontFamily:'inherit',textAlign:'right' as const}}>
                        <span style={{fontSize:17,fontWeight:600,color:'var(--storely-text)'}}>{p.name}</span>
                        <span style={{fontSize:15,color:'var(--storely-text)',whiteSpace:'nowrap' as const}}>{Number(p.qty) || 0} {p.unit || ''}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
              {picked && (
                <label style={{display:'block'}}>
                  <span style={apLbl}>{T('addedQty',lang)}</span>
                  <NumberInput value={newProduct.qty} onChange={e=>setNewProduct(p=>({...p,qty:e.target.value}))} autoFocus style={apInp}/>
                </label>
              )}
            </div>
            ) : (
            /* كل خانة فوقها اسمها (يبقى واضح بعد الكتابة) — الخط 16 أسود عشان يكون واضح وما يقرّب الآيفون الشاشة */
            <div style={{display:'flex',flexDirection:'column' as const,gap:14,marginBottom:22}}>
              <label style={{display:'block'}}>
                <span style={apLbl}>{T('productName',lang)}</span>
                <input value={newProduct.name} onChange={e=>setNewProduct(p=>({...p,name:e.target.value}))} autoFocus style={apInp}/>
              </label>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                <label style={{display:'block',minWidth:0}}>
                  <span style={apLbl}>{T('qtyRequired',lang)}</span>
                  <NumberInput value={newProduct.qty} onChange={e=>setNewProduct(p=>({...p,qty:e.target.value}))} style={apInp}/>
                </label>
                <div style={{minWidth:0}}>
                  <span style={apLbl}>{T('unitLbl',lang)}</span>
                  <SelectOrOther value={newProduct.unit} onChange={v=>setNewProduct(p=>({...p,unit:v}))} options={unitsFor(bizType)} placeholder={T('unitPh',lang)} style={apInp}/>
                </div>
              </div>
              <div>
                <span style={apLbl}>{T('categoryOpt',lang)}</span>
                <SelectOrOther value={newProduct.category} onChange={v=>setNewProduct(p=>({...p,category:v}))} options={catsFor(bizType)} emptyLabel="—" placeholder={T('categoryPh',lang)} style={apInp}/>
              </div>
            </div>
            )}
            <SheetFoot>
            <div style={{display:'flex',gap:8}}>
              <button onClick={addProduct} disabled={!canSave}
                style={{flex:2,height:48,background:'#203640',color:'white',border:'none',borderRadius:999,fontSize:17,fontWeight:600,cursor:'pointer',fontFamily:'inherit',opacity:canSave?1:0.6}}>
                {savingProduct?T('adding',lang):T('add',lang)}
              </button>
              <button onClick={()=>setShowAddProduct(false)}
                style={{flex:1,height:48,background:'var(--storely-fill)',color:'var(--storely-text)',border:'none',borderRadius:999,fontSize:17,cursor:'pointer',fontFamily:'inherit'}}>
                {T('cancel',lang)}
              </button>
            </div>
            </SheetFoot>
          </div>
        </div>
      )}
    </>
  )
}
