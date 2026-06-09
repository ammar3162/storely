const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const config = {
  port: process.env.PORT || 3000,
  
  wasender: {
    apiKey: process.env.WASENDER_API_KEY || 'your_api_key_here',
    sessionId: process.env.WASENDER_SESSION_ID || 'your_session_id_here',
    webhookSecret: process.env.WASENDER_WEBHOOK_SECRET || 'your_webhook_secret_here',
    baseUrl: 'https://api.wasenderapi.com',
    endpoints: {
      sendMessage: '/api/send-message',
      sendPoll: '/api/send-message'
    }
  },
  
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000/cashier.html'
};

module.exports = config;
