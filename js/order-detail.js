/**
 * 订单详情页面脚本
 * Order Detail Page Script
 */

// API 基础 URL - 使用 api-config.js 配置或相对路径
const API_BASE_URL = window.API_BASE_URL || window.API_CONFIG?.BOOKING_API || '/api';

// 全局变量
let currentOrder = null;
let orderCode = null;

// 订单状态映射（用于显示和样式）
const ORDER_STATUS = {
    'pending': { text: '確認待ち', class: 'pending', icon: 'fa-clock' },
    'paid': { text: '支払い済み', class: 'paid', icon: 'fa-check-circle' },
    'confirmed': { text: '確認済み', class: 'confirmed', icon: 'fa-check-circle' },
    'cancelled': { text: 'キャンセル済み', class: 'cancelled', icon: 'fa-times-circle' },
    'completed': { text: '完了', class: 'completed', icon: 'fa-flag-checkered' }
};

// 支付状态映射（用于显示和样式）
const PAYMENT_STATUS = {
    'unpaid': { text: '未払い', class: 'unpaid', icon: 'fa-credit-card' },
    'paid': { text: '支払い済み', class: 'paid', icon: 'fa-check-circle' },
    'refunded': { text: '返金済み', class: 'refunded', icon: 'fa-undo' }
};

// 支付方式映射（用于显示）
const PAYMENT_METHODS = {
    'credit_card': 'クレジットカード',
    'wallet': 'ウォレット',
    'points': 'ポイント',
    'bank_transfer': '銀行振込',
    'cash': '現地払い'
};

// 强制移除所有遮罩层的函数
function forceRemoveOverlays() {
    // 移除auth-modal遮罩层
    const authOverlay = document.querySelector('.auth-modal-overlay');
    if (authOverlay) {
        authOverlay.classList.remove('active');
        authOverlay.style.display = 'none';
        authOverlay.style.visibility = 'hidden';
        authOverlay.style.opacity = '0';
    }

    // 移除auth-modal本身
    const authModal = document.querySelector('.auth-modal');
    if (authModal) {
        authModal.classList.remove('active');
        authModal.style.display = 'none';
    }

    // 移除body的auth-modal-open类
    document.body.classList.remove('auth-modal-open');

    // 确保加载屏幕是隐藏的
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
        loadingScreen.style.display = 'none';
        loadingScreen.style.visibility = 'hidden';
        loadingScreen.style.opacity = '0';
    }

    // 确保内容区域是显示的
    const contentArea = document.getElementById('orderDetailContent');
    if (contentArea) {
        contentArea.style.display = 'block';
    }
}

// 立即执行一次（在DOMContentLoaded之前）
forceRemoveOverlays();

// 页面初始化
document.addEventListener('DOMContentLoaded', function() {
    // 再次强制移除遮罩层
    forceRemoveOverlays();

    // 持续监控并移除遮罩层（前3秒）
    let attempts = 0;
    const maxAttempts = 30; // 3秒内，每100ms检查一次
    const overlayMonitor = setInterval(() => {
        forceRemoveOverlays();
        attempts++;
        if (attempts >= maxAttempts) {
            clearInterval(overlayMonitor);
        }
    }, 100);

    // 从URL获取订单代码
    const urlParams = new URLSearchParams(window.location.search);
    orderCode = urlParams.get('code');

    if (!orderCode) {
        showError('订单代码未提供');
        setTimeout(() => {
            window.location.href = 'user-center.html#bookings';
        }, 2000);
        return;
    }

    // 加载订单详情
    loadOrderDetail();

    // 绑定事件监听器
    bindEventListeners();
});

// 在window.load时也执行一次
window.addEventListener('load', function() {
    forceRemoveOverlays();
});

/**
 * 绑定事件监听器
 */
