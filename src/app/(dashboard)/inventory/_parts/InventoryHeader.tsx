'use client'
import { Upload, Download, Plus, ScanLine, ClipboardCheck } from 'lucide-react'
import { StorelyButton, StorelyPageHeader } from '@/components/ui'
import type { InventoryState } from './useInventory'

export default function InventoryHeader({ m }: { m: InventoryState }) {
  const { products, setShowAdd, setEditItem, setAddQty, setForm, setShowJardScan, setShowImport, totalQty, openCount, exportCSV } = m
  return (
    <StorelyPageHeader
      title="المخزون"
      description={`${products.length.toLocaleString('en-US')} صنف · ${totalQty.toLocaleString('en-US')} وحدة إجمالاً`}
      actions={<>
        <StorelyButton variant="secondary" icon={<Download size={16}/>} onClick={exportCSV} title="تصدير CSV"><span className="iv-hide-sm">تصدير</span></StorelyButton>
        <StorelyButton variant="secondary" icon={<Upload size={16}/>} onClick={()=>setShowImport(true)} title="استيراد من ملف"><span className="iv-hide-sm">استيراد</span></StorelyButton>
        <StorelyButton variant="secondary" icon={<ClipboardCheck size={16}/>} onClick={openCount} title="جرد المخزون الفعلي"><span className="iv-hide-sm">جرد</span></StorelyButton>
        <StorelyButton variant="secondary" icon={<ScanLine size={16}/>} onClick={()=>setShowJardScan(true)} title="جرد بالكاميرا"><span className="iv-hide-sm">جرد بالباركود</span></StorelyButton>
        <StorelyButton variant="primary" icon={<Plus size={16}/>} onClick={()=>{setEditItem(null);setAddQty(0);setForm({name:'',sku:'',unit:'قطعة',qty:0,reorder_point:5,category:'',expiry_date:'',recipe_unit:'',recipe_unit_factor:''});setShowAdd(true)}}>
          إضافة منتج
        </StorelyButton>
      </>}
    />
  )
}
