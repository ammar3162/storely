import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const API_KEY      = process.env.WASENDER_API_KEY!
const SESSION      = process.env.WASENDER_SESSION_ID!
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function send(to: string, text: string) {
  try {
    await fetch('https://www.wasenderapi.com/api/send-message', {
      method: 'POST',
      headers: { 'Content-Type':'application/json', 'Authorization':`Bearer ${API_KEY}`, 'X-Session-Id':SESSION },
      body: JSON.stringify({ to, text }),
    })
  } catch {}
}

const MAIN_MENU = `مرحباً بك في *Storely* 🏪\n\nنظام إدارة المخزون الذكي\n\n1️⃣ الاشتراكات والباقات\n2️⃣ طريقة الاستخدام\n3️⃣ الدعم الفني\n4️⃣ التواصل مع الفريق\n\n👇 أرسل رقم الخيار`

const USER_MENU = `أهلاً بك في *Storely* 🏪\n\n1️⃣ حالة المخزون\n2️⃣ المنتجات الناقصة\n3️⃣ الاشتراكات والباقات\n4️⃣ التواصل مع الفريق\n\n👇 أرسل رقم الخيار`

const STOCK_MENU = `📦 *حالة المخزون*\n\nاختر ما تريد:\n\n1️⃣ المخزون الناقص\n2️⃣ المخزون الحالي\n3️⃣ عمليات الصرف اليومية\n4️⃣ تقارير المشتريات اليومية\n\nاكتب 0 للقائمة الرئيسية`

const V: Record<string,string> = {
  '1': `🏷️ *الاشتراكات والباقات*\n\n🌱 الأساسية: فرع واحد — 99 ر.س/شهر\n🏪 المتوسطة: 2-3 فروع — 199 ر.س/شهر\n🚀 المتقدمة: 4+ فروع — 349 ر.س/شهر\n\nللاشتراك اكتب 4\nاكتب 0 للقائمة`,
  '2': `📱 *طريقة الاستخدام*\n\n✅ سجّل حسابك\n✅ أضف منتجاتك\n✅ سجّل المشتريات والصرف\n✅ استقبل تنبيهات تلقائية\n\n🔗 storely-hm1u.vercel.app\n\nاكتب 0 للقائمة`,
  '3': `🛠️ *الدعم الفني*\n\n⏰ السبت-الخميس: 9ص-10م\nللتواصل اكتب 4\nاكتب 0 للقائمة`,
  '4': `👋 *التواصل*\n\n📱 +966594351667\nhttps://wa.me/966594351667\n\nاكتب 0 للقائمة`,
}

// حالة المستخدم (في الذاكرة)
const userState: Record<string, string> = {}

async function findUser(phone: string) {
  try {
    const sb = createClient(SUPABASE_URL, SERVICE_KEY)
    const clean = phone.replace(/^\+/,'')
    for (const p of [clean, '0'+clean.slice(3), '+'+clean]) {
      const { data } = await sb.from('profiles').select('id,full_name,org_id,status').eq('phone',p).maybeSingle()
      if (data) return data
    }
  } catch {}
  return null
}

async function getProducts(orgId: string) {
  try {
    const { data } = await createClient(SUPABASE_URL,SERVICE_KEY).from('products').select('name,qty,unit,reorder_point').eq('org_id',orgId).eq('is_active',true).order('name')
    return data||[]
  } catch { return [] }
}

async function getTodayDispense(orgId: string) {
  try {
    const today = new Date(); today.setHours(0,0,0,0)
    const { data } = await createClient(SUPABASE_URL,SERVICE_KEY)
      .from('stock_movements')
      .select('qty_change,note,created_at,products!inner(name,unit,org_id)')
      .eq('type','out')
      .eq('products.org_id',orgId)
      .gte('created_at', today.toISOString())
      .order('created_at',{ascending:false})
    return data||[]
  } catch { return [] }
}

