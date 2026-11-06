'use client'
import NumberInput from '@/components/NumberInput'
import { Package, Pencil, Trash2, ImagePlus, Plus } from 'lucide-react'
import type { SupplierDashboard } from './useSupplierDashboard'
import type { DashboardView } from './deriveView'

export default function ProductsTab({ m, v }: { m: SupplierDashboard; v: DashboardView }) {
  const { items, name, setName, unit, setUnit, price, setPrice, priceIncludesVat, setPriceIncludesVat, saving, editingId, imagePreview, existingImageUrl, uploading, activeTab, resetForm, startEdit, onPickImage, saveItem, toggleAvailable, deleteItem } = m
  const { money } = v
  return (
    <>
        {activeTab==='products' && (
          <div className="sd-grid-products">
            <section className="sd-panel">
              <h2>{editingId?'تعديل الصنف':'صنف جديد'}</h2>
              <div className="sd-form">
                <label>اسم الصنف<input className="sd-in" value={name} onChange={e=>setName(e.target.value)} placeholder="مثال: حليب طازج"/></label>
                <div className="sd-row2">
                  <label>الوحدة<input className="sd-in" value={unit} onChange={e=>setUnit(e.target.value)} placeholder="لتر، كيلو، كرتون"/></label>
                  <label>السعر (⃁)<NumberInput className="sd-in" value={price} onChange={e=>setPrice(e.target.value)} placeholder="0.00"/></label>
                </div>
                <div className="sd-seg" role="group" aria-label="هل السعر شامل الضريبة؟">
                  <span>السعر شامل الضريبة؟</span>
                  <button type="button" className={priceIncludesVat?'on':''} onClick={()=>setPriceIncludesVat(true)}>نعم</button>
                  <button type="button" className={!priceIncludesVat?'on':''} onClick={()=>setPriceIncludesVat(false)}>لا</button>
                </div>
                {price && !priceIncludesVat && <div className="sd-note">العميل يشوف السعر بعد الضريبة: <b>{(Number(price)*1.15).toFixed(2)} ⃁</b></div>}
                <label className="sd-img">
                  {(imagePreview || existingImageUrl) ? <img src={imagePreview || existingImageUrl} alt=""/> : <ImagePlus size={20}/>}
                  <span>{imagePreview||existingImageUrl?'تغيير الصورة':'صورة الصنف (اختياري)'}</span>
                  <input type="file" accept="image/*" onChange={onPickImage} hidden/>
                </label>
                <div className="sd-actions">
                  <button className="sd-btn" onClick={saveItem} disabled={saving || !name.trim() || !price}>{saving?(uploading?'جاري رفع الصورة…':'جاري الحفظ…'):editingId?'حفظ التعديل':<><Plus size={16}/> أضف الصنف</>}</button>
                  {editingId && <button className="sd-btn ghost" onClick={resetForm}>إلغاء</button>}
                </div>
              </div>
            </section>

            <section className="sd-panel">
              <h2>أصنافك <small>{items.length}</small></h2>
              {items.length===0 ? (
                <div className="sd-empty"><Package size={28}/><b>ما أضفت أصناف للحين</b><span>أضف أصنافك وأسعارك، والعملاء يطلبون منك مباشرة.</span></div>
              ) : (
                <div className="sd-list">
                  {items.map((item:any)=>(
                    <div key={item.id} className={'sd-item'+(item.is_available?'':' off')}>
                      <div className="sd-thumb">{item.image_url ? <img src={item.image_url} alt=""/> : <Package size={20}/>}</div>
                      <div className="sd-item-main"><b>{item.name}</b><span>{item.unit || '—'}</span></div>
                      <div className="sd-price">{money(item.price)} <small>⃁</small></div>
                      <button onClick={()=>toggleAvailable(item)} className={'sd-switch'+(item.is_available?' on':'')} role="switch" aria-checked={!!item.is_available} title={item.is_available?'متوفر — اضغط لإيقافه':'غير متوفر — اضغط لتفعيله'}><i/></button>
                      <div className="sd-icons">
                        <button onClick={()=>startEdit(item)} aria-label="تعديل"><Pencil size={15}/></button>
                        <button onClick={()=>deleteItem(item.id)} aria-label="حذف" className="danger"><Trash2 size={15}/></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
    </>
  )
}
