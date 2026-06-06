'use client'
import { useRef, useState } from 'react'

interface Props {
  onScan: (code: string) => void
  onClose: () => void
}

export default function BarcodeScanner({ onScan, onClose }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState('')

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setScanning(true)
    setError('')
    try {
      const { BrowserMultiFormatReader } = await import('@zxing/browser')
      const reader = new BrowserMultiFormatReader()
      const img = await createImageBitmap(file)
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const result = await reader.decodeFromCanvas(canvas)
      onScan(result.getText())
    } catch {
      setError('لم يتم التعرف على الباركود — حاول مرة أخرى')
    }
    setScanning(false)
  }

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.88)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',direction:'rtl',fontFamily:"'Segoe UI',system-ui,sans-serif",padding:16}}>
      <div style={{background:'white',borderRadius:16,padding:24,width:'100%',maxWidth:400}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
          <div style={{fontSize:15,fontWeight:700,color:'#0f172a'}}>مسح الباركود</div>
          <button onClick={onClose} style={{width:32,height:32,borderRadius:8,border:'1px solid #e2e8f0',background:'#f8fafc',cursor:'pointer',fontSize:18}}>✕</button>
        </div>

        {error && (
          <div style={{background:'#fef2f2',border:'1.5px solid #fecaca',borderRadius:9,padding:'10px 14px',fontSize:13,color:'#dc2626',fontWeight:600,marginBottom:14,textAlign:'center'}}>
            ⚠️ {error}
          </div>
        )}

        <div style={{textAlign:'center',marginBottom:16}}>
          <div style={{fontSize:48,marginBottom:8}}>📷</div>
          <div style={{fontSize:13,color:'#64748b',marginBottom:4}}>التقط صورة للباركود من الكاميرا</div>
          <div style={{fontSize:11,color:'#94a3b8'}}>سيتم التعرف على الباركود تلقائياً</div>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{display:'none'}}
          onChange={handleFile}
        />

        <button
          onClick={() => fileRef.current?.click()}
          disabled={scanning}
          style={{width:'100%',padding:'14px',background:scanning?'#94a3b8':'#1a4731',color:'white',border:'none',borderRadius:10,fontSize:14,fontWeight:700,cursor:scanning?'not-allowed':'pointer',fontFamily:'inherit',marginBottom:10}}>
          {scanning ? '⏳ جاري المسح...' : '📷 فتح الكاميرا'}
        </button>

        <button onClick={onClose} style={{width:'100%',padding:'11px',background:'#f1f5f9',color:'#64748b',border:'none',borderRadius:9,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>
          إلغاء
        </button>
      </div>
    </div>
  )
}
