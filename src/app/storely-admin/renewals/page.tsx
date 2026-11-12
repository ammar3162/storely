// انتقلت إلى صفحة تبويبات — الرابط القديم يحوّل للتبويب الصحيح
import { redirect } from 'next/navigation'

export default function Page() { redirect('/storely-admin/requests?tab=renewals') }
