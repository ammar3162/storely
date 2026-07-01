'use client'
import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const BarcodeScanner = lazy(() => import('@/components/BarcodeScanner'))

interface StaffSession {
  id: string; name: string; org_id: string; branch_id: string | null
  org_name: string; branch_name: string
  permissions: {dispense:boolean,inventory:boolean,purchases:boolean,reports:boolean}
}

const C = {
  primary:'#16a34a', primaryD:'#15803d', primaryL:'#f0fdf4', primaryB:'#bbf7d0',
  danger:'#e24b4a', dangerL:'#fef2f2',
  warning:'#ba7517', warningL:'#fffbeb',
  text:'#1c1c1a', text2:'#3d3d3a', text3:'#5f5e5a', text4:'#888780',
  bg:'#f5f5f4', surface:'#ffffff', border:'#ebebea', border2:'#e0e0dd',
}

const inp: React.CSSProperties = {width:'100%',padding:'10px 12px',border:`1px solid ${C.border2}`,borderRadius:8,fontSize:13,outline:'none',boxSizing:'border-box' as const,background:'white',color:C.text,fontFamily:'inherit'}
const lbl: React.CSSProperties = {fontSize:10,fontWeight:700,color:C.text3,display:'block',marginBottom:5,textTransform:'uppercase' as const,letterSpacing:'.06em'}

const UNITS = ['قطعة','كيلو','كيس','كرتون','لتر','علبة','باكيت','درزن','رول','غرام','أخرى']