function bindEventListeners() {
    // 打印按钮
    const printBtn = document.getElementById('printBtn');
    if (printBtn) {
        printBtn.addEventListener('click', handlePrint);
    }

    // 发送邮件按钮
    const emailBtn = document.getElementById('emailBtn');
    if (emailBtn) {
        emailBtn.addEventListener('click', handleResendEmail);
    }

    // 取消功能已禁用 - 所有取消相关代码已删除

    // 领收书按钮
    const receiptBtn = document.getElementById('receiptBtn');
    if (receiptBtn) {
        receiptBtn.addEventListener('click', () => generateReceiptPDF());
    }

    // 领收书模态框关闭按钮
    const closeReceiptModal = document.getElementById('closeReceiptModal');
    if (closeReceiptModal) {
        closeReceiptModal.addEventListener('click', () => closeReceiptModalFunc());
    }

    const closeReceiptBtn = document.getElementById('closeReceiptBtn');
    if (closeReceiptBtn) {
        closeReceiptBtn.addEventListener('click', () => closeReceiptModalFunc());
    }

    // 打印领收书按钮
    const printReceiptBtn = document.getElementById('printReceiptBtn');
    if (printReceiptBtn) {
        printReceiptBtn.addEventListener('click', handlePrintReceipt);
    }

    // 点击领收书模态框背景关闭
    const receiptModal = document.getElementById('receiptModal');
    if (receiptModal) {
        receiptModal.addEventListener('click', function(e) {
            if (e.target === receiptModal) {
                closeReceiptModalFunc();
            }
        });
    }
}

/**
 * 加载订单详情
 */
async function loadOrderDetail() {
    try {
        showLoading();

        // 获取用户身份信息
        const userInfo = getUserInfo();

        // 构建请求URL
        let url = window.getApiUrl(`/orders/${orderCode}`);
        const params = new URLSearchParams();

        if (userInfo.userId) {
            params.append('userId', userInfo.userId);
        }
        if (userInfo.email) {
            params.append('userEmail', userInfo.email);
        }

        if (params.toString()) {
            url += `?${params.toString()}`;
        }

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (!response.ok) {
            if (response.status === 401) {
                showError('ログインが必要です');
                setTimeout(() => {
                    window.location.href = 'user-center.html';
                }, 2000);
                return;
            } else if (response.status === 403) {
                showError('この予約を表示する権限がありません');
                setTimeout(() => {
                    window.location.href = 'user-center.html';
                }, 2000);
                return;
            }
            throw new Error(data.message || '订单加载失败');
        }

        if (data.success && data.data) {
            currentOrder = data.data;
            displayOrderDetail(currentOrder);
        } else {
            throw new Error(data.message || '订单数据无效');
        }
    } catch (error) {
        console.error('加载订单详情错误:', error);
        console.error('错误详情:', error.message);
        console.error('错误堆栈:', error.stack);
        showError(`订单详情加载失败: ${error.message || '请稍后重试'}`);
        setTimeout(() => {
            window.location.href = 'user-center.html#bookings';
        }, 3000);
    } finally {
        hideLoading();
    }
}

/**
 * 获取用户信息
 */
function getUserInfo() {
    // 尝试从localStorage或sessionStorage获取用户信息
    let userInfo = {
        userId: null,
        email: null
    };

    try {
        // 使用 safeStorage 获取用户信息
        if (window.safeStorage) {
            const currentUser = window.safeStorage.getItem('currentUser');
            if (currentUser) {
                const user = JSON.parse(currentUser);
                userInfo.userId = user.user_id || user.userId;
                userInfo.email = user.email;
                console.log('从 safeStorage 获取用户信息:', userInfo);
                return userInfo;
            }
        }

        // 备用：检查localStorage（旧版本兼容）
        const localUser = localStorage.getItem('currentUser') || localStorage.getItem('user');
        if (localUser) {
            const user = JSON.parse(localUser);
            userInfo.userId = user.user_id || user.userId;
            userInfo.email = user.email;
            console.log('从 localStorage 获取用户信息:', userInfo);
            return userInfo;
        }

        // 备用：检查sessionStorage（旧版本兼容）
        const sessionUser = sessionStorage.getItem('currentUser') || sessionStorage.getItem('user');
        if (sessionUser) {
            const user = JSON.parse(sessionUser);
            userInfo.userId = user.user_id || user.userId;
            userInfo.email = user.email;
            console.log('从 sessionStorage 获取用户信息:', userInfo);
            return userInfo;
        }

        // 对于游客订单，尝试从订单列表页面传递的email获取
        const urlParams = new URLSearchParams(window.location.search);
        const guestEmail = urlParams.get('email');
        if (guestEmail) {
            userInfo.email = guestEmail;
        }
    } catch (error) {
        console.error('获取用户信息错误:', error);
    }

    return userInfo;
}

