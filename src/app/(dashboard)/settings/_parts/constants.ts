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
  { code: '+966', name: 'السعودية' },
  { code: '+971', name: 'الإمارات' },
  { code: '+965', name: 'الكويت' },
  { code: '+973', name: 'البحرين' },
  { code: '+974', name: 'قطر' },
  { code: '+968', name: 'عُمان' },
  { code: '+967', name: 'اليمن' },
  { code: '+20', name: 'مصر' },
  { code: '+962', name: 'الأردن' },
  { code: '+961', name: 'لبنان' },
  { code: '+963', name: 'سوريا' },
  { code: '+964', name: 'العراق' },
  { code: '+212', name: 'المغرب' },
  { code: '+213', name: 'الجزائر' },
  { code: '+216', name: 'تونس' },
  { code: '+249', name: 'السودان' },
  { code: '+1', name: 'أمريكا' },
  { code: '+44', name: 'بريطانيا' },
  { code: '+91', name: 'الهند' },
  { code: '+92', name: 'باكستان' },
  { code: '+880', name: 'بنغلاديش' },
  { code: '+63', name: 'الفلبين' },
]

export function parsePhone(full: string) {
  for (const c of COUNTRY_CODES) {
    if (full.startsWith(c.code)) return { countryCode: c.code, number: full.slice(c.code.length) }
  }
  if (full.startsWith('05') || full.startsWith('5')) return { countryCode: '+966', number: full.startsWith('05') ? full.slice(1) : full }
  return { countryCode: '+966', number: full }
}
