// صلاحيات الموظف: الكاشير إما دوره «كاشير»، أو موظف عادي معطى صلاحية إقفال الكاشير
export const PERM_KEYS = ['dispense', 'inventory', 'purchases', 'reports', 'cashier'] as const
export type StaffPerms = Partial<Record<(typeof PERM_KEYS)[number], boolean>>

export const canCloseCashier = (s: { role?: string | null; permissions?: StaffPerms | null } | null | undefined) =>
  !!s && (s.role === 'cashier' || s.permissions?.cashier === true)

/** نحفظ مفاتيح الصلاحيات المعروفة فقط، وكلها true/false */
export function cleanPerms(raw: unknown): Record<string, boolean> {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  return Object.fromEntries(PERM_KEYS.map(k => [k, o[k] === true]))
}
