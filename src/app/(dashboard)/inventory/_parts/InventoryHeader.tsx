'use client'
import PageIcon from '@/components/PageIcon'
import { Upload, Download, Plus, ScanLine, ClipboardCheck } from 'lucide-react'
import type { InventoryState } from './useInventory'

export default function InventoryHeader({ m }: { m: InventoryState }) {
  const { products, setShowAdd, setEditItem, setAddQty, setForm, setShowJardScan, setShowImport, totalQty, openCount, exportCSV } = m
  return (
    <>
      {/* العنوان + الأدوات */}
      <div className="iv-head">
        <div style={{minWidth:0}}>
          <h1 className="iv-title" style={{display:'flex',alignItems:'center',gap:12}}><PageIcon/>المخزون</h1>
          <p className="iv-sub">{products.length} صنف · {totalQty.toLocaleString('en-US')} وحدة إجمالاً</p>
        </div>
        <div className="iv-tools">
          <button className="sh-btn" onClick={exportCSV} title="تصدير CSV"><Download size={16}/><span className="iv-hide-sm">تصدير</span></button>
          <button className="sh-btn" onClick={()=>setShowImport(true)} title="استيراد من ملف"><Upload size={16}/><span className="iv-hide-sm">استيراد</span></button>
          <button className="sh-btn" onClick={openCount} title="جرد المخزون الفعلي"><ClipboardCheck size={16}/><span className="iv-hide-sm">جرد</span></button>
          <button className="sh-btn" onClick={()=>setShowJardScan(true)} title="جرد بالكاميرا"><ScanLine size={16}/><span className="iv-hide-sm">جرد بالباركود</span></button>
          <button className="sh-btn sh-btn-primary" onClick={()=>{setEditItem(null);setAddQty(0);setForm({name:'',sku:'',unit:'قطعة',qty:0,reorder_point:5,category:'',expiry_date:'',recipe_unit:'',recipe_unit_factor:''});setShowAdd(true)}}>
            <Plus size={16}/> إضافة منتج
          </button>
        </div>
      </div>
    </>
  )
}
