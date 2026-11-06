export type Tab = 'products' | 'orders' | 'chats' | 'reps' | 'reports' | 'activity' | 'account'

export const TAB_PATHS: Record<Tab, string> = {
  products: '/supplier-portal/dashboard',
  orders: '/supplier-portal/dashboard/orders',
  chats: '/supplier-portal/dashboard/chats',
  reps: '/supplier-portal/dashboard/reps',
  reports: '/supplier-portal/dashboard/reports',
  activity: '/supplier-portal/dashboard/activity',
  account: '/supplier-portal/dashboard/account',
}
