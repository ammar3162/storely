'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { colors, font, card, btnPrimary, btnSecondary, inp, pageTitle, pageSub, radius } from '@/lib/ds'
import { toast } from '@/components/toast'
import { confirmDialog } from '@/components/ConfirmDialog'

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

  const sb = createClient()

  useEffect(()=>{ init() },[])
  useEffect(()=>{ if(orgId && fromBranch) loadProducts() },[orgId, fromBranch])
  useEffect(()=>{ if(orgId) loadHistory(orgId) },[filterFrom, filterTo])
  useEffect(()=>{ setCart([]) },[fromBranch, toBranch])

  async function init() {
    let oid = sessionStorage.getItem('s_org_id')
    if(!oid){
      const{data:{user}}=await sb.auth.getUser()
      if(!user) return
      const{data:p}=await sb.from('profiles').select('org_id').eq('id',user.id).single()
      if(!p) return
      oid=p.org_id; sessionStorage.setItem('s_org_id',oid!)
    }
    setOrgId(oid!)
    const{data:bList}=await sb.from('branches').select('id,name').eq('org_id',oid!).eq('is_active',true).order('created_at')
    setBranches(bList||[])
    loadHistory(oid!)
  }

  async function loadProducts() {
    const{data}=await sb.from('products').select('id,name,unit,qty').eq('org_id',orgId).eq('branch_id',fromBranch).eq('is_active',true).order('name')
    setProducts(data||[])
    setProductId('')
    setProductSearch('')
  }

  function swapBranches() {
    const f=fromBranch, t=toBranch
    setFromBranch(t); setToBranch(f)
  }

  async function loadHistory(oid:string) {
    setLoadingHistory(true)
    try {
      const params = new URLSearchParams({ org_id: oid })
      if(filterFrom) params.set('from', filterFrom)
      if(filterTo) params.set('to', filterTo)
      const res = await fetch(`/api/branch-transfer?${params.toString()}`)
      const j = await res.json()
      if(j.success) setHistory(j.transfers||[])
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
    if(fromBranch===toBranch){ toast('لازم يكون الفرعين مختلفين','warning'); return }
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
    toast(`✅ أُضيف ${selectedProduct.name} للقائمة`)
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

    if(failed.length===0) toast(`✅ تم نقل ${successCount} ${successCount===1?'صنف':'أصناف'} بنجاح`)
    else if(successCount===0) toast('فشل نقل كل الأصناف — حاول مرة ثانية','error')
    else toast(`⚠️ نُقل ${successCount} ونجاح، وفشل: ${failed.join('، ')}`,'warning')

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
      const { data: org } = orgId ? await sb.from('organizations').select('name').eq('id', orgId).single() : { data: null }
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
    <div style={{fontFamily:font.family,direction:'rtl',maxWidth:960,margin:'0 auto'}}>
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20}}>
        <div style={{width:44,height:44,borderRadius:radius.md,background:colors.primaryLight,border:`1px solid ${colors.primaryBorder}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0}}>🔄</div>
        <div>
          <h1 style={{...pageTitle,marginBottom:1}}>نقل مخزون بين الفروع</h1>
          <p style={{...pageSub}}>اختر الفروع، جمّع الأصناف اللي تبي تنقلها، وأكّد النقلة دفعة وحدة</p>
        </div>
      </div>

      <div style={{...card,padding:'22px 24px',marginBottom:20}}>
        {/* Branches */}
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:20}}>
          <div style={{flex:1}}>
            <label style={{fontSize:11,fontWeight:700,color:colors.text4,display:'block',marginBottom:5}}>🏢 من فرع</label>
            <select value={fromBranch} onChange={e=>setFromBranch(e.target.value)} style={inp()}>
              <option value="">اختر الفرع المصدر</option>
              {branches.filter((b:any)=>b.id!==toBranch).map((b:any)=>(<option key={b.id} value={b.id}>{b.name}</option>))}
            </select>
          </div>
          <button type="button" onClick={swapBranches} disabled={!fromBranch&&!toBranch}
            title="بدّل الفرعين"
            style={{width:42,height:42,borderRadius:radius.md,border:`1.5px solid ${colors.primaryBorder}`,background:colors.primaryLight,color:colors.primary,fontSize:18,fontWeight:700,cursor:(!fromBranch&&!toBranch)?'default':'pointer',opacity:(!fromBranch&&!toBranch)?0.4:1,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'inherit',marginTop:20,transition:'transform .15s'}}>
            ⇄
          </button>
          <div style={{flex:1}}>
            <label style={{fontSize:11,fontWeight:700,color:colors.text4,display:'block',marginBottom:5}}>🏢 إلى فرع</label>
            <select value={toBranch} onChange={e=>setToBranch(e.target.value)} style={inp()}>
              <option value="">اختر الفرع الوجهة</option>
              {branches.filter((b:any)=>b.id!==fromBranch).map((b:any)=>(<option key={b.id} value={b.id}>{b.name}</option>))}
            </select>
          </div>
        </div>

        {/* Add product row */}
        <div style={{display:'grid',gridTemplateColumns:'2fr 1fr auto',gap:10,marginBottom:16,alignItems:'flex-end'}}>
          <div style={{position:'relative'}}>
            <label style={{fontSize:11,fontWeight:700,color:colors.text4,display:'block',marginBottom:5}}>📦 الصنف</label>
            <input
              value={selectedProduct ? `${selectedProduct.name} — متبقي: ${remainingForSelected} ${selectedProduct.unit}` : productSearch}
              onChange={e=>{ setProductSearch(e.target.value); setProductId(''); setShowProductList(true) }}
              onFocus={()=>setShowProductList(true)}
              onBlur={()=>setTimeout(()=>setShowProductList(false),150)}
              disabled={!fromBranch||!toBranch}
              placeholder={!fromBranch||!toBranch ? 'اختر الفروع أول' : 'ابحث عن صنف...'}
              style={inp()}
            />
            {showProductList && fromBranch && toBranch && (
              <div style={{position:'absolute',top:'100%',right:0,left:0,marginTop:4,background:colors.surface,border:`1px solid ${colors.border2}`,borderRadius:radius.md,boxShadow:'0 8px 24px rgba(0,0,0,.1)',zIndex:20,maxHeight:220,overflowY:'auto' as const}}>
                {products.filter((p:any)=>!productSearch||p.name.includes(productSearch)).length===0 ? (
                  <div style={{padding:'12px 14px',fontSize:12,color:colors.text4}}>ما فيه أصناف مطابقة</div>
                ) : products.filter((p:any)=>!productSearch||p.name.includes(productSearch)).map((p:any)=>{
                  const inCartQty = cart.find(c=>c.productId===p.id)?.qty || 0
                  return (
                    <div key={p.id} onMouseDown={()=>{ setProductId(p.id); setProductSearch(''); setShowProductList(false) }}
                      style={{padding:'10px 14px',cursor:'pointer',fontSize:13,color:colors.text,borderBottom:`1px solid ${colors.border}`,display:'flex',justifyContent:'space-between'}}
                      onMouseEnter={e=>(e.currentTarget.style.background=colors.bg)}
                      onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
                      <span style={{fontWeight:600}}>{p.name}{inCartQty>0 && <span style={{color:colors.primary,fontWeight:700}}> — {inCartQty} بالقائمة</span>}</span>
                      <span style={{color:colors.text4,fontSize:11}}>متوفر: {p.qty - inCartQty} {p.unit}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
          <div>
            <label style={{fontSize:11,fontWeight:700,color:colors.text4,display:'block',marginBottom:5}}>الكمية{selectedProduct?` (${selectedProduct.unit})`:''}</label>
            <input type="number" value={qty} onChange={e=>setQty(e.target.value)} style={inp()} placeholder="0"/>
          </div>
          <button onClick={addToCart} disabled={!productId||!qty} style={{...btnSecondary,padding:'11px 18px',height:44,opacity:(!productId||!qty)?0.5:1,cursor:(!productId||!qty)?'not-allowed':'pointer'}}>
            + أضف
          </button>
        </div>

        {/* Cart */}
        {cart.length>0 && (
          <div style={{marginBottom:16}}>
            <div style={{fontSize:12,fontWeight:700,color:colors.text3,marginBottom:8}}>قائمة النقل ({cart.length} {cart.length===1?'صنف':'أصناف'} — {cartTotalQty} إجمالي الكمية)</div>
            <div style={{display:'flex',flexDirection:'column' as const,gap:6}}>
              {cart.map(item=>(
                <div key={item.productId} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'9px 12px',background:colors.primaryLight,border:`1px solid ${colors.primaryBorder}`,borderRadius:radius.sm}}>
                  <span style={{fontSize:13,fontWeight:700,color:colors.text}}>📦 {item.name}</span>
                  <div style={{display:'flex',alignItems:'center',gap:10}}>
                    <span style={{fontSize:13,fontWeight:800,color:colors.primary}}>{item.qty} {item.unit}</span>
                    <button onClick={()=>removeFromCart(item.productId)} title="إزالة"
                      style={{width:22,height:22,borderRadius:radius.full,border:'none',background:colors.dangerLight,color:colors.danger,fontSize:13,fontWeight:800,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'inherit'}}>×</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <button onClick={reviewAndSubmit} disabled={saving||cart.length===0} style={{...btnPrimary,padding:'12px 24px',opacity:(saving||cart.length===0)?0.6:1,cursor:(saving||cart.length===0)?'not-allowed':'pointer'}}>
          {saving?'⏳ جاري النقل...':`🔄 مراجعة وتأكيد النقل${cart.length>0?` (${cart.length})`:''}`}
        </button>
      </div>

      <div style={{...card,padding:'18px 20px'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14,flexWrap:'wrap' as const,gap:8}}>
          <div style={{fontSize:font.base,fontWeight:800,color:colors.text}}>📋 تقرير التحويلات</div>
          <div style={{display:'flex',gap:8}}>
            <button onClick={exportCSV} disabled={filteredHistory.length===0} style={{...btnPrimary,padding:'8px 14px',fontSize:font.xs,opacity:filteredHistory.length===0?0.6:1}}>📥 تصدير CSV</button>
            <button onClick={handleExportPdf} disabled={exportingPdf||filteredHistory.length===0} style={{...btnPrimary,padding:'8px 14px',fontSize:font.xs,opacity:exportingPdf||filteredHistory.length===0?0.6:1}}>
              {exportingPdf?'⏳ جاري التصدير...':'📄 تصدير PDF'}
            </button>
          </div>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:8,marginBottom:12}}>
          <div>
            <label style={{fontSize:10,fontWeight:700,color:colors.text4,display:'block',marginBottom:3}}>من تاريخ</label>
            <input type="date" value={filterFrom} onChange={e=>setFilterFrom(e.target.value)} style={{...inp(),fontSize:12}}/>
          </div>
          <div>
            <label style={{fontSize:10,fontWeight:700,color:colors.text4,display:'block',marginBottom:3}}>إلى تاريخ</label>
            <input type="date" value={filterTo} onChange={e=>setFilterTo(e.target.value)} style={{...inp(),fontSize:12}}/>
          </div>
          <div>
            <label style={{fontSize:10,fontWeight:700,color:colors.text4,display:'block',marginBottom:3}}>الفرع المصدر</label>
            <select value={filterBranch} onChange={e=>setFilterBranch(e.target.value)} style={{...inp(),fontSize:12}}>
              <option value="">الكل</option>
              {branches.map((b:any)=>(<option key={b.id} value={b.id}>{b.name}</option>))}
            </select>
          </div>
          <div>
            <label style={{fontSize:10,fontWeight:700,color:colors.text4,display:'block',marginBottom:3}}>بحث بالصنف</label>
            <input value={filterProduct} onChange={e=>setFilterProduct(e.target.value)} placeholder="اسم الصنف" style={{...inp(),fontSize:12}}/>
          </div>
        </div>

        <div style={{display:'flex',gap:10,marginBottom:14}}>
          <div style={{...card,padding:'8px 14px',background:colors.primaryLight,border:`1px solid ${colors.primaryBorder}`,flex:1,textAlign:'center' as const}}>
            <div style={{fontSize:16,fontWeight:900,color:colors.primary}}>{totalOps}</div>
            <div style={{fontSize:10,color:colors.primary,fontWeight:600}}>عدد عمليات النقل</div>
          </div>
          <div style={{...card,padding:'8px 14px',background:colors.infoLight,border:`1px solid ${colors.infoBorder}`,flex:1,textAlign:'center' as const}}>
            <div style={{fontSize:16,fontWeight:900,color:colors.info}}>{totalQty.toLocaleString('ar-SA', {numberingSystem:'latn'})}</div>
            <div style={{fontSize:10,color:colors.info,fontWeight:600}}>إجمالي الكمية المنقولة</div>
          </div>
        </div>

        {loadingHistory ? (
          <div style={{fontSize:12,color:colors.text4}}>جاري التحميل...</div>
        ) : filteredHistory.length===0 ? (
          <div style={{textAlign:'center' as const,padding:'28px 16px'}}>
            <div style={{fontSize:28,marginBottom:8,opacity:0.5}}>📭</div>
            <div style={{fontSize:12,color:colors.text4}}>ما فيه عمليات نقل مطابقة</div>
          </div>
        ) : (
          <div style={{display:'flex',flexDirection:'column' as const,gap:6}}>
            {filteredHistory.map((h:any)=>(
              <div key={h.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 12px',background:colors.bg,borderRadius:radius.sm}}>
                <div>
                  <span style={{fontSize:12,fontWeight:700,color:colors.text}}>{(h.products as any)?.name}</span>
                  <span style={{fontSize:11,color:colors.text4,marginRight:8}}>{branchName(h.branch_id)} ← {destBranchFromNote(h.note)}</span>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <span style={{fontSize:12,fontWeight:700,color:colors.danger}}>-{Math.abs(h.qty_change)} {(h.products as any)?.unit}</span>
                  <span style={{fontSize:10,color:colors.text4}}>{new Date(h.created_at).toLocaleDateString('ar-SA', {numberingSystem:'latn'})}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
