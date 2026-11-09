'use client'
import { Ruler } from 'lucide-react'
import { needsConversion } from '@/lib/recipeUnits'
import type { InventoryState } from './useInventory'

export default function MissingUnitsNotice({ m }: { m: InventoryState }) {
  const { products, showAudit, setShowAudit, openEdit } = m
  return (
    <>
      {/* الوحدات الدقيقة الناقصة */}
      {(()=>{
        const missing = products.filter((p:any)=>needsConversion(p))
        if(missing.length===0) return null
        return (
          <div className="iv-note">
            <button type="button" className="iv-note-head" onClick={()=>setShowAudit(v=>!v)}>
              <Ruler size={15}/>
              <span style={{flex:1}}>{missing.length} منتج بدون تحويل للوحدة الدقيقة — مهم إذا كنت تستخدمه في الوصفات</span>
              <span className="iv-link">{showAudit?'إخفاء':'عرض'}</span>
            </button>
            {showAudit && (
              <div className="iv-note-list">
                {missing.map((p:any)=>(
                  <button key={p.id} type="button" className="iv-note-item" onClick={()=>openEdit(p)}>
                    <span>{p.name}</span><span className="iv-link">تحديد التحويل</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )
      })()}
    </>
  )
}
