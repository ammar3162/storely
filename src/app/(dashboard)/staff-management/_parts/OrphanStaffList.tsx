'use client'
import { colors, card, btnPrimary } from '@/lib/ds'
import type { StaffPage } from './useStaffManagement'

export default function OrphanStaffList({ m }: { m: StaffPage }) {
  const { orphans, moveOrphanHere, deleteStaff } = m
  return (
    <>
      {orphans.length > 0 && (
        <div style={{...card,padding:'14px 16px',marginBottom:14,border:'1px solid #fde68a',background:'#fffdf5'}}>
          <div style={{fontSize:13.5,fontWeight:800,color:'#92400e'}}>موظفين بفروع موقوفة ({orphans.length})</div>
          <div style={{fontSize:12,color:'#b45309',marginTop:3,marginBottom:10,lineHeight:1.6}}>فروعهم موقوفة فما يطلعون بأي فرع شغّال، وأرقام جوالاتهم محجوزة. انقلهم لهذا الفرع، أو احذفهم، أو رجّع تشغيل فرعهم من «إدارة الفروع».</div>
          <div style={{display:'flex',flexDirection:'column' as const,gap:8}}>
            {orphans.map((o:any)=>(
              <div key={o.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,flexWrap:'wrap' as const,background:'white',border:`1px solid ${colors.border}`,borderRadius:10,padding:'10px 12px'}}>
                <div style={{minWidth:0}}>
                  <div style={{fontSize:13.5,fontWeight:700,color:colors.text}}>{o.name}</div>
                  <div style={{fontSize:11.5,color:colors.text3,marginTop:2}} dir="auto">{o.phone} · بفرع «{o.orphan_branch || '—'}» (موقوف){o.is_active ? '' : ' · موقوف'}</div>
                </div>
                <div style={{display:'flex',gap:6}}>
                  <button onClick={()=>moveOrphanHere(o)} style={{...btnPrimary,padding:'7px 14px',fontSize:12}}>نقل لهذا الفرع</button>
                  <button onClick={()=>deleteStaff(o.id)} style={{padding:'7px 14px',fontSize:12,fontWeight:700,borderRadius:8,border:`1px solid ${colors.dangerBorder}`,background:colors.dangerLight,color:colors.danger,cursor:'pointer',fontFamily:'inherit'}}>حذف</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
