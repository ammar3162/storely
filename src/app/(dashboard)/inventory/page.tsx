'use client'
export const dynamic = 'force-dynamic'
import { Suspense, lazy } from 'react'
import { X, AlertTriangle, Package } from 'lucide-react'
import Pagination from '@/components/pagination'
import { StorelyButton, StorelyEmptyState, StorelyMetricStrip, type StorelyMetric } from '@/components/ui'
import { C, STARTER_PRODUCTS } from './_parts/constants'
import { IV_CSS } from './_parts/styles'
import { useInventory } from './_parts/useInventory'
import DeleteConfirm from './_parts/DeleteConfirm'
import ImportSheet from './_parts/ImportSheet'
import ProductSheet from './_parts/ProductSheet'
import InventoryHeader from './_parts/InventoryHeader'
import MissingUnitsNotice from './_parts/MissingUnitsNotice'
import InventoryFilters from './_parts/InventoryFilters'
import StarterProducts from './_parts/StarterProducts'
import MobileList from './_parts/MobileList'
import DesktopTable from './_parts/DesktopTable'

const BarcodeScanner = lazy(() => import('@/components/BarcodeScanner'))
const StockCountSheet = lazy(() => import('@/components/StockCountSheet'))

export default function InventoryPage() {
  const m = useInventory()
  const { products, page, setPage, loading, search, setSearch, setStatusFilter, catFilter, setCatFilter, setForm, showScan, setShowScan, showJardScan, setShowJardScan, countSheet, setCountSheet, jardNotFound, setJardNotFound, businessType, templateDismissed, PER, filtered, load, openEdit } = m

  if(loading) return (
    <div style={{fontFamily:"'IBM Plex Sans Arabic',system-ui",direction:'rtl'}}>
      <style>{`@keyframes sk{0%,100%{opacity:1}50%{opacity:.3}}.sk{animation:sk 1.4s ease infinite}`}</style>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:16}}>
        <div className="sk" style={{height:24,width:100,background:C.border2,borderRadius:6}}/>
        <div className="sk" style={{height:34,width:80,background:C.border,borderRadius:8}}/>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:1,marginBottom:16,borderRadius:12,overflow:'hidden'}}>
        {[1,2,3,4].map(i=><div key={i} className="sk" style={{height:96,background:C.border}}/>)}
      </div>
      <div className="sk" style={{height:400,borderRadius:12,background:C.border}}/>
    </div>
  )

  return (
    <div className="iv" style={{fontFamily:"'IBM Plex Sans Arabic',system-ui",direction:'rtl'}}>
      <style>{IV_CSS}</style>
      <style>{`
        @keyframes up{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
        @keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:none}}
        .u{animation:up .3s ease both}
        input:focus,select:focus{border-color:${C.primary}!important;outline:none!important;box-shadow:0 0 0 3px rgba(32,54,64,.14)!important}
        .chip{padding:5px 12px;border-radius:99px;font-size:11px;font-weight:600;cursor:pointer;white-space:nowrap;border:1px solid;transition:all .15s;font-family:inherit}
        .rh{transition:background .1s}
        .rh:hover{background:#f9f9f8}
        .tap{transition:all .12s;cursor:pointer}
        .tap:active{transform:scale(.97)}
        /* mobile grid */
        .mgrid{display:block}
        .dtable{display:none}
        @media(min-width:640px){
          .mgrid{display:none}
          .dtable{display:block}
        }
        @media(min-width:768px){
          .s4{grid-template-columns:repeat(4,1fr)!important}
        }
      `}</style>

      <DeleteConfirm m={m}/>

      {/* Barcode */}
      {showScan&&<Suspense fallback={null}><BarcodeScanner onScan={(code:string)=>{setForm(f=>({...f,sku:code}));setShowScan(false)}} onClose={()=>setShowScan(false)}/></Suspense>}
      {countSheet&&<Suspense fallback={null}><StockCountSheet orgId={sessionStorage.getItem('s_org_id')||''} products={products as any} lastCounts={countSheet}
        onClose={()=>setCountSheet(null)} onSaved={()=>{setCountSheet(null);load(true)}}/></Suspense>}
      {showJardScan&&<Suspense fallback={null}><BarcodeScanner onScan={(code:string)=>{
        setShowJardScan(false)
        const found=products.find(p=>p.sku===code)
        if(found){ setJardNotFound(''); openEdit(found) }
        else { setJardNotFound(code) }
      }} onClose={()=>setShowJardScan(false)}/></Suspense>}
      <ImportSheet m={m}/>

      {jardNotFound&&(
        <div style={{position:'fixed',bottom:20,left:'50%',transform:'translateX(-50%)',background:C.dangerL,color:C.danger,border:`1px solid ${C.dangerB}`,borderRadius:10,padding:'10px 16px',fontSize:12,fontWeight:600,zIndex:2000,boxShadow:'0 4px 16px rgba(0,0,0,.1)'}}>
          <span style={{display:'inline-flex',alignItems:'center',gap:5}}><AlertTriangle size={13} strokeWidth={2.25}/> لا يوجد منتج بهذا الباركود: {jardNotFound}</span>
          <button onClick={()=>setJardNotFound('')} style={{marginRight:8,background:'none',border:'none',color:C.danger,cursor:'pointer',display:'flex',alignItems:'center'}}><X size={15} strokeWidth={2.5}/></button>
        </div>
      )}

      <ProductSheet m={m}/>

      <InventoryHeader m={m}/>

      <MissingUnitsNotice m={m}/>

      <InventoryFilters m={m}/>

      <StorelyMetricStrip className="mb-4" metrics={([
        { label: 'إجمالي المنتجات', value: products.length.toLocaleString('en-US'), helper: `${filtered.length.toLocaleString('en-US')} ضمن الفلاتر` },
        { label: 'منخفض المخزون', value: m.lowCount.toLocaleString('en-US'), tone: m.lowCount ? 'warning' : 'neutral' },
        { label: 'نافد المخزون', value: products.filter(p=>p.qty===0).length.toLocaleString('en-US'), tone: products.some(p=>p.qty===0) ? 'danger' : 'neutral' },
        { label: 'إجمالي الكمية', value: m.totalQty.toLocaleString('en-US'), helper: 'وحدة مسجّلة' },
      ]) as StorelyMetric[]} />

      {filtered.length===0 && !search && catFilter==='all' && STARTER_PRODUCTS[businessType] && !templateDismissed ? (
        <StarterProducts m={m}/>
      ) : filtered.length===0?(
        <StorelyEmptyState
          icon={<Package size={20}/>}
          title={search||catFilter!=='all'?'لا توجد نتائج':'المخزون فارغ'}
          description={search||catFilter!=='all'?'جرّب كلمة أو فئة أخرى':'ابدأ بإضافة أول منتج'}
          action={(search||catFilter!=='all') ? <StorelyButton variant="secondary" onClick={()=>{setSearch('');setCatFilter('all');setStatusFilter('all')}}>إزالة الفلاتر</StorelyButton> : undefined}
        />
      ):(
        <>
          <MobileList m={m}/>

          <DesktopTable m={m}/>

          <Pagination total={filtered.length} page={page} perPage={PER} onPage={setPage}/>
        </>
      )}
    </div>
  )
}
