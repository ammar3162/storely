'use client'
import { font } from '@/lib/ds'
import { Truck, BarChart3, Plus } from 'lucide-react'
import { StorelyButton, StorelyEmptyState, StorelyPageHeader, StorelyStatusBadge } from '@/components/ui'
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
      
      <StorelyPageHeader
        title="الموردون"
        description="اربط منتجاتك بالموردين، وحدد توقيت إشعار الطلب لكل مورد"
        actions={<>
          {priceComparisons.length>0&&(
            <StorelyButton variant="secondary" icon={<BarChart3 size={16}/>} onClick={()=>setShowPriceComparison(true)}>
              مقارنة الأسعار <StorelyStatusBadge status="danger">{priceComparisons.length}</StorelyStatusBadge>
            </StorelyButton>
          )}
          <StorelyButton variant="primary" icon={<Plus size={16}/>} onClick={()=>setShowAdd(true)}>مورد جديد</StorelyButton>
        </>}
      />

      <SupplierStats m={m} unlinkedProducts={unlinkedProducts}/>

      <PriceComparisonModal m={m}/>

      <AddSupplierForm m={m}/>

      <UnlinkedProductsBanner unlinkedProducts={unlinkedProducts}/>

      {/* قائمة الموردين */}
      {suppliers.length === 0 ? (
        <StorelyEmptyState icon={<Truck size={20}/>} title="لا يوجد موردون بعد" description="أضف أول مورد وابدأ بتتبع طلبات التوريد تلقائياً"
          action={<StorelyButton variant="primary" icon={<Plus size={16}/>} onClick={()=>setShowAdd(true)}>مورد جديد</StorelyButton>} />
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
