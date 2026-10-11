'use client'
/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */

export const dynamic = 'force-dynamic'

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { BarChart3, Clock, Link2, Plus, Search, Send, Settings, Trash2, Truck, Unlink, X } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { api } from '@/lib/api-client'
import { cache } from '@/lib/cache'
import { currencySymbol } from '@/lib/currencySymbol'
import { getMe, getOrgId } from '@/lib/session'
import { toast } from '@/components/toast'
import {
  StorelyButton,
  StorelyCard,
  StorelyDataTable,
  StorelyEmptyState,
  StorelyFormField,
  StorelyMetricStrip,
  StorelyPageHeader,
  StorelyStatusBadge,
  StorelyTableAction,
  StorelyTableActionGroup,
  type StorelyDataTableColumn,
  type StorelyMetric,
} from '@/components/ui'

const DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
const COUNTRY_CODES = ['+966', '+971', '+965', '+973', '+974', '+968', '+20', '+962', '+1', '+44', '+91', '+92']

type Supplier = {
  id: string
  name: string
  phone: string
  notify_mode?: string | null
  notify_time?: string | null
  notify_day?: number | null
  marketplace_supplier_id?: string | null
}

type Product = {
  id: string
  name: string
  qty: number
  unit?: string | null
  supplier_id?: string | null
  supplier_reorder_point?: number | null
  supplier_order_qty?: number | null
  supplier_notes?: string | null
}

function formatNumber(value: number) {
  return value.toLocaleString('ar-SA', { numberingSystem: 'latn' })
}

function inputClass(extra = '') {
  return `h-9 w-full rounded-[6px] border border-[#D7CDC2] bg-white px-3 text-sm text-[#203640] outline-none transition placeholder:text-[#8EA0B1] focus:border-[#203640] focus:ring-2 focus:ring-[#203640]/15 ${extra}`
}

