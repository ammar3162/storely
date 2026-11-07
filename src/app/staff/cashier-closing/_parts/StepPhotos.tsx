'use client'
import { ct } from './strings'
import { Question } from './inputs'
import type { CashierClosing } from './useCashierClosing'
import { Camera, RotateCcw, Loader2 } from 'lucide-react'

// خانة صورة كبيرة تعبّي الشاشة — صورة وحدة بكل شاشة
function PhotoSlot({ label, image, preview, uploading, onPick, onClear, lang }: { label: string; image: string; preview: string; uploading: boolean; onPick: (f: File) => void; onClear: () => void; lang: string }) {
  return (
    <div style={{minWidth:0}}>
      {label && <div style={{fontSize:14,fontWeight:500,color:'#111827',marginBottom:8}}>{label}</div>}
      {image ? (
        <div style={{position:'relative',aspectRatio:'4 / 5',maxHeight:'52vh',width:'100%',borderRadius:10,overflow:'hidden',border:'1px solid #e5e7eb',background:'#f4f5f6'}}>
          <img src={preview || image} alt={label} style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}}/>
          <button type="button" onClick={onClear}
            style={{position:'absolute',insetInline:8,bottom:8,height:36,borderRadius:8,border:'none',background:'rgba(17,24,39,.72)',color:'white',fontSize:13,fontWeight:500,fontFamily:'inherit',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
            <RotateCcw size={14} strokeWidth={1.75}/>{ct('photoRetake',lang)}
          </button>
        </div>
      ) : (
        <label style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:10,aspectRatio:'4 / 5',maxHeight:'52vh',width:'100%',border:'1px dashed #c9cdd3',borderRadius:10,cursor:'pointer',background:'#f9fafb',textAlign:'center' as const,padding:12}}>
          <input type="file" accept="image/*" style={{display:'none'}} onChange={e=>e.target.files?.[0]&&onPick(e.target.files[0])}/>
          <span style={{width:56,height:56,borderRadius:14,background:'white',border:'1px solid #e5e7eb',display:'flex',alignItems:'center',justifyContent:'center',color:'#4b5565'}}>
            {uploading ? <Loader2 size={20} strokeWidth={1.75} style={{animation:'spin .8s linear infinite'}}/> : <Camera size={20} strokeWidth={1.75}/>}
          </span>
          <span style={{fontSize:16,fontWeight:500,color:'#111827'}}>{uploading?ct('uploadingImg',lang):ct('tapSalesUpload',lang)}</span>
        </label>
      )}
    </div>
  )
}

export default function StepPhotos({ m }: { m: CashierClosing }) {
  const { lang, step, sub, networkImage, setNetworkImage, salesImage, setSalesImage, networkPreview, salesPreview, uploadingNetwork, uploadingSales, uploadImage } = m
  if(step!==3) return null
  // صورة بكل شاشة: تقرير المبيعات ثم موازنة الشبكة
  return (
    <div key={`s3-${sub}`}>
      {sub===0 ? (
        <Question title={ct('q_salesPhoto',lang)} hint={ct('photoHint',lang)}>
          <PhotoSlot label="" image={salesImage} preview={salesPreview} uploading={uploadingSales} lang={lang}
            onPick={f=>uploadImage(f,'sales')} onClear={()=>setSalesImage('')}/>
        </Question>
      ) : (
        <Question title={ct('q_networkPhoto',lang)} hint={ct('photoHint',lang)}>
          <PhotoSlot label="" image={networkImage} preview={networkPreview} uploading={uploadingNetwork} lang={lang}
            onPick={f=>uploadImage(f,'network')} onClear={()=>setNetworkImage('')}/>
        </Question>
      )}
    </div>
  )
}
