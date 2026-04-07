// Reservation Success Page JavaScript
document.addEventListener('DOMContentLoaded', function() {

    // 立即清除所有遮罩层
    function forceRemoveAllOverlays() {
        console.log('预约成功页面：强制清除所有遮罩层...');

        // 移除 auth-modal 相关遮罩
        const authOverlay = document.querySelector('.auth-modal-overlay');
        const authModal = document.querySelector('.auth-modal');
        if (authOverlay) {
            authOverlay.classList.remove('active');
            authOverlay.style.display = 'none';
            console.log('✓ 移除 auth-modal-overlay');
        }
        if (authModal) {
            authModal.classList.remove('active');
            authModal.style.display = 'none';
            console.log('✓ 移除 auth-modal');
        }

        // 移除 body 上可能的类
        document.body.classList.remove('auth-modal-open');
        document.body.classList.remove('modal-open');

        console.log('所有遮罩层已清除');
    }

    // 页面加载时立即清除遮罩
    forceRemoveAllOverlays();

    // 防止用户后退到预约页面（避免重复预约）
    if (window.history && window.history.pushState) {
        // 替换当前历史记录
        window.history.pushState(null, null, window.location.href);

        // 监听后退事件
        window.addEventListener('popstate', function(event) {
            // 阻止后退，提示用户
            window.history.pushState(null, null, window.location.href);

            alert('予約は既に完了しています。\n\n新しい予約をする場合は「新規予約する」ボタンをクリックしてください。');
        });

        console.log('后退防止已启用 - 防止重复预约');
    }

    // 清除预约表单数据，防止重复提交
    try {
        // 清除可能存储的表单数据
        const keysToRemove = ['bookingFormData', 'guestFormData', 'paymentFormData'];
        keysToRemove.forEach(key => {
            if (window.safeStorage) {
                window.safeStorage.removeItem(key);
            }
        });
        console.log('预约表单数据已清除');
    } catch (e) {
        console.warn('清除表单数据失败:', e);
    }

    // Get order code from URL (支持多种参数名)
    function getOrderCodeFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        // 支持多种参数名：orderCode, order_code, order
        return urlParams.get('orderCode') || urlParams.get('order_code') || urlParams.get('order');
    }

    // Get user info for API authentication
    function getUserInfo() {
        let userInfo = { userId: null, email: null };

        try {
            const localUser = window.safeStorage.getItem('currentUser');
            if (localUser) {
                const user = JSON.parse(localUser);
                userInfo.userId = user.user_id || user.userId;
                userInfo.email = user.email;
            }
        } catch (e) {
            console.log('Could not get user info from localStorage');
        }

        return userInfo;
    }

    // Fetch order data from API
    async function fetchOrderData(orderCode) {
        const userInfo = getUserInfo();
        const params = new URLSearchParams();

        if (userInfo.userId) {
            params.append('userId', userInfo.userId);
        }
        if (userInfo.email) {
            params.append('userEmail', userInfo.email);
        }

        const url = window.getApiUrl(`/orders/${orderCode}?${params.toString()}`);

        try {
            const response = await fetch(url);
            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.message || '注文情報の取得に失敗しました');
            }

            return result.data;
        } catch (error) {
            console.error('Error fetching order:', error);
            throw error;
        }
    }

    // Format date in Japanese style
    function formatDateJapanese(dateString) {
        const date = new Date(dateString);
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];

        return `${year}年${month}月${day}日（${dayOfWeek}）`;
    }

    // Map room type codes to display names
    function getRoomTypeDisplay(roomTypeCode) {
        const roomTypeMapping = {
            'twin-semi': 'ツインルーム【セミダブルベッド】',
            'triple-single': 'トリプルルーム【シングルベッド】',
            'japanese-western': '和洋室 6帖和室＋洋室ツイン【シングルベッド】',
            'family-japanese': 'ファミリー和洋室 15帖和洋室＋洋室ツイン【セミダブルベッド】'
        };
        return roomTypeMapping[roomTypeCode] || 'ツインルーム【セミダブルベッド】';
    }

    // Map payment method codes to display names
    function getPaymentMethodDisplay(paymentMethodCode, paymentDetails) {
        // If we have specific payment details, use them
        if (paymentDetails) {
            return paymentDetails;
        }

        const paymentMapping = {
            'onsite': '到店支払い',
            'online': 'オンライン決済'
        };
        return paymentMapping[paymentMethodCode] || '到店支払い';
    }

    // Format guest count
    function formatGuestCount(adults, children) {
        let count = `大人${adults}名`;
        if (children && children !== '0') {
            count += ` 子供${children}名`;
        }
        return count;
    }

    // Populate reservation details with order data
    function populateReservationDetails(order) {
        console.log('Populating page with order data:', order);

        // Set order code
        const reservationNumberElement = document.getElementById('reservationNumber');
        if (reservationNumberElement) {
            reservationNumberElement.textContent = order.order_code;
        }

        // Set guest information
        const guestNameElement = document.getElementById('guestName');
        const guestEmailElement = document.getElementById('guestEmail');
        const guestPhoneElement = document.getElementById('guestPhone');

        if (guestNameElement) {
            const lastName = order.guest_last_name || '';
            const firstName = order.guest_first_name || '';
            guestNameElement.textContent = `${lastName} ${firstName}`.trim();
        }
        if (guestEmailElement) {
            guestEmailElement.textContent = order.guest_email || '-';
        }
        if (guestPhoneElement) {
            guestPhoneElement.textContent = order.guest_phone || '-';
        }

        // Set stay details
        const checkinDateElement = document.getElementById('checkinDate');
        const checkoutDateElement = document.getElementById('checkoutDate');
        const guestCountElement = document.getElementById('guestCount');
        const roomTypeElement = document.getElementById('roomType');

        if (checkinDateElement) {
            checkinDateElement.textContent = formatDateJapanese(order.checkin_date);
        }
        if (checkoutDateElement) {
            checkoutDateElement.textContent = formatDateJapanese(order.checkout_date);
        }
        if (guestCountElement) {
            guestCountElement.textContent = formatGuestCount(order.num_adults, order.num_children);
        }
        if (roomTypeElement) {
            roomTypeElement.textContent = order.room_type_name || order.room_type_code || '-';
        }

        // Set payment method
        const paymentMethodElement = document.getElementById('paymentMethod');
        if (paymentMethodElement) {
            // For temporary orders, payment method depends on payment_status
            if (order.payment_status === 'paid') {
                paymentMethodElement.textContent = 'オンライン決済';
            } else {
                paymentMethodElement.textContent = '到店支払い';
            }
        }

        console.log('Page population completed');
    }

    // Load and display order data
    async function loadOrderData() {
        const orderCode = getOrderCodeFromUrl();
        const urlParams = new URLSearchParams(window.location.search);
        const paymentIntent = urlParams.get('payment_intent');
        const redirectStatus = urlParams.get('redirect_status');

        console.log('=== reservation-success.js 初始化 ===');
        console.log('URL:', window.location.href);
        console.log('Order Code:', orderCode);
        console.log('Payment Intent:', paymentIntent);
        console.log('Redirect Status:', redirectStatus);

        if (!orderCode) {
            console.error('Order code not found in URL');
            // 不要立即跳转，显示错误信息让用户看到
            const reservationNumberElement = document.getElementById('reservationNumber');
            if (reservationNumberElement) {
                reservationNumberElement.textContent = '読み込みエラー';
            }
            alert('予約情報が見つかりません。URLを確認してください。');
            return;
        }

        try {
            // 如果是从 Stripe 支付回调来的（有 payment_intent 参数），先完成订单转移
            if (paymentIntent && redirectStatus === 'succeeded') {
                console.log('检测到支付回调，正在完成订单转移...');
                console.log('Order Code:', orderCode);
                console.log('Payment Intent:', paymentIntent);

                try {
                    const completeResponse = await fetch(window.getApiUrl(`/order-temp/${orderCode}/complete-payment`), {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({ paymentIntentId: paymentIntent })
                    });

                    const completeResult = await completeResponse.json();
                    console.log('订单转移结果:', completeResult);

                    if (!completeResult.success) {
                        // 如果是"订单已存在"的错误，忽略它（可能是用户刷新页面）
                        if (!completeResult.message?.includes('已经转移') && !completeResult.message?.includes('already')) {
                            console.warn('订单转移失败，但继续尝试加载订单:', completeResult.message);
                        }
                    }
                } catch (completeError) {
                    console.error('订单转移请求失败:', completeError);
                    // 继续尝试加载订单（可能已经转移过了）
                }
            }

            // Fetch order from API
            const order = await fetchOrderData(orderCode);

            // Populate page with order data
            populateReservationDetails(order);

        } catch (error) {
            console.error('Error loading order:', error);
            alert('予約情報の読み込みに失敗しました：' + error.message);
        }
    }

    // Initialize page
    loadOrderData();

    // Add animation to success icon
    const successIcon = document.querySelector('.success-icon i');
    if (successIcon) {
        setTimeout(() => {
            successIcon.style.animation = 'bounceIn 0.6s ease-out';
        }, 300);
    }

    // Add CSS animation keyframes
    const style = document.createElement('style');
    style.textContent = `
        @keyframes bounceIn {
            0% {
                transform: scale(0.3);
                opacity: 0;
            }
            50% {
                transform: scale(1.05);
            }
            70% {
                transform: scale(0.9);
            }
            100% {
                transform: scale(1);
                opacity: 1;
            }
        }
    `;
    document.head.appendChild(style);

    console.log('Reservation success page initialized successfully');
});