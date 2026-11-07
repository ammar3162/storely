'use client'
import { SIGNUP_BUSINESS_TYPES } from '@/lib/businessTypes'

export const COUNTRY_CODES = [
  { code: '+966', flag: '🇸🇦', name: 'السعودية' },
  { code: '+971', flag: '🇦🇪', name: 'الإمارات' },
  { code: '+965', flag: '🇰🇼', name: 'الكويت' },
  { code: '+973', flag: '🇧🇭', name: 'البحرين' },
  { code: '+974', flag: '🇶🇦', name: 'قطر' },
  { code: '+968', flag: '🇴🇲', name: 'عُمان' },
  { code: '+967', flag: '🇾🇪', name: 'اليمن' },
  { code: '+20',  flag: '🇪🇬', name: 'مصر' },
  { code: '+962', flag: '🇯🇴', name: 'الأردن' },
  { code: '+961', flag: '🇱🇧', name: 'لبنان' },
  { code: '+963', flag: '🇸🇾', name: 'سوريا' },
  { code: '+964', flag: '🇮🇶', name: 'العراق' },
  { code: '+212', flag: '🇲🇦', name: 'المغرب' },
  { code: '+213', flag: '🇩🇿', name: 'الجزائر' },
  { code: '+216', flag: '🇹🇳', name: 'تونس' },
  { code: '+249', flag: '🇸🇩', name: 'السودان' },
  { code: '+1',   flag: '🇺🇸', name: 'أمريكا' },
  { code: '+44',  flag: '🇬🇧', name: 'بريطانيا' },
  { code: '+91',  flag: '🇮🇳', name: 'الهند' },
  { code: '+92',  flag: '🇵🇰', name: 'باكستان' },
  { code: '+880', flag: '🇧🇩', name: 'بنغلاديش' },
  { code: '+63',  flag: '🇵🇭', name: 'الفلبين' },
]

export const PHONE_RULES: Record<string,{length:number, prefix:string, placeholder:string}> = {
  '+966': { length:9,  prefix:'5',  placeholder:'5xxxxxxxx'   },  // السعودية
  '+971': { length:9,  prefix:'5',  placeholder:'5xxxxxxxx'   },  // الإمارات
  '+965': { length:8,  prefix:'',   placeholder:'xxxxxxxx'    },  // الكويت
  '+973': { length:8,  prefix:'',   placeholder:'xxxxxxxx'    },  // البحرين
  '+974': { length:8,  prefix:'',   placeholder:'xxxxxxxx'    },  // قطر
  '+968': { length:8,  prefix:'',   placeholder:'xxxxxxxx'    },  // عُمان
  '+967': { length:9,  prefix:'7',  placeholder:'7xxxxxxxx'   },  // اليمن
  '+20':  { length:10, prefix:'1',  placeholder:'1xxxxxxxxx'  },  // مصر
  '+962': { length:9,  prefix:'7',  placeholder:'7xxxxxxxx'   },  // الأردن
  '+961': { length:8,  prefix:'',   placeholder:'xxxxxxxx'    },  // لبنان
  '+963': { length:9,  prefix:'9',  placeholder:'9xxxxxxxx'   },  // سوريا
  '+964': { length:10, prefix:'7',  placeholder:'7xxxxxxxxx'  },  // العراق
  '+212': { length:9,  prefix:'6',  placeholder:'6xxxxxxxx'   },  // المغرب
  '+213': { length:9,  prefix:'5',  placeholder:'5xxxxxxxx'   },  // الجزائر
  '+216': { length:8,  prefix:'',   placeholder:'xxxxxxxx'    },  // تونس
  '+249': { length:9,  prefix:'9',  placeholder:'9xxxxxxxx'   },  // السودان
  '+1':   { length:10, prefix:'',   placeholder:'xxxxxxxxxx'  },  // أمريكا
  '+44':  { length:10, prefix:'7',  placeholder:'7xxxxxxxxx'  },  // بريطانيا
  '+91':  { length:10, prefix:'',   placeholder:'xxxxxxxxxx'  },  // الهند
  '+92':  { length:10, prefix:'3',  placeholder:'3xxxxxxxxx'  },  // باكستان
  '+880': { length:10, prefix:'1',  placeholder:'1xxxxxxxxx'  },  // بنغلاديش
  '+63':  { length:10, prefix:'9',  placeholder:'9xxxxxxxxx'  },  // الفلبين
}

// v = عدد الفروع (يحدد الباقة المطلوبة بعد التجربة) — التجربة نفسها بكل المميزات
// الباقات الجديدة (2026-11) — السعر لكل فرع من lib/planPricing
export const PLANS: { v: 'essential' | 'ops' | 'full'; desc: string; descEn: string; color: string }[] = [
  { v:'essential', desc:'المخزون والموردين والمشتريات والفواتير',          descEn:'Inventory, suppliers, purchases & invoices', color:'#029FA2' },
  { v:'ops',       desc:'كل الأساسية + إقفال الكاشير اليومي',             descEn:'Essential + daily cashier closing',          color:'#029FA2' },
  { v:'full',      desc:'كل المميزات: الحضور والرواتب والذكاء الاصطناعي', descEn:'Everything: attendance, payroll & AI',       color:'#7c3aed' },
]
export const PLAN_EN: Record<string, string> = { essential: 'Essential', ops: 'Operations', full: 'Complete' }

export function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/>
    </svg>
  )
}

export const BUSINESS_TYPES = SIGNUP_BUSINESS_TYPES
