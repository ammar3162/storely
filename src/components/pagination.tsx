'use client'
import { StorelyButton } from '@/components/ui/button'
interface Props { total:number; page:number; perPage:number; onPage:(p:number)=>void }
export default function Pagination({ total, page, perPage, onPage }: Props) {
  const pages = Math.ceil(total/perPage)
  if (pages<=1) return null
  const start=(page-1)*perPage+1, end=Math.min(page*perPage,total)
  const nums = Array.from({length:Math.min(pages,5)},(_,i)=>{
    if(pages<=5) return i+1
    if(page<=3) return i+1
    if(page>=pages-2) return pages-4+i
    return page-2+i
  })
  return (
    <div className="storely-pagination" dir="rtl">
      <div>يعرض <b>{start}–{end}</b> من <b>{total}</b></div>
      <div className="storely-pagination-controls">
        <StorelyButton onClick={()=>onPage(page-1)} disabled={page===1} size="sm" className="storely-pagination-number">›</StorelyButton>
        {nums.map(p=>(
          <StorelyButton key={p} onClick={()=>onPage(p)} size="sm" variant={page===p?'primary':'secondary'} className="storely-pagination-number">{p}</StorelyButton>
        ))}
        <StorelyButton onClick={()=>onPage(page+1)} disabled={page===pages} size="sm" className="storely-pagination-number">‹</StorelyButton>
      </div>
    </div>
  )
}
