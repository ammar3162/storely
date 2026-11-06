'use client'
import NumberInput from '@/components/NumberInput'
import { T } from './strings'
import type { StaffDispense } from './useStaffDispense'

export default function EditQtyModal({ m }: { m: StaffDispense }) {
  const { lang, editingProduct, setEditingProduct, editQty, setEditQty, savingQty, updateQty } = m
  return (
    <>
      {/* Edit qty modal */}
      {editingProduct && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.6)',display:'flex',alignItems:'flex-end',justifyContent:'center',zIndex:200,backdropFilter:'blur(4px)'}} onClick={()=>setEditingProduct(null)}>
          <div style={{background:'white',borderRadius:'24px 24px 0 0',padding:28,width:'100%',maxWidth:480,animation:'slideUp .3s ease'}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:18,fontWeight:800,color:'#0f172a',marginBottom:4}}>{editingProduct.name}</div>
            <div style={{fontSize:13,color:'#64748b',marginBottom:20}}>{T('currentQty',lang)}: <b>{editingProduct.qty}</b> {editingProduct.unit}</div>
            <div style={{fontSize:13,fontWeight:700,color:'#374151',marginBottom:8}}>{T('newQty',lang)}</div>
            <NumberInput value={editQty} onChange={e=>setEditQty(e.target.value)} min="0" autoFocus
              style={{width:'100%',padding:'16px',border:'2px solid #e2e8f0',borderRadius:14,fontSize:28,fontWeight:800,textAlign:'center',fontFamily:'inherit',boxSizing:'border-box' as const,marginBottom:16}}/>
            <div style={{display:'flex',gap:8}}>
              <button onClick={updateQty} disabled={savingQty}
                style={{flex:2,padding:16,background:'linear-gradient(135deg,#029FA2,#0f766e)',color:'white',border:'none',borderRadius:14,fontSize:15,fontWeight:800,cursor:'pointer',fontFamily:'inherit',boxShadow:'0 4px 14px rgba(22,163,74,.3)'}}>
                {savingQty?T('saving',lang):T('saveQty',lang)}
              </button>
              <button onClick={()=>setEditingProduct(null)}
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
