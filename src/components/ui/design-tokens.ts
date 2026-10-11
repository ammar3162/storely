export const storelyTokens = {
  color: {
    navy: '#203640',
    teal: '#203640',
    accent: '#A3917F',
    background: '#F7F3ED',
    surface: '#FFFFFF',
    border: '#E7E1D8',
    text: '#203640',
    textMuted: '#66737C',
    textSubtle: '#8EA0B1',
    success: '#047857',
    successBg: '#ECFDF5',
    successBorder: '#A7F3D0',
    warning: '#B45309',
    warningBg: '#FFFBEB',
    warningBorder: '#FDE68A',
    danger: '#B91C1C',
    dangerBg: '#FEF2F2',
    dangerBorder: '#FECACA',
    info: '#4F6678',
    infoBg: '#F3F5F6',
    infoBorder: '#CBD4DC',
  },
  radius: {
    control: '6px',
    card: '6px',
    panel: '6px',
    pill: '999px',
  },
  shadow: {
    focus: '0 0 0 3px rgba(32, 54, 64, .14)',
    panel: 'none',
  },
} as const

export type StorelyStatus = 'success' | 'warning' | 'danger' | 'info'
