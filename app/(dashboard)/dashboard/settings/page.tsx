'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function SettingsPage() {
  const [profile, setProfile]     = useState<any>(null)
  const [org, setOrg]             = useState<any>(null)
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [success, setSuccess]     = useState('')
  const [activeTab, setActiveTab] = useState<'profile'|'subscription'|'security'>('profile')
  const [orgName, setOrgName]     = useState('')
  const [phone, setPhone]         = useState('')
  const [newPass, setNewPass]     = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [showPass, setShowPass]   = useState(false)
  const supabase = createClient()
  const router   = useRouter()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { data: p } = await supabase.from('profiles').select('*, organizations(*)').eq('id', user.id).single()
    if (p) {
      setProfile({ ...p, email: user.email })
      setOrg(p.organizations)
      setOrgName(p.organizations?.name || '')
      setPhone(p.phone || '')
    }
    setLoading(false)
  }

  async function saveProfile() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('profiles').update({ phone }).eq('id', user.id)
    if (org?.id) await supabase.from('organizations').update({ name: orgName }).eq('id', org.id)
    setSuccess('✅ تم حفظ التغييرات بنجاح')
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
    setNewPass(''); setConfirmPass('')
    setSaving(false)
    setTimeout(() => setSuccess(''), 3000)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const isExpired    = org?.plan_ends_at && new Date(org.plan_ends_at) < new Date()
  const daysLeft     = org?.plan_ends_at ? Math.max(0, Math.ceil((new Date(org.plan_ends_at).getTime() - Date.now()) / 86400000)) : 0
  const planProgress = Math.min(100, (daysLeft / 30) * 100)

  const inp: React.CSSProperties = {
    width:'100%', padding:'13px 16px', border:'2px solid rgba(255,255,255,0.1)',
    borderRadius:12, fontSize:14, outline:'none', boxSizing:'border-box',
    background:'rgba(255,255,255,0.07)', color:'white',
    fontFamily:'system-ui', fontWeight:500
  }

  const tabs = [
    { key:'profile',      label:'المعلومات',  icon:'👤' },
    { key:'subscription', label:'الاشتراك',   icon:'💎' },
    { key:'security',     label:'الأمان',     icon:'🔐' },
  ]

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'70vh',flexDirection:'column',gap:20}}>
      <div style={{width:56,height:56,border:'4px solid rgba(99,102,241,0.2)',borderTopColor:'#6366f1',borderRadius:'50%',animation:'spin 0.8s linear infinite'}} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{direction:'rtl',fontFamily:'system-ui',minHeight:'100vh'}}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
        .glass-input:focus{
          border-color:rgba(99,102,241,0.6) !important;
          box-shadow:0 0 0 3px rgba(99,102,241,0.15),0 0 20px rgba(99,102,241,0.1) !important;
          background:rgba(255,255,255,0.12) !important;
        }
        .tab-btn:hover{transform:translateY(-2px)}
        .save-btn:hover{transform:translateY(-2px);box-shadow:0 8px 30px rgba(99,102,241,0.5) !important}
        .card-3d{
          transform:perspective(1000px) rotateX(2deg);
          transition:transform 0.3s ease;
        }
        .card-3d:hover{transform:perspective(1000px) rotateX(0deg) translateY(-4px)}
      `}</style>

      {/* Background */}
      <div style={{
        position:'fixed',inset:0,zIndex:0,
        background:'linear-gradient(135deg,#0f0c29,#302b63,#24243e)',
        pointerEvents:'none'
      }}>
        <div style={{position:'absolute',top:'20%',right:'10%',width:300,height:300,background:'radial-gradient(circle,rgba(99,102,241,0.15),transparent)',borderRadius:'50%',animation:'float 6s ease-in-out infinite'}} />
        <div style={{position:'absolute',bottom:'20%',left:'5%',width:200,height:200,background:'radial-gradient(circle,rgba(139,92,246,0.1),transparent)',borderRadius:'50%',animation:'float 8s ease-in-out infinite reverse'}} />
      </div>

      <div style={{position:'relative',zIndex:1,maxWidth:760,margin:'0 auto',padding:'0 0 40px'}}>

        {/* Hero Header */}
        <div style={{
          background:'linear-gradient(135deg,rgba(99,102,241,0.3),rgba(139,92,246,0.2))',
          backdropFilter:'blur(20px)',
          border:'1px solid rgba(255,255,255,0.1)',
          borderRadius:24,padding:'28px 32px',marginBottom:24,
          boxShadow:'0 20px 60px rgba(0,0,0,0.3),inset 0 1px 0 rgba(255,255,255,0.1)',
          animation:'fadeUp 0.5s ease',
          display:'flex',alignItems:'center',gap:20,flexWrap:'wrap'
        }}>
          {/* Avatar */}
          <div style={{
            width:72,height:72,flexShrink:0,
            background:'linear-gradient(135deg,#6366f1,#8b5cf6)',
            borderRadius:20,display:'flex',alignItems:'center',justifyContent:'center',fontSize:32,
            boxShadow:'0 8px 32px rgba(99,102,241,0.4),inset 0 1px 0 rgba(255,255,255,0.2)',
            border:'2px solid rgba(255,255,255,0.15)'
          }}>🏪</div>

          <div style={{flex:1}}>
            <div style={{fontSize:22,fontWeight:900,color:'white',marginBottom:4,letterSpacing:'-0.3px'}}>
              {orgName || 'مؤسستك'}
            </div>
            <div style={{fontSize:13,color:'rgba(255,255,255,0.5)',marginBottom:8}}>{profile?.email}</div>
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              <span style={{
                background:'rgba(16,185,129,0.2)',color:'#6ee7b7',
                padding:'3px 12px',borderRadius:50,fontSize:11,fontWeight:700,
                border:'1px solid rgba(16,185,129,0.3)'
              }}>
                {profile?.role === 'owner' ? '👑 مدير' : '👤 موظف'}
              </span>
              <span style={{
                background: isExpired ? 'rgba(239,68,68,0.2)' : 'rgba(99,102,241,0.2)',
                color: isExpired ? '#fca5a5' : '#a5b4fc',
                padding:'3px 12px',borderRadius:50,fontSize:11,fontWeight:700,
                border:`1px solid ${isExpired ? 'rgba(239,68,68,0.3)' : 'rgba(99,102,241,0.3)'}`
              }}>
                {isExpired ? '⚠️ اشتراك منتهي' : `✅ ${daysLeft} يوم متبقي`}
              </span>
            </div>
          </div>

          {/* Days Ring */}
          <div style={{textAlign:'center',flexShrink:0}}>
            <div style={{
              width:70,height:70,borderRadius:'50%',
              background:`conic-gradient(${isExpired?'#ef4444':'#6366f1'} ${planProgress*3.6}deg, rgba(255,255,255,0.1) 0deg)`,
              display:'flex',alignItems:'center',justifyContent:'center',
              boxShadow:'0 4px 20px rgba(0,0,0,0.3)'
            }}>
              <div style={{width:54,height:54,borderRadius:'50%',background:'rgba(15,12,41,0.8)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
                <div style={{fontSize:16,fontWeight:900,color:'white',lineHeight:1}}>{daysLeft}</div>
                <div style={{fontSize:8,color:'rgba(255,255,255,0.5)',fontWeight:600}}>يوم</div>
              </div>
            </div>
          </div>
        </div>

        {/* Alert */}
        {success && (
          <div style={{
            background: success.includes('⚠️') ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)',
            backdropFilter:'blur(10px)',
            border: `1.5px solid ${success.includes('⚠️') ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`,
            borderRadius:14,padding:'13px 18px',marginBottom:20,
            fontSize:13,fontWeight:700,
            color: success.includes('⚠️') ? '#fca5a5' : '#6ee7b7',
            animation:'fadeUp 0.3s ease'
          }}>{success}</div>
        )}

        {/* Tabs */}
        <div style={{
          background:'rgba(255,255,255,0.05)',backdropFilter:'blur(10px)',
          border:'1px solid rgba(255,255,255,0.08)',
          borderRadius:16,padding:4,marginBottom:20,
          display:'flex',gap:4,
          boxShadow:'0 4px 20px rgba(0,0,0,0.2)'
        }}>
          {tabs.map(tab => (
            <button key={tab.key} className="tab-btn"
              onClick={() => setActiveTab(tab.key as any)}
              style={{
                flex:1,padding:'12px',border:'none',borderRadius:12,cursor:'pointer',
                background: activeTab===tab.key
                  ? 'linear-gradient(135deg,rgba(99,102,241,0.4),rgba(139,92,246,0.3))'
                  : 'transparent',
                color: activeTab===tab.key ? 'white' : 'rgba(255,255,255,0.4)',
                fontWeight: activeTab===tab.key ? 800 : 500,
                fontSize:13,fontFamily:'system-ui',
                boxShadow: activeTab===tab.key ? '0 4px 15px rgba(99,102,241,0.3),inset 0 1px 0 rgba(255,255,255,0.1)' : 'none',
              }}>
              <span style={{marginLeft:6}}>{tab.icon}</span>{tab.label}
            </button>
          ))}
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="card-3d" style={{
            background:'rgba(255,255,255,0.05)',backdropFilter:'blur(20px)',
            border:'1px solid rgba(255,255,255,0.1)',borderRadius:24,padding:28,
            boxShadow:'0 20px 60px rgba(0,0,0,0.3),inset 0 1px 0 rgba(255,255,255,0.1)',
            animation:'fadeUp 0.4s ease'
          }}>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:24}}>
              <div style={{width:36,height:36,background:'linear-gradient(135deg,#6366f1,#8b5cf6)',borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,boxShadow:'0 4px 12px rgba(99,102,241,0.4)'}}>👤</div>
              <div>
                <h3 style={{fontSize:16,fontWeight:800,color:'white',margin:0}}>المعلومات الشخصية</h3>
                <p style={{fontSize:11,color:'rgba(255,255,255,0.4)',margin:0}}>تحديث بيانات مؤسستك</p>
              </div>
            </div>

            <div style={{display:'flex',flexDirection:'column',gap:18}}>
              <div>
                <label style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.5)',display:'block',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.08em'}}>
                  🏪 اسم المؤسسة
                </label>
                <input className="glass-input" type="text" value={orgName}
                  onChange={e => setOrgName(e.target.value)}
                  style={inp} />
              </div>

              <div>
                <label style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.5)',display:'block',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.08em'}}>
                  📧 البريد الإلكتروني
                </label>
                <input type="email" value={profile?.email || ''} disabled
                  style={{...inp,opacity:0.4,cursor:'not-allowed'}} />
                <div style={{fontSize:11,color:'rgba(255,255,255,0.3)',marginTop:4}}>لا يمكن تغيير البريد الإلكتروني</div>
              </div>

              <div>
                <label style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.5)',display:'block',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.08em'}}>
                  📱 رقم الجوال
                </label>
                <input className="glass-input" type="tel" placeholder="0561234567"
                  value={phone} onChange={e => setPhone(e.target.value)}
                  style={inp} />
                <div style={{fontSize:11,color:'#6ee7b7',marginTop:4,fontWeight:600}}>
                  📲 يُستخدم لإشعارات واتساب عند نقص المخزون
                </div>
              </div>

              <div>
                <label style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.5)',display:'block',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.08em'}}>
                  👑 الصلاحية
                </label>
                <div style={{
                  padding:'12px 16px',
                  background:'rgba(99,102,241,0.1)',
                  border:'1px solid rgba(99,102,241,0.2)',
                  borderRadius:12,fontSize:14,color:'#a5b4fc',fontWeight:600,
                  display:'flex',alignItems:'center',gap:8
                }}>
                  <span style={{fontSize:18}}>{profile?.role === 'owner' ? '👑' : '👤'}</span>
                  {profile?.role === 'owner' ? 'مدير المؤسسة' : 'موظف'}
                </div>
              </div>
            </div>

            <button className="save-btn" onClick={saveProfile} disabled={saving} style={{
              marginTop:24,width:'100%',padding:'15px',
              background: saving ? 'rgba(148,163,184,0.2)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
              color:'white',border:'none',borderRadius:14,fontSize:15,fontWeight:800,
              cursor: saving ? 'not-allowed' : 'pointer',fontFamily:'system-ui',
              boxShadow: saving ? 'none' : '0 4px 20px rgba(99,102,241,0.4)',
              transition:'all 0.2s',
              borderTop: saving ? 'none' : '1px solid rgba(255,255,255,0.2)'
            }}>
              {saving ? '⏳ جاري الحفظ...' : '💾 حفظ التغييرات'}
            </button>
          </div>
        )}

        {/* Subscription Tab */}
        {activeTab === 'subscription' && (
          <div style={{display:'flex',flexDirection:'column',gap:16,animation:'fadeUp 0.4s ease'}}>

            {/* Status Card */}
            <div className="card-3d" style={{
              background: isExpired
                ? 'linear-gradient(135deg,rgba(239,68,68,0.15),rgba(220,38,38,0.1))'
                : 'linear-gradient(135deg,rgba(16,185,129,0.15),rgba(5,150,105,0.1))',
              backdropFilter:'blur(20px)',
              border:`1px solid ${isExpired ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)'}`,
              borderRadius:24,padding:24,
              boxShadow:'0 20px 60px rgba(0,0,0,0.3)'
            }}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
                <div>
                  <div style={{fontSize:20,fontWeight:900,color:'white',marginBottom:4}}>
                    {isExpired ? '⚠️ الاشتراك منتهي' : '✅ الاشتراك نشط'}
                  </div>
                  <div style={{fontSize:13,color:'rgba(255,255,255,0.5)'}}>
                    باقة {org?.plan || 'basic'}
                  </div>
                </div>
                <div style={{textAlign:'center'}}>
                  <div style={{fontSize:40,fontWeight:900,color: isExpired ? '#fca5a5' : '#6ee7b7',lineHeight:1}}>{daysLeft}</div>
                  <div style={{fontSize:11,color:'rgba(255,255,255,0.4)'}}>يوم متبقي</div>
                </div>
              </div>
              <div style={{height:6,background:'rgba(255,255,255,0.1)',borderRadius:99,overflow:'hidden',marginBottom:8}}>
                <div style={{
                  height:'100%',width:`${planProgress}%`,borderRadius:99,
                  background: isExpired ? 'linear-gradient(90deg,#ef4444,#dc2626)' : 'linear-gradient(90deg,#10b981,#059669)',
                  transition:'width 1s ease',
                  boxShadow: isExpired ? '0 0 10px rgba(239,68,68,0.5)' : '0 0 10px rgba(16,185,129,0.5)'
                }} />
              </div>
              <div style={{fontSize:11,color:'rgba(255,255,255,0.3)',textAlign:'left'}}>
                {Math.round(planProgress)}% من الشهر
              </div>
            </div>

            {/* Details Grid */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              {[
                {label:'تاريخ الاشتراك', value: org?.created_at ? new Date(org.created_at).toLocaleDateString('ar-SA') : '—', icon:'📅', color:'#a5b4fc'},
                {label:'تاريخ الانتهاء', value: org?.plan_ends_at ? new Date(org.plan_ends_at).toLocaleDateString('ar-SA') : '—', icon:'⏰', color:'#fcd34d'},
                {label:'الباقة الحالية', value: org?.plan || 'basic', icon:'💎', color:'#6ee7b7'},
                {label:'حالة الحساب',   value: org?.status === 'active' ? 'نشط' : org?.status === 'pending' ? 'بانتظار الموافقة' : 'موقوف', icon:'📊', color:'#f9a8d4'},
              ].map((item,i) => (
                <div key={i} className="card-3d" style={{
                  background:'rgba(255,255,255,0.05)',backdropFilter:'blur(10px)',
                  border:'1px solid rgba(255,255,255,0.08)',
                  borderRadius:16,padding:'16px 18px',
                  boxShadow:'0 8px 24px rgba(0,0,0,0.2)'
                }}>
                  <div style={{fontSize:22,marginBottom:8}}>{item.icon}</div>
                  <div style={{fontSize:10,color:'rgba(255,255,255,0.4)',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:4}}>{item.label}</div>
                  <div style={{fontSize:14,fontWeight:800,color:item.color}}>{item.value}</div>
                </div>
              ))}
            </div>

            {/* Renewal Card */}
            <div className="card-3d" style={{
              background:'linear-gradient(135deg,rgba(99,102,241,0.2),rgba(139,92,246,0.15))',
              backdropFilter:'blur(20px)',
              border:'1px solid rgba(99,102,241,0.3)',
              borderRadius:24,padding:24,textAlign:'center',
              boxShadow:'0 20px 60px rgba(99,102,241,0.2)'
            }}>
              <div style={{fontSize:40,marginBottom:8,animation:'float 3s ease-in-out infinite'}}>💎</div>
              <div style={{fontSize:16,fontWeight:900,color:'white',marginBottom:6}}>
                تريد تجديد أو ترقية اشتراكك؟
              </div>
              <div style={{fontSize:13,color:'rgba(255,255,255,0.5)',marginBottom:16}}>
                تواصل معنا وسنساعدك في اختيار الباقة المناسبة
              </div>
              <a href="https://wa.me/966561161448" target="_blank" rel="noreferrer" style={{
                display:'inline-flex',alignItems:'center',gap:8,
                padding:'12px 28px',
                background:'linear-gradient(135deg,#25d366,#128c7e)',
                color:'white',borderRadius:12,
                fontSize:14,fontWeight:800,textDecoration:'none',
                boxShadow:'0 4px 20px rgba(37,211,102,0.4)',
                border:'1px solid rgba(255,255,255,0.2)'
              }}>
                💬 تواصل عبر واتساب
              </a>
            </div>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div style={{display:'flex',flexDirection:'column',gap:16,animation:'fadeUp 0.4s ease'}}>

            <div className="card-3d" style={{
              background:'rgba(255,255,255,0.05)',backdropFilter:'blur(20px)',
              border:'1px solid rgba(255,255,255,0.1)',borderRadius:24,padding:28,
              boxShadow:'0 20px 60px rgba(0,0,0,0.3)'
            }}>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:24}}>
                <div style={{width:36,height:36,background:'linear-gradient(135deg,#6366f1,#8b5cf6)',borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,boxShadow:'0 4px 12px rgba(99,102,241,0.4)'}}>🔐</div>
                <div>
                  <h3 style={{fontSize:16,fontWeight:800,color:'white',margin:0}}>تغيير كلمة المرور</h3>
                  <p style={{fontSize:11,color:'rgba(255,255,255,0.4)',margin:0}}>اجعل كلمة مرورك قوية وآمنة</p>
                </div>
              </div>

              <div style={{display:'flex',flexDirection:'column',gap:16,marginBottom:24}}>
                <div>
                  <label style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.5)',display:'block',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.08em'}}>
                    🔒 كلمة المرور الجديدة
                  </label>
                  <div style={{position:'relative'}}>
                    <input className="glass-input"
                      type={showPass ? 'text' : 'password'}
                      placeholder="6 أحرف على الأقل"
                      value={newPass} onChange={e => setNewPass(e.target.value)}
                      style={{...inp,paddingLeft:44}} />
                    <button type="button" onClick={() => setShowPass(!showPass)} style={{
                      position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',
                      background:'none',border:'none',cursor:'pointer',fontSize:18,
                      color:'rgba(255,255,255,0.4)'
                    }}>{showPass ? '🙈' : '👁️'}</button>
                  </div>
                </div>

                <div>
                  <label style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.5)',display:'block',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.08em'}}>
                    🔒 تأكيد كلمة المرور
                  </label>
                  <input className="glass-input"
                    type="password" placeholder="أعد كتابة كلمة المرور"
                    value={confirmPass} onChange={e => setConfirmPass(e.target.value)}
                    style={{...inp, borderColor: confirmPass && confirmPass !== newPass ? 'rgba(239,68,68,0.5)' : inp.borderColor as string}} />
                  {confirmPass && confirmPass !== newPass && (
                    <div style={{fontSize:11,color:'#fca5a5',marginTop:4}}>⚠️ كلمتا المرور غير متطابقتين</div>
                  )}
                </div>

                {/* Password strength */}
                {newPass && (
                  <div>
                    <div style={{fontSize:11,color:'rgba(255,255,255,0.4)',marginBottom:6}}>قوة كلمة المرور</div>
                    <div style={{height:4,background:'rgba(255,255,255,0.1)',borderRadius:99,overflow:'hidden'}}>
                      <div style={{
                        height:'100%',borderRadius:99,transition:'all 0.3s',
                        width: newPass.length < 6 ? '25%' : newPass.length < 10 ? '60%' : '100%',
                        background: newPass.length < 6 ? '#ef4444' : newPass.length < 10 ? '#f59e0b' : '#10b981',
                        boxShadow: newPass.length >= 10 ? '0 0 8px rgba(16,185,129,0.5)' : 'none'
                      }} />
                    </div>
                    <div style={{fontSize:10,color: newPass.length < 6 ? '#fca5a5' : newPass.length < 10 ? '#fcd34d' : '#6ee7b7',marginTop:4,fontWeight:600}}>
                      {newPass.length < 6 ? 'ضعيفة' : newPass.length < 10 ? 'متوسطة' : 'قوية 💪'}
                    </div>
                  </div>
                )}
              </div>

              <button className="save-btn" onClick={changePassword} disabled={saving} style={{
                width:'100%',padding:'15px',
                background: saving ? 'rgba(148,163,184,0.2)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                color:'white',border:'none',borderRadius:14,fontSize:15,fontWeight:800,
                cursor: saving ? 'not-allowed' : 'pointer',fontFamily:'system-ui',
                boxShadow: saving ? 'none' : '0 4px 20px rgba(99,102,241,0.4)',
                transition:'all 0.2s'
              }}>
                {saving ? '⏳ جاري الحفظ...' : '🔐 تغيير كلمة المرور'}
              </button>
            </div>

            {/* Danger Zone */}
            <div className="card-3d" style={{
              background:'rgba(239,68,68,0.08)',backdropFilter:'blur(20px)',
              border:'1px solid rgba(239,68,68,0.2)',borderRadius:24,padding:24,
              boxShadow:'0 20px 60px rgba(239,68,68,0.1)'
            }}>
              <h4 style={{fontSize:14,fontWeight:800,color:'#fca5a5',marginBottom:16,display:'flex',alignItems:'center',gap:8}}>
                ⚠️ منطقة الخطر
              </h4>
              <button onClick={handleLogout} style={{
                width:'100%',padding:'13px',
                background:'rgba(239,68,68,0.15)',color:'#fca5a5',
                border:'1.5px solid rgba(239,68,68,0.3)',borderRadius:12,
                fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'system-ui',
                transition:'all 0.2s'
              }}>
                🚪 تسجيل الخروج من جميع الأجهزة
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}