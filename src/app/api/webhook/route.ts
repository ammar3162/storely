import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const API_KEY      = process.env.WASENDER_API_KEY!
const SESSION      = process.env.WASENDER_SESSION_ID!
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!

const sb = () => createClient(SUPABASE_URL, SERVICE_KEY)

async function send(to: string, text: string) {
  try {
    await fetch('https://www.wasenderapi.com/api/send-message', {
      method: 'POST',
      headers: { 'Content-Type':'application/json', 'Authorization':`Bearer ${API_KEY}`, 'X-Session-Id':SESSION },
      body: JSON.stringify({ to, text }),
    })
  } catch {}
}

// ── الذاكرة الدائمة ──
async function getState(phone: string): Promise<string> {
  try {
    const { data } = await sb().from('whatsapp_sessions').select('state').eq('phone', phone).maybeSingle()
    return data?.state || 'main'
  } catch { return 'main' }
}

async function setState(phone: string, state: string) {
  try {
    await sb().from('whatsapp_sessions').upsert({ phone, state, updated_at: new Date().toISOString() }, { onConflict: 'phone' })
  } catch {}
}

const MAIN_MENU  = `أهلاً بك في *Storely* 🏪\n\n1️⃣ حالة المخزون\n2️⃣ المنتجات الناقصة\n3️⃣ الاشتراكات والباقات\n4️⃣ التواصل مع الفريق\n\n💡 أو اكتب اسم منتج مباشرة للبحث عنه\n👇 أرسل رقم الخيار`
const STOCK_MENU = `📦 *حالة المخزون*\n\n1️⃣ المخزون الناقص\n2️⃣ المخزون الحالي\n3️⃣ عمليات الصرف اليومية\n4️⃣ تقارير المشتريات اليومية\n\nاكتب 0 للقائمة الرئيسية`
const GUEST_MENU = `مرحباً بك في *Storely* 🏪\n\nنظام إدارة المخزون الذكي\n\n1️⃣ الاشتراكات والباقات\n2️⃣ طريقة الاستخدام\n3️⃣ الدعم الفني\n4️⃣ التواصل مع الفريق\n\n👇 أرسل رقم الخيار`

const GUEST_V: Record<string,string> = {
  '1': `🏷️ *الاشتراكات والباقات*\n\n🌱 الأساسية: فرع واحد — 99 ر.س/شهر\n🏪 المتوسطة: 2-3 فروع — 199 ر.س/شهر\n🚀 المتقدمة: 4+ فروع — 349 ر.س/شهر\n\n✅ جميع الباقات تشمل:\n• إشعارات واتساب تلقائية\n• نسخ احتياطي أسبوعي\n• تقارير مفصلة\n• دعم فني\n\n🔗 سجّل الآن: storely.dev/login\n\nاكتب 4 للتواصل\nاكتب 0 للقائمة`,
  '2': `📱 *طريقة الاستخدام*\n\n✅ سجّل حسابك\n✅ أضف منتجاتك\n✅ سجّل المشتريات والصرف\n✅ استقبل تنبيهات تلقائية\n\n🔗 storely.dev\n\nاكتب 0 للقائمة`,
  '3': `🛠️ *الدعم الفني*\n\n⏰ السبت-الخميس: 9ص-10م\nاكتب 4 للتواصل\nاكتب 0 للقائمة`,
  '4': `👋 *التواصل*\n\n📱 +966594351667\nhttps://wa.me/966594351667\n\nاكتب 0 للقائمة`,
}

async function findUser(phone: string) {
  try {
    const clean = phone.replace(/^\+/,'')
    for (const p of [clean, '0'+clean.slice(3), '+'+clean]) {
      const { data } = await sb().from('profiles').select('id,full_name,org_id,status').eq('phone',p).maybeSingle()
      if (data) return data
    }
  } catch {}
  return null
}

async function getProducts(orgId: string) {
  try {
    const { data } = await sb().from('products').select('id,name,qty,unit,reorder_point').eq('org_id',orgId).eq('is_active',true).order('name')
    return data||[]
  } catch { return [] }
}

async function getTodayDispense(orgId: string) {
  try {
    const today = new Date(); today.setHours(0,0,0,0)
    const { data } = await sb().from('stock_movements')
      .select('qty_change,note,created_at,products!inner(name,unit,org_id)')
      .eq('type','out').eq('products.org_id',orgId)
      .gte('created_at',today.toISOString()).order('created_at',{ascending:false})
    return data||[]
  } catch { return [] }
}

