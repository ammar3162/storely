'use client'
// بطاقة قفل الصفحة لما الميزة مو مفعّلة («ابنِ باقتك» أو إضافة لفروع معيّنة)
import Link from 'next/link'
import { Lock } from 'lucide-react'
import { colors, font } from '@/lib/ds'
import { FEATURE_LABEL, type Feature } from '@/lib/planFeatures'

export default function FeatureLock({ feature, otherBranch, owner }: { feature: Feature; otherBranch: boolean; owner: boolean }) {
  return (
    <div style={{ minHeight: '55vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: font.family, direction: 'rtl' }}>
      <div style={{ textAlign: 'center', maxWidth: 420 }}>
        <div style={{ display: 'flex', justifyContent: 'center', color: colors.text3, marginBottom: 14 }}><Lock size={40} /></div>
        <div style={{ fontSize: 17, fontWeight: 800, color: colors.text, marginBottom: 8 }}>
          «{FEATURE_LABEL[feature]}» {otherBranch ? 'غير مفعّلة لهذا الفرع' : 'غير مشمولة باشتراكك'}
        </div>
        <div style={{ fontSize: 14, color: colors.text, lineHeight: 1.8, marginBottom: 18 }}>
          {owner
            ? (otherBranch ? 'تقدر تضيفها لهالفرع من صفحة الإضافات، أو تبدّل الفرع من فوق.' : 'تقدر تضيفها لاشتراكك من صفحة الإضافات، وتختار الفروع اللي تبيها فيها.')
            : 'كلّم مالك المنشأة يضيفها من صفحة الإضافات.'}
        </div>
        {owner && (
          <Link href="/addons-market" className="hide-in-app" style={{ display: 'inline-block', padding: '12px 26px', borderRadius: 10, background: colors.primary, color: 'white', fontSize: 14, fontWeight: 800, textDecoration: 'none' }}>
            صفحة الإضافات
          </Link>
        )}
      </div>
    </div>
  )
}
