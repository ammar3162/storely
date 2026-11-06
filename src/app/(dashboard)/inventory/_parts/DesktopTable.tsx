'use client'
import { C, StatusDot } from './constants'
import type { InventoryState } from './useInventory'

export default function DesktopTable({ m }: { m: InventoryState }) {
  const { setConfirm, paginated, openEdit } = m
  return (
    <>
          {/* الكمبيوتر: جدول */}
          <div className="dtable iv-table-wrap">
            <table className="iv-table">
              <thead>
                <tr>{['المنتج','الفئة','الكمية','الحد الأدنى','الحالة',''].map((h,i)=><th key={i}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {paginated.map(p=>{
                  const isOut=p.qty===0,isLow=p.qty<=p.reorder_point
                  const exp=(p as any).expiry_date?Math.ceil((new Date((p as any).expiry_date).getTime()-Date.now())/86400000):null
                  return (
                    <tr key={p.id} onClick={()=>openEdit(p)}>
                      <td>
                        <div className="iv-name">{p.name}</div>
                        <div className="iv-meta">
                          {p.sku&&<span dir="ltr">#{p.sku}</span>}
                          {exp!==null&&exp<=7&&<span style={{color:exp<0?C.danger:C.warning}}>{exp<0?'منتهي الصلاحية':exp===0?'ينتهي اليوم':`ينتهي خلال ${exp} يوم`}</span>}
                        </div>
                      </td>
                      <td style={{color:C.text3}}>{p.category||'—'}</td>
                      <td style={{whiteSpace:'nowrap'}}><span className="iv-qty" style={{color:isOut?C.danger:isLow?C.warning:C.text}}>{p.qty}</span> <span className="iv-unit">{p.unit}</span></td>
                      <td style={{color:C.text3,whiteSpace:'nowrap'}}>{p.reorder_point} {p.unit}</td>
                      <td><StatusDot out={isOut} low={isLow}/></td>
                      <td style={{textAlign:'left',whiteSpace:'nowrap'}} onClick={e=>e.stopPropagation()}>
                        <button className="iv-act" onClick={()=>openEdit(p)}>تعديل</button>
                        <button className="iv-act" style={{color:C.danger}} onClick={()=>setConfirm({id:p.id,name:p.name})}>حذف</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
    </>
  )
}
