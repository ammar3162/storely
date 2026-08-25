import { Package, MessageCircle, Users, Wallet, Globe, BarChart3, Store, Bot, ShoppingBag } from 'lucide-react'

export type Billing = 'monthly'|'yearly'

export const PLAN_BRANCHES = [1, 3, 10]

export const PLANS = [
  { name:'الأساسية', nameEn:'Basic', price:'149', yearlyPrice:'1430', color:'#15803d', popular:false,
    limits:['فرع واحد','2 موظفين','3 موردين'],
    limitsEn:['1 branch','2 staff','3 suppliers'],
    features:['تتبع المخزون لحظياً','صرف يومي بصلاحيات موظفين','المشتريات وإدارة الموردين','تنبيهات واتساب تلقائية','كشف الهدر','تقارير أساسية قابلة للتصدير','نسخ احتياطي يومي','دعم عبر واتساب'],
    featuresEn:['Real-time inventory tracking','Daily dispensing with staff permissions','Purchasing and supplier management','Automatic WhatsApp alerts','Waste detection','Exportable basic reports','Daily backups','Support via WhatsApp'] },
  { name:'المتوسطة', nameEn:'Standard', price:'249', yearlyPrice:'2390', color:'#15803d', popular:true,
    limits:['3 فروع','10 موظفين','10 موردين'],
    limitsEn:['3 branches','10 staff','10 suppliers'],
    features:['تتبع المخزون','تنبيهات واتساب','إدارة الموظفين','تقارير أساسية','إدارة الموردين','تقارير متقدمة','إقفال الكاشير اليومي','الحضور والانصراف بـGPS 📍','اقتراح الشراء الذكي 🤖','توقع نفاد المخزون 🔮','تحليل الموسمية','تحسين نقطة إعادة الطلب 🎯'],
    featuresEn:['Inventory tracking','WhatsApp alerts','Staff management','Basic reports','Supplier management','Advanced reports','Daily cashier closing','GPS attendance 📍','Smart purchase suggestions 🤖','Stock-out prediction 🔮','Seasonality analysis','Reorder point optimization 🎯'] },
  { name:'المتقدمة', nameEn:'Advanced', price:'399', yearlyPrice:'3830', color:'#15803d', popular:false,
    limits:['غير محدود','غير محدود','غير محدود'],
    limitsEn:['Unlimited','Unlimited','Unlimited'],
    features:['تتبع المخزون','تنبيهات واتساب','إدارة الموظفين','تقارير أساسية','إدارة الموردين','تقارير متقدمة','إقفال الكاشير اليومي','الحضور والانصراف بـGPS 📍','اقتراح الشراء الذكي 🤖','توقع نفاد المخزون 🔮','تحليل الموسمية','تحسين نقطة إعادة الطلب 🎯','مقارنة الفروع 🤖','المخزون الراكد 🐌','كشف الهدر الحقيقي 🗑️','دعم ذو أولوية','دعم 24/7'],
    featuresEn:['Inventory tracking','WhatsApp alerts','Staff management','Basic reports','Supplier management','Advanced reports','Daily cashier closing','GPS attendance 📍','Smart purchase suggestions 🤖','Stock-out prediction 🔮','Seasonality analysis','Reorder point optimization 🎯','Branch comparison 🤖','Stagnant inventory 🐌','Real waste detection 🗑️','Priority support','24/7 support'] },
]

