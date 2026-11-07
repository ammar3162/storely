'use client'
import AIAssistant from '@/components/AIAssistant'
import { LanguageProvider } from '@/lib/i18n/LanguageContext'
import { SHELL_CSS } from './_shell/shellCss'
import { useDashboardShell } from './_shell/useDashboardShell'
import Banners from './_shell/Banners'
import MaintenanceScreen from './_shell/MaintenanceScreen'
import TermsConsentModal from './_shell/TermsConsentModal'
import WhatsAppConsentModal from './_shell/WhatsAppConsentModal'
import WaInviteModal from './_shell/WaInviteModal'
import BranchPickerSheet from './_shell/BranchPickerSheet'
import StopBranchConfirm from './_shell/StopBranchConfirm'
import OnboardingModal from './_shell/OnboardingModal'
import MoreMenuSheet from './_shell/MoreMenuSheet'
import MobileShell from './_shell/MobileShell'
import DesktopShell from './_shell/DesktopShell'
import FeatureLock from './_shell/FeatureLock'

function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const m = useDashboardShell()
  const banners = <Banners m={m}/>
  // صفحة تحتاج ميزة مو مفعّلة (للفرع المختار): بطاقة قفل بدل الصفحة
  const content = m.pageLock ? <FeatureLock feature={m.pageLock.feature} otherBranch={m.pageLock.otherBranch} owner={m.userRole !== 'manager'} /> : children

  if (m.showMaintenance) return <MaintenanceScreen m={m}/>

  return (
    <>
      <TermsConsentModal m={m}/>
      <WhatsAppConsentModal m={m}/>
      <WaInviteModal m={m}/>
      <BranchPickerSheet m={m}/>
      <StopBranchConfirm m={m}/>
      <OnboardingModal m={m}/>
      <MoreMenuSheet m={m}/>

      <div className="sh-root">
        <style>{SHELL_CSS}</style>
        <MobileShell m={m} banners={banners}>{content}</MobileShell>
        <DesktopShell m={m} banners={banners}>{content}</DesktopShell>
      </div>
      <AIAssistant/>
    </>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </LanguageProvider>
  )
}
