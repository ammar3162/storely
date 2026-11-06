'use client'
import { colors, card, btnPrimary } from '@/lib/ds'
import type { HrPage } from './useHrManagement'

export default function BranchLocationNote({ m }: { m: HrPage }) {
  const { branches, savingLocationId, currentBranchId, saveBranchLocation } = m
  return (
    <>
      {/* موقع الفرع — يتحدد من داخل الفرع نفسه: يطلع بس للفرع المختار حالياً (لفرع ثاني: انتقل له من قائمة الفروع) */}
      {(() => {
        const b = branches.find((x:any)=>x.id===currentBranchId)
        if (!b) return null
        return (
          <div style={{...card,padding:14,marginBottom:20,display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,flexWrap:'wrap' as const}}>
            <div style={{minWidth:0}}>
              <div style={{fontSize:12.5,fontWeight:700,color:colors.text}}>📍 موقع {b.name} (لتسجيل الحضور)</div>
              <div style={{fontSize:11,color:b.latitude?colors.primary:colors.warning,marginTop:3}}>{b.latitude ? '✓ الموقع محدّد' : 'الموقع غير محدّد — الموظفين ما يقدرون يحضّرون'}</div>
              <div style={{fontSize:10.5,color:colors.text4,marginTop:3}}>يتسجّل من مكان جهازك — حدّده وأنت داخل الفرع.{branches.length > 1 ? ' لفرع ثاني: انتقل له من قائمة الفروع فوق.' : ''}</div>
            </div>
            <button onClick={()=>saveBranchLocation(b.id)} disabled={savingLocationId===b.id}
              style={{...btnPrimary,padding:'9px 16px',fontSize:12.5,whiteSpace:'nowrap' as const,opacity:savingLocationId===b.id?.7:1}}>
              {savingLocationId===b.id ? 'جاري التحديد...' : b.latitude ? 'إعادة الضبط من هنا' : 'حدّد الموقع من هنا'}
            </button>
          </div>
        )
      })()}
    </>
  )
}