export const LS: Record<string, {ar:string, en:string}> = {
  navFeatures:   { ar:'المميزات', en:'Features' },
  navPricing:    { ar:'الأسعار', en:'Pricing' },
  navFaq:        { ar:'الأسئلة', en:'FAQ' },
  navLogin:      { ar:'دخول', en:'Log in' },
  navDemo:       { ar:'اطلب عرض النظام', en:'Book a demo' },
  heroBadge:     { ar:'تجربة مجانية 14 يوماً — بدون بطاقة ائتمانية', en:'14-day free trial — no credit card required' },
  heroH1a:       { ar:'نصمّم مستقبل الإدارة الذكية', en:'We design the future of smart management' },
  heroH1b:       { ar:'لكل منشأة تطمح للنمو', en:'for every business aiming to grow' },
  heroSub:       { ar:'من المخزون والمشتريات، لصفحة عرض منتجاتك والحجوزات الإلكترونية، وإدارة الموظفين والفروع — كل شي بمكان واحد', en:'From inventory and purchasing, to your product showcase page and online reservations, to staff and branch management — all in one place' },
  heroTry:       { ar:'جرب نظام Storely', en:'Try Storely' },
  heroStart:     { ar:'ابدأ تجربتك المجانية', en:'Start your free trial' },
  trustedBy:     { ar:'موثوق من قبل منشآت رائدة', en:'Trusted by leading businesses' },
  statStart:     { ar:'يبدأ من', en:'starting at' },
  statFree:      { ar:'مجاناً', en:'free' },
  statLangs:     { ar:'لغات', en:'languages' },
  statAlerts:    { ar:'تنبيهات', en:'alerts' },
  featuresTag:   { ar:'المميزات', en:'FEATURES' },
  featuresTitle: { ar:'كل أدوات إدارة منشأتك بمكان واحد', en:'Every tool to run your business, in one place' },
  trustTitle:    { ar:'نبني الثقة مع منشآت في كل مكان', en:'Building trust with businesses everywhere' },

  demoTitle:     { ar:'اطلب عرض النظام', en:'Book a demo' },
  demoSub:       { ar:'عبّي بياناتك وبنتواصل معك خلال ساعات عبر واتساب', en:"Fill in your details and we'll reach out within hours via WhatsApp" },
  demoFirstName: { ar:'الاسم *', en:'First name *' },
  demoLastName:  { ar:'اسم العائلة *', en:'Last name *' },
  demoPhone:     { ar:'رقم الهاتف *', en:'Phone number *' },
  demoEmail:     { ar:'البريد الإلكتروني *', en:'Email *' },
  demoBusiness:  { ar:'اسم المنشأة *', en:'Business name *' },
  demoBranches:  { ar:'عدد الفروع', en:'Number of branches' },
  demoPleaseSelect: { ar:'يرجى التحديد', en:'Please select' },
  demoAgree:     { ar:'أؤكد أني قرأت وأوافق على', en:'I confirm I have read and agree to the' },
  demoTerms:     { ar:'الشروط والأحكام', en:'Terms & Conditions' },
  demoAnd:       { ar:'و', en:'and' },
  demoPrivacy:   { ar:'سياسة الخصوصية', en:'Privacy Policy' },
  demoSending:   { ar:'جاري الإرسال...', en:'Sending...' },
  demoSubmit:    { ar:'إرسال الطلب', en:'Send request' },
  demoSideTitle: { ar:'اطلب تجربة نظام Storely لإدارة المخزون مجاناً', en:'Request a free trial of Storely inventory management' },
  demoSideSub:   { ar:'بنساعدك تختار الباقة الأنسب لمنشأتك، ونجاوب على كل أسئلتك مباشرة', en:"We'll help you pick the right plan for your business and answer all your questions directly" },

  pricingTag:    { ar:'الأسعار', en:'PRICING' },
  pricingTitle:  { ar:'باقة تناسب كل حجم منشأة', en:'A plan for every business size' },
  billMonthly:   { ar:'شهري', en:'Monthly' },
  billYearly:    { ar:'سنوي', en:'Yearly' },
  billSave:      { ar:'وفّر 20%', en:'Save 20%' },
  mostPopular:   { ar:'الأكثر شيوعاً', en:'Most popular' },
  perMonth:      { ar:'شهرياً', en:'/mo' },
  perYear:       { ar:'سنوياً', en:'/yr' },
  featuresAvail: { ar:'ميزة متاحة', en:'features included' },
  startNow:      { ar:'ابدأ الآن', en:'Start now' },

  ctaReady:      { ar:'جاهز تبدأ؟', en:'Ready to start?' },
  ctaSub:        { ar:'جرّب Storely مجاناً 14 يوماً — بدون بطاقة ائتمانية', en:'Try Storely free for 14 days — no credit card required' },
  ctaRegister:   { ar:'سجّل مجاناً الآن', en:'Sign up free now' },
  ctaContact:    { ar:'تواصل معنا', en:'Contact us' },

  faqTag:        { ar:'الأسئلة الشائعة', en:'FAQ' },
  faqTitle:      { ar:'عندك سؤال؟', en:'Got a question?' },

  footerTagline: { ar:'منصة إدارة المخزون الذكية لكل المنشآت', en:'The smart inventory management platform for every business' },
  footerPlatform:{ ar:'المنصة', en:'Platform' },
  footerLegal:   { ar:'قانوني', en:'Legal' },
  footerContact: { ar:'تواصل', en:'Contact' },
  footerLogin:   { ar:'تسجيل الدخول', en:'Log in' },
  footerSignup:  { ar:'إنشاء حساب', en:'Create account' },
  footerPricing: { ar:'الأسعار', en:'Pricing' },
  footerPrivacy: { ar:'سياسة الخصوصية', en:'Privacy Policy' },
  footerTerms:   { ar:'الشروط والأحكام', en:'Terms & Conditions' },
  footerSecurity:{ ar:'سياسة الأمان', en:'Security Policy' },
  footerWhatsapp:{ ar:'واتساب', en:'WhatsApp' },
  footerEmail:   { ar:'البريد الإلكتروني', en:'Email' },
  footerRights:  { ar:'جميع الحقوق محفوظة لدى Storely', en:'All rights reserved to Storely' },
}

