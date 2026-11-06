'use client'
import PageIcon from '@/components/PageIcon'
import { font, pageTitle, pageSub, btnPrimary, btnSecondary } from '@/lib/ds'
import { Truck } from 'lucide-react'
import { ListSkeleton } from '@/components/PageSkeleton'
import { useSuppliersPage } from './_parts/useSuppliersPage'
import SupplierCard from './_parts/SupplierCard'
import SupplierStats from './_parts/SupplierStats'
import PriceComparisonModal from './_parts/PriceComparisonModal'
import AddSupplierForm from './_parts/AddSupplierForm'
import UnlinkedProductsBanner from './_parts/UnlinkedProductsBanner'
export const dynamic = 'force-dynamic'

export default function SuppliersPage() {
  const m = useSuppliersPage()
  const { suppliers, products, orgId, curr, loading, setShowAdd, priceComparisons, setShowPriceComparison, supplierRatings, failedRecentMap, msParam, sidParam, refresh } = m

  if (loading) return <ListSkeleton/>

  const unlinkedProducts = products.filter((p:any)=>!p.supplier_id)

  return (
    <div style={{ fontFamily:font.family, direction:'rtl' }}>
      <style>{`@media(max-width:640px){.add-grid{grid-template-columns:1fr!important}}`}</style>
      
      <div style={{ marginBottom:22, display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div>
          <h1 style={pageTitle}><PageIcon/>الموردين</h1>
          <p style={pageSub}>اربط منتجاتك بموردين وحدد توقيت الإشعار لكل مورد</p>
        </div>
        <div style={{display:'flex',gap:8}}>
          {priceComparisons.length>0&&(
            <button onClick={()=>setShowPriceComparison(true)} style={{ ...btnSecondary, padding:'10px 18px', fontSize:font.sm, display:'flex', alignItems:'center', gap:6 }}>
              📊 مقارنة الأسعار
              <span style={{background:'#dc2626',color:'white',fontSize:10,fontWeight:800,padding:'1px 6px',borderRadius:99}}>{priceComparisons.length}</span>
            </button>
          )}
          <button onClick={()=>setShowAdd(true)} style={{ ...btnPrimary, padding:'10px 18px', fontSize:font.sm }}>+ مورد جديد</button>
        </div>
      </div>

      <SupplierStats m={m} unlinkedProducts={unlinkedProducts}/>

      <PriceComparisonModal m={m}/>

      <AddSupplierForm m={m}/>

      <UnlinkedProductsBanner unlinkedProducts={unlinkedProducts}/>

      {/* قائمة الموردين */}
      {suppliers.length === 0 ? (
        <div style={{ background:'white', border:'1.5px solid #e2e8f0', borderRadius:16, padding:48, textAlign:'center' }}>
          <div style={{ display:'flex', justifyContent:'center', marginBottom:12 }}><Truck size={44} color="#94a3b8" strokeWidth={1.5}/></div>
          <div style={{ fontSize:15, fontWeight:700, color:'#475569', marginBottom:6 }}>لا يوجد موردين بعد</div>
          <div style={{ fontSize:13, color:'#94a3b8' }}>أضف أول مورد وابدأ بتتبع طلبات التوريد تلقائياً</div>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column' as const, gap:12 }}>
          {suppliers.map(s => (
            <SupplierCard key={s.id} s={s} products={products} orgId={orgId} onRefresh={refresh} allSuppliers={suppliers} rating={supplierRatings[s.id]} curr={curr} autoOpen={(!!msParam && s.marketplace_supplier_id===msParam) || (!!sidParam && s.id===sidParam)} recentFailedCount={failedRecentMap[s.id]||0} />
          ))}
        </div>
      )}
    </div>
  )
}
