'use client'
import { useState, useEffect } from 'react'
import { colors, radius, font, shadow } from '@/lib/ds'

export default function PWAInstall() {
  const [prompt, setPrompt]         = useState<any>(null)
  const [showBanner, setShowBanner] = useState(false)
  const [installed, setInstalled]   = useState(false)

  useEffect(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(console.error)
    if (localStorage.getItem('pwa_dismissed')) return
    const handler = (e: any) => { e.preventDefault(); setPrompt(e); setShowBanner(true) }
    window.addEventListener('beforeinstallprompt', handler)
    if (window.matchMedia('(display-mode: standalone)').matches) setInstalled(true)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function install() {
    if (!prompt) return
    prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === 'accepted') setInstalled(true)
    setShowBanner(false); setPrompt(null)
  }

  if (installed || !showBanner) return null

  return (
    <div style={{position:'fixed',bottom:20,right:20,left:20,zIndex:9999,background:colors.surface,borderRadius:radius.xl,boxShadow:shadow.lg,border:`1px solid ${colors.border2}`,padding:'16px 18px',display:'flex',alignItems:'center',gap:14,fontFamily:font.family,direction:'rtl',maxWidth:420,margin:'0 auto'}}>
      <div style={{width:44,height:44,borderRadius:radius.md,background:colors.primaryLight,border:`1.5px solid ${colors.primaryBorder}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>🏪</div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:font.sm,fontWeight:700,color:colors.text}}>ثبّت Storely على جهازك</div>
        <div style={{fontSize:font.xs,color:colors.text4,marginTop:2}}>للوصول السريع بدون متصفح</div>
      </div>
      <div style={{display:'flex',gap:8,flexShrink:0}}>
        <button onClick={()=>{ setShowBanner(false); localStorage.setItem('pwa_dismissed','1') }} style={{padding:'7px 12px',background:colors.bg,color:colors.text3,border:`1px solid ${colors.border2}`,borderRadius:radius.sm,fontSize:font.xs,fontWeight:600,cursor:'pointer',fontFamily:font.family}}>لاحقاً</button>
        <button onClick={install} style={{padding:'7px 14px',background:colors.primary,color:'white',border:'none',borderRadius:radius.sm,fontSize:font.xs,fontWeight:700,cursor:'pointer',fontFamily:font.family}}>تثبيت</button>
      </div>
    </div>
  )
}
