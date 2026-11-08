'use client'
import { btnPrimary, btnSecondary, inp } from '@/lib/ds'
import type { SuppliersPageState } from './useSuppliersPage'

export default function AddSupplierForm({ m }: { m: SuppliersPageState }) {
  const { showAdd, setShowAdd, newName, setNewName, newPhone, setNewPhone, supCountry, setSupCountry, newNotes, setNewNotes, newConsent, setNewConsent, addSupplier } = m
  return (
    <>
      {/* إضافة مورد */}
      {showAdd && (
        <div style={{ background:'white', border:'1.5px solid #E2E7EA', borderRadius:16, padding:20, marginBottom:18 }}>
          <div style={{ fontSize:14, fontWeight:700, color:'#203640', marginBottom:14 }}>إضافة مورد جديد</div>
          <div className="add-grid" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
            <input value={newName} onChange={e=>setNewName(e.target.value)} style={inp()} placeholder="اسم المورد *" />
            <div style={{display:'flex',gap:8}}>
              <select value={supCountry} onChange={e=>setSupCountry(e.target.value)}
                style={{padding:'10px 8px',border:'1px solid #E2E7EA',borderRadius:8,fontFamily:'inherit',fontSize:12,background:'white',cursor:'pointer'}}>
                {[['+966','🇸🇦'],['+971','🇦🇪'],['+965','🇰🇼'],['+973','🇧🇭'],['+974','🇶🇦'],['+968','🇴🇲'],['+20','🇪🇬'],['+962','🇯🇴'],['+1','🇺🇸'],['+44','🇬🇧'],['+91','🇮🇳'],['+92','🇵🇰']].map(([code,flag])=>(
                <option key={code} value={code}>{flag} {code}</option>
              ))}
              </select>
              <input value={newPhone} onChange={e=>setNewPhone(e.target.value)} style={{...inp(),flex:1,direction:'ltr'}} placeholder={supCountry==='+966'?'5xxxxxxxx':supCountry==='+20'?'1xxxxxxxxx':'xxxxxxxxxx'} />
            </div>
          </div>
          <input value={newNotes} onChange={e=>setNewNotes(e.target.value)} style={{...inp(), width:'100%', marginBottom:14, boxSizing:'border-box' as const}} placeholder="ملاحظات عامة للمورد (اختياري)" />
          <label style={{display:'flex',alignItems:'flex-start',gap:8,padding:'10px 12px',background:'#F7F9FA',borderRadius:10,border:'1px solid #E2E7EA',cursor:'pointer',marginBottom:14}}>
            <input type="checkbox" checked={newConsent} onChange={e=>setNewConsent(e.target.checked)} style={{marginTop:2,width:16,height:16,flexShrink:0,cursor:'pointer'}}/>
            <span style={{fontSize:11,color:'#16262D',lineHeight:1.6}}>أقر بأن هذا المورد وافق على استلام رسائل واتساب مني بخصوص طلبات التوريد</span>
          </label>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={addSupplier} style={{ ...btnPrimary, padding:'10px 20px', fontSize:13 }}>حفظ المورد</button>
            <button onClick={()=>setShowAdd(false)} style={{ ...btnSecondary, padding:'10px 20px', fontSize:13 }}>إلغاء</button>
          </div>
        </div>
      )}
    </>
  )
}
