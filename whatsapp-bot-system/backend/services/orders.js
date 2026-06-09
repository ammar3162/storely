const { v4: uuidv4 } = require('uuid');
const db = require('../database/db');
const whatsapp = require('./whatsapp');

class OrderService {
  createOrder(customerPhone, customerName, orderDetails) {
    const orderId = uuidv4();
    
    const stmt = db.prepare(`
      INSERT INTO orders (id, customer_phone, customer_name, order_details, status)
      VALUES (?, ?, ?, ?, 'pending')
    `);
    
    stmt.run(orderId, customerPhone, customerName || 'عميل', orderDetails);
    
    console.log(`✅ Order created: ${orderId}`);
    return orderId;
  }

  getOrder(orderId) {
    const stmt = db.prepare('SELECT * FROM orders WHERE id = ?');
    return stmt.get(orderId);
  }

  getAllOrders() {
    const stmt = db.prepare('SELECT * FROM orders ORDER BY created_at DESC');
    return stmt.all();
  }

  async updateOrderStatus(orderId, newStatus) {
    const order = this.getOrder(orderId);
    
    if (!order) {
      throw new Error('Order not found');
    }

    const stmt = db.prepare(`
      UPDATE orders 
      SET status = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `);
    
    stmt.run(newStatus, orderId);

    console.log(`✅ Order ${orderId} updated to: ${newStatus}`);

    await this.sendStatusNotification(order, newStatus);

    return this.getOrder(orderId);
  }

  async sendStatusNotification(order, status) {
    let message = '';

    switch(status) {
      case 'received':
        message = `✅ *تم استلام طلبك!*\n\n🔢 رقم الطلب: ${order.id.substring(0, 8)}\n🍽️ ${order.order_details}\n\n⏳ جاري تحضير طلبك... شكراً لصبرك!`;
        break;
      case 'ready':
        message = `🎉 *طلبك جاهز!*\n\n🔢 رقم الطلب: ${order.id.substring(0, 8)}\n\n🏃 يمكنك القدوم لاستلام طلبك الآن!\n\n📍 نتطلع لرؤيتك!`;
        break;
      case 'delivered':
        message = `😊 *تم تسليم طلبك بنجاح!*\n\n🔢 رقم الطلب: ${order.id.substring(0, 8)}\n\n⭐ نأمل أن يكون طلبك لذيذاً!\n🙏 شكراً لتعاملك معنا!`;
        break;
    }

    if (message) {
      await whatsapp.sendTextMessage(order.customer_phone, message);
    }
  }

  findOrCreateCustomer(phone, name = null) {
    let stmt = db.prepare('SELECT * FROM customers WHERE phone = ?');
    let customer = stmt.get(phone);

    if (!customer) {
      stmt = db.prepare('INSERT INTO customers (phone, name) VALUES (?, ?)');
      stmt.run(phone, name);
      
      stmt = db.prepare('SELECT * FROM customers WHERE phone = ?');
      customer = stmt.get(phone);
    } else if (name && !customer.name) {
      stmt = db.prepare('UPDATE customers SET name = ? WHERE phone = ?');
      stmt.run(name, phone);
      customer.name = name;
    }

    return customer;
  }
}

module.exports = new OrderService();