export const FAQ_ITEMS = [
  {q:'هل فيه تجربة مجانية؟',a:'نعم — 14 يوماً مجانية كاملة بدون بطاقة ائتمانية. استكشف جميع المميزات من أول يوم.',
   qEn:'Is there a free trial?',aEn:"Yes — a full 14 days free, no credit card required. Explore all the features from day one."},
  {q:'كيف يتم الدفع؟',a:'الدفع عبر تحويل بنكي. بعد التحويل يتم تفعيل حسابك خلال 24 ساعة.',
   qEn:'How does payment work?',aEn:'Payment is via bank transfer. Your account is activated within 24 hours after transfer.'},
  {q:'كم عدد الموردين في كل باقة؟',a:'الأساسية: 3 موردين، المتوسطة: 10 موردين، المتقدمة: غير محدود.',
   qEn:'How many suppliers per plan?',aEn:'Basic: 3 suppliers, Standard: 10 suppliers, Advanced: unlimited.'},
  {q:'هل يدعم متعدد الفروع؟',a:'نعم — الأساسية: فرع واحد، المتوسطة: 3 فروع، المتقدمة: فروع غير محدودة.',
   qEn:'Does it support multiple branches?',aEn:'Yes — Basic: 1 branch, Standard: 3 branches, Advanced: unlimited branches.'},
  {q:'هل الموظفون يحتاجون تدريب؟',a:'لا — واجهة الموظفين بسيطة جداً بضغطة واحدة، وتدعم 7 لغات لأي جنسية.',
   qEn:'Do staff need training?',aEn:'No — the staff interface is extremely simple (one-tap), and supports 7 languages for any nationality.'},
  {q:'هل يمكن الإلغاء في أي وقت؟',a:'نعم — لا يوجد عقود. يمكنك إلغاء اشتراكك في أي وقت.',
   qEn:'Can I cancel anytime?',aEn:'Yes — no contracts. You can cancel your subscription at any time.'},
]