/**
 * 显示订单详情
 */
function displayOrderDetail(order) {
    // 订单头部信息
    document.getElementById('orderCode').textContent = order.order_code;
    document.getElementById('createdAt').textContent = formatDateTime(order.created_at);

    // 订单状态 - 使用后端API返回的状态
    console.log('订单数据:', order);

    // 直接使用后端返回的状态（后端已根据订单所在的表正确设置）
    const orderStatus = order.order_status || 'pending';
    const paymentStatus = order.payment_status || 'unpaid';

    console.log('订单状态:', orderStatus);
    console.log('支付状态:', paymentStatus);

    updateOrderStatus(orderStatus);
    updatePaymentStatus(paymentStatus);

    // 预订信息 - 使用数据库返回的房间类型名称
    document.getElementById('roomTypeName').textContent = order.room_type_name || order.room_type_code;
    document.getElementById('checkinDate').textContent = formatDate(order.checkin_date);
    document.getElementById('checkoutDate').textContent = formatDate(order.checkout_date);
    document.getElementById('numNights').textContent = `${order.num_nights}泊`;

    // 客人数量
    let guestText = `大人${order.num_adults}名`;
    if (order.num_children > 0) {
        guestText += `, 子供${order.num_children}名`;
    }
    document.getElementById('numGuests').textContent = guestText;
    document.getElementById('numRooms').textContent = `${order.num_rooms}室`;

    // 附加服务
    displayServices(order);

    // 特殊请求
    if (order.special_requests) {
        document.getElementById('specialRequestsSection').style.display = 'block';
        document.getElementById('specialRequestsText').textContent = order.special_requests;
    }

    // 客人信息
    displayGuestInfo(order);

    // 支付信息
    displayPaymentInfo(order);

    // 根据订单状态禁用某些按钮
    updateActionButtons(order);
}

/**
 * 更新订单状态
 */
function updateOrderStatus(status) {
    const statusBadge = document.getElementById('orderStatusBadge');
    const statusText = document.getElementById('orderStatusText');
    const statusInfo = ORDER_STATUS[status] || ORDER_STATUS['pending'];

    statusBadge.className = `status-badge ${statusInfo.class}`;

    // 更新图标
    const icon = statusBadge.querySelector('i');
    if (icon) {
        icon.className = `fas ${statusInfo.icon}`;
    }

    // 只更新文本内容
    statusText.textContent = statusInfo.text;
}

/**
 * 更新支付状态
 */
function updatePaymentStatus(status) {
    const paymentBadge = document.getElementById('paymentStatusBadge');
    const paymentText = document.getElementById('paymentStatusText');
    const paymentInfo = PAYMENT_STATUS[status] || PAYMENT_STATUS['unpaid'];

    paymentBadge.className = `payment-status-badge ${paymentInfo.class}`;

    // 更新图标
    const icon = paymentBadge.querySelector('i');
    if (icon) {
        icon.className = `fas ${paymentInfo.icon}`;
    }

    // 只更新文本内容
    paymentText.textContent = paymentInfo.text;
}

/**
 * 显示附加服务
 */
function displayServices(order) {
    const servicesList = document.getElementById('servicesList');
    const servicesSection = document.getElementById('servicesSection');
    const services = [];

    if (order.breakfast_selected) {
        services.push({ icon: 'fa-coffee', name: '朝食', price: 1500 });
    }
    if (order.dinner_selected) {
        services.push({ icon: 'fa-utensils', name: '夕食', price: 3000 });
    }
    if (order.private_bath_selected) {
        services.push({ icon: 'fa-bath', name: '貸切風呂', price: 2000 });
    }

    if (services.length > 0) {
        servicesSection.style.display = 'block';
        servicesList.innerHTML = services.map(service => `
            <div class="service-item">
                <i class="fas ${service.icon}"></i>
                <span>${service.name}</span>
                <span class="service-price">¥${formatNumber(service.price)}</span>
            </div>
        `).join('');
    } else {
        servicesSection.style.display = 'none';
    }
}

