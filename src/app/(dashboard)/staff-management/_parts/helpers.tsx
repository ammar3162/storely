'use client'
import { colors } from '@/lib/ds'

export function generatePin() { return String(Math.floor(1000 + Math.random() * 9000)) }
export const COUNTRY_CODES = ['+966','+971','+965','+973','+974','+968','+20','+962','+1','+44','+91','+92','+880','+63']
export function toLocalPhone(phone: string) {
  if (!phone) return phone
  const code = COUNTRY_CODES.find(c => phone.startsWith(c))
  if (!code) return phone
  return '0' + phone.slice(code.length)
}

export function Avatar({ name, active }: { name:string; active:boolean }) {
  const initials = name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()
  return (
    <div style={{
      width:44,height:44,borderRadius:14,
      background:active?`#203640`:'linear-gradient(135deg,#94a3b8,#64748b)',
      display:'flex',alignItems:'center',justifyContent:'center',
      fontSize:14,fontWeight:900,color:'white',flexShrink:0,
      boxShadow:active?`0 4px 12px ${colors.primary}33`:'none',
    }}>
      {initials||'؟'}
    </div>
  )
}
