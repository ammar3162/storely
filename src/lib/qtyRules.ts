// كميات المخزون أرقام صحيحة (عمود qty_change بالقاعدة integer) — نفس القاعدة بالصرف والهدر والجرد والمشتريات
export const WHOLE_QTY_ERROR = 'يجب أن تكون الكمية رقماً صحيحاً — إذا كانت فيها كسور فاستخدم وحدة أصغر (مثل الغرام بدل الكيلو)'

/** كمية صرف/هدر/نقل: عدد صحيح أكبر من صفر */
export const isWholePositive = (v: unknown) => { const n = Number(v); return Number.isInteger(n) && n > 0 }
/** كمية جرد/تعديل: عدد صحيح صفر أو أكثر */
export const isWholeNonNegative = (v: unknown) => { const n = Number(v); return Number.isInteger(n) && n >= 0 }