/**
 * 显示客人信息
 */
function displayGuestInfo(order) {
    // 姓名
    const fullName = `${order.guest_last_name || ''} ${order.guest_first_name || ''}`.trim();
    document.getElementById('guestName').textContent = fullName || 'N/A';

    // 姓名（片假名）
    const kataName = `${order.guest_last_name_katakana || ''} ${order.guest_first_name_katakana || ''}`.trim();
    document.getElementById('guestNameKatakana').textContent = kataName || 'N/A';

    // 邮箱
    document.getElementById('guestEmail').textContent = order.guest_email || 'N/A';

    // 电话
    const phone = order.phone_country_code && order.guest_phone
        ? `${order.phone_country_code} ${order.guest_phone}`
        : order.guest_phone || 'N/A';
    document.getElementById('guestPhone').textContent = phone;

    // 地址
    let address = '';
    if (order.country === 'japan') {
        if (order.postal_code) address += `〒${order.postal_code} `;
        if (order.prefecture) address += order.prefecture;
        if (order.city) address += order.city;
        if (order.address_line) address += order.address_line;
    } else {
        const parts = [order.address_line, order.city, order.prefecture, order.postal_code, order.country]
            .filter(part => part);
        address = parts.join(', ');
    }
    document.getElementById('guestAddress').textContent = address || 'N/A';
}

/**
 * 显示支付信息
 */
function displayPaymentInfo(order) {
    // 直接显示最终金额（final_amount）
    const finalAmount = parseFloat(order.final_amount) || parseFloat(order.total_price) || 0;

    // 显示合计金额
    document.getElementById('totalPriceDisplay').innerHTML = `¥${formatNumber(finalAmount)}<span class="tax-included-text">税込</span>`;
}

/**
 * 更新操作按钮状态
 */
function updateActionButtons(order) {
    const printBtn = document.getElementById('printBtn');
    const receiptBtn = document.getElementById('receiptBtn');
    const emailBtn = document.getElementById('emailBtn');
    const cancelBtn = document.getElementById('cancelBtn');

    // 使用后端返回的订单状态
    const orderStatus = order.order_status || 'pending';
    const paymentStatus = order.payment_status || 'unpaid';

    // 如果订单状态为pending（確認待ち），禁用所有操作按钮
    if (orderStatus === 'pending') {
        const disabledMessage = '予約確認後にご利用いただけます';

        if (printBtn) {
            printBtn.disabled = true;
            printBtn.title = disabledMessage;
        }

        if (receiptBtn) {
            receiptBtn.disabled = true;
            receiptBtn.title = disabledMessage;
        }

        if (emailBtn) {
            emailBtn.disabled = true;
            emailBtn.title = disabledMessage;
        }

        if (cancelBtn) {
            cancelBtn.disabled = true;
            cancelBtn.title = disabledMessage;
        }

        return; // 早期返回，不执行后续逻辑
    }

    // 如果订单已取消（cancelled），禁用所有操作按钮
    if (orderStatus === 'cancelled') {
        const disabledMessage = 'キャンセル済みの予約は操作できません';

        if (printBtn) {
            printBtn.disabled = true;
            printBtn.title = disabledMessage;
        }

        if (receiptBtn) {
            receiptBtn.disabled = true;
            receiptBtn.title = disabledMessage;
        }

        if (emailBtn) {
            emailBtn.disabled = true;
            emailBtn.title = disabledMessage;
        }

        if (cancelBtn) {
            cancelBtn.disabled = true;
            cancelBtn.innerHTML = '<i class="fas fa-ban"></i><span>キャンセル済み</span>';
            cancelBtn.title = '';
        }

        return; // 早期返回，不执行后续逻辑
    }

    // 如果订单已完成，禁用取消按钮
    if (orderStatus === 'completed') {
        if (cancelBtn) cancelBtn.disabled = true;
    }

    // 领收书按钮：只有已支付的订单才能发行领收书
    if (receiptBtn) {
        if (order.payment_status !== 'paid') {
            receiptBtn.disabled = true;
            receiptBtn.title = 'お支払い完了後に領収書を発行できます';
        } else {
            receiptBtn.disabled = false;
            receiptBtn.title = '';
        }
    }
}

