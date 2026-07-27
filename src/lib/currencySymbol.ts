// رمز العملة المعروض بالتقارير والفواتير حسب كود العملة (ISO 4217)
export const CURRENCY_SYMBOLS: Record<string, string> = {
  SAR: 'ر.س',
  AED: 'د.إ',
  KWD: 'د.ك',
  BHD: 'د.ب',
  QAR: 'ر.ق',
  OMR: 'ر.ع',
  EGP: 'ج.م',
  JOD: 'د.أ',
  LBP: 'ل.ل',
  IQD: 'د.ع',
  SYP: 'ل.س',
  ILS: '₪',
  MAD: 'د.م',
  TND: 'د.ت',
  DZD: 'د.ج',
  LYD: 'د.ل',
  SDG: 'ج.س',
  USD: '$',
  GBP: '£',
}

export function currencySymbol(code?: string | null): string {
  return CURRENCY_SYMBOLS[code || 'SAR'] || (code || 'SAR')
}
