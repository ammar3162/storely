'use client'
import { useEffect, useRef, useState } from 'react'
import { StorelyButton } from '@/components/ui/button'
import { storelyTokens as t } from '@/components/ui/design-tokens'

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
  const doneRef = useRef(false)

  useEffect(() => {
    startScan()
    return () => { forceStop() }
  }, [])

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
        if (result && !doneRef.current) {
          doneRef.current = true
          forceStop()
          setTimeout(() => onScan(result.getText()), 200)
        }
      })
    } catch (e: any) {
      if (e.name === 'NotAllowedError') setError('يرجى السماح باستخدام الكاميرا')
      else setError('تعذّر فتح الكاميرا')
    }
  }

  function forceStop() {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => { t.stop(); t.enabled = false })
        streamRef.current = null
      }
      if (videoRef.current) {
        videoRef.current.pause()
        videoRef.current.srcObject = null
      }
    } catch {}
  }

  function handleClose() {
    doneRef.current = true
    forceStop()
    setTimeout(onClose, 100)
  }

  return (
    <div className="storely-overlay">
      <div className="storely-dialog" style={{maxWidth:420}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
          <div style={{fontSize:t.typography.section,fontWeight:600,color:t.color.text}}>📷 مسح الباركود</div>
          <StorelyButton type="button" onClick={handleClose} size="sm">✕</StorelyButton>
        </div>
        {error ? (
          <div style={{background:t.color.dangerBg,border:`1px solid ${t.color.dangerBorder}`,borderRadius:t.radius.control,padding:12,fontSize:t.typography.body,color:t.color.danger,fontWeight:600,textAlign:'center',marginBottom:12}}>⚠️ {error}</div>
        ) : (
          <div style={{background:t.color.background,border:`1px solid ${t.color.border}`,borderRadius:t.radius.control,padding:'8px 12px',marginBottom:12,fontSize:t.typography.body,color:t.color.text,fontWeight:600,textAlign:'center'}}>
            {ready ? '🎯 وجّه الكاميرا نحو الباركود' : '⏳ جاري تشغيل الكاميرا...'}
          </div>
        )}
        <div style={{borderRadius:12,overflow:'hidden',background:'#000',position:'relative'}}>
          <video ref={videoRef} style={{width:'100%',display:'block'}} autoPlay playsInline muted/>
          {ready && (
            <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',pointerEvents:'none'}}>
              <div style={{width:'70%',height:80,border:'2px solid white',borderRadius:t.radius.control,boxShadow:'0 0 0 1000px rgba(0,0,0,0.4)'}}/>
            </div>
          )}
        </div>
        <StorelyButton type="button" onClick={handleClose} style={{width:'100%',marginTop:16}}>إلغاء</StorelyButton>
      </div>
    </div>
  )
}
