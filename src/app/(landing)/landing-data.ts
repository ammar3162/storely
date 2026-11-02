import { Package, MessageCircle, Users, Wallet, Globe, BarChart3, Store, Bot, TrendingUp } from 'lucide-react'

export type Billing = 'monthly'|'yearly'

export const PLAN_BRANCHES = [1, 3, 6, 11]

// معاينة محلية للترتيب الجديد (لم تُعتمد بعد)
export const PLANS = [
  { name:'الأساسية', nameEn:'Basic', price:'99', yearlyPrice:'950', color:'#0f766e', popular:false,
    who:'لمنشأة بفرع واحد تبدأ', whoEn:'For a single-branch business getting started',
    extra:'+ 79 ⃁ لفرع ثاني (معه 3 موظفين و5 موردين)', extraEn:'+ 79 SAR for a second branch (adds 3 staff and 5 suppliers)',
    limits:['فرع واحد','3 موظفين','5 موردين'],
    limitsEn:['1 branch','3 staff','5 suppliers'],
    features:['تتبع المخزون لحظياً','الصرف اليومي برمز PIN للموظفين','المشتريات وإدارة الموردين','تنبيهات واتساب تلقائية','التقارير الأساسية','نسخ احتياطي يومي','دعم فني عبر واتساب'],
    featuresEn:['Real-time inventory','Daily dispensing with staff PIN','Purchasing and suppliers','Automatic WhatsApp alerts','Basic reports','Daily backups','WhatsApp support'],
    addons:[['إقفال الكاشير اليومي','29'],['إدارة الموظفين (الحضور، الشفتات، الرواتب)','59'],['الربحية والمصروفات','29'],['الذكاء الاصطناعي (قرارات اليوم، الطلب الذكي، مسح الفواتير)','29']],
    addonsEn:[['Daily cashier closing','29'],['Staff management (attendance, shifts, payroll)','59'],['Profitability and expenses','29'],['AI tools (daily decisions, smart ordering, invoice scan)','29']] },
  { name:'الشاملة', nameEn:'Complete', price:'249', yearlyPrice:'2390', color:'#0f766e', popular:true,
    who:'كل المميزات + لين 3 فروع', whoEn:'All features + up to 3 branches',
    extra:'+ 79 ⃁ لكل فرع إضافي لين 5 فروع (معه 5 موظفين و5 موردين)', extraEn:'+ 79 SAR per extra branch up to 5 (adds 5 staff and 5 suppliers)',
    limits:['3 فروع','15 موظف','20 مورد'],
    limitsEn:['3 branches','15 staff','20 suppliers'],
    features:['كل مميزات الأساسية','إقفال الكاشير اليومي','إدارة الموظفين والحضور بـGPS','الشفتات والرواتب','الربحية والمصروفات','قرارات اليوم والطلب الذكي','مسح الفواتير بالذكاء الاصطناعي','تقارير متقدمة ومقارنة الفروع','المخزون الراكد وكشف الهدر','نقل المخزون بين الفروع'],
    featuresEn:['Everything in Basic','Daily cashier closing','Staff and GPS attendance','Shifts and payroll','Profitability and expenses','Daily decisions and smart ordering','AI invoice scanning','Advanced reports and branch comparison','Slow stock and waste detection','Stock transfer between branches'] },
  { name:'المتقدمة', nameEn:'Advanced', price:'499', yearlyPrice:'4790', color:'#0f766e', popular:false,
    who:'كل المميزات للمنشآت من 6 فروع وفوق', whoEn:'All features for 6+ branches',
    extra:'+ 59 ⃁ لكل فرع إضافي لين 10 فروع (معه 5 موظفين و5 موردين)', extraEn:'+ 59 SAR per extra branch up to 10 (adds 5 staff and 5 suppliers)',
    limits:['6 فروع','50 موظف','50 مورد'],
    limitsEn:['6 branches','50 staff','50 suppliers'],
    features:['كل مميزات الشاملة','فروع أكثر بسعر أقل للفرع','50 موظف و50 مورد'],
    featuresEn:['Everything in Complete','More branches at a lower price per branch','50 staff and 50 suppliers'] },
  { name:'المؤسسات', nameEn:'Enterprise', price:'', yearlyPrice:'', color:'#0f766e', popular:false, custom:true,
    who:'لأكثر من 10 فروع', whoEn:'For more than 10 branches',
    limits:['فروع وموظفين وموردين حسب احتياجك'],
    limitsEn:['Branches, staff and suppliers as you need'],
    features:['كل مميزات المتقدمة','سعر مخصص لحجم منشأتك','متابعة وتجهيز خاص لمنشأتك','تدريب الموظفين وتجهيز البيانات','أولوية في التطوير حسب احتياجكم'],
    featuresEn:['Everything in Advanced','Custom price for your size','Dedicated follow-up and setup','Staff training and data setup','Priority support and roadmap'] },
]

