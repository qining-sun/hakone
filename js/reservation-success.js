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

        const url = window.getApiUrl(`/user-orders/${orderCode}?${params.toString()}`);

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
        const weekdayKeys = ['weekday_sun', 'weekday_mon', 'weekday_tue', 'weekday_wed', 'weekday_thu', 'weekday_fri', 'weekday_sat'];
        const dayOfWeek = window.i18n ? window.i18n.t(weekdayKeys[date.getDay()]) : ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];

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

    // Create TL-Lincoln order (for redirect flow)
    async function createTLLincolnOrder(orderData, paymentIntentId) {
        console.log('📡 创建 TL-Lincoln 订单...');
        console.log('订单数据:', orderData);
        console.log('PaymentIntent ID:', paymentIntentId);

        try {
            // 准备 TL-Lincoln API 请求数据
            const tlLincolnData = {
                checkin: orderData.checkin_date,
                checkout: orderData.checkout_date,
                roomTypeCode: orderData.tl_room_type_code || orderData.room_type_code,
                ratePlanCode: orderData.tl_rate_plan_code || orderData.plan_code,
                rooms: orderData.num_rooms || 1,
                adults: orderData.num_adults || 2,
                children: orderData.num_children || 0,
                childrenPreschool: orderData.num_children_preschool || 0,
                childrenElementary: orderData.num_children_elementary || 0,
                breakfastSelected: orderData.breakfast_selected || false,
                dinnerSelected: orderData.dinner_selected || false,
                planBreakfast: orderData.plan_breakfast || orderData.breakfast || false,
                planDinner: orderData.plan_dinner || orderData.dinner || false,
                guestName: `${orderData.guest_last_name || ''} ${orderData.guest_first_name || ''}`.trim() || 'ゲスト',
                guestNameKana: `${orderData.guest_last_name_katakana || ''} ${orderData.guest_first_name_katakana || ''}`.trim(),
                guestLastName: orderData.guest_last_name || '',
                guestFirstName: orderData.guest_first_name || '',
                guestLastNameKana: orderData.guest_last_name_katakana || '',
                guestFirstNameKana: orderData.guest_first_name_katakana || '',
                guestEmail: orderData.guest_email,
                guestPhone: orderData.guest_phone,
                stripePaymentIntentId: paymentIntentId || null
            };

            console.log('📡 TL-Lincoln API 请求数据:', tlLincolnData);

            const response = await fetch(window.getApiUrl('/tl-lincoln/orders'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json; charset=UTF-8'
                },
                body: JSON.stringify(tlLincolnData)
            });

            const result = await response.json();
            console.log('📡 TL-Lincoln API 响应:', result);

            if (result.success) {
                console.log('✅ TL-Lincoln 订单创建成功');
                // 更新订单数据中的 order_code
                orderData.order_code = result.data.order_code;
                orderData.tl_lincoln_reservation_id = result.data.tl_lincoln_reservation_id;
                orderData.payment_status = 'paid';
                delete orderData.pending_creation;
            } else {
                console.error('❌ TL-Lincoln 订单创建失败:', result.message);
                alert('予約の作成に失敗しました。お手数ですが、カスタマーサポートにお問い合わせください。\n\nエラー: ' + result.message);
            }

            return result;
        } catch (error) {
            console.error('❌ TL-Lincoln API 调用失败:', error);
            alert('予約の作成に失敗しました。お手数ですが、カスタマーサポートにお問い合わせください。\n\nエラー: ' + error.message);
            throw error;
        }
    }

    // Populate reservation details with order data
    function populateReservationDetails(order) {
        console.log('Populating page with order data:', order);
        console.log('order.order_code =', order.order_code, '(type:', typeof order.order_code, ')');

        // Set order code
        const reservationNumberElement = document.getElementById('reservationNumber');
        if (reservationNumberElement) {
            // 使用 order_code，如果为空则尝试从 URL 获取
            const displayCode = order.order_code || getOrderCodeFromUrl() || '-';
            reservationNumberElement.textContent = displayCode;
            console.log('✅ reservationNumber set to:', displayCode);
        } else {
            console.error('❌ #reservationNumber element not found');
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
                paymentMethodElement.textContent = window.i18n ? window.i18n.t('payment_online') : 'オンライン決済';
            } else {
                paymentMethodElement.textContent = window.i18n ? window.i18n.t('payment_onsite') : '到店支払い';
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
        const source = urlParams.get('source'); // 检查是否来自 TL-Lincoln

        console.log('=== reservation-success.js 初始化 ===');
        console.log('URL:', window.location.href);
        console.log('Order Code:', orderCode);
        console.log('Payment Intent:', paymentIntent);
        console.log('Redirect Status:', redirectStatus);
        console.log('Source:', source);

        if (!orderCode) {
            console.error('Order code not found in URL');
            // 不要立即跳转，显示错误信息让用户看到
            const reservationNumberElement = document.getElementById('reservationNumber');
            if (reservationNumberElement) {
                reservationNumberElement.textContent = window.i18n ? window.i18n.t('loading_error') : '読み込みエラー';
            }
            alert('予約情報が見つかりません。URLを確認してください。');
            return;
        }

        try {
            // TL-Lincoln 模式：从 sessionStorage 读取订单数据
            if (source === 'tl-lincoln') {
                console.log('📡 TL-Lincoln mode: 从 sessionStorage 读取订单数据');
                try {
                    const tlOrderDataStr = sessionStorage.getItem('tl_lincoln_order');
                    if (tlOrderDataStr) {
                        const tlOrderData = JSON.parse(tlOrderDataStr);
                        console.log('✅ TL-Lincoln 订单数据:', tlOrderData);

                        // 清除 sessionStorage 中的数据（防止重复使用）
                        sessionStorage.removeItem('tl_lincoln_order');

                        // 如果订单需要创建（从 Stripe 重定向回来的情况）
                        if (tlOrderData.pending_creation) {
                            console.log('📡 TL-Lincoln mode: 订单需要创建，调用 TL-Lincoln API');
                            await createTLLincolnOrder(tlOrderData, paymentIntent);
                        }

                        // 使用 TL-Lincoln 订单数据填充页面
                        populateReservationDetails(tlOrderData);
                        return;
                    } else {
                        console.warn('⚠️ sessionStorage 中没有 TL-Lincoln 订单数据，使用 URL 中的订单号');
                        // sessionStorage 为空时，至少显示 URL 中的订单号
                        const reservationNumberElement = document.getElementById('reservationNumber');
                        if (reservationNumberElement && orderCode) {
                            reservationNumberElement.textContent = orderCode;
                        }
                        return;
                    }
                } catch (e) {
                    console.error('❌ 读取 TL-Lincoln 订单数据失败:', e);
                    // 至少显示 URL 中的订单号
                    const reservationNumberElement = document.getElementById('reservationNumber');
                    if (reservationNumberElement && orderCode) {
                        reservationNumberElement.textContent = orderCode;
                    }
                    return;
                }
            }

            // 支付成功后，主动调用后端 API 完成订单转移和支付捕获
            // 不能依赖 Webhook，因为手动捕获模式下 Webhook 不会触发
            if (paymentIntent && redirectStatus === 'succeeded') {
                console.log('✅ 支付成功，主动调用后端完成订单转移...');
                try {
                    const completeResponse = await fetch(window.getApiUrl(`/order-temp/${orderCode}/complete-payment`), {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        credentials: 'include',
                        body: JSON.stringify({
                            stripePaymentId: paymentIntent
                        })
                    });
                    const completeResult = await completeResponse.json();
                    if (completeResult.success) {
                        console.log('✅ 订单转移成功:', completeResult.data?.orderCode);
                    } else {
                        console.error('❌ 订单转移失败:', completeResult.message);
                        // 如果是"订单已存在"类的错误，可能是 Webhook 已经处理了，继续显示
                        if (!completeResult.message?.includes('已存在') && !completeResult.message?.includes('not found')) {
                            throw new Error(completeResult.message);
                        }
                    }
                } catch (transferError) {
                    console.error('❌ 订单转移 API 调用失败:', transferError);
                    // 不阻塞页面显示，可能 Webhook 已经处理了
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