/**
 * 处理打印 - 跳转到预约确认书页面
 */
function handlePrint() {
    if (!currentOrder) {
        alert('訂単データが読み込まれていません');
        return;
    }

    // 跳转到预约确认书页面
    window.open(`booking-confirmation.html?code=${currentOrder.order_code}`, '_blank');
}

/**
 * 处理重新发送邮件
 */
async function handleResendEmail() {
    try {
        const btn = document.getElementById('emailBtn');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>送信中...</span>';

        // 获取用户信息
        const userInfo = getUserInfo();

        const response = await fetch(window.getApiUrl(`/orders/${orderCode}/resend-email`), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(userInfo.userId && { 'x-user-id': userInfo.userId }),
                ...(userInfo.email && { 'x-user-email': userInfo.email })
            }
        });

        const data = await response.json();

        if (response.status === 403) {
            alert('この予約のメールを再送信する権限がありません');
            return;
        }

        if (data.success) {
            alert('確認メールを再送信しました');
        } else {
            throw new Error(data.message || 'メール送信に失敗しました');
        }
    } catch (error) {
        console.error('邮件发送错误:', error);
        alert('メールの送信に失敗しました。後でもう一度お試しください。');
    } finally {
        const btn = document.getElementById('emailBtn');
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-envelope"></i><span>確認メールを再送信</span>';
    }
}

// 取消功能已禁用 - openCancelModal, closeCancelModalFunc, handleCancelOrder 函数已删除

/**
 * 获取认证令牌
 */
function getAuthToken() {
    return localStorage.getItem('authToken') || sessionStorage.getItem('authToken') || '';
}

/**
 * 格式化日期时间
 */
function formatDateTime(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}/${month}/${day} ${hours}:${minutes}`;
}

/**
 * 格式化日期
 */
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    // 获取星期几
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    const weekday = weekdays[date.getDay()];

    return `${year}/${month}/${day} (${weekday})`;
}

/**
 * 格式化数字（添加千位分隔符）
 */
function formatNumber(number) {
    return new Intl.NumberFormat('ja-JP').format(number);
}

/**
 * 打开领收书模态框
 */
function openReceiptModal() {
    if (!currentOrder) {
        alert('订单数据未加载');
        return;
    }

    // 只有已支付的订单才能发行领收书
    if (currentOrder.payment_status !== 'paid') {
        alert('お支払いが完了していないため、領収書を発行できません。');
        return;
    }

    // 填充领收书数据
    fillReceiptData(currentOrder);

    // 显示模态框
    const modal = document.getElementById('receiptModal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

/**
 * 关闭领收书模态框
 */
function closeReceiptModalFunc() {
    const modal = document.getElementById('receiptModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

/**
 * 生成领收书PDF
 */
async function generateReceiptPDF() {
    if (!currentOrder) {
        alert('订单数据未加载');
        return;
    }

    // 只有已支付的订单才能发行领收书
    if (currentOrder.payment_status !== 'paid') {
        alert('お支払いが完了していないため、領収書を発行できません。');
        return;
    }

    try {
        // 禁用按钮并显示加载状态
        const btn = document.getElementById('receiptBtn');
        const originalHTML = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>PDF生成中...</span>';

        // 填充领收书数据
        fillReceiptData(currentOrder);

        // 获取领收书容器
        const receiptContainer = document.getElementById('receiptContainer');

        // 配置pdf选项
        const opt = {
            margin: [5, 5, 5, 5], // 减小边距 [top, left, bottom, right]
            filename: `領収書_${currentOrder.order_code}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: {
                scale: 1.5, // 降低缩放以适配单页
                useCORS: true,
                letterRendering: true
            },
            jsPDF: {
                unit: 'mm',
                format: 'a4',
                orientation: 'landscape' // 横向以适配设计
            },
            pagebreak: { mode: 'avoid-all' } // 避免分页
        };

        // 生成PDF并在新窗口打开
        const pdfBlob = await html2pdf().set(opt).from(receiptContainer).output('blob');
        const pdfUrl = URL.createObjectURL(pdfBlob);
        window.open(pdfUrl, '_blank');

        // 恢复按钮状态
        btn.disabled = false;
        btn.innerHTML = originalHTML;
    } catch (error) {
        console.error('PDF生成错误:', error);
        alert('PDFの生成に失敗しました。後でもう一度お試しください。');

        // 恢复按钮状态
        const btn = document.getElementById('receiptBtn');
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-file-invoice"></i><span>領収書を発行</span>';
    }
}

