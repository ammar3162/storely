'use client'
import { Search } from 'lucide-react'
import { StorelyButton } from '@/components/ui'
import type { InventoryState } from './useInventory'

export default function InventoryFilters({ m }: { m: InventoryState }) {
  const { products, setPage, search, setSearch, statusFilter, setStatusFilter, catFilter, setCatFilter, allCats, lowCount } = m
  const filtered = !!search || catFilter !== 'all' || statusFilter !== 'all'
  return (
    <div className="iv-filterbar">
      <label className="iv-search">
        <Search size={16}/>
        <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}} placeholder="ابحث بالاسم أو الباركود" aria-label="بحث"/>
      </label>
      <select className="iv-select" value={statusFilter} aria-label="الحالة" onChange={e=>{setStatusFilter(e.target.value as 'all'|'low'|'ok');setPage(1)}}>
        <option value="all">كل الحالات ({products.length})</option>
        <option value="low">ناقص ({lowCount})</option>
        <option value="ok">كافٍ ({products.length-lowCount})</option>
      </select>
      {allCats.length>1 && (
        <select className="iv-select" value={catFilter} aria-label="الفئة" onChange={e=>{setCatFilter(e.target.value);setPage(1)}}>
          {allCats.map(cat=><option key={cat} value={cat}>{cat==='all'?'كل الفئات':cat}</option>)}
        </select>
      )}
      {filtered && <StorelyButton variant="ghost" onClick={()=>{setSearch('');setCatFilter('all');setStatusFilter('all');setPage(1)}}>إزالة الفلاتر</StorelyButton>}
    </div>
  )
}
