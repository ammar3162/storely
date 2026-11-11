'use client'
import { StorelyStatusBadge, StorelyTableAction, StorelyTableActionGroup } from '@/components/ui'
import { breakdownQty } from '@/lib/productUnits'
import { C } from './constants'
import type { InventoryState } from './useInventory'
import { unitFor } from '@/lib/arabicCount'

export default function DesktopTable({ m }: { m: InventoryState }) {
  const { setConfirm, paginated, openEdit } = m
  return (
    <div className="dtable storely-data-table">
      <div className="storely-table-scroll">
        <table className="storely-table">
          <thead>
            <tr>{['المنتج','الفئة','الكمية','الحد الأدنى','الحالة','الإجراءات'].map((h,i)=><th key={i} style={i===5?{textAlign:'left'}:undefined}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {paginated.map(p=>{
              const isOut=p.qty===0,isLow=p.qty<=p.reorder_point
              const exp=(p as any).expiry_date?Math.ceil((new Date((p as any).expiry_date).getTime()-Date.now())/86400000):null
              return (
                <tr key={p.id} onClick={()=>openEdit(p)} style={{cursor:'pointer'}}>
                  <td style={{minWidth:220}}>
                    <div className="iv-name">{p.name}</div>
                    <div className="iv-meta">
                      {p.sku&&<span dir="ltr">#{p.sku}</span>}
                      {exp!==null&&exp<=7&&<span style={{color:exp<0?C.danger:C.warning}}>{exp<0?'منتهي الصلاحية':exp===0?'ينتهي اليوم':`ينتهي خلال ${exp} يوم`}</span>}
                    </div>
                  </td>
                  <td style={{color:C.text3}}>{p.category||'—'}</td>
                  <td style={{whiteSpace:'nowrap'}}><span className="iv-qty" style={{color:isOut?C.danger:isLow?C.warning:C.text}}>{p.qty}</span> <span className="iv-unit">{unitFor(p.qty, p.unit)}</span>
                    {breakdownQty(Number(p.qty)||0, p.unit, p.purchase_units) && <div style={{fontSize:12,color:C.text3,marginTop:2}}>{breakdownQty(Number(p.qty)||0, p.unit, p.purchase_units)}</div>}</td>
                  <td style={{color:C.text3,whiteSpace:'nowrap'}}>{p.reorder_point} {unitFor(p.reorder_point, p.unit)}</td>
                  <td>{isOut ? <StorelyStatusBadge status="danger">نافد</StorelyStatusBadge> : isLow ? <StorelyStatusBadge status="warning">منخفض</StorelyStatusBadge> : <StorelyStatusBadge status="success">كافٍ</StorelyStatusBadge>}</td>
                  <td style={{textAlign:'left',width:120}} onClick={e=>e.stopPropagation()}>
                    <StorelyTableActionGroup className="justify-end">
                      <StorelyTableAction action="edit" onClick={()=>openEdit(p)} />
                      <StorelyTableAction action="delete" onClick={()=>setConfirm({id:p.id,name:p.name})} />
                    </StorelyTableActionGroup>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
