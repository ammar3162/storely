'use client'
import { useLiveRefresh } from '@/lib/useLiveRefresh'
import { useState, useEffect } from 'react'
import { currencySymbol } from '@/lib/currencySymbol'
import { useSearchParams } from 'next/navigation'
import { api } from '@/lib/api-client'
import { getMe, getOrgId } from '@/lib/session'
import { toast } from '@/components/toast'
import { cache } from '@/lib/cache'

/** حالة صفحة الموردين ودوالها — منقولة كما هي من page.tsx */
export function useSuppliersPage() {
  const searchParams = useSearchParams()
  const msParam = searchParams.get('ms')
  const sidParam = searchParams.get('sid')   // من «قرارات اليوم» في أدوات الذكاء
  const [maxSuppliers, setMaxSuppliers] = useState<number>(999)
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [products, setProducts]   = useState<any[]>([])
  const [orgId, setOrgId]         = useState('')
  const [curr, setCurr]           = useState('⃁')
  const [loading, setLoading]     = useState(true)
  const [showAdd, setShowAdd]     = useState(false)
  const [newName, setNewName]     = useState('')
  const [newPhone, setNewPhone]   = useState('')
  const [supCountry, setSupCountry] = useState(()=>sessionStorage.getItem('s_country_code')||'+966')
  const [newNotes, setNewNotes]   = useState('')
  const [newConsent, setNewConsent] = useState(false)
  const [priceComparisons, setPriceComparisons] = useState<any[]>([])
  const [showPriceComparison, setShowPriceComparison] = useState(false)
  const [supplierRatings, setSupplierRatings] = useState<Record<string,any>>({})
  const [failedRecentMap, setFailedRecentMap] = useState<Record<string,number>>({})

  // تحديث فوري: لما تتغير بيانات المنشأة من أي جهاز، الصفحة تعيد جلبها
  useLiveRefresh(typeof window!=='undefined'?sessionStorage.getItem('s_org_id'):null, ['suppliers','supplier_orders','products'], ()=>{ const o=typeof window!=='undefined'?sessionStorage.getItem('s_org_id'):null; if(o){ loadSuppliers(o); loadProducts(o) } })
  useEffect(() => { init() }, [])

  async function init() {
    setLoading(true)
    let oid = sessionStorage.getItem('s_org_id')
    // عرض كاش الموردين فوراً لو متوفر
    if (oid) {
      const cachedSuppliers = cache.get('suppliers:'+oid)
      if (cachedSuppliers) { setSuppliers(cachedSuppliers); setLoading(false) }
    }
    if (!oid) {
      oid = await getOrgId()
      if (!oid) return
    }
    setOrgId(oid)
    getMe().then(me=>{ if(me?.org?.currency) setCurr(currencySymbol(me.org.currency)) })
    await Promise.all([loadSuppliers(oid), loadProducts(oid)])
    fetch('/api/supplier-price-comparison',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({org_id:oid})}).then(r=>r.json()).then(d=>{ if(d.success) setPriceComparisons(d.comparisons||[]) }).catch(()=>{})
    fetch('/api/supplier-rating',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({org_id:oid})}).then(r=>r.json()).then(d=>{
      if(d.success){ const map:Record<string,any>={}; d.ratings.forEach((r:any)=>{ map[r.id]=r }); setSupplierRatings(map) }
    }).catch(()=>{})
    setLoading(false)
  }

  async function loadSuppliers(oid: string) {
    const bid = sessionStorage.getItem('s_branch_id')
    const j = await api.get('/api/suppliers', { org_id: oid, branch_id: bid })
    if (!j.success) return
    setSuppliers(j.suppliers || [])
    cache.set('suppliers:'+oid, j.suppliers || [])
    setFailedRecentMap(j.failed_recent || {})
    setMaxSuppliers(j.max_suppliers || 999)
  }

  async function loadProducts(oid: string) {
    const bid = sessionStorage.getItem('s_branch_id')
    const j = await api.get('/api/products', { org_id: oid, branch_id: bid, view: 'suppliers' })
    setProducts(j.products || [])
  }

  async function addSupplier() {
    if (!newName.trim() || !newPhone.trim()) { toast('أدخل اسم المورد ورقمه', 'warning'); return }
    if (!newConsent) { toast('يرجى تأكيد إقرار موافقة المورد على استلام رسائل واتساب', 'warning'); return }
    const phoneRules2: Record<string,number> = {'+966':9,'+971':9,'+965':8,'+973':8,'+974':8,'+968':8,'+20':10,'+962':9,'+1':10,'+44':10,'+91':10,'+92':10}
    const reqLen2 = phoneRules2[supCountry] || 9
    const cleanedPhone2 = newPhone.trim().replace(/^0+/,'')
    if(cleanedPhone2.length !== reqLen2){toast(`رقم الجوال يجب أن يكون ${reqLen2} أرقام`,'warning');return}
    const resData = await api.post('/api/add-supplier', { org_id: orgId, branch_id: sessionStorage.getItem('s_branch_id') || null, name: newName.trim(), phone: supCountry + newPhone.trim().replace(/^0+/,''), notes: newNotes.trim(), whatsapp_consent: true })
    const error = !resData.success ? {message: resData.error} : null
    if (error) { toast('خطأ: ' + error.message, 'error'); return }
    toast('✅ تم إضافة المورد')
    setNewName(''); setNewPhone(''); setNewNotes(''); setNewConsent(false); setShowAdd(false)
    loadSuppliers(orgId)
  }

  const refresh = () => { loadSuppliers(orgId); loadProducts(orgId) }

  return { maxSuppliers, setMaxSuppliers, suppliers, setSuppliers, products, setProducts, orgId, setOrgId, curr, setCurr, loading, setLoading, showAdd, setShowAdd, newName, setNewName, newPhone, setNewPhone, supCountry, setSupCountry, newNotes, setNewNotes, newConsent, setNewConsent, priceComparisons, setPriceComparisons, showPriceComparison, setShowPriceComparison, supplierRatings, setSupplierRatings, failedRecentMap, setFailedRecentMap, searchParams, msParam, sidParam, refresh, init, loadSuppliers, loadProducts, addSupplier }
}

export type SuppliersPageState = ReturnType<typeof useSuppliersPage>
