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

  const sb = createClient()

  useEffect(()=>{ init() },[])
  useEffect(()=>{ if(orgId && fromBranch) loadProducts() },[orgId, fromBranch])

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
      const res = await fetch(`/api/branch-transfer?org_id=${oid}`)
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
        <div style={{fontSize:font.base,fontWeight:800,color:colors.text,marginBottom:14}}>سجل التحويلات الأخيرة</div>
        {loadingHistory ? (
          <div style={{fontSize:12,color:colors.text4}}>جاري التحميل...</div>
        ) : history.length===0 ? (
          <div style={{fontSize:12,color:colors.text4,textAlign:'center' as const,padding:16}}>ما فيه عمليات نقل مسجّلة بعد</div>
        ) : (
          <div style={{display:'flex',flexDirection:'column' as const,gap:6}}>
            {history.filter((h:any)=>h.type==='transfer_out').map((h:any)=>(
              <div key={h.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 12px',background:colors.bg,borderRadius:8}}>
                <div>
                  <span style={{fontSize:12,fontWeight:700,color:colors.text}}>{(h.products as any)?.name}</span>
                  <span style={{fontSize:11,color:colors.text4,marginRight:8}}>{h.note}</span>
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
