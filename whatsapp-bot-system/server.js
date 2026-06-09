require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const webhookRoutes = require('./backend/routes/webhook');
const orders = require('./backend/services/orders');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'frontend')));

app.use('/webhook', webhookRoutes);

app.get('/api/orders', (req, res) => {
  const allOrders = orders.getAllOrders();
  res.json(allOrders);
});

app.get('/api/orders/:id', (req, res) => {
  const order = orders.getOrder(req.params.id);
  if (order) {
    res.json(order);
  } else {
    res.status(404).json({ error: 'Order not found' });
  }
});

app.patch('/api/orders/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const updatedOrder = await orders.updateOrderStatus(req.params.id, status);
    res.json(updatedOrder);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/cashier.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'cashier.html'));
});

app.get('/', (req, res) => {
  res.json({
    status: '✅ Server is running',
    time: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`
  🚀 Server running on port ${PORT}
  📡 Webhook: http://localhost:${PORT}/webhook
  💻 Cashier Page: http://localhost:${PORT}/cashier.html
  🔧 API Orders: http://localhost:${PORT}/api/orders
  `);
});
