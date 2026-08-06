'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { colors, font, card, btnPrimary, inp, pageTitle, pageSub } from '@/lib/ds'
import { toast } from '@/components/toast'

export default function TransferStockPage() {
  const [orgId, setOrgId] = useState('')
  const [branches, setBranches] = useState<any[]>([])
  const [fromBranch, setFromBranch] = useState('')
  const [toBranch, setToBranch] = useState('')
  const [products, setProducts] = useState<any[]>([])
  const [productId, setProductId] = useState('')
  const [qty, setQty] = useState('')
  const [saving, setSaving] = useState(false)
  const [history, setHistory] = useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')
  const [filterBranch, setFilterBranch] = useState('')
  const [filterProduct, setFilterProduct] = useState('')

  const sb = createClient()

  useEffect(()=>{ init() },[])
  useEffect(()=>{ if(orgId && fromBranch) loadProducts() },[orgId, fromBranch])
  useEffect(()=>{ if(orgId) loadHistory(orgId) },[filterFrom, filterTo])

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

  async function submitTransfer() {
    if(!fromBranch||!toBranch||!productId||!qty){ toast('عبّي كل الحقول','warning'); return }
    if(fromBranch===toBranch){ toast('لازم يكون الفرعين مختلفين','warning'); return }
    if(selectedProduct && Number(qty) > Number(selectedProduct.qty)){ toast('الكمية أكبر من المتوفر','warning'); return }
    setSaving(true)
    const res = await fetch('/api/branch-transfer',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
      org_id:orgId, from_branch_id:fromBranch, to_branch_id:toBranch, product_id:productId, qty:Number(qty),
    })})
    const j = await res.json()
    setSaving(false)
    if(j.success){
      toast('✅ تم نقل المخزون بنجاح')
      setQty(''); setProductId('')
      loadProducts()
      loadHistory(orgId)
    } else toast(j.error||'خطأ','error')
  }

  const branchName = (id:string) => branches.find((b:any)=>b.id===id)?.name || '—'

  const filteredHistory = history.filter((h:any)=>{
    if(filterBranch && h.branch_id!==filterBranch) return false
    if(filterProduct && !((h.products as any)?.name||'').includes(filterProduct.trim())) return false
    return true
  })
  const totalOps = filteredHistory.length
  const totalQty = filteredHistory.reduce((s:number,h:any)=>s+Math.abs(h.qty_change),0)

  return (
    <div style={{fontFamily:font.family,direction:'rtl',maxWidth:900,margin:'0 auto'}}>
      <div style={{marginBottom:20}}>
        <h1 style={{...pageTitle}}>نقل مخزون بين الفروع</h1>
        <p style={{...pageSub}}>انقل كمية من صنف من فرع لفرع ثاني — تُخصم من المصدر وتُضاف للوجهة تلقائياً، وتُسجّل بسجل التحويلات</p>
      </div>

      <div style={{...card,padding:'18px 20px',marginBottom:20}}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
          <div>
            <label style={{fontSize:11,fontWeight:700,color:colors.text4,display:'block',marginBottom:4}}>من فرع</label>
            <select value={fromBranch} onChange={e=>setFromBranch(e.target.value)} style={inp()}>
              <option value="">اختر الفرع المصدر</option>
              {branches.filter((b:any)=>b.id!==toBranch).map((b:any)=>(<option key={b.id} value={b.id}>{b.name}</option>))}
            </select>
          </div>
          <div>
            <label style={{fontSize:11,fontWeight:700,color:colors.text4,display:'block',marginBottom:4}}>إلى فرع</label>
            <select value={toBranch} onChange={e=>setToBranch(e.target.value)} style={inp()}>
              <option value="">اختر الفرع الوجهة</option>
              {branches.filter((b:any)=>b.id!==fromBranch).map((b:any)=>(<option key={b.id} value={b.id}>{b.name}</option>))}
            </select>
          </div>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:12,marginBottom:14}}>
          <div>
            <label style={{fontSize:11,fontWeight:700,color:colors.text4,display:'block',marginBottom:4}}>الصنف</label>
            <select value={productId} onChange={e=>setProductId(e.target.value)} style={inp()} disabled={!fromBranch}>
              <option value="">{fromBranch ? 'اختر الصنف' : 'اختر الفرع المصدر أول'}</option>
              {products.map((p:any)=>(<option key={p.id} value={p.id}>{p.name} — متوفر: {p.qty} {p.unit}</option>))}
            </select>
          </div>
          <div>
            <label style={{fontSize:11,fontWeight:700,color:colors.text4,display:'block',marginBottom:4}}>الكمية{selectedProduct?` (${selectedProduct.unit})`:''}</label>
            <input type="number" value={qty} onChange={e=>setQty(e.target.value)} style={inp()} placeholder="0"/>
          </div>
        </div>

        <button onClick={submitTransfer} disabled={saving} style={{...btnPrimary,padding:'11px 24px'}}>
          {saving?'⏳ جاري النقل...':'🔄 نقل المخزون'}
        </button>
      </div>

      <div style={{...card,padding:'18px 20px'}}>
        <div style={{fontSize:font.base,fontWeight:800,color:colors.text,marginBottom:14}}>تقرير التحويلات</div>

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
            <div style={{fontSize:16,fontWeight:900,color:colors.info}}>{totalQty.toLocaleString('ar')}</div>
            <div style={{fontSize:10,color:colors.info,fontWeight:600}}>إجمالي الكمية المنقولة</div>
          </div>
        </div>

        {loadingHistory ? (
          <div style={{fontSize:12,color:colors.text4}}>جاري التحميل...</div>
        ) : filteredHistory.length===0 ? (
          <div style={{fontSize:12,color:colors.text4,textAlign:'center' as const,padding:16}}>ما فيه عمليات نقل مطابقة</div>
        ) : (
          <div style={{display:'flex',flexDirection:'column' as const,gap:6}}>
            {filteredHistory.map((h:any)=>(
              <div key={h.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 12px',background:colors.bg,borderRadius:8}}>
                <div>
                  <span style={{fontSize:12,fontWeight:700,color:colors.text}}>{(h.products as any)?.name}</span>
                  <span style={{fontSize:11,color:colors.text4,marginRight:8}}>{branchName(h.branch_id)} ← {h.note}</span>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <span style={{fontSize:12,fontWeight:700,color:colors.danger}}>-{Math.abs(h.qty_change)} {(h.products as any)?.unit}</span>
                  <span style={{fontSize:10,color:colors.text4}}>{new Date(h.created_at).toLocaleDateString('ar-SA')}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
