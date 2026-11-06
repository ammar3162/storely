'use client'
import NumberInput from '@/components/NumberInput'
import SelectOrOther from '@/components/SelectOrOther'
import { unitsFor, catsFor } from '@/lib/businessTypes'
import { T } from './strings'
import { apLbl, apInp } from './styles'
import type { StaffDispense } from './useStaffDispense'

export default function AddProductModal({ m }: { m: StaffDispense }) {
  const { lang, bizType, showAddProduct, setShowAddProduct, newProduct, setNewProduct, savingProduct, addProduct } = m
  return (
    <>
      {/* Add product modal */}
      {showAddProduct && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.6)',display:'flex',alignItems:'flex-end',justifyContent:'center',zIndex:200,backdropFilter:'blur(4px)'}} onClick={()=>setShowAddProduct(false)}>
          <div style={{background:'white',borderRadius:'24px 24px 0 0',padding:28,width:'100%',maxWidth:480,animation:'slideUp .3s ease'}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:18,fontWeight:800,color:'#0f172a',marginBottom:20}}>{T('newProduct',lang)}</div>
            {/* كل خانة فوقها اسمها (يبقى واضح بعد الكتابة) — الخط 16 أسود عشان يكون واضح وما يقرّب الآيفون الشاشة */}
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
            <div style={{display:'flex',gap:8}}>
              <button onClick={addProduct} disabled={savingProduct||!newProduct.name||!newProduct.qty}
                style={{flex:2,padding:16,background:'linear-gradient(135deg,#029FA2,#0f766e)',color:'white',border:'none',borderRadius:14,fontSize:15,fontWeight:800,cursor:'pointer',fontFamily:'inherit',opacity:savingProduct||!newProduct.name||!newProduct.qty?0.6:1}}>
                {savingProduct?T('adding',lang):T('add',lang)}
              </button>
              <button onClick={()=>setShowAddProduct(false)}
                style={{flex:1,padding:16,background:'#f3f4f6',color:'#374151',border:'none',borderRadius:14,fontSize:15,cursor:'pointer',fontFamily:'inherit'}}>
                {T('cancel',lang)}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
