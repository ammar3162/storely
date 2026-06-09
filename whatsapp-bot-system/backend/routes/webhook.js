const express = require('express');
const router = express.Router();
const whatsapp = require('../services/whatsapp');
const orders = require('../services/orders');

router.post('/', async (req, res) => {
  try {
    console.log('📥 Webhook received:', JSON.stringify(req.body, null, 2));
    
    const { event, data } = req.body;

    if (event === 'message' || event === 'messages.upsert') {
      await handleIncomingMessage(data);
    }

    if (event === 'poll.results' || event === 'poll_response') {
      await handlePollResponse(data);
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('❌ Webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === 'your_verify_token') {
      console.log('✅ Webhook verified');
      return res.status(200).send(challenge);
    }
  }

  res.status(403).send('Forbidden');
});

async function handleIncomingMessage(messageData) {
  try {
    const from = messageData.key?.remoteJid || messageData.from;
    const messageText = messageData.message?.conversation || 
                       messageData.message?.extendedTextMessage?.text || '';
    
    console.log(`📩 Message from ${from}: ${messageText}`);

    if (['hi', 'hello', 'مرحبا', 'سلام', 'hey', 'start'].includes(messageText.toLowerCase())) {
      await whatsapp.sendWelcomeMessage(from);
      return;
    }

    switch(messageText.trim()) {
      case '1':
      case '1️⃣':
        await handleMenuRequest(from);
        break;
        
      case '2':
      case '2️⃣':
        await handleWorkingHours(from);
        break;
        
      case '3':
      case '3️⃣':
        await handleOrderRequest(from);
        break;
        
      case '4':
      case '4️⃣':
        await handleComplaints(from);
        break;
        
      default:
        if (messageText.length > 5) {
          await handleCustomOrder(from, messageText);
        } else {
          await whatsapp.sendTextMessage(from, '❓ لم أفهم طلبك. يرجى اختيار رقم من القائمة.');
        }
    }
  } catch (error) {
    console.error('Error handling message:', error);
  }
}

async function handlePollResponse(pollData) {
  try {
    const from = pollData.key?.remoteJid;
    const selectedOption = pollData.pollResult?.[0]?.name;
    
    console.log(`📊 Poll selection from ${from}: ${selectedOption}`);

    if (selectedOption) {
      switch(selectedOption) {
        case '1️⃣ عرض المنيو':
          await handleMenuRequest(from);
          break;
        case '2️⃣ أوقات العمل':
          await handleWorkingHours(from);
          break;
        case '3️⃣ طلب طب':
          await handleOrderRequest(from);
          break;
        case '4️⃣ الشكاوى والاستفسارات':
          await handleComplaints(from);
          break;
      }
    }
  } catch (error) {
    console.error('Error handling poll:', error);
  }
}

async function handleMenuRequest(from) {
  const menuText = `🍽️ *قائمتنا اليومية*\n\n` +
    `🥗 *الأطباق الرئيسية:*\n` +
    `• مندي لحم - 45 ريال\n` +
    `• كبسة دجاج - 35 ريال\n` +
    `• برياني - 40 ريال\n\n` +
    `🍟 *المقبلات:*\n` +
    `• حموس - 10 ريال\n` +
    `• متبل - 10 ريال\n` +
    `• سلطة - 12 ريال\n\n` +
    `🥤 *المشروبات:*\n` +
    `• عصير طازج - 8 ريال\n` +
    `• مشروبات غازية - 5 ريال\n\n` +
    `📝 *للطلب:* أرسل "3" أو اختر "طلب طب"`;
    
  await whatsapp.sendTextMessage(from, menuText);
}

async function handleWorkingHours(from) {
  const hoursText = `🕐 *أوقات العمل*\n\n` +
    `📅 *الأيام:* السبت إلى الخميس\n` +
    `🌅 *الفترة الصباحية:* 11:00 صباحاً - 4:00 مساءً\n` +
    `🌆 *فترة المساء:* 6:00 مساءً - 12:00 ليلاً\n\n` +
    `🔴 *الجمعة:* مغلق\n\n` +
    `📞 *للاستفسار:* اتصل بنا مباشرة`;
    
  await whatsapp.sendTextMessage(from, hoursText);
}

async function handleOrderRequest(from) {
  const orderText = `🛒 *طلب جديد*\n\n` +
    `لإتمام طلبك، يرجى إرسال:\n` +
    `1. اسمك الكريم\n` +
    `2. الأطباق المطلوبة\n\n` +
    `💡 *مثال:*\n` +
    `"أحمد، مندي لحم + عصير برتقال"\n\n` +
    `⏳ سنرسل لك رابط متابعة الطلب فوراً!`;
    
  await whatsapp.sendTextMessage(from, orderText);
}

async function handleCustomOrder(from, orderText) {
  const customer = orders.findOrCreateCustomer(from);
  const orderId = orders.createOrder(from, customer.name, orderText);
  
  await whatsapp.sendOrderLink(from, orderId);
  
  await whatsapp.sendTextMessage(from, 
    `✅ *تم تسجيل طلبك!*\n\n` +
    `🔢 *رقم الطلب:* ${orderId.substring(0, 8)}\n` +
    `📋 *تفاصيل:* ${orderText}\n\n` +
    `🔗 تم إرسال رابط المتابعة أعلاه`
  );
}

async function handleComplaints(from) {
  const complaintText = `📞 *خدمة العملاء*\n\n` +
    `نسعد بتلقي استفساراتك وشكاويك!\n\n` +
    `📧 *البريد:* support@restaurant.com\n` +
    `📱 *واتساب:* نفس هذا الرقم\n` +
    `⏰ *مواعيد الرد:* خلال ساعة عمل\n\n` +
    `💬 *ارسل رسالتك الآن وسنرد عليك في أقرب وقت!*`;
    
  await whatsapp.sendTextMessage(from, complaintText);
}

module.exports = router;
