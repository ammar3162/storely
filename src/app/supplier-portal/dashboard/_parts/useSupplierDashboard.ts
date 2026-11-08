'use client'
import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api-client'
import { confirmDialog } from '@/components/ConfirmDialog'
import { TAB_PATHS } from './tabs'
import type { Tab } from './tabs'

/** حالة لوحة المورد ودوالها — منقولة كما هي من DashboardShared.tsx */
export function useSupplierDashboard() {
  const router = useRouter()
  const pathname = usePathname()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const activeTab: Tab = (Object.entries(TAB_PATHS).find(([,p])=>p===pathname)?.[0] as Tab) || 'products'
  const [accountSaving, setAccountSaving] = useState(false)
  const [accountName, setAccountName] = useState('')
  const [accountLocation, setAccountLocation] = useState('')

  const [items, setItems] = useState<any[]>([])
  const [name, setName] = useState('')
  const [unit, setUnit] = useState('')
  const [price, setPrice] = useState('')
  const [priceIncludesVat, setPriceIncludesVat] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string|null>(null)
  const [imageFile, setImageFile] = useState<File|null>(null)
  const [imagePreview, setImagePreview] = useState<string>('')
  const [existingImageUrl, setExistingImageUrl] = useState<string>('')
  const [uploading, setUploading] = useState(false)

  const [quoteRequests, setQuoteRequests] = useState<any[]>([])
  const [respondingId, setRespondingId] = useState<string|null>(null)
  const [respondPrice, setRespondPrice] = useState('')
  const [respondNote, setRespondNote] = useState('')
  const [respondSaving, setRespondSaving] = useState(false)

  const [chatMessages, setChatMessages] = useState<any[]>([])
  const [openChatOrgId, setOpenChatOrgId] = useState<string|null>(null)
  const [chatReply, setChatReply] = useState('')
  const [chatSending, setChatSending] = useState(false)

  const [reps, setReps] = useState<any[]>([])
  const [repName, setRepName] = useState('')
  const [repPhone, setRepPhone] = useState('')
  const [repSaving, setRepSaving] = useState(false)

  const sb = createClient()

  useEffect(()=>{ init() },[])

  useEffect(()=>{
    if (!profile?.id) return
    const channel = sb.channel(`supplier-updates-${profile.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quote_requests', filter: `supplier_id=eq.${profile.id}` }, () => {
        refresh()
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `supplier_id=eq.${profile.id}` }, () => {
        refresh()
      })
      .subscribe()
    return () => { sb.removeChannel(channel) }
  },[profile?.id])

  // كل بيانات لوحة المورد من /api/supplier-portal (الهوية من الجلسة)
  async function refresh() {
    const j = await api.get('/api/supplier-portal')
    if (!j.success) return null
    setItems(j.items || [])
    setQuoteRequests(j.quote_requests || [])
    setChatMessages(j.messages || [])
    setMyGivenReviewIds(j.given_review_ids || [])
    setReps(j.reps || [])
    return j
  }

  async function init() {
    const j = await refresh()
    if (!j) { window.location.href = '/supplier-portal'; return }
    setProfile(j.profile)
    setLoading(false)
  }

  const act = (action: string, data: Record<string, unknown> = {}) => api.post('/api/supplier-portal', { action, ...data })

  async function addRep() {
    if (!repName.trim() || !repPhone.trim()) return
    setRepSaving(true)
    await act('rep_add', { name: repName.trim(), phone: repPhone.trim() })
    setRepName(''); setRepPhone(''); setRepSaving(false)
    refresh()
  }

  async function deleteRep(id: string) {
    if (!(await confirmDialog({ title: 'حذف المندوب', message: 'حذف هذا المندوب؟' }))) return
    await act('rep_delete', { id })
    refresh()
  }

  async function sendChatReply(orgId: string) {
    if (!chatReply.trim()) return
    setChatSending(true)
    const r = await act('chat_reply', { org_id: orgId, message: chatReply.trim() })
    const data = r.message
    if (data) setChatMessages(prev => prev.some((m:any)=>m.id===data.id) ? prev : [...prev, data])
    setChatReply('')
    setChatSending(false)
  }

  const [myGivenReviewIds, setMyGivenReviewIds] = useState<string[]>([])
  const [ratingCustomerId, setRatingCustomerId] = useState<string|null>(null)
  const [customerRating, setCustomerRating] = useState(5)
  const [ratingSaving, setRatingSaving] = useState(false)

  async function submitCustomerRating(reqId: string) {
    setRatingSaving(true)
    const r = await act('org_review', { quote_request_id: reqId, rating: customerRating })
    setRatingSaving(false)
    if (r.success) {
      setRatingCustomerId(null); setCustomerRating(5)
      refresh()
    }
  }

  async function markFulfilled(reqId: string) {
    await act('quote_fulfill', { id: reqId })
    refresh()
  }

  async function togglePaymentStatus(reqId: string, current: string) {
    const newStatus = current==='paid' ? 'unpaid' : 'paid'
    await act('quote_payment', { id: reqId, payment_status: newStatus })
    refresh()
  }

  const [approvingId, setApprovingId] = useState<string|null>(null)
  const [selectedRepId, setSelectedRepId] = useState('')
  const [deliveryDate, setDeliveryDate] = useState('')
  const [approveSaving, setApproveSaving] = useState(false)

  function startApprove(reqId: string) {
    setApprovingId(reqId); setSelectedRepId(''); setDeliveryDate('')
  }

  async function approveDelivery(req: any) {
    if (!selectedRepId || !deliveryDate) return
    const rep = reps.find((r:any)=>r.id===selectedRepId)
    if (!rep) return
    setApproveSaving(true)
    await fetch('/api/supplier-approve-delivery', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quote_request_id: req.id, rep_name: rep.name, rep_phone: rep.phone,
        delivery_date: deliveryDate, supplier_business_name: profile.business_name, org_id: req.org_id,
      }),
    })
    setApproveSaving(false)
    setApprovingId(null)
    refresh()
  }

  function startRespond(reqId: string) {
    setRespondingId(reqId); setRespondPrice(''); setRespondNote('')
  }

  async function submitResponse(reqId: string) {
    if (!respondPrice) return
    setRespondSaving(true)
    await act('quote_respond', { id: reqId, price: Number(respondPrice), note: respondNote.trim() || null })
    setRespondSaving(false)
    setRespondingId(null)
    refresh()
  }

  function resetForm() {
    setName(''); setUnit(''); setPrice(''); setEditingId(null); setPriceIncludesVat(true)
    setImageFile(null); setImagePreview(''); setExistingImageUrl('')
  }

  function startEdit(item: any) {
    setEditingId(item.id); setName(item.name); setUnit(item.unit||''); setPrice(String(item.price||''))
    setPriceIncludesVat(item.price_includes_vat !== false)
    setExistingImageUrl(item.image_url||''); setImageFile(null); setImagePreview('')
  }

  function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  async function saveItem() {
    if (!name.trim() || !price) return
    setSaving(true)

    let imageUrl = existingImageUrl || null
    if (imageFile) {
      setUploading(true)
      const ext = imageFile.name.split('.').pop()
      const path = `${profile.id}/${Date.now()}.${ext}`
      const { error: upErr } = await sb.storage.from('supplier-items').upload(path, imageFile, { upsert: true })
      if (!upErr) {
        const { data: pub } = sb.storage.from('supplier-items').getPublicUrl(path)
        imageUrl = pub.publicUrl
      }
      setUploading(false)
    }

    await act('item_save', { id: editingId || undefined, name: name.trim(), unit: unit.trim()||null, price: Number(price), price_includes_vat: priceIncludesVat, image_url: imageUrl })
    setSaving(false)
    resetForm()
    refresh()
  }

  async function toggleAvailable(item: any) {
    await act('item_toggle', { id: item.id })
    refresh()
  }

  async function deleteItem(id: string) {
    if (!(await confirmDialog({ title: 'حذف الصنف', message: 'حذف هذا الصنف نهائياً؟' }))) return
    await act('item_delete', { id })
    refresh()
  }

  async function toggleVisibility() {
    const newValue = !profile.is_visible
    await act('visibility', { is_visible: newValue })
    setProfile((prev:any) => ({ ...prev, is_visible: newValue }))
  }

  useEffect(()=>{
    if (profile) { setAccountName(profile.business_name || ''); setAccountLocation(profile.location || '') }
  },[profile])

  async function saveAccountInfo() {
    if (!accountName.trim()) return
    setAccountSaving(true)
    await act('account', { business_name: accountName.trim(), location: accountLocation.trim() || null })
    setProfile((prev:any) => ({ ...prev, business_name: accountName.trim(), location: accountLocation.trim() || null }))
    setAccountSaving(false)
  }

  // شعار المنشأة: يترفع لمجلد المورد ويتحفظ مباشرة — ويظهر للعملاء في قائمة الموردين
  const [logoBusy, setLogoBusy] = useState(false)
  async function uploadLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; e.target.value = ''
    if (!file || !profile) return
    if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) { alert('يجب أن يكون الشعار صورة PNG أو JPG'); return }
    if (file.size > 2 * 1024 * 1024) { alert('حجم الشعار أكبر من 2 ميجابايت'); return }
    setLogoBusy(true)
    const path = `${profile.id}/logo-${Date.now()}.${file.type.split('/')[1].replace('jpeg','jpg')}`
    const { error } = await sb.storage.from('supplier-items').upload(path, file, { upsert: true, contentType: file.type })
    if (!error) {
      const url = sb.storage.from('supplier-items').getPublicUrl(path).data.publicUrl
      const r = await act('account', { business_name: profile.business_name, location: profile.location || null, logo_url: url })
      if (r.success) setProfile((p:any) => ({ ...p, logo_url: url }))
    }
    setLogoBusy(false)
  }
  async function removeLogo() {
    const r = await act('account', { business_name: profile.business_name, location: profile.location || null, logo_url: null })
    if (r.success) setProfile((p:any) => ({ ...p, logo_url: null }))
  }

  async function logout() {
    await sb.auth.signOut()
    window.location.href = '/supplier-portal'
  }

  return { loading, setLoading, profile, setProfile, accountSaving, setAccountSaving, accountName, setAccountName, accountLocation, setAccountLocation, items, setItems, name, setName, unit, setUnit, price, setPrice, priceIncludesVat, setPriceIncludesVat, saving, setSaving, editingId, setEditingId, imageFile, setImageFile, imagePreview, setImagePreview, existingImageUrl, setExistingImageUrl, uploading, setUploading, quoteRequests, setQuoteRequests, respondingId, setRespondingId, respondPrice, setRespondPrice, respondNote, setRespondNote, respondSaving, setRespondSaving, chatMessages, setChatMessages, openChatOrgId, setOpenChatOrgId, chatReply, setChatReply, chatSending, setChatSending, reps, setReps, repName, setRepName, repPhone, setRepPhone, repSaving, setRepSaving, myGivenReviewIds, setMyGivenReviewIds, ratingCustomerId, setRatingCustomerId, customerRating, setCustomerRating, ratingSaving, setRatingSaving, approvingId, setApprovingId, selectedRepId, setSelectedRepId, deliveryDate, setDeliveryDate, approveSaving, setApproveSaving, logoBusy, setLogoBusy, router, pathname, activeTab, sb, act, refresh, init, addRep, deleteRep, sendChatReply, submitCustomerRating, markFulfilled, togglePaymentStatus, startApprove, approveDelivery, startRespond, submitResponse, resetForm, startEdit, onPickImage, saveItem, toggleAvailable, deleteItem, toggleVisibility, saveAccountInfo, uploadLogo, removeLogo, logout }
}

export type SupplierDashboard = ReturnType<typeof useSupplierDashboard>
