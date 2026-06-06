'use client'
import { useEffect, useRef, useState } from 'react'

interface Props {
  onScan: (code: string) => void
  onClose: () => void
}

export default function BarcodeScanner({ onScan, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)
  const streamRef = useRef<MediaStream|null>(null)
  const readerRef = useRef<any>(null)

  useEffect(() => { startScan(); return () => stop() }, [])

  async function startScan() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } }
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        setReady(true)
      }
      const { BrowserMultiFormatReader } = await import('@zxing/browser')
      const reader = new BrowserMultiFormatReader()
      readerRef.current = reader
      reader.decodeFromStream(stream, videoRef.current!, (result) => {
        if (result) { stop(); onScan(result.getText()) }
      })
    } catch (e: any) {
      if (e.name === 'NotAllowedError') setError('يرجى السماح باستخدام الكاميرا')
      else setError('تعذّر فتح الكاميرا')
    }
  }

  function stop() {
    try {
      streamRef.current?.getTracks().forEach(t => t.stop())
      streamRef.current = null
      if (videoRef.current) { videoRef.current.srcObject = null }
    } catch {}
  }

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.92)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center',direction:'rtl',fontFamily:"'Segoe UI',system-ui,sans-serif",padding:16}}>
      <div style={{background:'white',borderRadius:16,padding:20,width:'100%',maxWidth:420}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
          <div style={{fontSize:15,fontWeight:700,color:'#0f172a'}}>📷 مسح الباركود</div>
          <button onClick={()=>{stop();onClose()}} style={{width:32,height:32,borderRadius:8,border:'1px solid #e2e8f0',background:'#f8fafc',cursor:'pointer',fontSize:18,display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
        </div>
        {error ? (
          <div style={{background:'#fef2f2',border:'1.5px solid #fecaca',borderRadius:9,padding:'12px',fontSize:13,color:'#dc2626',fontWeight:600,textAlign:'center',marginBottom:12}}>⚠️ {error}</div>
        ) : (
          <div style={{background:'#f0fdf4',border:'1px solid #86efac',borderRadius:8,padding:'8px 12px',marginBottom:12,fontSize:12,color:'#166534',fontWeight:600,textAlign:'center'}}>
            {ready ? '🎯 وجّه الكاميرا نحو الباركود' : '⏳ جاري تشغيل الكاميرا...'}
          </div>
        )}
        <div style={{borderRadius:12,overflow:'hidden',background:'#000',position:'relative'}}>
          <video ref={videoRef} style={{width:'100%',display:'block'}} autoPlay playsInline muted/>
          {ready && (
            <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',pointerEvents:'none'}}>
              <div style={{width:'70%',height:80,border:'2.5px solid #4abe7a',borderRadius:10,boxShadow:'0 0 0 1000px rgba(0,0,0,0.4)'}}/>
            </div>
          )}
        </div>
        <button onClick={()=>{stop();onClose()}} style={{width:'100%',marginTop:14,padding:'11px',background:'#f1f5f9',color:'#64748b',border:'none',borderRadius:9,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>إلغاء</button>
      </div>
    </div>
  )
}
