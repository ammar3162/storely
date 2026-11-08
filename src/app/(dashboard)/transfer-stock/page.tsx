'use client'
import { StorelyPageHeader } from '@/components/ui/page-header'
import { StorelyButton } from '@/components/ui/button'
import { StorelyCard } from '@/components/ui/card'
import { StorelyFormField } from '@/components/ui/form-field'
import { StorelyEmptyState } from '@/components/ui/empty-state'
import { storelyTokens as T } from '@/components/ui/design-tokens'
import { ArrowRightLeft } from 'lucide-react'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api-client'
import { getMe, getOrgId } from '@/lib/session'
import { colors } from '@/lib/ds'
import { toast } from '@/components/toast'
import { confirmDialog } from '@/components/ConfirmDialog'
import { cache } from '@/lib/cache'
import { ListSkeleton } from '@/components/PageSkeleton'
import { useLiveRefresh } from '@/lib/useLiveRefresh'
import NumberInput from '@/components/NumberInput'

type CartItem = { productId: string; name: string; unit: string; qty: number; available: number }

export default function TransferStockPage() {
  const [orgId, setOrgId] = useState('')
  const [branches, setBranches] = useState<any[]>([])
  const [fromBranch, setFromBranch] = useState('')
  const [toBranch, setToBranch] = useState('')
  const [products, setProducts] = useState<any[]>([])
  const [productId, setProductId] = useState('')
  const [productSearch, setProductSearch] = useState('')
  const [showProductList, setShowProductList] = useState(false)
  const [qty, setQty] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [saving, setSaving] = useState(false)
  const [history, setHistory] = useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')
  const [filterBranch, setFilterBranch] = useState('')
  const [filterProduct, setFilterProduct] = useState('')
  const [exportingPdf, setExportingPdf] = useState(false)

  useEffect(()=>{ init() },[])
  useEffect(()=>{ if(orgId && fromBranch) loadProducts() },[orgId, fromBranch])
  useEffect(()=>{ if(orgId) loadHistory(orgId) },[filterFrom, filterTo])
  useEffect(()=>{ setCart([]) },[fromBranch, toBranch])

  async function init() {
    const oid = await getOrgId()
    if(!oid) return
    setOrgId(oid)
    const bj = await api.get('/api/branches', { org_id: oid })
    setBranches(bj.branches||[])
    loadHistory(oid)
  }

  useLiveRefresh(orgId || null, ['stock_movements', 'branches'], () => {
    if (!orgId) return
    loadHistory(orgId)
    api.get('/api/branches', { org_id: orgId }).then(bj => { if (bj.branches) setBranches(bj.branches) })
  })

  async function loadProducts() {
    const pj = await api.get('/api/products', { org_id: orgId, branch_id: fromBranch })
    setProducts(pj.products||[])
    setProductId('')
    setProductSearch('')
  }

  function swapBranches() {
    const f=fromBranch, t=toBranch
    setFromBranch(t); setToBranch(f)
  }

  async function loadHistory(oid:string) {
    const cacheKey = 'transfer-history:'+oid+':'+(filterFrom||'')+':'+(filterTo||'')
    const cached = cache.get(cacheKey)
    if (cached) { setHistory(cached); setLoadingHistory(false) }
    else setLoadingHistory(true)
    try {
      const params = new URLSearchParams({ org_id: oid })
      if(filterFrom) params.set('from', filterFrom)
      if(filterTo) params.set('to', filterTo)
      const res = await fetch(`/api/branch-transfer?${params.toString()}`)
      const j = await res.json()
      if(j.success) { setHistory(j.transfers||[]); cache.set(cacheKey, j.transfers||[]) }
      else { toast(j.error||'تعذر تحميل السجل','error'); setHistory([]) }
    } catch {
      toast('خطأ بالاتصال','error'); setHistory([])
    }
    setLoadingHistory(false)
  }

  const selectedProduct = products.find((p:any)=>p.id===productId)
  const cartQtyForSelected = cart.find(c=>c.productId===productId)?.qty || 0
  const remainingForSelected = selectedProduct ? selectedProduct.qty - cartQtyForSelected : 0

  function addToCart() {
    if(!fromBranch||!toBranch){ toast('اختر الفرعين أول','warning'); return }
    if(fromBranch===toBranch){ toast('يجب أن يكون الفرعان مختلفين','warning'); return }
    if(!productId||!qty){ toast('اختر صنف وكمية','warning'); return }
    const qtyNum = Number(qty)
    if(!(qtyNum>0)){ toast('الكمية غير صحيحة','warning'); return }
    if(!selectedProduct){ toast('الصنف غير موجود','error'); return }
    if(qtyNum > remainingForSelected){ toast(`الكمية أكبر من المتوفر (متبقي ${remainingForSelected} ${selectedProduct.unit})`,'warning'); return }

    setCart(prev=>{
      const existing = prev.find(c=>c.productId===productId)
      if(existing) return prev.map(c=>c.productId===productId ? {...c, qty:c.qty+qtyNum} : c)
      return [...prev, { productId, name:selectedProduct.name, unit:selectedProduct.unit, qty:qtyNum, available:selectedProduct.qty }]
    })
    setQty(''); setProductId(''); setProductSearch('')
    toast(`أُضيف ${selectedProduct.name} للقائمة`)
  }

  function removeFromCart(pid:string) {
    setCart(prev=>prev.filter(c=>c.productId!==pid))
  }

  async function reviewAndSubmit() {
    if(cart.length===0){ toast('أضف صنف واحد على الأقل للنقل','warning'); return }
    const fromName = branchName(fromBranch), toName = branchName(toBranch)
    const summary = cart.map(c=>`• ${c.name}: ${c.qty} ${c.unit}`).join('\n')
    const ok = await confirmDialog({
      title: `تأكيد نقل ${cart.length} ${cart.length===1?'صنف':'أصناف'}`,
      message: `من "${fromName}" إلى "${toName}":\n\n${summary}`,
    })
    if(!ok) return

    setSaving(true)
    let successCount = 0
    const failed: string[] = []
    for(const item of cart) {
      try {
        const res = await fetch('/api/branch-transfer',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
          org_id:orgId, from_branch_id:fromBranch, to_branch_id:toBranch, product_id:item.productId, qty:item.qty,
        })})
        const j = await res.json()
        if(j.success) successCount++
        else failed.push(item.name)
      } catch { failed.push(item.name) }
    }
    setSaving(false)

    if(failed.length===0) toast(`تم نقل ${successCount} ${successCount===1?'صنف':'أصناف'} بنجاح`)
    else if(successCount===0) toast('فشل نقل كل الأصناف — حاول مرة ثانية','error')
    else toast(`نُقل ${successCount} ونجاح، وفشل: ${failed.join('، ')}`,'warning')

    setCart([])
    loadProducts()
    loadHistory(orgId)
  }

  const branchName = (id:string) => branches.find((b:any)=>b.id===id)?.name || '—'

  function destBranchFromNote(note:string) {
    return (note||'').replace('نقل إلى فرع ', '').trim() || '—'
  }

  function exportCSV() {
    const csv = '\ufeff' + [
      ['التاريخ','المنتج','من فرع','إلى فرع','الكمية','الوحدة'],
      ...filteredHistory.map((h:any)=>[
        new Date(h.created_at).toLocaleDateString('en-GB'),
        (h.products as any)?.name || '',
        branchName(h.branch_id),
        destBranchFromNote(h.note),
        Math.abs(h.qty_change),
        (h.products as any)?.unit || '',
      ])
    ].map(r=>r.map(c=>'"'+c+'"').join(',')).join('\n')
    Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' })),
      download: 'تقرير_نقل_المخزون.csv',
    }).click()
  }

  async function handleExportPdf() {
    setExportingPdf(true)
    try {
      const org = (await getMe())?.org
      const { exportReportPdf } = await import('@/lib/pdfExport')
      await exportReportPdf({
        title: 'تقرير نقل المخزون بين الفروع',
        subtitle: filterFrom || filterTo ? `${filterFrom||'البداية'} — ${filterTo||'اليوم'}` : 'كل الفترات',
        orgName: (org as any)?.name || 'Storely',
        logoUrl: '/storely-logo.png',
        columns: [
          { header: 'التاريخ', key: 'date' },
          { header: 'المنتج', key: 'product' },
          { header: 'من فرع', key: 'from' },
          { header: 'إلى فرع', key: 'to' },
          { header: 'الكمية', key: 'qty', align: 'left' },
        ],
        rows: filteredHistory.map((h:any) => ({
          date: new Date(h.created_at).toLocaleDateString('ar-SA', {numberingSystem:'latn'}),
          product: (h.products as any)?.name || '—',
          from: branchName(h.branch_id),
          to: destBranchFromNote(h.note),
          qty: Math.abs(h.qty_change) + ' ' + ((h.products as any)?.unit || ''),
        })),
        summaryStats: [
          { label: 'عمليات النقل', value: String(totalOps), color: colors.primary },
          { label: 'إجمالي الكمية', value: String(totalQty), color: colors.info },
        ],
        fileName: `تقرير-نقل-المخزون-${new Date().toISOString().slice(0,10)}.pdf`,
      })
    } catch { toast('تعذر تصدير التقرير','error') }
    setExportingPdf(false)
  }

  const filteredHistory = history.filter((h:any)=>{
    if(filterBranch && h.branch_id!==filterBranch) return false
    if(filterProduct && !((h.products as any)?.name||'').includes(filterProduct.trim())) return false
    return true
  })
  const totalOps = filteredHistory.length
  const totalQty = filteredHistory.reduce((s:number,h:any)=>s+Math.abs(h.qty_change),0)
  const cartTotalQty = cart.reduce((s,c)=>s+c.qty,0)

  return (
    <div className="transfer-page">
      <style>{`
        .transfer-page{max-width:1100px;min-width:0;margin:0 auto;padding:${T.spacing[6]}px;direction:rtl;background:${T.color.background};color:${T.color.text};font-family:${T.typography.family};font-size:${T.typography.body}px;line-height:${T.typography.lineHeight};border-radius:${T.radius.panel}}
        .transfer-page *{box-sizing:border-box}
        .transfer-page>header{margin-bottom:${T.spacing[6]}px}
        .transfer-page>header h1{font-size:${T.typography.title}px;line-height:1.6}
        .transfer-page>header p{font-size:${T.typography.body}px;line-height:${T.typography.lineHeight}}
        .transfer-page .ts-workspace{padding:${T.spacing[6]}px;background:${T.color.surface};border-color:${T.color.border};border-radius:${T.radius.card};overflow:visible}
        .ts-form{margin-bottom:${T.spacing[6]}px}
        .ts-branches{display:grid;grid-template-columns:minmax(0,1fr) 44px minmax(0,1fr);align-items:end;gap:${T.spacing[4]}px;padding-bottom:${T.spacing[6]}px;margin-bottom:${T.spacing[6]}px;border-bottom:1px solid ${T.color.border}}
        .ts-product-entry{display:grid;grid-template-columns:minmax(0,2fr) minmax(120px,1fr) auto;align-items:end;gap:${T.spacing[4]}px;margin-bottom:${T.spacing[6]}px}
        .transfer-page label{color:${T.color.textMuted};font-size:${T.typography.supporting}px;line-height:${T.typography.lineHeight};margin-bottom:${T.spacing[2]}px;letter-spacing:0}
        .transfer-page .ts-control{width:100%;min-width:0;height:44px;padding:${T.spacing[2]}px ${T.spacing[3]}px;border:1px solid ${T.color.infoBorder};border-radius:${T.radius.control};background:${T.color.surface};color:${T.color.text};font-family:inherit;font-size:${T.typography.body}px;line-height:${T.typography.lineHeight};transition:border-color .15s,box-shadow .15s}
        .transfer-page .ts-control::placeholder{color:${T.color.textSubtle};opacity:1}
        .transfer-page .ts-control:disabled{background:${T.color.background};color:${T.color.textMuted};cursor:not-allowed}
        .transfer-page input[type=number]{font-variant-numeric:tabular-nums;direction:ltr;text-align:right}
        .transfer-page input[type=date]{direction:ltr;text-align:right}
        .transfer-page .ts-control:focus-visible,.transfer-page button:focus-visible{outline:2px solid ${T.color.navy};outline-offset:2px;box-shadow:${T.shadow.focus}}
        .transfer-page .ts-button{height:auto;min-height:40px;padding:${T.spacing[2]}px ${T.spacing[4]}px;gap:${T.spacing[2]}px;border:1px solid ${T.color.infoBorder};border-radius:${T.radius.control};background:${T.color.surface};color:${T.color.navy};font-size:${T.typography.body}px;line-height:1.6;font-weight:600;white-space:normal;font-family:inherit;box-shadow:none;cursor:pointer}
        .transfer-page .ts-button:hover:not(:disabled){background:${T.color.infoBg};border-color:${T.color.infoBorder}}
        .transfer-page .ts-button:disabled{opacity:.5;cursor:not-allowed}
        .transfer-page .ts-primary{background:${T.color.navy};border-color:${T.color.navy};color:${T.color.surface}}
        .transfer-page .ts-primary:hover:not(:disabled){background:${T.color.navy};border-color:${T.color.navy};color:${T.color.surface}}
        .transfer-page .ts-swap{width:44px;height:44px;padding:0;font-size:22px}
        .transfer-page .ts-add{min-height:44px}
        .transfer-page .ts-remove{width:36px;height:36px;min-height:36px;padding:0;flex-shrink:0;border-color:${T.color.dangerBorder};color:${T.color.danger};background:${T.color.surface};font-size:20px}
        .transfer-page .ts-remove:hover{background:${T.color.dangerBg};border-color:${T.color.dangerBorder}}
        .ts-product-field{position:relative;min-width:0}
        .ts-product-options{position:absolute;inset-inline:0;top:100%;margin-top:${T.spacing[1]}px;z-index:20;max-height:260px;overflow-y:auto;overscroll-behavior:contain;background:${T.color.surface};border:1px solid ${T.color.infoBorder};border-radius:${T.radius.control};box-shadow:${T.shadow.panel}}
        .ts-product-option{display:flex;justify-content:space-between;align-items:flex-start;gap:${T.spacing[4]}px;padding:${T.spacing[3]}px ${T.spacing[4]}px;border-bottom:1px solid ${T.color.border};cursor:pointer;font-size:${T.typography.body}px;overflow-wrap:anywhere}
        .ts-product-option:last-child{border-bottom:0}
        .ts-product-option:hover{background:${T.color.infoBg}!important}
        .ts-product-option>span:first-child{min-width:0;font-weight:600}
        .ts-product-option>.ts-supporting{flex-shrink:0}
        .ts-product-options>.ts-supporting{padding:${T.spacing[4]}px}
        .ts-record-name{font-size:${T.typography.body}px;font-weight:600;color:${T.color.text};overflow-wrap:anywhere}
        .ts-supporting{font-size:${T.typography.supporting}px;font-weight:400;color:${T.color.textMuted};line-height:1.8}
        .ts-cart{margin-bottom:${T.spacing[6]}px;padding-top:${T.spacing[6]}px;border-top:1px solid ${T.color.border}}
        .ts-cart-title{font-size:${T.typography.body}px;font-weight:600;color:${T.color.text};margin-bottom:${T.spacing[3]}px;line-height:${T.typography.lineHeight}}
        .ts-list{display:flex;flex-direction:column;min-width:0}
        .ts-cart-row,.ts-history-row{display:flex;align-items:center;justify-content:space-between;gap:${T.spacing[4]}px;min-height:56px;padding:${T.spacing[3]}px 0;border-bottom:1px solid ${T.color.border}}
        .ts-cart-row:last-child,.ts-history-row:last-child{border-bottom:0}
        .ts-cart-row>.ts-record-name{min-width:0;flex:1}
        .ts-inline{display:flex;align-items:center;gap:${T.spacing[3]}px;flex-shrink:0}
        .ts-cart-quantity,.ts-history-quantity{font-size:${T.typography.body}px;font-weight:600;font-variant-numeric:tabular-nums;color:${T.color.navy}}
        .ts-history-quantity{color:${T.color.danger}}
        .transfer-page .ts-submit{min-height:44px}
        .ts-report-header{display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:${T.spacing[4]}px;padding-bottom:${T.spacing[5]}px;margin-bottom:${T.spacing[5]}px;border-bottom:1px solid ${T.color.border}}
        .ts-section-title{font-size:${T.typography.section}px;font-weight:600;color:${T.color.text};line-height:${T.typography.lineHeight}}
        .ts-export-actions{display:flex;align-items:center;flex-wrap:wrap;gap:${T.spacing[2]}px}
        .ts-filters{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:${T.spacing[4]}px;margin-bottom:${T.spacing[5]}px}
        .ts-report-summary{display:flex;align-items:center;flex-wrap:wrap;gap:${T.spacing[6]}px;padding:${T.spacing[4]}px 0;margin-bottom:${T.spacing[2]}px;border-block:1px solid ${T.color.border}}
        .ts-summary-item{display:flex;align-items:baseline;gap:${T.spacing[2]}px}
        .ts-summary-value{font-size:${T.typography.section}px;font-weight:600;color:${T.color.navy};font-variant-numeric:tabular-nums}
        .ts-history-row>div:first-child{display:flex;flex-direction:column;gap:${T.spacing[1]}px;min-width:0;flex:1}
        .ts-history-row>.ts-inline{gap:${T.spacing[4]}px}
        .ts-history-empty{margin-top:${T.spacing[5]}px;background:${T.color.surface};border-color:${T.color.border};border-radius:${T.radius.control}}
        .ts-history-empty>div:first-child{background:${T.color.background};border-color:${T.color.border}}
        .ts-report>.ts-supporting{padding:${T.spacing[6]}px 0}
        @media(max-width:900px){.ts-filters{grid-template-columns:repeat(2,minmax(0,1fr))}}
        @media(max-width:640px){
          .transfer-page{padding:${T.spacing[4]}px}
          .transfer-page .ts-workspace{padding:${T.spacing[5]}px}
          .ts-branches{grid-template-columns:minmax(0,1fr);gap:${T.spacing[3]}px}
          .transfer-page .ts-swap{justify-self:center;transform:rotate(90deg)}
          .ts-product-entry{grid-template-columns:minmax(0,1fr);gap:${T.spacing[4]}px}
          .transfer-page .ts-add,.transfer-page .ts-submit{width:100%}
          .ts-product-option{flex-direction:column;gap:${T.spacing[1]}px}
          .ts-report-header{flex-direction:column}
          .ts-export-actions{width:100%}
          .ts-export-actions .ts-button{flex:1}
          .ts-history-row{align-items:flex-start;flex-direction:column;gap:${T.spacing[2]}px;padding:${T.spacing[4]}px 0}
          .ts-history-row>.ts-inline{width:100%;justify-content:space-between;flex-wrap:wrap;gap:${T.spacing[2]}px}
          .ts-cart-row{gap:${T.spacing[2]}px;flex-wrap:wrap}
          .ts-cart-row>.ts-inline{margin-inline-start:auto}
          .ts-report-summary{gap:${T.spacing[3]}px ${T.spacing[5]}px}
        }
        @media(max-width:420px){.ts-filters{grid-template-columns:minmax(0,1fr)}}
        @media(prefers-reduced-motion:reduce){.transfer-page *{transition:none!important}}
      `}</style>

      <StorelyPageHeader
        title="نقل مخزون بين الفروع"
        description="اختر الفروع، واجمع الأصناف التي تريد نقلها، ثم أكّد النقل دفعة واحدة"
      />

      <StorelyCard className="ts-workspace ts-form">
        {/* Branches */}
        <div className="ts-branches">
          <StorelyFormField label={<>من فرع</>} htmlFor="transfer-field-1">
            <select id="transfer-field-1" className="ts-control" value={fromBranch} onChange={e=>setFromBranch(e.target.value)}>
              <option value="">اختر الفرع المصدر</option>
              {branches.filter((b:any)=>b.id!==toBranch).map((b:any)=>(<option key={b.id} value={b.id}>{b.name}</option>))}
            </select>
          </StorelyFormField>
          <StorelyButton className="ts-button ts-swap" type="button" onClick={swapBranches} disabled={!fromBranch&&!toBranch}
            title="بدّل الفرعين">
                      </StorelyButton>
          <StorelyFormField label={<>إلى فرع</>} htmlFor="transfer-field-2">
            <select id="transfer-field-2" className="ts-control" value={toBranch} onChange={e=>setToBranch(e.target.value)}>
              <option value="">اختر الفرع الوجهة</option>
              {branches.filter((b:any)=>b.id!==fromBranch).map((b:any)=>(<option key={b.id} value={b.id}>{b.name}</option>))}
            </select>
          </StorelyFormField>
        </div>

        {/* Add product row */}
        <div className="ts-product-entry">
          <StorelyFormField className="ts-product-field" label={<>الصنف</>} htmlFor="transfer-field-3">
            <input id="transfer-field-3" className="ts-control"
              value={selectedProduct ? `${selectedProduct.name} — متبقي: ${remainingForSelected} ${selectedProduct.unit}` : productSearch}
              onChange={e=>{ setProductSearch(e.target.value); setProductId(''); setShowProductList(true) }}
              onFocus={()=>setShowProductList(true)}
              onBlur={()=>setTimeout(()=>setShowProductList(false),150)}
              disabled={!fromBranch||!toBranch}
              placeholder={!fromBranch||!toBranch ? 'اختر الفروع أول' : 'ابحث عن صنف...'}

            />
            {showProductList && fromBranch && toBranch && (
              <div className="ts-product-options">
                {products.filter((p:any)=>!productSearch||p.name.includes(productSearch)).length===0 ? (
                  <div className="ts-supporting">لا توجد أصناف مطابقة</div>
                ) : products.filter((p:any)=>!productSearch||p.name.includes(productSearch)).map((p:any)=>{
                  const inCartQty = cart.find(c=>c.productId===p.id)?.qty || 0
                  return (
                    <div className="ts-product-option" key={p.id} onMouseDown={()=>{ setProductId(p.id); setProductSearch(''); setShowProductList(false) }}

                      onMouseEnter={e=>(e.currentTarget.style.background=colors.bg)}
                      onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
                      <span >{p.name}{inCartQty>0 && <span className="ts-record-name"> — {inCartQty} بالقائمة</span>}</span>
                      <span className="ts-supporting">متوفر: {p.qty - inCartQty} {p.unit}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </StorelyFormField>
          <StorelyFormField label={<>الكمية{selectedProduct?` (${selectedProduct.unit})`:''}</>} htmlFor="transfer-field-4">
            <NumberInput id="transfer-field-4" className="ts-control" value={qty} onChange={e=>setQty(e.target.value)}  placeholder="0"/>
          </StorelyFormField>
          <StorelyButton className="ts-button ts-add" onClick={addToCart} disabled={!productId||!qty} >
            + أضف
          </StorelyButton>
        </div>

        {/* Cart */}
        {cart.length>0 && (
          <div className="ts-cart">
            <div className="ts-cart-title">قائمة النقل ({cart.length} {cart.length===1?'صنف':'أصناف'} — {cartTotalQty} إجمالي الكمية)</div>
            <div className="ts-list">
              {cart.map(item=>(
                <div className="ts-cart-row" key={item.productId} >
                  <span className="ts-record-name">{item.name}</span>
                  <div className="ts-inline">
                    <span className="ts-cart-quantity">{item.qty} {item.unit}</span>
                    <StorelyButton className="ts-button ts-remove" variant="danger" onClick={()=>removeFromCart(item.productId)} title="إزالة">×</StorelyButton>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <StorelyButton className="ts-button ts-primary ts-submit" variant="primary" onClick={reviewAndSubmit} disabled={saving||cart.length===0} >
          {saving?'جاري النقل...':`مراجعة وتأكيد النقل${cart.length>0?` (${cart.length})`:''}`}
        </StorelyButton>
      </StorelyCard>

      <StorelyCard className="ts-workspace ts-report">
        <div className="ts-report-header">
          <div className="ts-section-title">تقرير التحويلات</div>
          <div className="ts-export-actions">
            <StorelyButton className="ts-button" onClick={exportCSV} disabled={filteredHistory.length===0} >تصدير CSV</StorelyButton>
            <StorelyButton className="ts-button" onClick={handleExportPdf} disabled={exportingPdf||filteredHistory.length===0} >
              {exportingPdf?'جاري التصدير...':'تصدير PDF'}
            </StorelyButton>
          </div>
        </div>

        <div className="ts-filters">
          <StorelyFormField label={<>من تاريخ</>} htmlFor="transfer-field-5">
            <input id="transfer-field-5" className="ts-control" type="date" value={filterFrom} onChange={e=>setFilterFrom(e.target.value)} />
          </StorelyFormField>
          <StorelyFormField label={<>إلى تاريخ</>} htmlFor="transfer-field-6">
            <input id="transfer-field-6" className="ts-control" type="date" value={filterTo} onChange={e=>setFilterTo(e.target.value)} />
          </StorelyFormField>
          <StorelyFormField label={<>الفرع المصدر</>} htmlFor="transfer-field-7">
            <select id="transfer-field-7" className="ts-control" value={filterBranch} onChange={e=>setFilterBranch(e.target.value)}>
              <option value="">الكل</option>
              {branches.map((b:any)=>(<option key={b.id} value={b.id}>{b.name}</option>))}
            </select>
          </StorelyFormField>
          <StorelyFormField label={<>بحث بالصنف</>} htmlFor="transfer-field-8">
            <input id="transfer-field-8" className="ts-control" value={filterProduct} onChange={e=>setFilterProduct(e.target.value)} placeholder="اسم الصنف" />
          </StorelyFormField>
        </div>

        <div className="ts-report-summary">
          <div className="ts-summary-item">
            <div className="ts-summary-value">{totalOps}</div>
            <div className="ts-supporting">عدد عمليات النقل</div>
          </div>
          <div className="ts-summary-item">
            <div className="ts-summary-value">{totalQty.toLocaleString('ar-SA', {numberingSystem:'latn'})}</div>
            <div className="ts-supporting">إجمالي الكمية المنقولة</div>
          </div>
        </div>

        {loadingHistory ? (
          <ListSkeleton/>
        ) : filteredHistory.length===0 ? (
          <StorelyEmptyState className="ts-history-empty" icon={<ArrowRightLeft size={20}/>} title="لا توجد عمليات نقل مطابقة"/>
        ) : (
          <div className="ts-list">
            {filteredHistory.map((h:any)=>(
              <div className="ts-history-row" key={h.id} >
                <div>
                  <span className="ts-record-name">{(h.products as any)?.name}</span>
                  <span className="ts-supporting">{branchName(h.branch_id)} ← {destBranchFromNote(h.note)}</span>
                </div>
                <div className="ts-inline">
                  <span className="ts-history-quantity">-{Math.abs(h.qty_change)} {(h.products as any)?.unit}</span>
                  <span className="ts-supporting">{new Date(h.created_at).toLocaleDateString('ar-SA', {numberingSystem:'latn'})}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </StorelyCard>
    </div>
  )
}
