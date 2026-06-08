'use client'
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
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 16px',borderTop:'1px solid #f1f5f9',flexWrap:'wrap',gap:8,direction:'rtl',fontFamily:"'IBM Plex Sans Arabic',system-ui,sans-serif"}}>
      <div style={{fontSize:12,color:'#94a3b8'}}>يعرض <b style={{color:'#0f172a'}}>{start}–{end}</b> من <b style={{color:'#0f172a'}}>{total}</b></div>
      <div style={{display:'flex',gap:4}}>
        <button onClick={()=>onPage(page-1)} disabled={page===1} style={{width:32,height:32,borderRadius:8,border:'1.5px solid #e2e8f0',background:page===1?'#f8fafc':'white',color:page===1?'#cbd5e1':'#334155',cursor:page===1?'not-allowed':'pointer',fontSize:14,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center'}}>›</button>
        {nums.map(p=>(
          <button key={p} onClick={()=>onPage(p)} style={{width:32,height:32,borderRadius:8,border:'1.5px solid '+(page===p?'#16a34a':'#e2e8f0'),background:page===p?'#16a34a':'white',color:page===p?'white':'#334155',cursor:'pointer',fontSize:13,fontWeight:700}}>
            {p}
          </button>
        ))}
        <button onClick={()=>onPage(page+1)} disabled={page===pages} style={{width:32,height:32,borderRadius:8,border:'1.5px solid #e2e8f0',background:page===pages?'#f8fafc':'white',color:page===pages?'#cbd5e1':'#334155',cursor:page===pages?'not-allowed':'pointer',fontSize:14,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center'}}>‹</button>
      </div>
    </div>
  )
}
