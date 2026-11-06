import { colors, font } from '@/lib/ds'

export const lbl: React.CSSProperties = { fontSize: font.xs, fontWeight: 700, color: colors.text3, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }

export const DAYS = [
  {key:'0',label:'أحد'},{key:'1',label:'إثن'},{key:'2',label:'ثلث'},
  {key:'3',label:'أرب'},{key:'4',label:'خمس'},{key:'5',label:'جمع'},{key:'6',label:'سبت'},
]

export const TABS = [
  {key:'account', label:'الحساب',     icon:'👤'},
  {key:'org',    label:'المؤسسة',    icon:'🏢'},
  {key:'notify', label:'الإشعارات',  icon:'🔔'},
  {key:'backup', label:'النسخ الاحتياطي', icon:'💾'},
  {key:'accountant', label:'المحاسب', icon:'📊', ownerOnly:true},
  {key:'security',label:'الأمان',   icon:'🔐'},
]

export const COUNTRY_CODES = [
  { code: '+966', flag: '🇸🇦', name: 'السعودية' },
  { code: '+971', flag: '🇦🇪', name: 'الإمارات' },
  { code: '+965', flag: '🇰🇼', name: 'الكويت' },
  { code: '+973', flag: '🇧🇭', name: 'البحرين' },
  { code: '+974', flag: '🇶🇦', name: 'قطر' },
  { code: '+968', flag: '🇴🇲', name: 'عُمان' },
  { code: '+967', flag: '🇾🇪', name: 'اليمن' },
  { code: '+20', flag: '🇪🇬', name: 'مصر' },
  { code: '+962', flag: '🇯🇴', name: 'الأردن' },
  { code: '+961', flag: '🇱🇧', name: 'لبنان' },
  { code: '+963', flag: '🇸🇾', name: 'سوريا' },
  { code: '+964', flag: '🇮🇶', name: 'العراق' },
  { code: '+212', flag: '🇲🇦', name: 'المغرب' },
  { code: '+213', flag: '🇩🇿', name: 'الجزائر' },
  { code: '+216', flag: '🇹🇳', name: 'تونس' },
  { code: '+249', flag: '🇸🇩', name: 'السودان' },
  { code: '+1', flag: '🇺🇸', name: 'أمريكا' },
  { code: '+44', flag: '🇬🇧', name: 'بريطانيا' },
  { code: '+91', flag: '🇮🇳', name: 'الهند' },
  { code: '+92', flag: '🇵🇰', name: 'باكستان' },
  { code: '+880', flag: '🇧🇩', name: 'بنغلاديش' },
  { code: '+63', flag: '🇵🇭', name: 'الفلبين' },
]

export function parsePhone(full: string) {
  for (const c of COUNTRY_CODES) {
    if (full.startsWith(c.code)) return { countryCode: c.code, number: full.slice(c.code.length) }
  }
  if (full.startsWith('05') || full.startsWith('5')) return { countryCode: '+966', number: full.startsWith('05') ? full.slice(1) : full }
  return { countryCode: '+966', number: full }
}
