'use client'
import { ct } from './strings'
import type { CashierClosing } from './useCashierClosing'
import { Camera, X } from 'lucide-react'

export default function StepPhotos({ m }: { m: CashierClosing }) {
  const { lang, step, networkImage, setNetworkImage, salesImage, setSalesImage, networkPreview, salesPreview, uploadingNetwork, uploadingSales, uploadImage } = m
  return (
    <>
            {/* خطوة 3: الصور */}
            {step===3 && (
              <div className="fu" style={{background:'white',borderRadius:14,padding:16,marginBottom:16,border:'1px solid #e5e7eb'}}>
                <div style={{fontSize:15,fontWeight:600,color:'#111827',marginBottom:16,display:'flex',alignItems:'center',gap:8}}>
                  <span style={{width:28,height:28,borderRadius:8,background:'#eceef1',display:'flex',alignItems:'center',justifyContent:'center',color:'#4b5565'}}><Camera size={16} strokeWidth={1.75}/></span>
                  {ct('step3Title',lang)}
                </div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:12}}>
                  <div>
                    <label style={{fontSize:13,fontWeight:500,color:'#111827',display:'block',marginBottom:8}}>{ct('salesReportImg',lang)}</label>
                    {salesImage ? (
                      <div style={{position:'relative'}}>
                        <img src={salesPreview || salesImage} alt="sales report" style={{width:'100%',aspectRatio:'3 / 4',borderRadius:10,objectFit:'cover',display:'block',border:'1px solid #e5e7eb'}}/>
                        <button type="button" onClick={()=>setSalesImage('')} aria-label="حذف" style={{position:'absolute',top:8,insetInlineEnd:8,background:'rgba(17,24,39,.72)',color:'white',border:'none',borderRadius:8,width:32,height:32,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><X size={16} strokeWidth={1.75}/></button>
                      </div>
                    ):(
                      <label style={{display:'flex',flexDirection:'column' as const,alignItems:'center',justifyContent:'center',gap:10,aspectRatio:'3 / 4',border:'1px dashed #c9cdd3',borderRadius:10,cursor:'pointer',background:'#f9fafb',textAlign:'center' as const,padding:8}}>
                        <span style={{width:48,height:48,borderRadius:12,background:'white',border:'1px solid #e5e7eb',display:'flex',alignItems:'center',justifyContent:'center',color:'#4b5565'}}><Camera size={20} strokeWidth={1.75}/></span>
                        <input type="file" accept="image/*" style={{display:'none'}} onChange={e=>e.target.files?.[0]&&uploadImage(e.target.files[0],'sales')}/>
                        <span style={{fontSize:14,fontWeight:500,color:'#111827'}}>{uploadingSales?ct('uploadingImg',lang):ct('tapSalesUpload',lang)}</span>
                      </label>
                    )}
                  </div>
                  <div>
                    <label style={{fontSize:13,fontWeight:500,color:'#111827',display:'block',marginBottom:8}}>{ct('networkBalanceImg',lang)}</label>
                    {networkImage ? (
                      <div style={{position:'relative'}}>
                        <img src={networkPreview || networkImage} alt="network balance" style={{width:'100%',aspectRatio:'3 / 4',borderRadius:10,objectFit:'cover',display:'block',border:'1px solid #e5e7eb'}}/>
                        <button type="button" onClick={()=>setNetworkImage('')} aria-label="حذف" style={{position:'absolute',top:8,insetInlineEnd:8,background:'rgba(17,24,39,.72)',color:'white',border:'none',borderRadius:8,width:32,height:32,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><X size={16} strokeWidth={1.75}/></button>
                      </div>
                    ):(
                      <label style={{display:'flex',flexDirection:'column' as const,alignItems:'center',justifyContent:'center',gap:10,aspectRatio:'3 / 4',border:'1px dashed #c9cdd3',borderRadius:10,cursor:'pointer',background:'#f9fafb',textAlign:'center' as const,padding:8}}>
                        <span style={{width:48,height:48,borderRadius:12,background:'white',border:'1px solid #e5e7eb',display:'flex',alignItems:'center',justifyContent:'center',color:'#4b5565'}}><Camera size={20} strokeWidth={1.75}/></span>
                        <input type="file" accept="image/*" style={{display:'none'}} onChange={e=>e.target.files?.[0]&&uploadImage(e.target.files[0],'network')}/>
                        <span style={{fontSize:14,fontWeight:500,color:'#111827'}}>{uploadingNetwork?ct('uploadingImg',lang):ct('tapNetworkUpload',lang)}</span>
                      </label>
                    )}
                  </div>
                </div>
              </div>
            )}
    </>
  )
}