async function getTodayPurchases(orgId: string) {
  try {
    const today = new Date(); today.setHours(0,0,0,0)
    const { data } = await sb().from('purchases')
      .select('name,qty,amount,supplier').eq('org_id',orgId)
      .gte('created_at',today.toISOString()).order('created_at',{ascending:false})
    return data||[]
  } catch { return [] }
}

// ── 3. تسجيل صرف من واتساب ──
async function handleDispense(to: string, user: any, text: string) {
  // صيغة: "صرف سكر 5"
  const match = text.match(/^صرف\s+(.+?)\s+(\d+(?:\.\d+)?)$/)
  if (!match) {
    await send(to, '⚠️ الصيغة الصحيحة:\n*صرف اسم_المنتج الكمية*\n\nمثال: صرف سكر 5\n\nاكتب 0 للقائمة')
    return
  }
  const productName = match[1].trim()
  const qty = Number(match[2])
  const products = await getProducts(user.org_id)
  const product = products.find((p:any) => p.name.includes(productName) || productName.includes(p.name))
  if (!product) {
    await send(to, `❌ المنتج "${productName}" غير موجود في المخزون\n\nاكتب 0 للقائمة`)
    return
  }
  if (product.qty < qty) {
    await send(to, `⚠️ الكمية المطلوبة (${qty}) أكبر من المتاح (${product.qty} ${product.unit})\n\nاكتب 0 للقائمة`)
    return
  }
  const { error } = await sb().from('stock_movements').insert({
    product_id: product.id, profile_id: user.id,
    type: 'out', qty_change: -qty, note: 'صرف عبر واتساب'
  })
  if (error) { await send(to, '❌ حدث خطأ، حاول مرة أخرى'); return }

  // 4. إشعار للمدير
  const { data: org } = await sb().from('organizations').select('whatsapp_number,name').eq('id',user.org_id).single()
  if (org?.whatsapp_number) {
    const managerPhone = org.whatsapp_number.replace(/^\+/,'').replace(/^0/,'966')
    const remaining = product.qty - qty
    await send(managerPhone,
      `📤 *إشعار صرف*\n\n👤 ${user.full_name}\n📦 ${product.name}: ${qty} ${product.unit}\n📊 المتبقي: ${remaining} ${product.unit}${remaining<=product.reorder_point?'\n⚠️ وصل للحد الأدنى!':''}`
    )
  }
  await send(to, `✅ تم صرف ${qty} ${product.unit} من ${product.name}\n📊 المتبقي: ${product.qty - qty} ${product.unit}\n\nاكتب 0 للقائمة`)
}

