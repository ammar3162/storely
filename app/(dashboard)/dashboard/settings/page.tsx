'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function SettingsPage() {
  const [profile, setProfile]   = useState<any>(null)
  const [org, setOrg]           = useState<any>(null)
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [success, setSuccess]   = useState('')
  const [activeTab, setActiveTab] = useState<'profile'|'subscription'|'security'>('profile')
  const [orgName, setOrgName]   = useState('')
  const [phone, setPhone]       = useState('')
  const [newPass, setNewPass]   = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const supabase = createClient()
  const router   = useRouter()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*, organizations(*)')
      .eq('id', user.id)
      .single()

    if (profileData) {
      setProfile({ ...profileData, email: user.email })
      setOrg(profileData.organizations)
      setOrgName(profileData.organizations?.name || '')
      setPhone(profileData.phone || '')
    }
    setLoading(false)
  }

  async function saveProfile() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('profiles').update({ phone }).eq('id', user.id)
    if (org?.id) {
      await supabase.from('organizations').update({ name: orgName }).eq('id', org.id)
    }

    setSuccess('✅ تم حفظ التغييرات')
    setTimeout(() => setSuccess(''), 3000)
    setSaving(false)
    loadData()
  }

  async function changePassword() {
    if (newPass.length < 6) { setSuccess('⚠️ كلمة المرور 6 أحرف على الأقل'); return }
    if (newPass !== confirmPass) { setSuccess('⚠️ كلمتا المرور غير متطابقتين'); return }
    setSaving(true)
    const { error } = await supabase.auth.updateUser({ password: newPass })
    if (error) { setSuccess('⚠️ ' + error.message); setSaving(false); return }
    setSuccess('✅ تم تغيير كلمة المرور')
    setNewPass('')
    setConfirmPass('')
    setSaving(false)
    setTimeout(() => setSuccess(''), 3000)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const isExpired   = org?.plan_ends_at && new Date(org.plan_ends_at) < new Date()
  const daysLeft    = org?.plan_ends_at
    ? Math.max(0, Math.ceil((new Date(org.plan_ends_at).getTime() - Date.now()) / (1000*60*60*24)))
    : 0
  const planProgress = org?.plan_ends_at
    ? Math.max(0, Math.min(100, (daysLeft / 30) * 100))
    : 0

  const inp: React.CSSProperties = {
    width:'100%', padding:'12px 14px', border:'2px solid #e2e8f0',
    borderRadius:12, fontSize:14, outline:'none', boxSizing:'border-box',
    background:'white', color:'#1e293b', fontFamily:'system-ui', fontWeight:500
  }

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'60vh',flexDirection:'column',gap:16}}>
      <div style={{width:44,height:44,border:'4px solid #e2e8f0',borderTopColor:'#6366f1',borderRadius:'50%',animation:'spin 0.8s linear infinite'}} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{direction:'rtl',fontFamily:'system-ui',maxWidth:720,margin:'0 auto'}}>
      <style>{`
        input:focus{border-color:#6366f1 !important;box-shadow:0 0 0 3px rgba(99,102,241,0.15) !important;}
        @keyframes fadeIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      {/* Header */}
      <div style={{marginBottom:28}}>
        <h1 style={{fontSize:26,fontWeight:900,color:'#0f172a',marginBottom:4}}>⚙️ الإعدادات</h1>
        <p style={{fontSize:14,color:'#64748b'}}>إدارة حسابك ومعلوماتك الشخصية</p>
      </div>

      {/* Profile Card */}
      <div style={{background:'linear-gradient(135deg,#6366f1,#8b5cf6)',borderRadius:20,padding:'24px 28px',marginBottom:24,display:'flex',alignItems:'center',gap:20,flexWrap:'wrap'}}>
        <div style={{width:64,height:64,background:'rgba(255,255,255,0.2)',borderRadius:18,display:'flex',alignItems:'center',justifyContent:'center',fontSize:28,flexShrink:0}}>
          🏪
        </div>
        <div style={{flex:1}}>
          <div style={{fontSize:20,fontWeight:900,color:'white',marginBottom:2}}>{orgName || 'مؤسستك'}</div>
          <div style={{fontSize:13,color:'rgba(255,255,255,0.7)'}}>{profile?.email}</div>
        </div>
        <div style={{
          background: isExpired ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)',
          border: `1.5px solid ${isExpired ? 'rgba(239,68,68,0.4)' : 'rgba(16,185,129,0.4)'}`,
          borderRadius:12,padding:'8px 16px',textAlign:'center'
        }}>
          <div style={{fontSize:11,color:'rgba(255,255,255,0.6)',marginBottom:2}}>الاشتراك</div>
          <div style={{fontSize:14,fontWeight:800,color: isExpired ? '#fca5a5' : '#6ee7b7'}}>
            {isExpired ? '⚠️ منتهي' : `✅ ${daysLeft} يوم`}
          </div>
        </div>
      </div>

      {success && (
        <div style={{
          background: success.includes('⚠️') ? '#fef2f2' : '#f0fdf4',
          border: `1.5px solid ${success.includes('⚠️') ? '#fecaca' : '#bbf7d0'}`,
          borderRadius:12,padding:'12px 16px',marginBottom:20,
          fontSize:13,fontWeight:700,
          color: success.includes('⚠️') ? '#dc2626' : '#16a34a',
          animation:'fadeIn 0.3s ease'
        }}>{success}</div>
      )}

      {/* Tabs */}
      <div style={{display:'flex',background:'#f1f5f9',borderRadius:14,padding:4,marginBottom:24,gap:4}}>
        {[
          {key:'profile',     label:'👤 المعلومات',    },
          {key:'subscription',label:'💳 الاشتراك',     },
          {key:'security',    label:'🔒 الأمان',       },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key as any)} style={{
            flex:1,padding:'11px',border:'none',borderRadius:10,
            background: activeTab===tab.key ? 'white' : 'transparent',
            color: activeTab===tab.key ? '#6366f1' : '#64748b',
            fontWeight: activeTab===tab.key ? 800 : 500,
            fontSize:13,cursor:'pointer',fontFamily:'system-ui',
            boxShadow: activeTab===tab.key ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
            transition:'all 0.2s'
          }}>{tab.label}</button>
        ))}
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div style={{background:'white',borderRadius:20,padding:28,boxShadow:'0 4px 24px rgba(0,0,0,0.06)'}}>
          <h3 style={{fontSize:16,fontWeight:800,color:'#0f172a',marginBottom:20}}>المعلومات الشخصية</h3>
          <div style={{display:'flex',flexDirection:'column',gap:16}}>
            <div>
              <label style={{fontSize:12,fontWeight:700,color:'#374151',display:'block',marginBottom:6}}>
                🏪 اسم المؤسسة
              </label>
              <input type="text" value={orgName} onChange={e => setOrgName(e.target.value)} style={inp} />
            </div>
            <div>
              <label style={{fontSize:12,fontWeight:700,color:'#374151',display:'block',marginBottom:6}}>
                📧 البريد الإلكتروني
              </label>
              <input type="email" value={profile?.email || ''} disabled
                style={{...inp,background:'#f8fafc',color:'#94a3b8',cursor:'not-allowed'}} />
              <div style={{fontSize:11,color:'#94a3b8',marginTop:4}}>لا يمكن تغيير البريد الإلكتروني</div>
            </div>
            <div>
              <label style={{fontSize:12,fontWeight:700,color:'#374151',display:'block',marginBottom:6}}>
                📱 رقم الجوال (للإشعارات)
              </label>
              <input type="tel" placeholder="0561234567" value={phone} onChange={e => setPhone(e.target.value)} style={inp} />
              <div style={{fontSize:11,color:'#10b981',marginTop:4,fontWeight:600}}>
                📲 يُستخدم لإشعارات واتساب عند نقص المخزون
              </div>
            </div>
            <div>
              <label style={{fontSize:12,fontWeight:700,color:'#374151',display:'block',marginBottom:6}}>
                👤 الدور
              </label>
              <div style={{padding:'12px 14px',background:'#f8fafc',borderRadius:12,fontSize:14,color:'#475569',fontWeight:600}}>
                {profile?.role === 'owner' ? '👑 مدير المؤسسة' : '👤 موظف'}
              </div>
            </div>
          </div>
          <button onClick={saveProfile} disabled={saving} style={{
            marginTop:24,width:'100%',padding:'14px',
            background: saving ? '#94a3b8' : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
            color:'white',border:'none',borderRadius:12,fontSize:15,fontWeight:800,
            cursor: saving ? 'not-allowed' : 'pointer',fontFamily:'system-ui',
            boxShadow:'0 4px 14px rgba(99,102,241,0.3)',transition:'all 0.2s'
          }}>
            {saving ? '⏳ جاري الحفظ...' : '💾 حفظ التغييرات'}
          </button>
        </div>
      )}

      {/* Subscription Tab */}
      {activeTab === 'subscription' && (
        <div style={{background:'white',borderRadius:20,padding:28,boxShadow:'0 4px 24px rgba(0,0,0,0.06)'}}>
          <h3 style={{fontSize:16,fontWeight:800,color:'#0f172a',marginBottom:20}}>تفاصيل الاشتراك</h3>

          <div style={{
            background: isExpired ? 'linear-gradient(135deg,#fef2f2,#fee2e2)' : 'linear-gradient(135deg,#f0fdf4,#dcfce7)',
            border: `2px solid ${isExpired ? '#fecaca' : '#bbf7d0'}`,
            borderRadius:16,padding:20,marginBottom:20
          }}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
              <div>
                <div style={{fontSize:18,fontWeight:900,color: isExpired ? '#dc2626' : '#16a34a'}}>
                  {isExpired ? '⚠️ الاشتراك منتهي' : '✅ الاشتراك نشط'}
                </div>
                <div style={{fontSize:13,color:'#64748b',marginTop:2}}>
                  باقة {org?.plan || 'basic'}
                </div>
              </div>
              <div style={{textAlign:'center'}}>
                <div style={{fontSize:32,fontWeight:900,color: isExpired ? '#dc2626' : '#16a34a'}}>{daysLeft}</div>
                <div style={{fontSize:11,color:'#64748b'}}>يوم متبقي</div>
              </div>
            </div>
            <div style={{height:8,background:'rgba(0,0,0,0.08)',borderRadius:99,overflow:'hidden'}}>
              <div style={{
                height:'100%',
                width:`${planProgress}%`,
                background: isExpired ? '#ef4444' : '#10b981',
                borderRadius:99,transition:'width 0.5s'
              }} />
            </div>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:20}}>
            {[
              {label:'تاريخ الاشتراك', value: org?.created_at ? new Date(org.created_at).toLocaleDateString('ar-SA') : '—'},
              {label:'تاريخ الانتهاء', value: org?.plan_ends_at ? new Date(org.plan_ends_at).toLocaleDateString('ar-SA') : '—'},
              {label:'الباقة الحالية', value: org?.plan || 'basic'},
              {label:'حالة الحساب',   value: org?.status === 'active' ? '✅ نشط' : org?.status === 'pending' ? '⏳ بانتظار الموافقة' : '🚫 موقوف'},
            ].map((item,i) => (
              <div key={i} style={{background:'#f8fafc',borderRadius:12,padding:'14px 16px'}}>
                <div style={{fontSize:11,color:'#94a3b8',fontWeight:700,marginBottom:4,textTransform:'uppercase',letterSpacing:'0.05em'}}>{item.label}</div>
                <div style={{fontSize:14,fontWeight:700,color:'#0f172a'}}>{item.value}</div>
              </div>
            ))}
          </div>

          <div style={{background:'#eef2ff',border:'1.5px solid #c7d2fe',borderRadius:14,padding:16,textAlign:'center'}}>
            <div style={{fontSize:14,fontWeight:700,color:'#6366f1',marginBottom:8}}>
              تريد تجديد اشتراكك؟
            </div>
            <div style={{fontSize:12,color:'#64748b'}}>
              تواصل معنا عبر واتساب لتجديد أو ترقية اشتراكك
            </div>
            <a href="https://wa.me/966561161448" target="_blank" rel="noreferrer" style={{
              display:'inline-block',marginTop:12,padding:'10px 24px',
              background:'#25d366',color:'white',borderRadius:10,
              fontSize:13,fontWeight:700,textDecoration:'none'
            }}>
              💬 تواصل معنا
            </a>
          </div>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div style={{background:'white',borderRadius:20,padding:28,boxShadow:'0 4px 24px rgba(0,0,0,0.06)'}}>
          <h3 style={{fontSize:16,fontWeight:800,color:'#0f172a',marginBottom:20}}>الأمان وكلمة المرور</h3>
          <div style={{display:'flex',flexDirection:'column',gap:16,marginBottom:24}}>
            <div>
              <label style={{fontSize:12,fontWeight:700,color:'#374151',display:'block',marginBottom:6}}>
                🔒 كلمة المرور الجديدة
              </label>
              <input type="password" placeholder="6 أحرف على الأقل"
                value={newPass} onChange={e => setNewPass(e.target.value)} style={inp} />
            </div>
            <div>
              <label style={{fontSize:12,fontWeight:700,color:'#374151',display:'block',marginBottom:6}}>
                🔒 تأكيد كلمة المرور
              </label>
              <input type="password" placeholder="أعد كتابة كلمة المرور"
                value={confirmPass} onChange={e => setConfirmPass(e.target.value)} style={inp} />
            </div>
          </div>
          <button onClick={changePassword} disabled={saving} style={{
            width:'100%',padding:'14px',
            background: saving ? '#94a3b8' : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
            color:'white',border:'none',borderRadius:12,fontSize:15,fontWeight:800,
            cursor: saving ? 'not-allowed' : 'pointer',fontFamily:'system-ui',
            boxShadow:'0 4px 14px rgba(99,102,241,0.3)',marginBottom:16
          }}>
            {saving ? '⏳ جاري الحفظ...' : '🔒 تغيير كلمة المرور'}
          </button>

          <div style={{borderTop:'1px solid #f1f5f9',paddingTop:20}}>
            <h4 style={{fontSize:14,fontWeight:700,color:'#dc2626',marginBottom:12}}>⚠️ منطقة الخطر</h4>
            <button onClick={handleLogout} style={{
              width:'100%',padding:'13px',
              background:'#fef2f2',color:'#ef4444',
              border:'2px solid #fecaca',borderRadius:12,
              fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'system-ui'
            }}>
              🚪 تسجيل الخروج من جميع الأجهزة
            </button>
          </div>
        </div>
      )}
    </div>
  )
}