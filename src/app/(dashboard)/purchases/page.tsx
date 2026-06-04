'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

const CATEGORIES = ['مخزون', 'صيانة', 'أخرى']

export default function PurchasesPage() {
  const [history, setHistory]   = useState<any[]>([])
  const [loading, setLoading]   = useState(false)
  const [success, setSuccess]   = useState('')
  const [form, setForm] = useState({
    category: 'مخزون', name: '', qty: '', unit: 'قطعة',
    reorder_point: '5', amount: '', supplier: '', note: ''
  })
  const supabase = createClient()

  useEffect(() => { loadHistory() }, [])

  async function loadHistory() {
    const { data } = await supabase.from('purchases').select('*').order('created_at', { ascending: false }).limit(30)
    setHistory(data || [])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()
    if (!profile?.org_id) { alert('لا يوجد org_id'); setLoading(false); return }

    const { error: purchaseErr } = await supabase.from('purchases').insert({
      org_id: profile.org_id, profile_id: user.id,
      category: form.category, name: form.name,
      qty: form.qty ? Number(form.qty) : null,
      unit: form.unit, reorder_point: Number(form.reorder_point),
      amount: Number(form.amount), supplier: form.supplier, note: form.note,
    })
    if (purchaseErr) { alert('خطأ: ' + purchaseErr.message); setLoading(false); return }

    if (form.category === 'مخزون' && form.name && form.qty) {
      const { data: existing } = await supabase.from('products')
        .select('id, qty').eq('org_id', profile.org_id).eq('name', form.name).single()
      if (existing) {
        await supabase.from('stock_movements').insert({
          product_id: existing.id, profile_id: user.id,
          type: 'in', qty_change: Number(form.qty), note: 'شراء: ' + (form.supplier || ''),
        })
      } else {
        const { data: newProduct } = await supabase.from('products').insert({
          org_id: profile.org_id, name: form.name, unit: form.unit,
          qty: Number(form.qty), reorder_point: Number(form.reorder_point),
          category: 'مشتريات',
        }).select().single()
        if (newProduct) {
          await supabase.from('stock_movements').insert({
            product_id: newProduct.id, profile_id: user.id,
            type: 'in', qty_change: Number(form.qty), note: 'شراء جديد: ' + (form.supplier || ''),
          })
        }
      }
    }

    setSuccess('تم تسجيل الشراء' + (form.category === 'مخزون' ? ' وتحديث المخزون تلقائياً' : ''))
    setForm({ category: 'مخزون', name: '', qty: '', unit: 'قطعة', reorder_point: '5', amount: '', supplier: '', note: '' })
    setLoading(false)
    loadHistory()
    setTimeout(() => setSuccess(''), 5000)
  }

  const inp: React.CSSProperties = {
    width: '100%', padding: '11px 14px', border: '2px solid #e2e8f0',
    borderRadius: 10, fontSize: 14, outline: 'none', boxSizing: 'border-box',
    background: 'white', color: '#1e293b', fontFamily: 'system-ui', fontWeight: 500,
  }

  const totalSpent = history.reduce((s, p) => s + Number(p.amount || 0), 0)
  const totalVat   = history.reduce((s, p) => s + Number(p.vat_amount || 0), 0)
  const totalWithVat = history.reduce((s, p) => s + Number(p.total_amount || 0), 0)

  return (
    <div style={{ direction: 'rtl', fontFamily: 'system-ui' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: '#0f172a', marginBottom: 4 }}>المشتريات</h1>
        <p style={{ fontSize: 13, color: '#64748b' }}>تسجيل المشتريات — فئة مخزون تُحدّث المخزون تلقائياً</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'إجمالي المشتريات', value: totalSpent.toFixed(2) + ' ر.س', color: '#667eea', bg: '#eef2ff', border: '#c7d2fe' },
          { label: 'ضريبة 15%', value: totalVat.toFixed(2) + ' ر.س', color: '#f59e0b', bg: '#fffbeb', border: '#fde68a' },
          { label: 'الإجمالي مع الضريبة', value: totalWithVat.toFixed(2) + ' ر.س', color: '#10b981', bg: '#f0fdf4', border: '#bbf7d0' },
          { label: 'عدد الفواتير', value: history.length, color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc' },
        ].map((s, i) => (
          <div key={i} style={{ background: s.bg, border: '1.5px solid ' + s.border, borderRadius: 14, padding: '16px 18px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', marginBottom: 6, textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>{s.label}</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {success && (
        <div style={{ background: '#ecfdf5', border: '2px solid #10b981', borderRadius: 14, padding: '14px 18px', marginBottom: 20, fontSize: 14, fontWeight: 700, color: '#059669' }}>
          {success}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>
        <div style={{ background: 'white', borderRadius: 20, padding: 24, boxShadow: '0 4px 24px rgba(0,0,0,0.07)' }}>
          <h3 style={{ fontWeight: 800, fontSize: 15, color: '#0f172a', margin: '0 0 20px' }}>تسجيل شراء جديد</h3>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 8 }}>نوع الشراء</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {CATEGORIES.map(c => (
                  <button key={c} type="button" onClick={() => setForm({ ...form, category: c })}
                    style={{ flex: 1, padding: '10px 6px', borderRadius: 10, border: '2px solid ' + (form.category === c ? '#667eea' : '#e2e8f0'), background: form.category === c ? '#eef2ff' : 'white', color: form.category === c ? '#667eea' : '#64748b', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'system-ui' }}>
                    {c === 'مخزون' ? '📦 ' + c : c === 'صيانة' ? '🔧 ' + c : '📋 ' + c}
                  </button>
                ))}
              </div>
              {form.category === 'مخزون' && (
                <div style={{ background: '#eef2ff', border: '1.5px solid #c7d2fe', borderRadius: 8, padding: '8px 12px', marginTop: 8, fontSize: 12, color: '#4338ca', fontWeight: 600 }}>
                  سيتم إضافة هذا الصنف للمخزون تلقائياً
                </div>
              )}
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>اسم الصنف / الخدمة *</label>
              <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={inp} placeholder="مثال: قهوة عربية / صيانة مكيف" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>المبلغ (بدون ضريبة) *</label>
                <input type="number" min="0" step="0.01" required value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} style={inp} placeholder="0.00" />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>المورد</label>
                <input value={form.supplier} onChange={e => setForm({ ...form, supplier: e.target.value })} style={inp} placeholder="اسم المورد" />
              </div>
            </div>

            {form.category === 'مخزون' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>الكمية</label>
                  <input type="number" min="0" value={form.qty} onChange={e => setForm({ ...form, qty: e.target.value })} style={inp} placeholder="0" />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>الوحدة</label>
                  <input value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} style={inp} placeholder="كيلو / لتر" />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>الحد الأدنى</label>
                  <input type="number" min="0" value={form.reorder_point} onChange={e => setForm({ ...form, reorder_point: e.target.value })} style={inp} />
                </div>
              </div>
            )}

            {form.amount && (
              <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, color: '#64748b' }}>المبلغ بدون ضريبة</span>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{Number(form.amount).toFixed(2)} ر.س</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, color: '#64748b' }}>ضريبة 15%</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#f59e0b' }}>{(Number(form.amount) * 0.15).toFixed(2)} ر.س</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: 8, marginTop: 4 }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>الإجمالي</span>
                  <span style={{ fontSize: 14, fontWeight: 900, color: '#10b981' }}>{(Number(form.amount) * 1.15).toFixed(2)} ر.س</span>
                </div>
              </div>
            )}

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>ملاحظات</label>
              <textarea value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} style={{ ...inp, minHeight: 60, resize: 'none' }} placeholder="أي تفاصيل إضافية..." />
            </div>

            <button type="submit" disabled={loading} style={{ width: '100%', padding: '14px', background: loading ? '#94a3b8' : 'linear-gradient(135deg,#667eea,#764ba2)', color: 'white', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'system-ui' }}>
              {loading ? 'جاري الحفظ...' : 'تسجيل الشراء'}
            </button>
          </form>
        </div>

        <div style={{ background: 'white', borderRadius: 20, padding: 24, boxShadow: '0 4px 24px rgba(0,0,0,0.07)' }}>
          <h3 style={{ fontWeight: 800, fontSize: 15, color: '#0f172a', margin: '0 0 16px' }}>آخر المشتريات</h3>
          {history.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🛒</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>لا توجد مشتريات بعد</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', maxHeight: 560, overflowY: 'auto' }}>
              {history.map((p, i) => (
                <div key={p.id} style={{ padding: '13px 0', borderBottom: i < history.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a', marginBottom: 4 }}>{p.name}</div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
                        <span style={{ background: p.category === 'مخزون' ? '#eef2ff' : p.category === 'صيانة' ? '#fef3c7' : '#f1f5f9', color: p.category === 'مخزون' ? '#4338ca' : p.category === 'صيانة' ? '#92400e' : '#475569', padding: '2px 8px', borderRadius: 50, fontSize: 11, fontWeight: 600 }}>{p.category}</span>
                        {p.supplier && <span style={{ color: '#94a3b8', fontSize: 11 }}>{p.supplier}</span>}
                        <span style={{ color: '#94a3b8', fontSize: 11 }}>{new Date(p.created_at).toLocaleDateString('ar-SA')}</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'left' as const, flexShrink: 0, marginRight: 8 }}>
                      <div style={{ fontWeight: 900, fontSize: 14, color: '#10b981' }}>{Number(p.total_amount).toFixed(2)} ر.س</div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>شامل الضريبة</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