// ── 2. بحث عن منتج ──
async function searchProduct(to: string, orgId: string, query: string) {
  const products = await getProducts(orgId)
  const results = products.filter((p:any) => p.name.includes(query))
  if (!results.length) {
    await send(to, `🔍 لم أجد منتجاً باسم "${query}"\n\nاكتب 0 للقائمة`)
    return
  }
  const list = results.slice(0,10).map((p:any) => `${p.qty<=p.reorder_point?'🔴':'🟢'} ${p.name}: ${p.qty} ${p.unit}`).join('\n')
  await send(to, `🔍 *نتائج البحث عن "${query}"*\n\n${list}\n\nاكتب 0 للقائمة`)
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    if (body?.data?.test===true) return NextResponse.json({ok:true})
    const messages = body?.data?.messages
    const msgs = Array.isArray(messages)?messages:(messages?[messages]:[])
    if (!msgs.length) return NextResponse.json({ok:true})

    for (const msg of msgs) {
      if (msg?.key?.fromMe===true) continue
      const to   = (msg?.key?.cleanedSenderPn||msg?.key?.remoteJid?.replace('@s.whatsapp.net','')?.replace('@c.us','')||'')
      const text = (msg?.messageBody||msg?.message?.conversation||'').trim()
      if (!to||!text) continue

      const user = await findUser(to)
      const t = text.trim()

      if (user?.status==='active') {
        const state = await getState(to)

        // رجوع للقائمة
        if (t==='0'||t==='قائمة'||t==='رجوع') {
          await setState(to,'main')
          await send(to, MAIN_MENU)
          continue
        }

        // صرف مباشر
        if (t.startsWith('صرف ')) {
          await handleDispense(to, user, t)
          continue
        }

        // ── القائمة الرئيسية ──
        if (state==='main') {
          if (t==='1') { await setState(to,'stock'); await send(to,STOCK_MENU); continue }
          if (t==='2') {
            const p = await getProducts(user.org_id)
            const low = p.filter((x:any)=>x.qty<=x.reorder_point)
            if (!low.length) { await send(to,'✅ جميع المنتجات كافية\n\nاكتب 0 للقائمة'); continue }
            const list = low.slice(0,15).map((x:any)=>`🔴 ${x.name}: ${x.qty}/${x.reorder_point} ${x.unit}`).join('\n')
            await send(to,`⚠️ *الناقص (${low.length})*\n\n${list}\n\nاكتب 0 للقائمة`)
            continue
          }
          if (t==='3') { await send(to,GUEST_V['1']); continue }
          if (t==='4') { await send(to,GUEST_V['4']); continue }
          // بحث عن منتج
          if (t.length>1 && isNaN(Number(t))) {
            await searchProduct(to, user.org_id, t)
            continue
          }
          await send(to, MAIN_MENU)
        }

        // ── قائمة المخزون ──
        else if (state==='stock') {
          if (t==='8') { await send(to,STOCK_MENU); continue }
          if (t==='1') {
            const p = await getProducts(user.org_id)
            const low = p.filter((x:any)=>x.qty<=x.reorder_point)
            if (!low.length) { await send(to,'✅ لا توجد منتجات ناقصة\n\nاكتب 0 للقائمة'); continue }
            const list = low.slice(0,15).map((x:any)=>`🔴 ${x.name}: ${x.qty}/${x.reorder_point} ${x.unit}`).join('\n')
            await send(to,`🔴 *الناقص (${low.length})*\n\n${list}\n\nاكتب 0 للقائمة | اكتب 8 لقائمة المخزون`)
            continue
          }
          if (t==='2') {
            const p = await getProducts(user.org_id)
            if (!p.length) { await send(to,'📦 المخزون فارغ\n\nاكتب 0 للقائمة'); continue }
            const low = p.filter((x:any)=>x.qty<=x.reorder_point).length
            const list = p.slice(0,15).map((x:any)=>`${x.qty<=x.reorder_point?'🔴':'🟢'} ${x.name}: ${x.qty} ${x.unit}`).join('\n')
            await send(to,`📦 *المخزون (${p.length} صنف)*\n\n${list}${p.length>15?`\n...و${p.length-15} أخرى`:''}\n\n⚠️ ناقص: ${low}\n\nاكتب 0 للقائمة | اكتب 8 للمخزون`)
            continue
          }
          if (t==='3') {
            const moves = await getTodayDispense(user.org_id)
            if (!moves.length) { await send(to,'📭 لا توجد عمليات صرف اليوم\n\nاكتب 0 للقائمة'); continue }
            const list = moves.slice(0,10).map((x:any)=>`▪️ ${(x.products as any)?.name}: ${Math.abs(x.qty_change)} ${(x.products as any)?.unit}`).join('\n')
            await send(to,`📤 *الصرف اليوم (${moves.length})*\n\n${list}\n\nاكتب 0 للقائمة | اكتب 8 للمخزون`)
            continue
          }
          if (t==='4') {
            const purchases = await getTodayPurchases(user.org_id)
            if (!purchases.length) { await send(to,'📭 لا توجد مشتريات اليوم\n\nاكتب 0 للقائمة'); continue }
            const total = purchases.reduce((s:number,x:any)=>s+Number(x.amount||0),0)
            const list = purchases.slice(0,10).map((x:any)=>`▪️ ${x.name}: ${Number(x.amount).toFixed(0)} ر.س`).join('\n')
            await send(to,`🛒 *مشتريات اليوم (${purchases.length})*\n\n${list}\n\n💰 الإجمالي: ${total.toFixed(2)} ر.س\n\nاكتب 0 للقائمة | اكتب 8 للمخزون`)
            continue
          }
          await send(to, STOCK_MENU)
        }

      } else {
        // زائر غير مسجل
        await setState(to,'main')
        await send(to, GUEST_V[t]||GUEST_MENU)
      }
    }
    return NextResponse.json({ok:true})
  } catch { return NextResponse.json({ok:true}) }
}

export async function GET() { return NextResponse.json({status:'Storely Bot ✅'}) }