export default function StaffPurchasesPage() {
  const [session, setSession] = useState<StaffSession|null>(null)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [showScan, setShowScan] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string|null>(null)
  const [toast, setToast] = useState('')
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [form, setForm] = useState({
    category:'مخزون', name:'', sku:'', qty:'', unit:'قطعة',
    reorder_point:'5', total_amount:'', supplier:'', note:'',
    invoice_image:'', hasVat:''
  })
  const submitting = useRef(false)
  const sb = createClient()
  const router = useRouter()

  useEffect(()=>{
    const saved = localStorage.getItem('staff_session')
    if (!saved) { router.push('/staff'); return }
    const s = JSON.parse(saved) as StaffSession
    if (!s.permissions?.purchases) { router.push('/staff/dispense'); return }
    setSession(s)
    loadSuppliers(s.org_id)
  },[])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(()=>setToast(''),3000)
  }

  async function loadSuppliers(orgId: string) {
    const{data}=await (sb as any).from('suppliers').select('id,name').eq('org_id',orgId).eq('is_active',true).order('name')
    setSuppliers(data||[])
  }

  async function handleImage(file: File) {
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `invoices/${session!.org_id}-${Date.now()}.${ext}`
    const{error}=await sb.storage.from('invoices').upload(path, file, {upsert:true})
    if(error){showToast('فشل رفع الصورة');setUploading(false);return}
    const{data:{publicUrl}}=sb.storage.from('invoices').getPublicUrl(path)
    setForm(f=>({...f,invoice_image:publicUrl}));setPreviewUrl(publicUrl)
    setUploading(false);showToast('تم رفع الفاتورة ✓')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if(!form.total_amount||!session)return
    if(submitting.current)return
    submitting.current=true
    if(!form.hasVat){showToast('حدد هل الفاتورة تشمل الضريبة');submitting.current=false;return}
    if(form.hasVat==='yes'&&!form.invoice_image){showToast('يرجى رفع صورة الفاتورة');submitting.current=false;return}
    if(!form.supplier.trim()){showToast('يرجى إدخال اسم المورد');submitting.current=false;return}
    setLoading(true)
    const inputTotal = Number(form.total_amount)
    const amount = parseFloat((inputTotal/1.15).toFixed(2))
    const total_amount = inputTotal.toFixed(2)

    const res = await fetch('/api/staff-purchase', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        org_id:session.org_id, branch_id:session.branch_id,
        category:form.category, name:form.name,
        qty:form.qty?Number(form.qty):null,
        unit:form.unit||null, reorder_point:Number(form.reorder_point)||5,
        amount, total_amount,
        supplier:form.supplier,
        note:form.note||null,
        invoice_image:form.invoice_image||null,
        staff_name:session.name
      })
    })
    const resData = await res.json()
    if(!res.ok){showToast('خطأ: '+resData.error);setLoading(false);submitting.current=false;return}
    showToast(form.category==='مخزون'?`✅ تم تحديث المخزون (+${form.qty||0})`:'✅ تم تسجيل الشراء')

    setForm({category:'مخزون',name:'',sku:'',qty:'',unit:'قطعة',reorder_point:'5',total_amount:'',supplier:'',note:'',invoice_image:'',hasVat:''})
    setPreviewUrl(null);setLoading(false);submitting.current=false
    // بعد 2 ثانية ارجع لصفحة الموظف
    setTimeout(()=>router.push('/staff/dispense'), 2000)
  }

  const inputTotal = Number(form.total_amount)||0
  const displayAmount = form.hasVat==='yes'&&inputTotal>0?(inputTotal/1.15).toFixed(2):inputTotal.toFixed(2)
  const displayVat = form.hasVat==='yes'&&inputTotal>0?(inputTotal-Number(displayAmount)).toFixed(2):'0.00'

  if(!session) return null

  return (
    <div style={{minHeight:'100vh',background:C.bg,fontFamily:"'IBM Plex Sans Arabic',system-ui,sans-serif",direction:'rtl'}}>
      {showScan&&<Suspense fallback={null}><BarcodeScanner onScan={(code:string)=>{setShowScan(false);setForm(f=>({...f,sku:code}))}} onClose={()=>setShowScan(false)}/></Suspense>}

      {/* Header */}
      <div style={{background:'white',padding:'14px 20px',boxShadow:'0 1px 3px rgba(0,0,0,.06)',display:'flex',justifyContent:'space-between',alignItems:'center',position:'sticky',top:0,zIndex:100}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <button onClick={()=>router.push('/staff/dispense')}
            style={{background:'none',border:'none',cursor:'pointer',fontSize:20,padding:'4px 8px',color:C.text2}}>←</button>
          <div>
            <div style={{fontSize:15,fontWeight:800,color:C.text}}>تسجيل مشتريات</div>
            <div style={{fontSize:11,color:C.text4}}>{session.name} · {session.org_name}</div>
          </div>
        </div>
      </div>

      {toast&&<div style={{background:toast.startsWith('✅')?C.primaryL:C.dangerL,color:toast.startsWith('✅')?C.primary:C.danger,padding:'12px 20px',fontSize:13,fontWeight:700,textAlign:'center'}}>{toast}</div>}

      <div style={{padding:'16px 20px',maxWidth:520,margin:'0 auto'}}>
        <form onSubmit={handleSubmit}>

          {/* نوع الفاتورة */}
          <div style={{marginBottom:14}}>
            <label style={lbl}>نوع الشراء</label>
            <div style={{display:'flex',gap:8}}>
              {['مخزون','مشتريات','أخرى'].map(cat=>(
                <button key={cat} type="button" onClick={()=>setForm(f=>({...f,category:cat}))}
                  style={{flex:1,padding:'9px',borderRadius:8,border:`1.5px solid ${form.category===cat?C.primary:C.border2}`,background:form.category===cat?C.primaryL:'white',color:form.category===cat?C.primary:C.text2,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                  {cat==='مخزون'?'📦':cat==='مشتريات'?'🛒':'📋'} {cat}
                </button>
              ))}
            </div>
          </div>

          {/* اسم المنتج */}
          <div style={{marginBottom:12}}>
            <label style={lbl}>اسم الصنف *</label>
            <input style={inp} value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="مثال: دقيق" required/>
          </div>

          {/* الكمية والوحدة */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:12}}>
            <div>
              <label style={lbl}>الكمية</label>
              <input style={inp} type="number" min="0" value={form.qty} onChange={e=>setForm(f=>({...f,qty:e.target.value}))} placeholder="0"/>
            </div>
            <div>
              <label style={lbl}>الوحدة</label>
              <select style={inp} value={form.unit} onChange={e=>setForm(f=>({...f,unit:e.target.value}))}>
                {UNITS.map(u=><option key={u}>{u}</option>)}
              </select>
            </div>
          </div>

          {/* المورد */}
          <div style={{marginBottom:12}}>
            <label style={lbl}>المورد *</label>
            <input style={inp} list="sup-list" value={form.supplier} onChange={e=>setForm(f=>({...f,supplier:e.target.value}))} placeholder="اسم المورد" required/>
            <datalist id="sup-list">{suppliers.map(s=><option key={s.id} value={s.name}/>)}</datalist>
          </div>

          {/* الضريبة */}
          <div style={{marginBottom:12}}>
            <label style={lbl}>هل الفاتورة تشمل ضريبة 15%؟</label>
            <div style={{display:'flex',gap:8}}>
              {[{v:'yes',l:'نعم — شاملة'},{v:'no',l:'لا — بدون ضريبة'}].map(o=>(
                <button key={o.v} type="button" onClick={()=>setForm(f=>({...f,hasVat:o.v}))}
                  style={{flex:1,padding:'9px',borderRadius:8,border:`1.5px solid ${form.hasVat===o.v?C.primary:C.border2}`,background:form.hasVat===o.v?C.primaryL:'white',color:form.hasVat===o.v?C.primary:C.text2,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                  {o.l}
                </button>
              ))}
            </div>
          </div>

          {/* المبلغ */}
          <div style={{marginBottom:12}}>
            <label style={lbl}>المبلغ الإجمالي (ر.س) *</label>
            <input style={{...inp,fontSize:18,fontWeight:700,textAlign:'center' as const}} type="number" min="0" step="0.01" value={form.total_amount} onChange={e=>setForm(f=>({...f,total_amount:e.target.value}))} placeholder="0.00" required/>
            {inputTotal>0&&form.hasVat&&(
              <div style={{display:'flex',gap:8,marginTop:6}}>
                <div style={{flex:1,background:C.bg,borderRadius:8,padding:'8px 10px',textAlign:'center' as const}}>
                  <div style={{fontSize:9,color:C.text4,fontWeight:700}}>بدون ضريبة</div>
                  <div style={{fontSize:14,fontWeight:700,color:C.text}}>{displayAmount}</div>
                </div>
                <div style={{flex:1,background:C.warningL,borderRadius:8,padding:'8px 10px',textAlign:'center' as const}}>
                  <div style={{fontSize:9,color:C.warning,fontWeight:700}}>ضريبة 15%</div>
                  <div style={{fontSize:14,fontWeight:700,color:C.warning}}>{displayVat}</div>
                </div>
              </div>
            )}
          </div>

          {/* صورة الفاتورة */}
          {form.hasVat==='yes'&&(
            <div style={{marginBottom:12}}>
              <label style={lbl}>صورة الفاتورة *</label>
              {previewUrl?(
                <div style={{position:'relative' as const,marginBottom:8}}>
                  <img src={previewUrl} alt="فاتورة" style={{width:'100%',borderRadius:10,maxHeight:160,objectFit:'cover' as const}}/>
                  <button type="button" onClick={()=>{setPreviewUrl(null);setForm(f=>({...f,invoice_image:''}))}}
                    style={{position:'absolute' as const,top:6,left:6,background:'rgba(0,0,0,.5)',color:'white',border:'none',borderRadius:'50%',width:24,height:24,cursor:'pointer',fontSize:14}}>×</button>
                </div>
              ):(
                <label style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:'20px',border:`2px dashed ${C.border2}`,borderRadius:10,cursor:'pointer',background:C.bg}}>
                  <input type="file" accept="image/*" style={{display:'none'}} onChange={e=>e.target.files?.[0]&&handleImage(e.target.files[0])}/>
                  <span style={{fontSize:13,color:C.text3,fontWeight:600}}>{uploading?'⏳ جاري الرفع...':'📸 اضغط لرفع الفاتورة'}</span>
                </label>
              )}
            </div>
          )}

          {/* ملاحظة */}
          <div style={{marginBottom:16}}>
            <label style={lbl}>ملاحظة (اختياري)</label>
            <textarea style={{...inp,resize:'none' as const,minHeight:60}} value={form.note} onChange={e=>setForm(f=>({...f,note:e.target.value}))} placeholder="أي تفاصيل إضافية..."/>
          </div>

          <button type="submit" disabled={loading||uploading}
            style={{width:'100%',padding:'14px',background:loading?'#9ca3af':C.primary,color:'white',border:'none',borderRadius:12,fontSize:15,fontWeight:800,cursor:loading?'not-allowed':'pointer',fontFamily:'inherit',boxShadow:`0 4px 14px rgba(22,163,74,.3)`}}>
            {loading?'⏳ جاري التسجيل...':'✅ تسجيل الشراء'}
          </button>
        </form>
      </div>
    </div>
  )
}