/**
 * 填充领收书数据
 */
function fillReceiptData(order) {
    // 生成收据编号（使用订单创建日期和订单ID）
    const orderDate = new Date(order.created_at);
    const receiptNumber = `${orderDate.getFullYear()}-${String(order.order_id).padStart(4, '0')}`;
    document.getElementById('receiptNumber').textContent = receiptNumber;

    // 收款人姓名
    const recipientName = `${order.guest_last_name || ''} ${order.guest_first_name || ''}`.trim();
    document.getElementById('receiptRecipientName').textContent = recipientName || 'お客様';

    // 金额
    document.getElementById('receiptAmount').textContent = formatNumber(order.total_price);

    // 计算消费税（10%）
    const totalPrice = parseFloat(order.total_price);
    const tax = totalPrice - Math.round(totalPrice / 1.1); // 反算消费税：含税价格 - 税前价格
    document.getElementById('receiptTax').textContent = formatNumber(tax);

    // 显示收入印纸（50,000円以上）
    const revenueStampBox = document.getElementById('revenueStampBox');
    if (totalPrice >= 50000) {
        revenueStampBox.style.display = 'flex';
    }

    // 宿泊日期
    const checkinDate = new Date(order.checkin_date);
    const checkoutDate = new Date(order.checkout_date);
    document.getElementById('receiptCheckinDate').textContent = formatJapaneseDate(checkinDate);
    document.getElementById('receiptCheckoutDate').textContent = formatJapaneseDate(checkoutDate);
    document.getElementById('receiptNights').textContent = order.num_nights;

    // 客室タイプ - 使用数据库返回的房间类型名称
    const roomTypeName = order.room_type_name || order.room_type_code;
    document.getElementById('receiptRoomType').textContent = roomTypeName;

    // 予約番号
    document.getElementById('receiptOrderCode').textContent = order.order_code;

    // 宿泊料金
    const roomTotal = order.room_price * order.num_nights * order.num_rooms;
    document.getElementById('receiptRoomPrice').textContent = formatNumber(roomTotal);

    // サービス料
    const serviceCost = parseFloat(order.service_cost) || 0;
    if (serviceCost > 0) {
        document.getElementById('receiptServiceRow').style.display = 'table-row';
        document.getElementById('receiptServiceCost').textContent = formatNumber(serviceCost);
    }

    // 发行日期（今天）
    const today = new Date();
    document.getElementById('receiptIssueDate').textContent = formatJapaneseDate(today);
}

/**
 * 格式化日本日期（yyyy年mm月dd日）
 */
function formatJapaneseDate(date) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${year}年${month}月${day}日`;
}

/**
 * 打印领收书
 */
function handlePrintReceipt() {
    window.print();
}

/**
 * 显示加载中
 */
function showLoading() {
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
        loadingScreen.style.display = 'flex';
        loadingScreen.style.visibility = 'visible';
        loadingScreen.style.opacity = '1';
    }
}

/**
 * 隐藏加载中
 */
function hideLoading() {
    const loadingScreen = document.getElementById('loadingScreen');
    const contentArea = document.getElementById('orderDetailContent');

    if (loadingScreen) {
        loadingScreen.style.opacity = '0';
        setTimeout(() => {
            loadingScreen.style.display = 'none';
            loadingScreen.style.visibility = 'hidden';
        }, 300);
    }

    if (contentArea) {
        contentArea.style.display = 'block';
    }
}

/**
 * 显示错误信息
 */
function showError(message) {
    hideLoading();
    alert(message);
}

// 打印样式已在CSS文件中定义