// جدول مقارنة الباقات (معاينة) — true/false أو نص؛ 'addon' = متاح كإضافة
type Cell = boolean | string
export const COMPARE: { group: string; rows: [string, Cell, Cell, Cell, Cell][] }[] = [
  { group: 'الحجم', rows: [
    ['الفروع المشمولة', '1', '3', '6', 'حسب الاتفاق'],
    ['أقصى عدد فروع', '2', '5', '10', 'بدون حد'],
    ['الموظفين', '3 (و6 مع الفرع الثاني)', '15', '50', 'حسب الاتفاق'],
    ['الموردين', '5', '20', '50', 'حسب الاتفاق'],
  ]},
  { group: 'المخزون والمشتريات', rows: [
    ['تتبع المخزون لحظياً', true, true, true, true],
    ['الصرف اليومي برمز PIN للموظفين', true, true, true, true],
    ['المشتريات وطلبات التوريد للموردين', true, true, true, true],
    ['تنبيهات واتساب تلقائية', true, true, true, true],
    ['نقل المخزون بين الفروع', false, true, true, true],
  ]},
  { group: 'التشغيل والموظفين', rows: [
    ['إقفال الكاشير اليومي', 'addon', true, true, true],
    ['الحضور والانصراف بالموقع', 'addon', true, true, true],
    ['الشفتات والرواتب', 'addon', true, true, true],
    ['واجهة موظفين بـ7 لغات', true, true, true, true],
  ]},
  { group: 'الربحية والذكاء الاصطناعي', rows: [
    ['الربحية والمصروفات', 'addon', true, true, true],
    ['قرارات اليوم والطلب الذكي', 'addon', true, true, true],
    ['مسح الفواتير بالذكاء الاصطناعي', 'addon', true, true, true],
    ['مقارنة الفروع والمخزون الراكد', false, true, true, true],
  ]},
  { group: 'الدعم', rows: [
    ['دعم فني عبر واتساب', true, true, true, true],
    ['متابعة وتجهيز خاص وتدريب الموظفين', false, false, false, true],
  ]},
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
  heroSub:       { ar:'من المخزون والمشتريات، لإقفال الكاشير والأرباح، وإدارة الموظفين والفروع — كل شي بمكان واحد', en:'From inventory and purchasing, to cashier closing and profit, to staff and branch management — all in one place' },
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
  demoSideTitle: { ar:'اطلب تجربة Storely مجاناً — نظام واحد يربط كل أعمال منشأتك', en:'Request a free Storely trial — one system for your whole business' },
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

  footerTagline: { ar:'نظام واحد يربط كل أعمال منشأتك', en:'One system that connects your whole business' },
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

  // التصميم الجديد
  navHow:        { ar:'كيف يشتغل', en:'How it works' },
  navStart:      { ar:'ابدأ مجاناً', en:'Start free' },
  heroTitleA:    { ar:'ودّع الدفاتر والإكسل،', en:'Say goodbye to notebooks and spreadsheets,' },
  heroTitleB:    { ar:'وأدر منشأتك', en:'and run your business' },
  heroTitleC:    { ar:'بهدوء', en:'calmly' },
  heroWatch:     { ar:'شوف كيف يشتغل', en:'See how it works' },
  heroPoint1:    { ar:'إعداد خلال دقائق', en:'Set up in minutes' },
  heroPoint2:    { ar:'دعم عربي عبر واتساب', en:'Arabic support on WhatsApp' },
  heroPoint3:    { ar:'بدون عقود', en:'No contracts' },
  storyTag:      { ar:'صُمم لأصحاب المنشآت', en:'Built for business owners' },
  storyTitle:    { ar:'كل صباح، تعرف وضع منشأتك في دقيقة', en:'Every morning, know where your business stands in a minute' },
  storyBody:     { ar:'ما تحتاج تكون محاسب ولا خبير أنظمة. افتح Storely مع قهوتك، وتشوف وش نقص، وش انصرف، ومين حضر من موظفينك — من أي فرع، ومن جوالك.', en:"You don't need to be an accountant. Open Storely with your coffee and see what's running low, what was used, and who showed up — from any branch, on your phone." },
  storyP1:       { ar:'مخزونك ومشترياتك وصرفك بمكان واحد', en:'Inventory, purchases and usage in one place' },
  storyP2:       { ar:'تنبيه قبل ما يخلص أي صنف', en:'An alert before anything runs out' },
  storyP3:       { ar:'موظفينك يصرفون برمز PIN بدون ما يشوفون بياناتك', en:'Staff dispense with a PIN, without seeing your data' },
  howTag:        { ar:'كيف يشتغل', en:'How it works' },
  howTitle:      { ar:'شوف Storely وهو يشتغل عنك', en:'Watch Storely work for you' },
  how1T:         { ar:'المخزون وصل الحد الأدنى؟', en:'Stock hit its minimum?' },
  how1D:         { ar:'يروح طلب التوريد للمورد على الواتساب تلقائياً، ويوصلك تأكيده أول ما يرد.', en:'A supply order goes to your supplier on WhatsApp automatically, and you get their confirmation.' },
  how2T:         { ar:'إقفال الكاشير اليومي', en:'Daily cashier closing' },
  how2D:         { ar:'المبيعات والشبكة والمسحوبات والكاش الفعلي — وأي زيادة أو عجز يوصلك فوراً.', en:'Sales, card, withdrawals and actual cash — any surplus or shortage reaches you instantly.' },
  how3T:         { ar:'النقل بين الفروع', en:'Transfers between branches' },
  how3D:         { ar:'جمّع الأصناف وانقلها دفعة وحدة، والكميات تتحدث في الفرعين.', en:'Gather items and move them in one go; both branches update.' },
  how4T:         { ar:'الحضور والانصراف', en:'Attendance' },
  how4D:         { ar:'كل موظف يسجّل حضوره برقم جواله ورمز PIN، وتشوف مين حضر ومين تأخر.', en:'Each employee checks in with their phone and PIN; see who is in and who is late.' },
  supTag:        { ar:'الموردين', en:'Suppliers' },
  supTitle:      { ar:'مورّدك صار جزء من فريقك', en:'Your supplier becomes part of your team' },
  supBody:       { ar:'لما ينقص صنف، يوصل مورّدك طلب واضح على الواتساب بالكمية والفرع. يرد بـ«تم»، وتوصلك الموافقة — بدون مكالمات ولا نسيان.', en:'When an item runs low, your supplier gets a clear WhatsApp order with quantity and branch. They reply "done" and you get the confirmation — no calls, nothing forgotten.' },
  ctaTitle:      { ar:'منشأتك تستاهل إدارة أهدأ', en:'Your business deserves calmer management' },
}

