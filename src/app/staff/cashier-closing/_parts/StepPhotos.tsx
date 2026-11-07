'use client'
import { ct } from './strings'
import type { CashierClosing } from './useCashierClosing'
import { Camera } from 'lucide-react'

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
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                  <div>
                    <label style={{fontSize:13,fontWeight:500,color:'#111827',display:'block',marginBottom:8}}>{ct('salesReportImg',lang)}</label>
                    {salesImage ? (
                      <div style={{position:'relative'}}>
                        <img src={salesPreview || salesImage} alt="sales report" style={{width:'100%',height:130,borderRadius:10,objectFit:'cover'}}/>
                        <button type="button" onClick={()=>setSalesImage('')} style={{position:'absolute',top:6,left:6,background:'rgba(0,0,0,.55)',color:'white',border:'none',borderRadius:'50%',width:24,height:24,cursor:'pointer',fontSize:14}}>×</button>
                      </div>
                    ):(
                      <label style={{display:'flex',alignItems:'center',justifyContent:'center',height:130,border:'1px dashed #d1d5db',borderRadius:10,cursor:'pointer',background:'#f4f5f6',textAlign:'center' as const,padding:8}}>
                        <input type="file" accept="image/*" style={{display:'none'}} onChange={e=>e.target.files?.[0]&&uploadImage(e.target.files[0],'sales')}/>
                        <span style={{fontSize:13,color:'#4b5565'}}>{uploadingSales?ct('uploadingImg',lang):ct('tapSalesUpload',lang)}</span>
                      </label>
                    )}
                  </div>
                  <div>
                    <label style={{fontSize:13,fontWeight:500,color:'#111827',display:'block',marginBottom:8}}>{ct('networkBalanceImg',lang)}</label>
                    {networkImage ? (
                      <div style={{position:'relative'}}>
                        <img src={networkPreview || networkImage} alt="network balance" style={{width:'100%',height:130,borderRadius:10,objectFit:'cover'}}/>
                        <button type="button" onClick={()=>setNetworkImage('')} style={{position:'absolute',top:6,left:6,background:'rgba(0,0,0,.55)',color:'white',border:'none',borderRadius:'50%',width:24,height:24,cursor:'pointer',fontSize:14}}>×</button>
                      </div>
                    ):(
                      <label style={{display:'flex',alignItems:'center',justifyContent:'center',height:130,border:'1px dashed #d1d5db',borderRadius:10,cursor:'pointer',background:'#f4f5f6',textAlign:'center' as const,padding:8}}>
                        <input type="file" accept="image/*" style={{display:'none'}} onChange={e=>e.target.files?.[0]&&uploadImage(e.target.files[0],'network')}/>
                        <span style={{fontSize:13,color:'#4b5565'}}>{uploadingNetwork?ct('uploadingImg',lang):ct('tapNetworkUpload',lang)}</span>
                      </label>
                    )}
                  </div>
                </div>
              </div>
            )}
    </>
  )
}
