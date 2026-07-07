'use client'

interface StoreMascotProps {
  focused: 'email' | 'password' | null
  cursorRatio?: number // 0 to 1, position of cursor within the email field
}

export default function StoreMascot({ focused, cursorRatio = 0.5 }: StoreMascotProps) {
  const eyesOpen = focused !== 'password'
  const offsetX = focused === 'email' ? (0.5 - cursorRatio) * 12 : 0
  const offsetY = focused === 'email' ? -3 : 0

  return (
    <svg viewBox="0 0 200 180" style={{ width: 130, height: 'auto', display: 'block', margin: '0 auto 12px', transition: 'transform .2s' }}>
      <ellipse cx="100" cy="168" rx="55" ry="8" fill="#000" opacity="0.06" />
      <rect x="35" y="55" width="130" height="100" rx="10" fill="#16a34a" />
      <rect x="35" y="55" width="130" height="100" rx="10" fill="none" stroke="#15803d" strokeWidth="2" />
      <line x1="100" y1="55" x2="100" y2="155" stroke="#15803d" strokeWidth="2" />
      <rect x="80" y="85" width="40" height="35" rx="4" fill="#dcfce7" stroke="#15803d" strokeWidth="2" />
      <path d="M35 55 L65 20 L135 20 L165 55 Z" fill="#22c55e" stroke="#15803d" strokeWidth="2" strokeLinejoin="round" />
      <path d="M65 20 L100 55 L135 20" fill="none" stroke="#15803d" strokeWidth="2" strokeLinejoin="round" />

      {/* Left eye */}
      <circle cx="78" cy="80" r="14" fill="white" stroke="#15803d" strokeWidth="2" opacity={eyesOpen ? 1 : 0} style={{ transition: 'opacity .15s' }} />
      <circle cx={78 + offsetX} cy={80 + offsetY} r="6" fill="#0d2818" opacity={eyesOpen ? 1 : 0} style={{ transition: 'cx .12s ease, cy .12s ease, opacity .15s' }} />
      <path d="M64 80 Q78 80 92 80" fill="none" stroke="#15803d" strokeWidth="3" strokeLinecap="round" opacity={eyesOpen ? 0 : 1} style={{ transition: 'opacity .15s' }} />

      {/* Right eye */}
      <circle cx="122" cy="80" r="14" fill="white" stroke="#15803d" strokeWidth="2" opacity={eyesOpen ? 1 : 0} style={{ transition: 'opacity .15s' }} />
      <circle cx={122 + offsetX} cy={80 + offsetY} r="6" fill="#0d2818" opacity={eyesOpen ? 1 : 0} style={{ transition: 'cx .12s ease, cy .12s ease, opacity .15s' }} />
      <path d="M108 80 Q122 80 136 80" fill="none" stroke="#15803d" strokeWidth="3" strokeLinecap="round" opacity={eyesOpen ? 0 : 1} style={{ transition: 'opacity .15s' }} />

      <path
        d={focused === 'password' ? 'M92 108 Q100 105 108 108' : 'M88 105 Q100 112 112 105'}
        fill="none" stroke="#0d2818" strokeWidth="2.5" strokeLinecap="round"
        style={{ transition: 'd .15s' }}
      />
      <ellipse cx="60" cy="98" rx="7" ry="4" fill="#4ade80" opacity="0.5" />
      <ellipse cx="140" cy="98" rx="7" ry="4" fill="#4ade80" opacity="0.5" />
    </svg>
  )
}