export const FAQ_ITEMS = [
  {q:'هل Storely منصة معتمدة ولها سجل تجاري؟',a:'نعم — Storely تابعة لـ «مؤسسة باسم علي خلوي لتقنية المعلومات»، مسجّلة رسمياً في وزارة التجارة السعودية بالرقم الوطني الموحد 7055023522، ونوع الكيان مؤسسة، وحالة السجل نشط. تقدر تتحقق من السجل بنفسك عبر موقع وزارة التجارة mc.gov.sa.',
   qEn:'Is Storely a registered business?',aEn:'Yes — Storely is operated by Basim Ali Khulwi Information Technology Est., officially registered with the Saudi Ministry of Commerce under unified national number 7055023522 (entity type: establishment, status: active). You can verify it yourself at mc.gov.sa.'},
  {q:'هل فيه تجربة مجانية؟',a:'نعم — 14 يوماً مجانية كاملة بدون بطاقة ائتمانية. استكشف جميع المميزات من أول يوم.',
   qEn:'Is there a free trial?',aEn:"Yes — a full 14 days free, no credit card required. Explore all the features from day one."},
  {q:'كيف يتم الدفع؟',a:'الدفع عبر تحويل بنكي. بعد التحويل يتم تفعيل حسابك خلال 24 ساعة.',
   qEn:'How does payment work?',aEn:'Payment is via bank transfer. Your account is activated within 24 hours after transfer.'},
  {q:'كم عدد الموردين في كل باقة؟',a:'الأساسية: 5 موردين، الشاملة: 20 مورد، المتقدمة: 50 مورد. وكل فرع إضافي يزيد عدد الموردين، وتقدر تضيف موردين من داخل النظام.',
   qEn:'How many suppliers per plan?',aEn:'Basic: 5 suppliers, Complete: 20, Advanced: 50. Each extra branch adds more, and you can add suppliers from inside the app.'},
  {q:'هل يدعم متعدد الفروع؟',a:'نعم — الأساسية: فرع واحد وتقدر توصل لفرعين، الشاملة: 3 فروع وتقدر توصل لـ5، المتقدمة: 6 فروع وتقدر توصل لـ10. وتضيف الفروع بنفسك من داخل النظام، وللمنشآت الأكبر تواصل معنا.',
   qEn:'Does it support multiple branches?',aEn:'Yes — Basic: 1 branch (up to 2), Complete: 3 (up to 5), Advanced: 6 (up to 10). Add branches yourself from inside the app; larger chains, contact us.'},
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
  { icon:TrendingUp, title:'الأرباح والمصروفات', titleEn:'Profit & expenses', desc:'اعرف صافي ربحك كل شهر بعد المشتريات والمصروفات الثابتة والمتغيرة والرواتب، وقارنه بالشهر اللي قبله.', descEn:'See your net profit every month after purchases, fixed and variable expenses and salaries, compared with last month.' },
]

