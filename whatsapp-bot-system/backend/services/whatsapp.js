const axios = require('axios');
const config = require('../config');

class WhatsAppService {
  constructor() {
    this.apiKey = config.wasender.apiKey;
    this.sessionId = config.wasender.sessionId;
    this.baseUrl = config.wasender.baseUrl;
  }

  async sendTextMessage(to, text) {
    try {
      const response = await axios.post(
        `${this.baseUrl}${config.wasender.endpoints.sendMessage}`,
        {
          sessionId: this.sessionId,
          to: to,
          text: text
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('✅ Message sent successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error sending message:', error.response?.data || error.message);
      throw error;
    }
  }

  async sendInteractiveMessage(to, question, options) {
    try {
      const response = await axios.post(
        `${this.baseUrl}${config.wasender.endpoints.sendMessage}`,
        {
          sessionId: this.sessionId,
          to: to,
          poll: {
            question: question,
            options: options,
            multiSelect: false
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('✅ Interactive message sent:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error sending interactive message:', error.response?.data || error.message);
      throw error;
    }
  }

  async sendOrderLink(to, orderId) {
    const orderUrl = `${config.frontendUrl}?order=${orderId}`;
    const message = `🛒 *رابط طلبك*\n\nاضغط على الرابط أدناه لمتابعة طلبك:\n\n${orderUrl}\n\n📞 شكراً لتعاملك معنا!`;
    
    return await this.sendTextMessage(to, message);
  }

  async sendWelcomeMessage(to) {
    const welcomeText = `👋 *مرحباً بك في مطعمنا!*\n\nنحن سعداء بخدمتك. اختر أحد الخيارات التالية:`;
    
    await this.sendTextMessage(to, welcomeText);
    
    return await this.sendInteractiveMessage(
      to,
      '📋 *ماذا تريد أن تفعل؟*',
      [
        '1️⃣ عرض المنيو',
        '2️⃣ أوقات العمل',
        '3️⃣ طلب طب',
        '4️⃣ الشكاوى والاستفسارات'
      ]
    );
  }
}

module.exports = new WhatsAppService();
