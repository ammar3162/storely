'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// صفحة مستقلة لصلاحية "المخزون" — تحوّل لصفحة الصرف بتبويب المخزون فقط (شريط التبويبات مخفي تلقائياً)
export default function StaffInventoryPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/staff/dispense?tab=inventory')
  }, [])
  return null
}