async function getTodayPurchases(orgId: string) {
  try {
    const today = new Date(); today.setHours(0,0,0,0)
    const { data } = await createClient(SUPABASE_URL,SERVICE_KEY)
      .from('purchases')
      .select('name,qty,amount,supplier,category')
      .eq('org_id',orgId)
      .gte('created_at', today.toISOString())
      .order('created_at',{ascending:false})
    return data||[]
  } catch { return [] }
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
      const t = text.toLowerCase().trim()

      if (user?.status==='active') {
        const state = userState[to] || 'main'

        // رجوع للقائمة الرئيسية
        if (t==='0'||t==='قائمة'||t==='رجوع') {
          userState[to] = 'main'
          await send(to, USER_MENU)
          continue
        }

        // ── القائمة الرئيسية ──
        if (state === 'main') {
          if (t==='1'||t==='مخزون'||t==='حالة المخزون') {
            userState[to] = 'stock'
            await send(to, STOCK_MENU)
            continue
          }
          if (t==='2'||t==='ناقص') {
            const p = await getProducts(user.org_id)
            const low = p.filter((x:any)=>x.qty<=x.reorder_point)
            if (!low.length) { await send(to,'✅ جميع المنتجات كافية\n\nاكتب 0 للقائمة'); continue }
            const list = low.slice(0,15).map((x:any)=>`⚠️ ${x.name}: ${x.qty}/${x.reorder_point} ${x.unit}`).join('\n')
            await send(to,`⚠️ *المنتجات الناقصة (${low.length})*\n\n${list}\n\nاكتب 0 للقائمة`)
            continue
          }
          if (t==='3') { await send(to,V['1']); continue }
          if (t==='4') { await send(to,V['4']); continue }
          await send(to, USER_MENU)
        }

        // ── قائمة المخزون الفرعية ──
        else if (state === 'stock') {
          // 1 - المخزون الناقص
          if (t==='1') {
            const p = await getProducts(user.org_id)
            const low = p.filter((x:any)=>x.qty<=x.reorder_point)
            if (!low.length) { await send(to,'✅ لا توجد منتجات ناقصة\n\nاكتب 0 للقائمة'); continue }
            const list = low.slice(0,15).map((x:any)=>`🔴 ${x.name}: ${x.qty}/${x.reorder_point} ${x.unit}`).join('\n')
            await send(to,`🔴 *المخزون الناقص (${low.length})*\n\n${list}\n\nاكتب 0 للقائمة | اكتب 8 للمخزون`)
            continue
          }
          // 2 - المخزون الحالي
          if (t==='2') {
            const p = await getProducts(user.org_id)
            if (!p.length) { await send(to,'📦 المخزون فارغ\n\nاكتب 0 للقائمة'); continue }
            const low = p.filter((x:any)=>x.qty<=x.reorder_point).length
            const list = p.slice(0,15).map((x:any)=>`${x.qty<=x.reorder_point?'🔴':'🟢'} ${x.name}: ${x.qty} ${x.unit}`).join('\n')
            await send(to,`📦 *المخزون الحالي*\n\n${list}${p.length>15?`\n...و${p.length-15} أخرى`:''}\n\n📊 ${p.length} صنف | ⚠️ ناقص: ${low}\n\nاكتب 0 للقائمة | اكتب 8 للمخزون`)
            continue
          }
          // 3 - عمليات الصرف اليومية
          if (t==='3') {
            const moves = await getTodayDispense(user.org_id)
            if (!moves.length) { await send(to,'📭 لا توجد عمليات صرف اليوم\n\nاكتب 0 للقائمة'); continue }
            const list = moves.slice(0,10).map((x:any)=>`▪️ ${(x.products as any)?.name}: ${Math.abs(x.qty_change)} ${(x.products as any)?.unit} — ${x.note||'—'}`).join('\n')
            await send(to,`📤 *عمليات الصرف اليوم (${moves.length})*\n\n${list}\n\nاكتب 0 للقائمة | اكتب 8 للمخزون`)
            continue
          }
          // 4 - تقارير المشتريات اليومية
          if (t==='4') {
            const purchases = await getTodayPurchases(user.org_id)
            if (!purchases.length) { await send(to,'📭 لا توجد مشتريات اليوم\n\nاكتب 0 للقائمة'); continue }
            const total = purchases.reduce((s:number,x:any)=>s+Number(x.amount||0),0)
            const list = purchases.slice(0,10).map((x:any)=>`▪️ ${x.name}: ${x.qty||'—'} — ${Number(x.amount).toFixed(0)} ر.س`).join('\n')
            await send(to,`🛒 *مشتريات اليوم (${purchases.length})*\n\n${list}\n\n💰 الإجمالي: ${total.toFixed(2)} ر.س\n\nاكتب 0 للقائمة | اكتب 8 للمخزون`)
            continue
          }
          // اكتب 8 للرجوع لقائمة المخزون
          if (t==='8') {
            await send(to, STOCK_MENU)
            continue
          }
          await send(to, STOCK_MENU)
        }

      } else {
        // مستخدم غير مسجل
        userState[to] = 'main'
        await send(to, V[text]||V[t]||MAIN_MENU)
      }
    }
    return NextResponse.json({ok:true})
  } catch(err:any) { return NextResponse.json({ok:true}) }
}

export async function GET() { return NextResponse.json({status:'Storely Bot ✅'}) }
