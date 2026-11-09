'use client'
import { T, WASTE_KEYS } from './strings'
import type { StaffDispense } from './useStaffDispense'

export default function DispenseModal({ m }: { m: StaffDispense }) {
  const { lang, selected, setSelected, dispenseQty, setDispenseQty, wasteMode, setWasteMode, wasteReason, setWasteReason, wasteNote, setWasteNote, submitting, WASTE_REASONS, tx, handleDispense, handleWaste } = m
  return (
    <>
      {/* Dispense modal */}
      {selected && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.6)',display:'flex',alignItems:'flex-end',justifyContent:'center',zIndex:200,backdropFilter:'blur(4px)'}} onClick={()=>{setSelected(null);setDispenseQty('');setWasteMode(false);setWasteReason('');setWasteNote('')}}>
          <div style={{background:'white',borderRadius:'24px 24px 0 0',padding:28,width:'100%',maxWidth:480,animation:'slideUp .3s ease'}} onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20}}>
              <div>
                <div style={{fontSize:20,fontWeight:600,color:'var(--storely-text)'}}>{tx(selected.name)}</div>
                {lang!=='ar'&&<div style={{fontSize:12,color:'#4b5565',marginTop:2}}>{selected.name}</div>}
                <div style={{fontSize:13,color:'#4b5565',marginTop:4}}>{T('available',lang)}: <b style={{color:selected.qty<=selected.reorder_point?'#dc2626':'#203640'}}>{selected.qty} {selected.unit}</b></div>
              </div>
              <button onClick={()=>{setSelected(null);setDispenseQty('');setWasteMode(false);setWasteReason('');setWasteNote('')}} style={{background:'#eceef1',border:'none',borderRadius:'50%',width:36,height:36,color:'#4b5565',fontSize:18,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
            </div>
            <div style={{display:'flex',gap:8,marginBottom:20,background:'#eceef1',borderRadius:12,padding:4}}>
              <button onClick={()=>setWasteMode(false)} style={{flex:1,padding:'10px',borderRadius:9,border:'none',background:!wasteMode?'white':'transparent',color:!wasteMode?'#203640':'#6b7487',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',boxShadow:!wasteMode?'0 1px 3px rgba(0,0,0,.1)':'none'}}>
                {T('normalOut',lang)}
              </button>
              <button onClick={()=>setWasteMode(true)} style={{flex:1,padding:'10px',borderRadius:9,border:'none',background:wasteMode?'white':'transparent',color:wasteMode?'#d97706':'#6b7487',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',boxShadow:wasteMode?'0 1px 3px rgba(0,0,0,.1)':'none'}}>
                {T('recordWaste',lang)}
              </button>
            </div>
            {wasteMode && (
              <>
                <div style={{fontSize:13,fontWeight:600,color:'#4b5565',marginBottom:8}}>{T('wasteReason',lang)}</div>
                <div style={{display:'flex',flexWrap:'wrap' as const,gap:8,marginBottom:16}}>
                  {WASTE_REASONS.map(r=>(
                    <button key={r} onClick={()=>setWasteReason(r)}
                      style={{padding:'8px 14px',borderRadius:8,border:`1px solid ${wasteReason===r?'#d97706':'var(--storely-border)'}`,background:wasteReason===r?'#fffbeb':'white',color:wasteReason===r?'#b45309':'#6b7487',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>
                      {T(WASTE_KEYS[r]||r,lang)}
                    </button>
                  ))}
                </div>
                <div style={{fontSize:13,fontWeight:600,color:'#4b5565',marginBottom:8}}>{T('noteOptional',lang)}</div>
                <textarea value={wasteNote} onChange={e=>setWasteNote(e.target.value)}
                  placeholder={T('wasteNotePh',lang)}
                  style={{width:'100%',padding:'12px',border:'2px solid var(--storely-border)',borderRadius:12,fontSize:14,fontFamily:'inherit',boxSizing:'border-box' as const,marginBottom:16,minHeight:60,resize:'none' as const}}/>
              </>
            )}
            <div style={{fontSize:13,fontWeight:600,color:'#4b5565',marginBottom:10}}>{T('qty',lang)}</div>
            <input value={dispenseQty} readOnly
              style={{width:'100%',padding:'16px',border:'2px solid var(--storely-border)',borderRadius:14,fontSize:28,fontWeight:600,textAlign:'center',fontFamily:'inherit',boxSizing:'border-box' as const,marginBottom:12,background:'#f4f5f6',caretColor:'transparent'}}
              placeholder="0"/>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:16}}>
              {['1','2','3','4','5','6','7','8','9','.','0','⌫'].map(k=>(
                <button key={k} type="button"
                  onClick={()=>{
                    if(k==='⌫'){ setDispenseQty(q=>q.slice(0,-1)); return }
                    if(k==='.' && dispenseQty.includes('.')) return
                    setDispenseQty(q=>(q+k).replace(/[^0-9.]/g,''))
                  }}
                  style={{padding:'16px 0',borderRadius:12,border:'1.5px solid var(--storely-border)',background:'white',fontSize:20,fontWeight:600,color:k==='⌫'?'#dc2626':'#111827',cursor:'pointer',fontFamily:'inherit',transition:'background .1s'}}
                  onTouchStart={e=>{(e.currentTarget as HTMLButtonElement).style.background='#e7f3f1'}}
                  onTouchEnd={e=>{(e.currentTarget as HTMLButtonElement).style.background='white'}}>
                  {k}
                </button>
              ))}
            </div>
            {wasteMode ? (
              <button onClick={handleWaste} disabled={!dispenseQty||!wasteReason||submitting}
                style={{width:'100%',height:52,background:(!dispenseQty||!wasteReason||submitting)?'#d1d5db':'#b45309',color:'white',border:'none',borderRadius:10,fontSize:16,fontWeight:600,cursor:(!dispenseQty||!wasteReason||submitting)?'not-allowed':'pointer',fontFamily:'inherit',boxShadow:'none'}}>
                {submitting?T('saving',lang):T('recordWasteQty',lang,{q:dispenseQty||'',u:selected.unit})}
              </button>
            ) : (
              <button onClick={handleDispense} disabled={!dispenseQty||submitting}
                style={{width:'100%',height:52,background:(!dispenseQty||submitting)?'#d1d5db':'#203640',color:'white',border:'none',borderRadius:10,fontSize:16,fontWeight:600,cursor:(!dispenseQty||submitting)?'not-allowed':'pointer',fontFamily:'inherit',boxShadow:'none'}}>
                {submitting?T('saving',lang):T('confirm',lang)}
              </button>
            )}
          </div>
        </div>
      )}
    </>
  )
}
