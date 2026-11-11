'use client'
import { C, StatusDot } from './constants'
import type { InventoryState } from './useInventory'

export default function MobileList({ m }: { m: InventoryState }) {
  const { paginated, openEdit } = m
  return (
    <>
          {/* الجوال: قائمة */}
          <div className="mgrid iv-list">
            {paginated.map(p=>{
              const isOut=p.qty===0,isLow=p.qty<=p.reorder_point
              const exp=(p as any).expiry_date?Math.ceil((new Date((p as any).expiry_date).getTime()-Date.now())/86400000):null
              return (
                <button key={p.id} className="iv-item" onClick={()=>openEdit(p)}>
                  <div style={{flex:1,minWidth:0}}>
                    <div className="iv-name">{p.name}</div>
                    <div className="iv-meta">
                      <StatusDot out={isOut} low={isLow}/>
                      {p.category&&<span>· {p.category}</span>}
                      {exp!==null&&exp<=7&&<span style={{color:exp<0?C.danger:C.warning}}>· {exp<0?'منتهي الصلاحية':exp===0?'ينتهي اليوم':`ينتهي خلال ${exp} يوم`}</span>}
                    </div>
                  </div>
                  <div style={{textAlign:'left',flexShrink:0}}>
                    <div className="iv-qty" style={{color:isOut?C.danger:isLow?C.warning:C.text}}>{p.qty} <span className="iv-unit">{p.unit}</span></div>
                    <div className="iv-min">الحد {p.reorder_point}</div>
                  </div>
                </button>
              )
            })}
          </div>
    </>
  )
}
