'use client'
import { useEffect, useRef } from 'react'

interface Props {
  onScan: (code: string) => void
  onClose: () => void
}

export default function BarcodeScanner({ onScan, onClose }: Props) {
  const scannerRef = useRef<any>(null)

  useEffect(() => {
    let scanner: any
    import('html5-qrcode').then(({ Html5Qrcode }) => {
      scanner = new Html5Qrcode('barcode-reader')
      scannerRef.current = scanner
      scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 150 } },
        (code: string) => { scanner.stop().then(() => { onScan(code) }) },
        () => {}
      ).catch(() => {})
    })
    return () => { if (scannerRef.current) scannerRef.current.stop().catch(() => {}) }
  }, [])

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.85)',zIndex:1000,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',direction:'rtl',fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
      <div style={{background:'white',borderRadius:16,padding:20,width:'100%',maxWidth:400,margin:20}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
          <div style={{fontSize:15,fontWeight:700,color:'#0f172a'}}>مسح الباركود</div>
          <button onClick={onClose} style={{width:32,height:32,borderRadius:8,border:'1px solid #e2e8f0',background:'#f8fafc',cursor:'pointer',fontSize:16,display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
        </div>
        <div style={{background:'#f0fdf4',border:'1px solid #86efac',borderRadius:8,padding:'8px 12px',marginBottom:14,fontSize:12,color:'#166534',fontWeight:600}}>
          📷 وجّه الكاميرا نحو الباركود
        </div>
        <div id="barcode-reader" style={{borderRadius:10,overflow:'hidden'}}/>
        <button onClick={onClose} style={{width:'100%',marginTop:14,padding:'11px',background:'#f1f5f9',color:'#64748b',border:'none',borderRadius:9,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>
          إلغاء
        </button>
      </div>
    </div>
  )
}
