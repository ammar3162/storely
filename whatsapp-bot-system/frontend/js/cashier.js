// API Base URL
const API_URL = '/api/orders';

// Auto refresh interval
let refreshInterval;

// Load orders on page load
document.addEventListener('DOMContentLoaded', () => {
    loadOrders();
    setupAutoRefresh();
    setupModalClose();
});

// Load all orders
async function loadOrders() {
    try {
        const response = await fetch(API_URL);
        const orders = await response.json();
        
        displayOrders(orders);
        updateStats(orders);
        
        console.log('✅ Orders loaded:', orders.length);
    } catch (error) {
        console.error('❌ Error loading orders:', error);
        showError('خطأ في تحميل الطلبات');
    }
}

// Display orders in the list
function displayOrders(orders) {
    const ordersList = document.getElementById('ordersList');
    
    if (orders.length === 0) {
        ordersList.innerHTML = '<p class="no-orders">لا توجد طلبات حالياً...</p>';
        return;
    }
    
    ordersList.innerHTML = orders.map(order => createOrderCard(order)).join('');
    
    // Add event listeners to buttons
    document.querySelectorAll('.btn-receive').forEach(btn => {
        btn.addEventListener('click', (e) => updateOrderStatus(e.target.dataset.orderId, 'received'));
    });
    
    document.querySelectorAll('.btn-ready').forEach(btn => {
        btn.addEventListener('click', (e) => updateOrderStatus(e.target.dataset.orderId, 'ready'));
    });
    
    document.querySelectorAll('.btn-deliver').forEach(btn => {
        btn.addEventListener('click', (e) => updateOrderStatus(e.target.dataset.orderId, 'delivered'));
    });
}

// Create order card HTML
function createOrderCard(order) {
    const statusClass = `status-${order.status}`;
    const statusText = getStatusText(order.status);
    const timeAgo = getTimeAgo(new Date(order.created_at));
    
    return `
        <div class="order-card" id="order-${order.id}">
            <div class="order-header">
                <span class="order-id">🔢 #${order.id.substring(0, 8)}</span>
                <span class="order-status ${statusClass}">${statusText}</span>
            </div>
            
            <div class="order-info">
                <div class="info-item">
                    <span class="info-label">👤 اسم العميل</span>
                    <span class="info-value">${order.customer_name || 'غير محدد'}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">📱 رقم الجوال</span>
                    <span class="info-value">${maskPhone(order.customer_phone)}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">⏰ وقت الطلب</span>
                    <span class="info-value">${timeAgo}</span>
                </div>
            </div>
            
            <div class="order-details-text">
                <strong>📋 تفاصيل الطلب:</strong><br>
                ${order.order_details}
            </div>
            
            <div class="order-actions">
                ${order.status === 'pending' ? `
                    <button class="btn btn-receive" data-order-id="${order.id}">
                        ✅ تم استلام الطب
                    </button>
                ` : ''}
                
                ${order.status === 'received' ? `
                    <button class="btn btn-ready" data-order-id="${order.id}">
                        🎉 الطلب جاهز
                    </button>
                ` : ''}
                
                ${order.status === 'ready' ? `
                    <button class="btn btn-deliver" data-order-id="${order.id}">
                        🚚 تم التسليم
                    </button>
                ` : ''}
            </div>
        </div>
    `;
}

// Get status text in Arabic
function getStatusText(status) {
    const statusMap = {
        'pending': '⏳ قيد الانتظار',
        'received': '✅ تم الاستلام',
        'ready': '🎉 جاهز للتسليم',
        'delivered': '✅ تم التسليم'
    };
    return statusMap[status] || status;
}

// Update order status
async function updateOrderStatus(orderId, newStatus) {
    if (!confirm(`هل تريد تغيير حالة الطلب إلى: "${getStatusText(newStatus)}"؟`)) {
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/${orderId}/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: newStatus })
        });
        
        if (response.ok) {
            console.log(`✅ Order ${orderId} updated to ${newStatus}`);
            
            // Show success message
            showSuccess(`تم تحديث حالة الطلب بنجاح!`);
            
            // Reload orders after a short delay
            setTimeout(() => loadOrders(), 500);
        } else {
            throw new Error('Failed to update order');
        }
    } catch (error) {
        console.error('❌ Error updating order:', error);
        showError('خطأ في تحديث حالة الطلب');
    }
}

// Update statistics
function updateStats(orders) {
    const pending = orders.filter(o => o.status === 'pending').length;
    const received = orders.filter(o => o.status === 'received').length;
    const ready = orders.filter(o => o.status === 'ready').length;
    
    animateNumber('pendingCount', pending);
    animateNumber('receivedCount', received);
    animateNumber('readyCount', ready);
}

// Animate number change
function animateNumber(elementId, targetValue) {
    const element = document.getElementById(elementId);
    const currentValue = parseInt(element.textContent) || 0;
    
    if (currentValue === targetValue) return;
    
    const duration = 300;
    const steps = 20;
    const increment = (targetValue - currentValue) / steps;
    let step = 0;
    
    const timer = setInterval(() => {
        step++;
        element.textContent = Math.round(currentValue + (increment * step));
        
        if (step >= steps) {
            clearInterval(timer);
            element.textContent = targetValue;
        }
    }, duration / steps);
}

// Setup auto refresh
function setupAutoRefresh() {
    const autoRefreshCheckbox = document.getElementById('autoRefresh');
    
    autoRefreshCheckbox.addEventListener('change', (e) => {
        if (e.target.checked) {
            startAutoRefresh();
        } else {
            stopAutoRefresh();
        }
    });
    
    // Start auto refresh by default
    startAutoRefresh();
}

// Start auto refresh
function startAutoRefresh() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
    refreshInterval = setInterval(loadOrders, 5000); // Refresh every 5 seconds
    console.log('🔄 Auto refresh started');
}

// Stop auto refresh
function stopAutoRefresh() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
        refreshInterval = null;
        console.log('⏹️ Auto refresh stopped');
    }
}

// Setup modal close
function setupModalClose() {
    const modal = document.getElementById('orderModal');
    const span = document.getElementsByClassName('close')[0];
    
    span.onclick = function() {
        modal.style.display = 'none';
    }
    
    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    }
}

// Mask phone number for privacy
function maskPhone(phone) {
    if (!phone || phone.length < 4) return phone;
    return phone.substring(0, 3) + '****' + phone.substring(phone.length - 2);
}

// Get time ago string
function getTimeAgo(date) {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) {
        return 'الآن';
    } else if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        return `منذ ${minutes} دقيقة`;
    } else if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        return `منذ ${hours} ساعة`;
    } else {
        const days = Math.floor(diffInSeconds / 86400);
        return `منذ ${days} يوم`;
    }
}

// Show success notification
function showSuccess(message) {
    showNotification(message, 'success');
}

// Show error notification
function showError(message) {
    showNotification(message, 'error');
}

// Show notification
function showNotification(message, type) {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(n => n.remove());
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Style the notification
    Object.assign(notification.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        padding: '15px 25px',
        borderRadius: '10px',
        color: 'white',
        fontWeight: 'bold',
        zIndex: '9999',
        animation: 'slideIn 0.3s ease',
        boxShadow: '0 5px 15px rgba(0,0,0,0.3)'
    });
    
    if (type === 'success') {
        notification.style.background = '#28a745';
    } else {
        notification.style.background = '#dc3545';
    }
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

console.log('🍽️ Cashier System Loaded Successfully!');
