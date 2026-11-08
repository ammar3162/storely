'use client'
import { colors, card } from '@/lib/ds'
import ExtraDayDecision from '@/components/ExtraDayDecision'
import type { HrPage } from './useHrManagement'

export default function ExtraDaysAlert({ m }: { m: HrPage }) {
  const { orgId, extraDays, setExtraDays, canDecideExtra } = m
  return (
    <>
      {/* أيام إضافية (دوام بيوم إجازة) بانتظار قرار المالك */}
      {extraDays.length > 0 && (
        <div style={{...card,padding:'14px 16px',marginBottom:20,border:`1px solid ${colors.primaryBorder}`}}>
          <div style={{fontSize:13.5,fontWeight:800,color:colors.text}}>أيام إضافية بانتظار قرارك ({extraDays.length})</div>
          <div style={{fontSize:12,color:colors.text3,marginTop:3,marginBottom:10}}>موظفون حضروا في يوم إجازتهم — حدّد التعويض: مبلغ يُضاف إلى رواتبهم أو يوم إجازة بديل.</div>
          <div style={{display:'flex',flexDirection:'column' as const,gap:8}}>
            {extraDays.map((e:any)=>(
              <div key={e.id} style={{background:colors.bg,borderRadius:10,padding:'10px 12px'}}>
                <div style={{fontSize:13,fontWeight:700,color:colors.text}}>{e.name}</div>
                <div style={{fontSize:11.5,color:colors.text3,marginTop:2}}>
                  {e.reason==='monthly' ? 'حضر بعد إكمال أيام دوامه المطلوبة هذا الشهر' : 'حضر في يوم إجازته'} — {new Date(`${e.work_date}T12:00:00Z`).toLocaleDateString('ar-SA-u-ca-gregory',{weekday:'long',day:'numeric',month:'long',calendar:'gregory',numberingSystem:'latn',timeZone:'UTC'})}
                </div>
                <ExtraDayDecision item={e} orgId={orgId} canDecide={canDecideExtra} onDone={()=>setTimeout(()=>setExtraDays(prev=>prev.filter((x:any)=>x.id!==e.id)),1200)}/>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
