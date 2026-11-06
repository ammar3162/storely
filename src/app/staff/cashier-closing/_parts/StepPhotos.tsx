'use client'
import { ct } from './strings'
import type { CashierClosing } from './useCashierClosing'

export default function StepPhotos({ m }: { m: CashierClosing }) {
  const { lang, step, networkImage, setNetworkImage, salesImage, setSalesImage, uploadingNetwork, uploadingSales, uploadImage } = m
  return (
    <>
            {/* خطوة 3: الصور */}
            {step===3 && (
              <div className="fu" style={{background:'white',borderRadius:18,padding:22,marginBottom:16,boxShadow:'0 2px 16px rgba(0,0,0,.05)',border:'1px solid #eeeeeb'}}>
                <div style={{fontSize:13,fontWeight:800,color:'#1c1c1a',marginBottom:16,display:'flex',alignItems:'center',gap:8}}>
                  <span style={{width:24,height:24,borderRadius:7,background:'#eff6ff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12}}>📸</span>
                  {ct('step3Title',lang)}
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                  <div>
                    <label style={{fontSize:11,fontWeight:700,color:'#5f5e5a',display:'block',marginBottom:6}}>{ct('salesReportImg',lang)}</label>
                    {salesImage ? (
                      <div style={{position:'relative'}}>
                        <img src={salesImage} alt="sales report" style={{width:'100%',height:130,borderRadius:10,objectFit:'cover'}}/>
                        <button type="button" onClick={()=>setSalesImage('')} style={{position:'absolute',top:6,left:6,background:'rgba(0,0,0,.55)',color:'white',border:'none',borderRadius:'50%',width:24,height:24,cursor:'pointer',fontSize:14}}>×</button>
                      </div>
                    ):(
                      <label style={{display:'flex',alignItems:'center',justifyContent:'center',height:130,border:'2px dashed #d4d3ce',borderRadius:10,cursor:'pointer',background:'#faf9f7',textAlign:'center' as const,padding:8}}>
                        <input type="file" accept="image/*" style={{display:'none'}} onChange={e=>e.target.files?.[0]&&uploadImage(e.target.files[0],'sales')}/>
                        <span style={{fontSize:12,color:'#8b8a84',fontWeight:600}}>{uploadingSales?ct('uploadingImg',lang):ct('tapSalesUpload',lang)}</span>
                      </label>
                    )}
                  </div>
                  <div>
                    <label style={{fontSize:11,fontWeight:700,color:'#5f5e5a',display:'block',marginBottom:6}}>{ct('networkBalanceImg',lang)}</label>
                    {networkImage ? (
                      <div style={{position:'relative'}}>
                        <img src={networkImage} alt="network balance" style={{width:'100%',height:130,borderRadius:10,objectFit:'cover'}}/>
                        <button type="button" onClick={()=>setNetworkImage('')} style={{position:'absolute',top:6,left:6,background:'rgba(0,0,0,.55)',color:'white',border:'none',borderRadius:'50%',width:24,height:24,cursor:'pointer',fontSize:14}}>×</button>
                      </div>
                    ):(
                      <label style={{display:'flex',alignItems:'center',justifyContent:'center',height:130,border:'2px dashed #d4d3ce',borderRadius:10,cursor:'pointer',background:'#faf9f7',textAlign:'center' as const,padding:8}}>
                        <input type="file" accept="image/*" style={{display:'none'}} onChange={e=>e.target.files?.[0]&&uploadImage(e.target.files[0],'network')}/>
                        <span style={{fontSize:12,color:'#8b8a84',fontWeight:600}}>{uploadingNetwork?ct('uploadingImg',lang):ct('tapNetworkUpload',lang)}</span>
                      </label>
                    )}
                  </div>
                </div>
              </div>
            )}
    </>
  )
}
