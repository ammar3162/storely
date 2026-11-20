// رابط كامل يفتح Soul على قرار — لرسائل الواتساب (الخادم فقط: يعتمد على عنوان الموقع حسب البيئة)
import { siteOrigin } from '@/lib/invoiceUrl'
import { soulPath, type DecisionKind } from '@/lib/soulDecisions'

export const soulLink = (kind?: DecisionKind, id?: string | null) => `${siteOrigin()}${soulPath(kind, id)}`