export const TRUST_POINTS = [
  { icon:'🔒', label:'بياناتك محمية بنسخ احتياطي يومي', labelEn:'Your data is protected with daily backups' },
  { icon:'⚡', label:'إعداد حسابك خلال دقائق', labelEn:'Set up your account in minutes' },
  { icon:'📱', label:'دعم عربي كامل عبر واتساب', labelEn:'Full support via WhatsApp' },
  { icon:'🌍', label:'واجهة موظفين بـ7 لغات', labelEn:'Staff interface in 7 languages' },
]

export const BRANCH_OPTIONS = ['فرع واحد','2-3 فروع','4-10 فروع','أكثر من 10 فروع']
export const BRANCH_OPTIONS_EN = ['1 branch','2-3 branches','4-10 branches','More than 10 branches']

export const FEATURES = [
  { icon:Package, title:'تتبع لحظي', titleEn:'Real-time tracking', desc:'راقب كل صنف في الوقت الحقيقي. كل صرف وكل شراء يُسجَّل فوراً.', descEn:'Monitor every item in real time. Every dispense and purchase is logged instantly.' },
  { icon:MessageCircle, title:'واتساب تلقائي', titleEn:'Automatic WhatsApp alerts', desc:'تنبيه فوري لك وللمورد لما يوصل أي صنف للحد الأدنى.', descEn:'Instant alert to you and your supplier when any item hits its minimum level.' },
  { icon:Users, title:'إدارة الموظفين', titleEn:'Staff management', desc:'كل موظف برمز PIN خاص يصرف من المخزون بدون وصول لبياناتك.', descEn:'Each employee gets a private PIN to dispense stock without access to your data.' },
  { icon:Wallet, title:'إقفال الكاشير اليومي', titleEn:'Daily cashier closing', desc:'تسوية الصندوق بخطوات بسيطة مع صور إثبات، وتنبيه واتساب فوري لك عند أي عجز أو زيادة.', descEn:'Simple cash reconciliation with proof photos, and instant WhatsApp alerts for any shortage or surplus.' },
  { icon:Globe, title:'7 لغات', titleEn:'7 languages', desc:'واجهة موظفين بالعربي والإنجليزي والأردو والهندي والتاغالوغ والبنغالي والفرنسي.', descEn:'Staff interface in Arabic, English, Urdu, Hindi, Tagalog, Bengali, and French.' },
  { icon:BarChart3, title:'تقارير ذكية', titleEn:'Smart reports', desc:'تقارير الصرف والمشتريات والجرد وإقفال الكاشير. صدّرها بـ PDF أو CSV بضغطة واحدة.', descEn:'Dispense, purchase, inventory, and cashier closing reports. Export to PDF or CSV in one click.' },
  { icon:Store, title:'متعدد الفروع', titleEn:'Multi-branch', desc:'أدر جميع فروعك من لوحة تحكم واحدة مع مخزون مستقل لكل فرع.', descEn:'Manage all your branches from one dashboard with independent inventory per branch.' },
  { icon:Bot, title:'أدوات الذكاء الاصطناعي', titleEn:'AI tools', desc:'اقتراح الشراء الذكي بناءً على اتجاه استهلاكك الفعلي، ومقارنة أداء الفروع تلقائياً.', descEn:'Smart purchase suggestions based on your actual consumption trend, and automatic branch performance comparison.' },
  { icon:ShoppingBag, title:'المتجر — حل تقني متكامل', titleEn:'The Store — a complete tech solution', desc:'صفحة عرض منتجات أنيقة برابط أو QR + نظام حجوزات إلكتروني كامل بلوحة إدارة للكاشير وإشعارات واتساب تلقائية — كل شي تحت سقف واحد.', descEn:'An elegant product showcase page via link or QR + a complete online reservation system with a cashier dashboard and automatic WhatsApp alerts — all under one roof.', badge:'حل تقني', badgeEn:'Tech Solution' },
]
