'use client'
import { Search } from 'lucide-react'
import { C } from './constants'
import type { InventoryState } from './useInventory'

export default function InventoryFilters({ m }: { m: InventoryState }) {
  const { products, setPage, search, setSearch, statusFilter, setStatusFilter, catFilter, setCatFilter, allCats, lowCount } = m
  return (
    <>
      {/* الفلاتر */}
      <div className="iv-bar">
        <div className="iv-tabs">
          {([
            {k:'all' as const, l:'الكل', n:products.length},
            {k:'low' as const, l:'ناقص', n:lowCount},
            {k:'ok' as const, l:'كافٍ', n:products.length-lowCount},
          ]).map(tb=>(
            <button key={tb.k} className={`iv-tab${statusFilter===tb.k?' on':''}`} onClick={()=>{setStatusFilter(tb.k);setPage(1)}}>
              {tb.l} <span className="iv-tab-n" style={tb.k==='low'&&tb.n>0?{color:C.danger}:undefined}>{tb.n}</span>
            </button>
          ))}
        </div>
        <div className="iv-search">
          <Search size={15}/>
          <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}} placeholder="ابحث بالاسم أو الباركود"/>
        </div>
      </div>
      {allCats.length>1 && (
        <div className="iv-cats">
          {allCats.map(cat=>(
            <button key={cat} className={`iv-cat${catFilter===cat?' on':''}`} onClick={()=>{setCatFilter(cat);setPage(1)}}>{cat==='all'?'كل الفئات':cat}</button>
          ))}
        </div>
      )}
    </>
  )
}