function Modal({
  title,
  description,
  children,
  onClose,
  maxWidth = 'max-w-lg',
}: {
  title: ReactNode
  description?: ReactNode
  children: ReactNode
  onClose: () => void
  maxWidth?: string
}) {
  return (
    <div className="fixed inset-0 z-[3500] flex items-center justify-center bg-black/45 p-4" dir="rtl" onClick={onClose}>
      <div
        className={`max-h-[82vh] w-full ${maxWidth} overflow-y-auto rounded-[6px] border border-[#E7E1D8] bg-white`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[#E7E1D8] px-4 py-3">
          <div className="min-w-0">
            <h2 className="m-0 text-base font-semibold leading-6 text-[#203640]">{title}</h2>
            {description ? <p className="mt-1 text-[13px] leading-5 text-[#66737C]">{description}</p> : null}
          </div>
          <button
            type="button"
            className="inline-flex size-7 shrink-0 items-center justify-center rounded-[5px] text-[#66737C] transition hover:bg-[#F8EEDF] hover:text-[#203640]"
            onClick={onClose}
            aria-label="إغلاق"
          >
            <X size={15} />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  )
}

function notifyLabel(mode?: string | null, time?: string | null, day?: number | null) {
  if (mode === 'instant') return 'فوري'
  if (mode === 'weekly') return `أسبوعي ${DAYS[day ?? 0] ?? DAYS[0]} ${time || '08:00'}`
  return `يومي ${time || '08:00'}`
}

function notifyStatus(mode?: string | null) {
  if (mode === 'instant') return 'warning'
  if (mode === 'weekly') return 'info'
  return 'success'
}

function EscalationChain({ productId, allSuppliers, primarySupplierId, refreshKey }: any) {
  const [chain, setChain] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [pickSupplier, setPickSupplier] = useState('')

  useEffect(() => { load() }, [productId, refreshKey])

  async function load() {
    setLoading(true)
    const j = await api.get('/api/suppliers/chain', { org_id: sessionStorage.getItem('s_org_id'), product_id: productId })
    setChain(j.chain || [])
    setLoading(false)
  }

  async function addBackup() {
    if (!pickSupplier) return
    await api.post('/api/suppliers/chain', { org_id: sessionStorage.getItem('s_org_id'), product_id: productId, supplier_id: pickSupplier })
    setPickSupplier('')
    setAdding(false)
    load()
  }

  async function removeBackup(id: string) {
    await api.del('/api/suppliers/chain', { org_id: sessionStorage.getItem('s_org_id'), id })
    load()
  }

  const usedIds = new Set([primarySupplierId, ...chain.map((item: any) => item.supplier_id)])
  const available = (allSuppliers || []).filter((supplier: Supplier) => !usedIds.has(supplier.id))

  if (loading) return null

  return (
    <div className="mt-2 border-t border-dashed border-[#E7E1D8] pt-2">
      <div className="mb-1.5 text-xs font-semibold text-[#66737C]">سلسلة التصعيد عند عدم توفر المورد الأساسي</div>
      {chain.length === 0 && !adding ? (
        <div className="mb-2 text-xs text-[#8EA0B1]">لا يوجد موردون بديلون. سيتم الاكتفاء بالإشعار اليدوي عند عدم التوفر.</div>
      ) : null}
      <div className="space-y-1.5">
        {chain.map((item: any, index: number) => (
          <div key={item.id} className="flex items-center gap-2 text-xs">
            <span className="rounded-[5px] border border-[#CBD4DC] bg-[#F3F5F6] px-1.5 py-0.5 font-semibold text-[#4F6678]">#{index + 2}</span>
            <span className="min-w-0 flex-1 truncate font-medium text-[#203640]">{item.suppliers?.name || 'مورد'}</span>
            <button type="button" className="text-[#B91C1C] hover:underline" onClick={() => removeBackup(item.id)}>حذف</button>
          </div>
        ))}
      </div>
      {adding ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <select className={inputClass('min-w-44 flex-1')} value={pickSupplier} onChange={(event) => setPickSupplier(event.target.value)}>
            <option value="">اختر مورد</option>
            {available.map((supplier: Supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
          </select>
          <StorelyButton size="sm" variant="primary" disabled={!pickSupplier} onClick={addBackup}>إضافة</StorelyButton>
          <StorelyButton size="sm" variant="ghost" onClick={() => setAdding(false)}>إلغاء</StorelyButton>
        </div>
      ) : (
        <StorelyButton size="sm" variant="secondary" className="mt-2" disabled={!available.length} onClick={() => setAdding(true)}>
          إضافة مورد بديل
        </StorelyButton>
      )}
    </div>
  )
}

function SupplierWorkspace({
  supplier,
  products,
  orgId,
  onRefresh,
  allSuppliers,
  curr,
  recentFailedCount,
  onClose,
}: {
  supplier: Supplier
  products: Product[]
  orgId: string
  onRefresh: () => void
  allSuppliers: Supplier[]
  curr: string
  recentFailedCount: number
  onClose: () => void
}) {
  const [showTimeline, setShowTimeline] = useState(false)
  const [timelineEvents, setTimelineEvents] = useState<any[]>([])
  const [timelineLoading, setTimelineLoading] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [mode, setMode] = useState(supplier.notify_mode || 'daily')
  const [time, setTime] = useState(supplier.notify_time || '08:00')
  const [day, setDay] = useState(String(supplier.notify_day ?? 0))
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState('')
  const [productSearch, setProductSearch] = useState('')
  const [reorderPoint, setReorderPoint] = useState('')
  const [orderQty, setOrderQty] = useState('')
  const [supplierNotes, setSupplierNotes] = useState('')
  const [chainRefreshKey] = useState(0)
  const [editingPhone, setEditingPhone] = useState(false)
  const [editPhoneVal, setEditPhoneVal] = useState(supplier.phone || '')
  const [savingPhone, setSavingPhone] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [catalogItems, setCatalogItems] = useState<any[]>([])
  const [selectedCatalogItem, setSelectedCatalogItem] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!supplier.marketplace_supplier_id) {
        if (!cancelled) setCatalogItems([])
        return
      }
      const j = await api.get('/api/suppliers/catalog', { org_id: orgId, supplier_id: supplier.id })
      if (!cancelled) setCatalogItems(j.items || [])
    })()
    return () => {
      cancelled = true
    }
  }, [supplier.marketplace_supplier_id, supplier.id, orgId])

  async function openTimeline() {
    setShowTimeline(true)
    setTimelineLoading(true)
    try {
      const res = await fetch('/api/supplier-timeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ org_id: orgId, supplier_id: supplier.id, supplier_name: supplier.name }),
      })
      const data = await res.json()
      setTimelineEvents(data.events || [])
    } catch {
      setTimelineEvents([])
    }
    setTimelineLoading(false)
  }

  async function savePhone() {
    if (!editPhoneVal.trim()) {
      toast('أدخل رقم صحيح', 'warning')
      return
    }
    setSavingPhone(true)
    const result = await api.patch('/api/suppliers', { org_id: orgId, id: supplier.id, phone: editPhoneVal.trim() })
    setSavingPhone(false)
    if (!result.success) {
      toast('فشل تحديث رقم المورد', 'error')
      return
    }
    setEditingPhone(false)
    toast('تم تحديث رقم المورد')
    onRefresh()
  }

  async function saveSettings() {
    setSaving(true)
    const result = await api.patch('/api/suppliers', { org_id: orgId, id: supplier.id, notify_mode: mode, notify_time: time, notify_day: Number(day) })
    setSaving(false)
    if (!result.success) {
      toast('فشل حفظ الإعدادات', 'error')
      return
    }
    setSettingsOpen(false)
    toast('تم حفظ إعدادات المورد')
    onRefresh()
  }

  async function sendNow() {
    setSending(true)
    const data = await api.post('/api/notify-supplier', { org_id: orgId, supplier_id: supplier.id, manual: true })
    setSending(false)
    if (data.sent > 0 && data.failed > 0) toast(`تم إرسال ${data.sent} صنف، وفشل إرسال ${data.failed}. تحقق من رقم واتساب المورد وحاول مرة أخرى`, 'warning')
    else if (data.sent > 0) toast(`تم إرسال طلب توريد للمورد ${supplier.name}`)
    else if (data.failed > 0) toast(`فشل إرسال طلب التوريد للمورد ${supplier.name}. تحقق من رقم واتساب المورد وحاول مرة أخرى`, 'error')
    else toast('لا توجد منتجات تحتاج طلب توريد الآن', 'warning')
  }

  async function linkProduct() {
    if (!selectedProduct || !reorderPoint) {
      toast('اختر منتج وأدخل الحد الأدنى', 'warning')
      return
    }
    const result = await api.post('/api/suppliers/link', {
      org_id: orgId,
      supplier_id: supplier.id,
      product_id: selectedProduct,
      reorder_point: reorderPoint,
      order_qty: orderQty,
      notes: supplierNotes,
      catalog_item_id: selectedCatalogItem || null,
    })
    if (!result.success) {
      toast(result.error || 'فشل ربط المنتج بالمورد', 'error')
      return
    }
    if (result.chain_failed) toast('تم ربط المنتج، لكن فشل تحديث سلسلة التصعيد', 'warning')
    else toast('تم ربط المنتج')
    setSelectedProduct('')
    setReorderPoint('')
    setOrderQty('')
    setSupplierNotes('')
    setSelectedCatalogItem('')
    onRefresh()
  }

  async function unlinkProduct(productId: string) {
    const result = await api.del('/api/suppliers/link', { org_id: orgId, product_id: productId })
    if (!result.success) {
      toast('فشل فك الارتباط', 'error')
      return
    }
    toast('تم فك الارتباط')
    onRefresh()
  }

  async function deleteSupplier() {
    const result = await api.del('/api/suppliers', { org_id: orgId, id: supplier.id })
    setConfirmDelete(false)
    if (!result.success) {
      toast('فشل حذف المورد', 'error')
      return
    }
    toast('تم الحذف')
    onClose()
    onRefresh()
  }

  const linked = products.filter((product) => product.supplier_id === supplier.id)
  const unlinked = products.filter((product) => product.supplier_id !== supplier.id && (!productSearch || product.name?.toLowerCase().includes(productSearch.toLowerCase())))

  return (
    <StorelyCard
      className="mb-4"
      title={supplier.name}
      description={`${linked.length} منتج مرتبط · ${notifyLabel(supplier.notify_mode, supplier.notify_time, supplier.notify_day)}`}
      actions={
        <>
          <StorelyButton variant="secondary" size="sm" icon={<Send size={14} />} disabled={sending} onClick={sendNow}>
            {sending ? 'جاري الإرسال' : 'إرسال طلب'}
          </StorelyButton>
          <StorelyButton variant="secondary" size="sm" icon={<Clock size={14} />} onClick={openTimeline}>سجل التواصل</StorelyButton>
          <StorelyButton variant="ghost" size="sm" icon={<Settings size={14} />} onClick={() => setSettingsOpen((value) => !value)}>الإعدادات</StorelyButton>
          <StorelyButton variant="ghost" size="sm" onClick={onClose}>إغلاق</StorelyButton>
        </>
      }
    >
      <div className="space-y-4 p-3">
        <div className="grid overflow-hidden rounded-[6px] border border-[#E7E1D8] bg-white md:grid-cols-[1.2fr_.8fr]">
          <div className="border-b border-[#E7E1D8] p-3 md:border-b-0 md:border-l">
            <div className="mb-2 text-xs font-semibold text-[#66737C]">بيانات التواصل</div>
            {editingPhone ? (
              <div className="flex flex-wrap items-center gap-2">
                <input className={inputClass('max-w-56 text-left')} value={editPhoneVal} onChange={(event) => setEditPhoneVal(event.target.value)} dir="ltr" autoFocus />
                <StorelyButton size="sm" variant="primary" disabled={savingPhone} onClick={savePhone}>{savingPhone ? 'جاري الحفظ' : 'حفظ'}</StorelyButton>
                <StorelyButton size="sm" variant="ghost" onClick={() => { setEditingPhone(false); setEditPhoneVal(supplier.phone || '') }}>إلغاء</StorelyButton>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-[#203640]" dir="ltr">{supplier.phone || '-'}</span>
                <StorelyButton size="sm" variant="secondary" onClick={() => setEditingPhone(true)}>تعديل الرقم</StorelyButton>
              </div>
            )}
          </div>
          <div className="p-3">
            <div className="mb-2 text-xs font-semibold text-[#66737C]">الحالة</div>
            <div className="flex flex-wrap items-center gap-2">
              <StorelyStatusBadge status={linked.length > 0 ? 'success' : 'warning'}>{linked.length > 0 ? 'نشط' : 'غير نشط'}</StorelyStatusBadge>
              {recentFailedCount > 0 ? <StorelyStatusBadge status="danger">{recentFailedCount} فشل إرسال آخر 24 ساعة</StorelyStatusBadge> : null}
              <StorelyStatusBadge status={notifyStatus(supplier.notify_mode) as any}>{notifyLabel(supplier.notify_mode, supplier.notify_time, supplier.notify_day)}</StorelyStatusBadge>
            </div>
          </div>
        </div>

        {settingsOpen ? (
          <div className="rounded-[6px] border border-[#E7E1D8] bg-white p-3">
            <div className="mb-3 text-sm font-semibold text-[#203640]">إعدادات الإشعارات</div>
            <div className="grid gap-3 md:grid-cols-3">
              <StorelyFormField label="نمط الإشعار">
                <select className={inputClass()} value={mode} onChange={(event) => setMode(event.target.value)}>
                  <option value="instant">فوري</option>
                  <option value="daily">يومي</option>
                  <option value="weekly">أسبوعي</option>
                </select>
              </StorelyFormField>
              <StorelyFormField label="الوقت">
                <input className={inputClass()} type="time" value={time} onChange={(event) => setTime(event.target.value)} />
              </StorelyFormField>
              <StorelyFormField label="اليوم">
                <select className={inputClass()} value={day} disabled={mode !== 'weekly'} onChange={(event) => setDay(event.target.value)}>
                  {DAYS.map((item, index) => <option key={item} value={index}>{item}</option>)}
                </select>
              </StorelyFormField>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <StorelyButton variant="primary" disabled={saving} onClick={saveSettings}>{saving ? 'جاري الحفظ' : 'حفظ الإعدادات'}</StorelyButton>
              <StorelyButton variant="ghost" onClick={() => setSettingsOpen(false)}>إلغاء</StorelyButton>
            </div>
          </div>
        ) : null}

        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <h3 className="m-0 text-sm font-semibold text-[#203640]">المنتجات المرتبطة</h3>
            <span className="text-xs text-[#66737C]">{formatNumber(linked.length)} منتج</span>
          </div>
          {linked.length > 0 ? (
            <div className="overflow-hidden rounded-[6px] border border-[#E7E1D8] bg-white">
              {linked.map((product) => {
                const low = Number(product.qty) <= Number(product.supplier_reorder_point ?? 0)
                return (
                  <div key={product.id} className="border-b border-[#E7E1D8] p-3 last:border-b-0">
                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-[#203640]">{product.name}</span>
                          {low ? <StorelyStatusBadge status="warning">ناقص</StorelyStatusBadge> : null}
                        </div>
                        {product.supplier_notes ? <div className="mt-1 text-xs text-[#66737C]">{product.supplier_notes}</div> : null}
                        <div className="mt-1 text-xs text-[#66737C]">
                          المتاح: <b className="text-[#203640]">{product.qty} {product.unit}</b> · يطلب عند: <b className="text-[#203640]">{product.supplier_reorder_point ?? '-'}</b> · كمية الطلب: <b className="text-[#203640]">{product.supplier_order_qty ?? '-'}</b>
                        </div>
                        <EscalationChain productId={product.id} allSuppliers={allSuppliers} primarySupplierId={supplier.id} refreshKey={chainRefreshKey} />
                      </div>
                      <StorelyButton size="sm" variant="ghost" icon={<Unlink size={14} />} onClick={() => unlinkProduct(product.id)}>فك الربط</StorelyButton>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <StorelyEmptyState title="لا توجد منتجات مرتبطة" description="اربط منتجاً بهذا المورد لتفعيل طلبات التوريد." />
          )}
        </div>

        {unlinked.length > 0 ? (
          <div className="rounded-[6px] border border-[#E7E1D8] bg-white p-3">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#203640]">
              <Link2 size={15} />
              ربط منتج جديد
            </div>
            <div className="grid gap-3 md:grid-cols-[2fr_1fr_1fr]">
              <StorelyFormField label="المنتج">
                <div className="overflow-hidden rounded-[5px] border border-[#D7CDC2]">
                  <input className="h-8 w-full border-0 border-b border-[#E7E1D8] bg-[#F8EEDF]/35 px-2.5 text-sm text-[#203640] outline-none" value={productSearch} onChange={(event) => setProductSearch(event.target.value)} placeholder="ابحث عن منتج" />
                  {unlinked.length === 0 ? (
                    <div className="px-3 py-4 text-center text-xs text-[#8EA0B1]">لا يوجد منتج مطابق للبحث</div>
                  ) : (
                    <select className="h-28 w-full border-0 bg-white px-2 text-sm text-[#203640] outline-none" value={selectedProduct} onChange={(event) => setSelectedProduct(event.target.value)} size={5}>
                      <option value="">اختر منتج</option>
                      {unlinked.map((product) => <option key={product.id} value={product.id}>{product.name} ({product.qty} {product.unit})</option>)}
                    </select>
                  )}
                </div>
              </StorelyFormField>
              <StorelyFormField label="يطلب عند" required>
                <input className={inputClass()} type="number" value={reorderPoint} onChange={(event) => setReorderPoint(event.target.value)} placeholder="5" />
              </StorelyFormField>
              <StorelyFormField label="كمية الطلب">
                <input className={inputClass()} type="number" value={orderQty} onChange={(event) => setOrderQty(event.target.value)} placeholder="20" />
              </StorelyFormField>
            </div>
            {supplier.marketplace_supplier_id && catalogItems.length > 0 ? (
              <StorelyFormField label="الصنف المقابل في كتالوج المورد" className="mt-3">
                <select className={inputClass()} value={selectedCatalogItem} onChange={(event) => setSelectedCatalogItem(event.target.value)}>
                  <option value="">بدون ربط، إشعار واتساب فقط</option>
                  {catalogItems.map((item: any) => <option key={item.id} value={item.id}>{item.name} - {item.price} {curr || 'ر.س'} / {item.unit}</option>)}
                </select>
              </StorelyFormField>
            ) : null}
            <StorelyFormField label="ملاحظات المنتج" className="mt-3">
              <input className={inputClass()} value={supplierNotes} onChange={(event) => setSupplierNotes(event.target.value)} placeholder="مثال: يرجى التوريد مبرداً" />
            </StorelyFormField>
            <StorelyButton className="mt-3" variant="primary" icon={<Link2 size={14} />} disabled={!selectedProduct} onClick={linkProduct}>ربط المنتج</StorelyButton>
          </div>
        ) : linked.length === 0 ? (
          <StorelyEmptyState title="لا توجد منتجات متاحة للربط" description="كل المنتجات الحالية مرتبطة أو لا توجد منتجات في المخزون." />
        ) : null}

        <div className="border-t border-[#E7E1D8] pt-3">
          <StorelyButton variant="danger" size="sm" icon={<Trash2 size={14} />} onClick={() => setConfirmDelete(true)}>حذف المورد</StorelyButton>
        </div>
      </div>

      {confirmDelete ? (
        <Modal title={`حذف المورد "${supplier.name}"؟`} description="سيتم فك ارتباطه بكل المنتجات المرتبطة به. لا يمكن التراجع عن هذا الإجراء." onClose={() => setConfirmDelete(false)} maxWidth="max-w-sm">
          <div className="flex gap-2">
            <StorelyButton className="flex-1" variant="secondary" onClick={() => setConfirmDelete(false)}>إلغاء</StorelyButton>
            <StorelyButton className="flex-1" variant="danger" onClick={deleteSupplier}>حذف</StorelyButton>
          </div>
        </Modal>
      ) : null}

      {showTimeline ? (
        <Modal title={`سجل التواصل - ${supplier.name}`} description="يعرض الطلبات، التأكيدات، المشتريات، ومحاولات الإرسال خلال الفترة المتاحة." onClose={() => setShowTimeline(false)}>
          {timelineLoading ? (
            <div className="py-10 text-center text-sm text-[#66737C]">جاري التحميل...</div>
          ) : timelineEvents.length === 0 ? (
            <StorelyEmptyState title="لا يوجد سجل تواصل بعد" description="ستظهر هنا طلبات التوريد والمشتريات المرتبطة بهذا المورد." />
          ) : (
            <div className="space-y-2">
              {timelineEvents.map((event: any, index: number) => (
                <div key={index} className="border-b border-[#E7E1D8] pb-2 last:border-b-0">
                  <div className="text-sm font-semibold text-[#203640]">{String(event.title || '').replace('❌ ', '')}</div>
                  {event.detail ? <div className="mt-1 text-xs leading-5 text-[#66737C]">{event.detail}</div> : null}
                  <div className="mt-1 text-xs text-[#8EA0B1]">{new Date(event.at).toLocaleDateString('ar-SA', { numberingSystem: 'latn', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              ))}
            </div>
          )}
        </Modal>
      ) : null}
    </StorelyCard>
  )
}

export default function SuppliersPage() {
  const searchParams = useSearchParams()
  const msParam = searchParams.get('ms')
  const [maxSuppliers, setMaxSuppliers] = useState<number>(999)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [orgId, setOrgId] = useState('')
  const [curr, setCurr] = useState('ر.س')
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [supCountry, setSupCountry] = useState(() => (typeof window === 'undefined' ? '+966' : sessionStorage.getItem('s_country_code') || '+966'))
  const [newNotes, setNewNotes] = useState('')
  const [newConsent, setNewConsent] = useState(false)
  const [priceComparisons, setPriceComparisons] = useState<any[]>([])
  const [showPriceComparison, setShowPriceComparison] = useState(false)
  const [supplierRatings, setSupplierRatings] = useState<Record<string, any>>({})
  const [failedRecentMap, setFailedRecentMap] = useState<Record<string, number>>({})
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'linked' | 'unlinked' | 'failed'>('all')
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null)
  const detailsRef = useRef<HTMLDivElement>(null)

  useEffect(() => { init() }, [])

  useEffect(() => {
    if (!msParam || suppliers.length === 0) return
    const found = suppliers.find((supplier) => supplier.marketplace_supplier_id === msParam)
    if (found) queueMicrotask(() => setSelectedSupplierId(found.id))
  }, [msParam, suppliers])

  useEffect(() => {
    if (selectedSupplierId) setTimeout(() => detailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
  }, [selectedSupplierId])

  async function init() {
    setLoading(true)
    let oid = sessionStorage.getItem('s_org_id')
    if (oid) {
      const cachedSuppliers = cache.get('suppliers:' + oid)
      if (cachedSuppliers) {
        setSuppliers(cachedSuppliers)
        setLoading(false)
      }
    }
    if (!oid) {
      oid = await getOrgId()
      if (!oid) return
    }
    setOrgId(oid)
    getMe().then((me) => { if (me?.org?.currency) setCurr(currencySymbol(me.org.currency)) })
    await Promise.all([loadSuppliers(oid), loadProducts(oid)])
    fetch('/api/supplier-price-comparison', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ org_id: oid }) })
      .then((response) => response.json())
      .then((data) => { if (data.success) setPriceComparisons(data.comparisons || []) })
      .catch(() => {})
    fetch('/api/supplier-rating', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ org_id: oid }) })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          const map: Record<string, any> = {}
          data.ratings.forEach((rating: any) => { map[rating.id] = rating })
          setSupplierRatings(map)
        }
      })
      .catch(() => {})
    setLoading(false)
  }

  async function loadSuppliers(oid: string) {
    const bid = sessionStorage.getItem('s_branch_id')
    const result = await api.get('/api/suppliers', { org_id: oid, branch_id: bid })
    if (!result.success) return
    setSuppliers(result.suppliers || [])
    cache.set('suppliers:' + oid, result.suppliers || [])
    setFailedRecentMap(result.failed_recent || {})
    setMaxSuppliers(result.max_suppliers || 999)
  }

  async function loadProducts(oid: string) {
    const bid = sessionStorage.getItem('s_branch_id')
    const result = await api.get('/api/products', { org_id: oid, branch_id: bid, view: 'suppliers' })
    setProducts(result.products || [])
  }

  async function addSupplier() {
    if (!newName.trim() || !newPhone.trim()) {
      toast('أدخل اسم المورد ورقمه', 'warning')
      return
    }
    if (!newConsent) {
      toast('يرجى تأكيد إقرار موافقة المورد على استلام رسائل واتساب', 'warning')
      return
    }
    const phoneRules: Record<string, number> = { '+966': 9, '+971': 9, '+965': 8, '+973': 8, '+974': 8, '+968': 8, '+20': 10, '+962': 9, '+1': 10, '+44': 10, '+91': 10, '+92': 10 }
    const requiredLength = phoneRules[supCountry] || 9
    const cleanedPhone = newPhone.trim().replace(/^0+/, '')
    if (cleanedPhone.length !== requiredLength) {
      toast(`رقم الجوال يجب أن يكون ${requiredLength} أرقام`, 'warning')
      return
    }
    const result = await api.post('/api/add-supplier', {
      org_id: orgId,
      branch_id: sessionStorage.getItem('s_branch_id') || null,
      name: newName.trim(),
      phone: supCountry + cleanedPhone,
      notes: newNotes.trim(),
      whatsapp_consent: true,
    })
    if (!result.success) {
      toast('خطأ: ' + result.error, 'error')
      return
    }
    toast('تم إضافة المورد')
    setNewName('')
    setNewPhone('')
    setNewNotes('')
    setNewConsent(false)
    setShowAdd(false)
    loadSuppliers(orgId)
  }

  const refresh = () => {
    loadSuppliers(orgId)
    loadProducts(orgId)
  }

  const linkedCounts = useMemo(() => {
    const map: Record<string, number> = {}
    for (const product of products) {
      if (product.supplier_id) map[product.supplier_id] = (map[product.supplier_id] || 0) + 1
    }
    return map
  }, [products])

  const failedCount = Object.values(failedRecentMap).reduce((sum, value) => sum + value, 0)
  const unlinkedProducts = products.filter((product) => !product.supplier_id)
  const selectedSupplier = suppliers.find((supplier) => supplier.id === selectedSupplierId) || null

  const filteredSuppliers = suppliers
    .filter((supplier) => {
      const cleanQuery = query.trim().toLowerCase()
      if (!cleanQuery) return true
      return `${supplier.name || ''} ${supplier.phone || ''}`.toLowerCase().includes(cleanQuery)
    })
    .filter((supplier) => {
      if (statusFilter === 'linked') return (linkedCounts[supplier.id] || 0) > 0
      if (statusFilter === 'unlinked') return (linkedCounts[supplier.id] || 0) === 0
      if (statusFilter === 'failed') return (failedRecentMap[supplier.id] || 0) > 0
      return true
    })

  const metrics: StorelyMetric[] = [
    { label: 'إجمالي الموردين', value: formatNumber(suppliers.length), helper: `الحد المتاح ${formatNumber(maxSuppliers)}` },
    { label: 'موردون مرتبطون', value: formatNumber(suppliers.filter((supplier) => (linkedCounts[supplier.id] || 0) > 0).length), tone: 'neutral' },
    { label: 'منتجات بدون مورد', value: formatNumber(unlinkedProducts.length), tone: unlinkedProducts.length ? 'warning' : 'neutral' },
    ...(failedCount > 0 ? [{ label: 'فشل إرسال آخر 24 ساعة', value: formatNumber(failedCount), tone: 'danger' as const }] : []),
  ]

  const supplierColumns: StorelyDataTableColumn<Supplier>[] = [
    {
      key: 'supplier',
      header: 'المورد',
      sortable: true,
      sortValue: (supplier) => supplier.name,
      className: 'min-w-[240px]',
      cell: (supplier) => (
        <div className="min-w-0">
          <div className="truncate font-semibold text-[#203640]">{supplier.name}</div>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#66737C]">
            <span>{formatNumber(linkedCounts[supplier.id] || 0)} منتج مرتبط</span>
            {supplier.marketplace_supplier_id ? <span>من السوق</span> : null}
          </div>
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'بيانات التواصل',
      className: 'whitespace-nowrap text-[#66737C]',
      cell: (supplier) => <span dir="ltr">{supplier.phone || '-'}</span>,
    },
    {
      key: 'notify',
      header: 'جدولة الطلب',
      sortable: true,
      sortValue: (supplier) => notifyLabel(supplier.notify_mode, supplier.notify_time, supplier.notify_day),
      className: 'whitespace-nowrap text-[#66737C]',
      cell: (supplier) => notifyLabel(supplier.notify_mode, supplier.notify_time, supplier.notify_day),
    },
    {
      key: 'status',
      header: 'الحالة',
      sortable: true,
      sortValue: (supplier) => linkedCounts[supplier.id] || 0,
      cell: (supplier) => {
        const linked = linkedCounts[supplier.id] || 0
        const failed = failedRecentMap[supplier.id] || 0
        return (
          <div className="flex flex-wrap gap-1.5">
            <StorelyStatusBadge status={linked > 0 ? 'success' : 'warning'}>{linked > 0 ? 'نشط' : 'غير نشط'}</StorelyStatusBadge>
            {failed > 0 ? <StorelyStatusBadge status="danger">متأخر</StorelyStatusBadge> : null}
          </div>
        )
      },
    },
    {
      key: 'products',
      header: 'المنتجات',
      sortable: true,
      sortValue: (supplier) => linkedCounts[supplier.id] || 0,
      className: 'whitespace-nowrap text-[#66737C]',
      cell: (supplier) => `${formatNumber(linkedCounts[supplier.id] || 0)} منتج`,
    },
    {
      key: 'rating',
      header: 'الأداء',
      sortable: true,
      sortValue: (supplier) => supplierRatings[supplier.id]?.stars ?? 0,
      className: 'whitespace-nowrap text-[#66737C]',
      cell: (supplier) => {
        const rating = supplierRatings[supplier.id]
        return rating?.hasData && rating?.stars != null ? `${rating.stars} تقييم` : 'لا توجد بيانات'
      },
    },
    {
      key: 'actions',
      header: 'الإجراءات',
      className: 'w-[96px] whitespace-nowrap',
      cell: (supplier) => (
        <StorelyTableActionGroup>
          <StorelyTableAction action="view" onClick={(event) => { event.stopPropagation(); setSelectedSupplierId((current) => current === supplier.id ? null : supplier.id) }} />
          <StorelyTableAction action="more" aria-label="تفاصيل المورد" title="تفاصيل المورد" onClick={(event) => { event.stopPropagation(); setSelectedSupplierId(supplier.id) }} />
        </StorelyTableActionGroup>
      ),
    },
  ]

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 text-center text-sm text-[#66737C]" dir="rtl">
        جاري التحميل...
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pb-8" dir="rtl">
      <StorelyPageHeader
        title="الموردون"
        description="إدارة الموردين وربط المنتجات وجدولة طلبات التوريد."
        actions={
          <>
            {priceComparisons.length > 0 ? (
              <StorelyButton variant="secondary" icon={<BarChart3 size={16} />} onClick={() => setShowPriceComparison(true)}>
                مقارنة الأسعار
                <span className="mr-1 rounded-[5px] border border-[#E7E1D8] bg-[#F8EEDF]/60 px-1.5 py-0.5 text-[11px] text-[#203640]">{priceComparisons.length}</span>
              </StorelyButton>
            ) : null}
            <StorelyButton variant="primary" icon={<Plus size={16} />} onClick={() => setShowAdd(true)}>إضافة مورد</StorelyButton>
          </>
        }
      />

      {showAdd ? (
        <StorelyCard
          title="إضافة مورد جديد"
          description="أدخل بيانات التواصل الأساسية، ثم اربط المنتجات من تفاصيل المورد."
          className="mb-4"
        >
          <div className="space-y-3 p-3">
            <div className="grid gap-3 md:grid-cols-2">
              <StorelyFormField label="اسم المورد" required>
                <input className={inputClass()} value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="اسم المورد" />
              </StorelyFormField>
              <StorelyFormField label="رقم الجوال" required>
                <div className="flex gap-2">
                  <select className={inputClass('w-28 shrink-0')} value={supCountry} onChange={(event) => setSupCountry(event.target.value)}>
                    {COUNTRY_CODES.map((code) => <option key={code} value={code}>{code}</option>)}
                  </select>
                  <input className={inputClass('text-left')} value={newPhone} onChange={(event) => setNewPhone(event.target.value)} dir="ltr" placeholder={supCountry === '+966' ? '5xxxxxxxx' : supCountry === '+20' ? '1xxxxxxxxx' : 'xxxxxxxxxx'} />
                </div>
              </StorelyFormField>
            </div>
            <StorelyFormField label="ملاحظات عامة">
              <input className={inputClass()} value={newNotes} onChange={(event) => setNewNotes(event.target.value)} placeholder="اختياري" />
            </StorelyFormField>
            <label className="flex cursor-pointer items-start gap-2 rounded-[6px] border border-[#D9CDBE] bg-[#F8EEDF]/45 p-3 text-xs leading-5 text-[#203640]">
              <input className="mt-1 size-4 shrink-0 accent-[#203640]" type="checkbox" checked={newConsent} onChange={(event) => setNewConsent(event.target.checked)} />
              <span>أقر بأن هذا المورد وافق على استلام رسائل واتساب مني بخصوص طلبات التوريد.</span>
            </label>
            <div className="flex flex-wrap gap-2">
              <StorelyButton variant="primary" onClick={addSupplier}>حفظ المورد</StorelyButton>
              <StorelyButton variant="secondary" onClick={() => setShowAdd(false)}>إلغاء</StorelyButton>
            </div>
          </div>
        </StorelyCard>
      ) : null}

      <div className="mb-4 flex flex-col gap-2 rounded-[6px] border border-[#E7E1D8] bg-white p-2.5 md:flex-row md:items-center">
        <label className="relative block min-w-0 flex-1 md:max-w-sm">
          <Search className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#8EA0B1]" size={15} />
          <input
            className={inputClass('pr-8')}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ابحث باسم المورد أو رقم الجوال"
          />
        </label>
        <select className={inputClass('md:w-44')} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as any)}>
          <option value="all">كل الحالات</option>
          <option value="linked">نشط</option>
          <option value="unlinked">غير نشط</option>
          <option value="failed">لديهم فشل إرسال</option>
        </select>
        {(query || statusFilter !== 'all') ? (
          <StorelyButton variant="ghost" onClick={() => { setQuery(''); setStatusFilter('all') }}>إزالة الفلاتر</StorelyButton>
        ) : null}
      </div>

      <StorelyMetricStrip metrics={metrics} className="mb-4" />

      {selectedSupplier ? (
        <div ref={detailsRef}>
          <SupplierWorkspace
            key={selectedSupplier.id}
            supplier={selectedSupplier}
            products={products}
            orgId={orgId}
            onRefresh={refresh}
            allSuppliers={suppliers}
            curr={curr}
            recentFailedCount={failedRecentMap[selectedSupplier.id] || 0}
            onClose={() => setSelectedSupplierId(null)}
          />
        </div>
      ) : null}

      {unlinkedProducts.length > 0 ? (
        <div className="mb-4 rounded-[6px] border border-[#D9CDBE] bg-[#F8EEDF]/35 p-3">
          <div className="text-sm font-semibold text-[#203640]">{formatNumber(unlinkedProducts.length)} منتج بدون مورد مرتبط</div>
          <div className="mt-1 text-xs leading-5 text-[#66737C]">اربط هذه المنتجات بموردين لتفعيل الطلبات التلقائية.</div>
        </div>
      ) : null}

      {suppliers.length === 0 ? (
        <StorelyEmptyState
          icon={<Truck size={16} />}
          title="لا يوجد موردون بعد"
          description="أضف أول مورد وابدأ بربط المنتجات وطلبات التوريد."
          action={<StorelyButton variant="primary" icon={<Plus size={16} />} onClick={() => setShowAdd(true)}>إضافة مورد</StorelyButton>}
        />
      ) : filteredSuppliers.length === 0 ? (
        <StorelyEmptyState
          title="لا توجد نتائج"
          description="جرّب تعديل البحث أو الفلاتر الحالية."
          action={<StorelyButton variant="secondary" onClick={() => { setQuery(''); setStatusFilter('all') }}>إزالة الفلاتر</StorelyButton>}
        />
      ) : (
        <StorelyDataTable
          columns={supplierColumns}
          data={filteredSuppliers}
          rowKey="id"
          searchable={false}
          pageSize={12}
          onRowClick={(supplier) => setSelectedSupplierId((current) => current === supplier.id ? null : supplier.id)}
          emptyState={<StorelyEmptyState title="لا توجد نتائج" description="غيّر البحث أو الفلاتر الحالية." />}
        />
      )}

      {showPriceComparison ? (
        <Modal title="مقارنة أسعار الموردين" description="بناءً على آخر 6 أشهر من سجل المشتريات." onClose={() => setShowPriceComparison(false)} maxWidth="max-w-xl">
          <div className="space-y-3">
            {priceComparisons.map((comparison, index) => (
              <div key={index} className="rounded-[6px] border border-[#E7E1D8] p-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="font-semibold text-[#203640]">{comparison.name}</span>
                  {comparison.savingsPct > 0 ? <StorelyStatusBadge status="info">وفر حتى {comparison.savingsPct}%</StorelyStatusBadge> : null}
                </div>
                <div className="space-y-1.5">
                  {comparison.suppliers.map((supplier: any, supplierIndex: number) => (
                    <div key={supplierIndex} className="flex items-center justify-between gap-3 rounded-[5px] border border-[#E7E1D8] bg-[#F8EEDF]/25 px-2.5 py-2 text-sm">
                      <span className="text-[#43525B]">{supplier.supplier}</span>
                      <span className="font-semibold text-[#203640]">{supplier.unitPrice} {curr || 'ر.س'} / {supplier.unit || 'وحدة'}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Modal>
      ) : null}
    </div>
  )
}
