'use client'
import { useState, useEffect, useRef } from 'react'
import { api } from '@/lib/api-client'
import { toast } from '@/components/toast'

/** حالة بطاقة المورد ودوالها — منقولة كما هي من SupplierCard في page.tsx */
export function useSupplierCard({ s, products, orgId, onRefresh, allSuppliers, rating, curr, autoOpen, recentFailedCount }: any) {
  const [showTimeline, setShowTimeline] = useState(false)
  const [timelineEvents, setTimelineEvents] = useState<any[]>([])
  const [timelineLoading, setTimelineLoading] = useState(false)

  async function openTimeline() {
    setShowTimeline(true); setTimelineLoading(true)
    try {
      const res = await fetch('/api/supplier-timeline',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({org_id:orgId,supplier_id:s.id,supplier_name:s.name})})
      const data = await res.json()
      setTimelineEvents(data.events || [])
    } catch { setTimelineEvents([]) }
    setTimelineLoading(false)
  }
  const [open, setOpen]           = useState(!!autoOpen)
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(()=>{
    if (autoOpen && cardRef.current) {
      setTimeout(()=>cardRef.current?.scrollIntoView({ behavior:'smooth', block:'center' }), 300)
    }
  },[autoOpen])
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [mode, setMode]           = useState(s.notify_mode || 'daily')
  const [time, setTime]           = useState(s.notify_time || '08:00')
  const [day, setDay]             = useState(String(s.notify_day ?? 0))
  const [saving, setSaving]       = useState(false)
  const [sending, setSending]     = useState(false)
  const [selectedProduct, setSelectedProduct] = useState('')
  const [productSearch, setProductSearch] = useState('')
  const [reorderPoint, setReorderPoint]       = useState('')
  const [orderQty, setOrderQty]               = useState('')
  const [supplierNotes, setSupplierNotes]     = useState('')
  const [editingPhone, setEditingPhone] = useState(false)
  const [editPhoneVal, setEditPhoneVal] = useState(s.phone || '')
  const [savingPhone, setSavingPhone]   = useState(false)
  const [editingVat, setEditingVat]     = useState(false)
  const [editVatVal, setEditVatVal]     = useState(s.vat_number || '')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [catalogItems, setCatalogItems] = useState<any[]>([])
  const [selectedCatalogItem, setSelectedCatalogItem] = useState('')

  useEffect(()=>{
    if (!s.marketplace_supplier_id) { setCatalogItems([]); return }
    (async () => {
      const j = await api.get('/api/suppliers/catalog', { org_id: orgId, supplier_id: s.id })
      setCatalogItems(j.items || [])
    })()
  },[s.marketplace_supplier_id])

  async function savePhone() {
    if (!editPhoneVal.trim()) { toast('أدخل رقم صحيح', 'warning'); return }
    setSavingPhone(true)
    const r=await api.patch('/api/suppliers',{ org_id: orgId, id: s.id, phone: editPhoneVal.trim() })
    setSavingPhone(false)
    if(!r.success){toast('فشل تحديث رقم المورد','error');return}
    setEditingPhone(false)
    toast('✅ تم تحديث رقم المورد')
    onRefresh()
  }

  // الرقم الضريبي للمورد — يتعبى تلقائياً بفواتيره ويحتاجه المحاسب للضريبة
  async function saveVat() {
    setSavingPhone(true)
    const r=await api.patch('/api/suppliers',{ org_id: orgId, id: s.id, vat_number: editVatVal.trim() || null })
    setSavingPhone(false)
    if(!r.success){toast(r.error||'فشل حفظ الرقم الضريبي','error');return}
    setEditingVat(false)
    toast('✅ تم حفظ الرقم الضريبي')
    onRefresh()
  }

  const linked   = products.filter((p:any) => p.supplier_id === s.id)
  const unlinked = products.filter((p:any) => p.supplier_id !== s.id && (!productSearch || p.name?.toLowerCase().includes(productSearch.toLowerCase())))

  async function saveSettings() {
    setSaving(true)
    const r=await api.patch('/api/suppliers',{ org_id: orgId, id: s.id, notify_mode: mode, notify_time: time, notify_day: Number(day) })
    setSaving(false)
    if(!r.success){toast('فشل حفظ الإعدادات','error');return}
    setSettingsOpen(false)
    toast('✅ تم حفظ إعدادات المورد')
    onRefresh()
  }

  async function sendNow() {
    setSending(true)
    const data = await api.post('/api/notify-supplier', { org_id: orgId, supplier_id: s.id, manual: true })
    setSending(false)
    if (data.sent > 0 && data.failed > 0) toast(`⚠️ تم إرسال ${data.sent} صنف، وفشل إرسال ${data.failed} — تحقق من رقم واتساب المورد وحاول مرة أخرى`, 'warning')
    else if (data.sent > 0) toast(`✅ تم إرسال طلب توريد للمورد ${s.name}`)
    else if (data.failed > 0) toast(`❌ فشل إرسال طلب التوريد للمورد ${s.name} — تحقق من رقم واتساب المورد وحاول مرة أخرى`, 'error')
    else toast('لا توجد منتجات تحتاج طلب توريد الآن', 'warning')
  }

  async function linkProduct() {
    if (!selectedProduct || !reorderPoint) { toast('اختر منتج وأدخل الحد الأدنى', 'warning'); return }
    const r=await api.post('/api/suppliers/link',{ org_id: orgId, supplier_id: s.id, product_id: selectedProduct, reorder_point: reorderPoint, order_qty: orderQty, notes: supplierNotes, catalog_item_id: selectedCatalogItem || null })
    if(!r.success){toast(r.error||'فشل ربط المنتج بالمورد','error');return}
    toast('تم ربط المنتج')
    setSelectedProduct(''); setReorderPoint(''); setOrderQty(''); setSupplierNotes(''); setSelectedCatalogItem('')
    onRefresh()
  }

  async function unlinkProduct(pid: string) {
    const r=await api.del('/api/suppliers/link',{ org_id: orgId, product_id: pid })
    if(!r.success){toast('فشل فك الارتباط','error');return}
    toast('تم فك الارتباط')
    onRefresh()
  }

  async function deleteSupplier() {
    const r=await api.del('/api/suppliers',{ org_id: orgId, id: s.id })
    setConfirmDelete(false)
    if(!r.success){toast('فشل حذف المورد','error');return}
    toast('تم الحذف')
    onRefresh()
  }

  return { s, products, orgId, onRefresh, allSuppliers, rating, curr, autoOpen, recentFailedCount, showTimeline, setShowTimeline, timelineEvents, setTimelineEvents, timelineLoading, setTimelineLoading, open, setOpen, settingsOpen, setSettingsOpen, mode, setMode, time, setTime, day, setDay, saving, setSaving, sending, setSending, selectedProduct, setSelectedProduct, productSearch, setProductSearch, reorderPoint, setReorderPoint, orderQty, setOrderQty, supplierNotes, setSupplierNotes, editingPhone, setEditingPhone, editPhoneVal, setEditPhoneVal, savingPhone, setSavingPhone, editingVat, setEditingVat, editVatVal, setEditVatVal, confirmDelete, setConfirmDelete, catalogItems, setCatalogItems, selectedCatalogItem, setSelectedCatalogItem, cardRef, linked, unlinked, openTimeline, savePhone, saveVat, saveSettings, sendNow, linkProduct, unlinkProduct, deleteSupplier }
}

export type SupplierCardState = ReturnType<typeof useSupplierCard>
