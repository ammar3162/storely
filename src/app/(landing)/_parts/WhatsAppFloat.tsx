'use client'
import { WA_ICON } from './constants'

export default function WhatsAppFloat() {
  return (
    <>
      {/* واتساب */}
      <a href="https://wa.me/966594351667" target="_blank" rel="noreferrer" className="lp-wa-float" aria-label="تواصل عبر واتساب">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="white"><path d={WA_ICON}/></svg>
      </a>
    </>
  )
}
