'use client'
import { T } from './strings'
import type { StaffDispense } from './useStaffDispense'

export default function InventoryTab({ m }: { m: StaffDispense }) {
  const { lang, tab, invSearch, setInvSearch, setEditingProduct, setEditQty, setShowAddProduct, filteredInventory, tx } = m
  return (
    <>
      {/* ═══ INVENTORY TAB ═══ */}
      {tab==='inventory' && (
        <div style={{padding:'16px 20px',maxWidth:560,margin:'0 auto',animation:'fadeIn .3s'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
            <div style={{fontSize:18,fontWeight:800,color:'#0f172a'}}>{T('inventory',lang)}</div>
            <button onClick={()=>setShowAddProduct(true)}
              style={{padding:'9px 16px',background:'#029FA2',color:'white',border:'none',borderRadius:10,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit',boxShadow:'0 4px 12px rgba(22,163,74,.3)'}}>
              ＋ {T('addProduct',lang)}
            </button>
          </div>
          <input value={invSearch} onChange={e=>setInvSearch(e.target.value)} placeholder={T('searchProduct',lang)}
            style={{width:'100%',padding:'12px 16px',border:'2px solid #e2e8f0',borderRadius:12,fontSize:14,background:'white',fontFamily:'inherit',marginBottom:14,boxSizing:'border-box' as const}}/>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            {filteredInventory.length===0 ? (
              <div className="card" style={{padding:40,textAlign:'center',color:'#94a3b8',gridColumn:'span 2'}}>{T('noProducts',lang)}</div>
            ) : filteredInventory.map(p=>(
              <div key={p.id} className="card" style={{padding:'16px',display:'flex',flexDirection:'column' as const,gap:6}}>
                <div style={{fontSize:14,fontWeight:700,color:'#0f172a',lineHeight:1.3}}>{tx(p.name)}</div>
                <div style={{fontSize:11,color:'#64748b'}}>{p.category||'—'}</div>
                <div style={{display:'flex',alignItems:'baseline',gap:4,margin:'4px 0'}}>
                  <span style={{fontSize:30,fontWeight:900,color:p.qty<=p.reorder_point?'#ef4444':'#029FA2',lineHeight:1}}>{p.qty}</span>
                  <span style={{fontSize:12,color:'#94a3b8'}}>{p.unit}</span>
                </div>
                {p.qty<=p.reorder_point && <div style={{fontSize:10,color:'#ef4444',fontWeight:700}}>{T('lowStock',lang)}</div>}
                <button onClick={()=>{setEditingProduct(p);setEditQty(String(p.qty))}}
                  style={{width:'100%',padding:'8px',background:'#f0fdfa',color:'#029FA2',border:'1.5px solid #99f6e4',borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit',marginTop:'auto'}}>
                  {T('edit',lang)}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