// حسابات ستورلي في السوشيال ميديا (أيقونات أسفل الموقع) — مسارات الشعارات من simple-icons (CC0)
export const SOCIAL_LINKS = [
  { label: 'WhatsApp', href: 'https://wa.me/966594351667', path: 'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z' },
  { label: 'Snapchat', href: 'https://www.snapchat.com/add/storelydev', path: 'M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.51.075.045.203.09.401.09.3-.016.659-.12 1.033-.301.165-.088.344-.104.464-.104.182 0 .359.029.509.09.45.149.734.479.734.838.015.449-.39.839-1.213 1.168-.089.029-.209.075-.344.119-.45.135-1.139.36-1.333.81-.09.224-.061.524.12.868l.015.015c.06.136 1.526 3.475 4.791 4.014.255.044.435.27.42.509 0 .075-.015.149-.045.225-.24.569-1.273.988-3.146 1.271-.059.091-.12.375-.164.57-.029.179-.074.36-.134.553-.076.271-.27.405-.555.405h-.03c-.135 0-.313-.031-.538-.074-.36-.075-.765-.135-1.273-.135-.3 0-.599.015-.913.074-.6.104-1.123.464-1.723.884-.853.599-1.826 1.288-3.294 1.288-.06 0-.119-.015-.18-.015h-.149c-1.468 0-2.427-.675-3.279-1.288-.599-.42-1.107-.779-1.707-.884-.314-.045-.629-.074-.928-.074-.54 0-.958.089-1.272.149-.211.043-.391.074-.54.074-.374 0-.523-.224-.583-.42-.061-.192-.09-.389-.135-.567-.046-.181-.105-.494-.166-.57-1.918-.222-2.95-.642-3.189-1.226-.031-.063-.052-.15-.055-.225-.015-.243.165-.465.42-.509 3.264-.54 4.73-3.879 4.791-4.02l.016-.029c.18-.345.224-.645.119-.869-.195-.434-.884-.658-1.332-.809-.121-.029-.24-.074-.346-.119-1.107-.435-1.257-.93-1.197-1.273.09-.479.674-.793 1.168-.793.146 0 .27.029.383.074.42.194.789.3 1.104.3.234 0 .384-.06.465-.105l-.046-.569c-.098-1.626-.225-3.651.307-4.837C7.392 1.077 10.739.807 11.727.807l.419-.015h.06z' },
]
