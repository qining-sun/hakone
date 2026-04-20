// Stripe Payment Integration
// Stripe支付集成

// 使用动态主机名构建API地址，支持通过IP访问
window.API_BASE_URL = window.API_BASE_URL || window.API_CONFIG?.BOOKING_API || '/api';

// 获取支付成功后的回调URL（自动适配开发/生产环境）
// 直接跳转到前端成功页面，订单转移由 Webhook 异步处理
// 使用不带 .html 后缀的 URL，避免服务器 URL 重写导致参数丢失
function getSuccessReturnUrl(orderCode) {
    const origin = window.location.origin;
    return `${origin}/reservation-success.html?orderCode=${orderCode}`;
}

let stripe = null;
let elements = null;
let paymentElement = null;
let cardNumberElement = null;
let cardExpiryElement = null;
let cardCvcElement = null;
let linkElements = null;
let linkPaymentElement = null;
let stripePublishableKey = null;
let clientSecret = null;
let linkClientSecret = null;
let isStripeFormInitialized = false; // 标记是否已初始化支付表单
let isLinkFormInitialized = false; // 标记是否已初始化Link支付表单
let expressCheckoutElement = null; // Express Checkout Element
let expressCheckoutElementsInstance = null; // Express Checkout Elements 实例
let expressCheckoutReady = false; // Express Checkout Element 是否已加载完成
let expressCheckoutReadyResolver = null; // Promise resolver for ready event

// 初始化Stripe
async function initializeStripe() {
    try {
        // 从后端获取Stripe可发布密钥
        const response = await fetch(window.getApiUrl('/stripe/config'));
        const data = await response.json();

        if (data.success) {
            stripePublishableKey = data.data.publishableKey;
            stripe = Stripe(stripePublishableKey);
            console.log('Stripe初始化成功');
            return true;
        } else {
            console.error('获取Stripe配置失败');
            return false;
        }
    } catch (error) {
        console.error('Stripe初始化错误:', error);
        return false;
    }
}

// 创建PaymentIntent并初始化Stripe Elements
async function initializeStripePaymentForm(orderData) {
    try {
        // 如果已经初始化过，先清理
        if (isStripeFormInitialized) {
            console.log('检测到重复初始化，先清理之前的表单...');

            // 卸载已存在的payment element
            if (paymentElement) {
                paymentElement.unmount();
                paymentElement = null;
            }

            // 移除已存在的表单，但保留 payment element 容器
            const existingForm = document.getElementById('stripe-payment-form');
            if (existingForm) {
                // 先将 payment element 容器移出表单
                const paymentContainer = document.getElementById('stripe-payment-element');
                const parentSection = document.getElementById('creditCardSection');
                if (paymentContainer && parentSection) {
                    parentSection.appendChild(paymentContainer);
                }
                // 然后移除表单
                existingForm.remove();
            }

            elements = null;
            isStripeFormInitialized = false;
        }

        console.log('初始化Stripe支付表单...', orderData);

        // 确保 Stripe 已初始化
        if (!stripe) {
            console.log('Stripe 未初始化，正在初始化...');
            await initializeStripe();
        }

        if (!stripe) {
            throw new Error('Stripe の初期化に失敗しました');
        }

        // 验证必填字段
        if (!orderData) {
            throw new Error('订单数据缺失 (orderData is missing)');
        }
        if (!orderData.bookerEmail) {
            throw new Error('预订者邮箱缺失 (bookerEmail is missing)');
        }
        if (!orderData.guestLastName || !orderData.guestFirstName) {
            throw new Error('宿泊者氏名缺失 (guest name is missing)');
        }
        if (!orderData.roomType) {
            throw new Error('房间类型缺失 (roomType is missing)');
        }
        if (!orderData.checkinDate || !orderData.checkoutDate) {
            throw new Error('入住/退房日期缺失 (check-in/out dates are missing)');
        }

        // 计算总金额
        const totalAmount = calculateTotalAmount(orderData);
        console.log('计算的总金额:', totalAmount);

        // 积分全额支付（¥0）：跳过 Stripe，直接完成订单
        if (totalAmount === 0) {
            console.log('💎 检测到 ¥0 支付，跳过 Stripe，直接完成订单');

            // 获取临时订单号
            const tempOrderCode = window.OrderTemp && window.OrderTemp.getTempOrderCode
                ? window.OrderTemp.getTempOrderCode()
                : orderData.orderCode || window.currentTempOrderCode;

            if (!tempOrderCode) {
                throw new Error('注文番号が見つかりません。ページを更新してもう一度お試しください。');
            }

            // 显示加载状态
            const submitBtn = document.getElementById('stripe-submit-btn');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = '処理中...';
            }

            try {
                // 调用后端接口完成订单（不创建 Stripe PaymentIntent）
                const apiUrl = window.getApiUrl(`/order-temp/${tempOrderCode}/complete-payment`);
                console.log('💎 ポイント全額（0円）決済: 注文を確定します。', tempOrderCode);

                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        // 0円の場合は Stripe PaymentIntent を作成しない
                        stripePaymentId: null
                    })
                });

                // 先检查 HTTP 状态码
                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('❌ サーバーエラー:', response.status, errorText);
                    throw new Error(`サーバーエラー: ${response.status} ${response.statusText}`);
                }

                const result = await response.json();

                if (result.success) {
                    console.log('✅ ポイント全额決済完了:', result.data);

                    // 跳转成功页
                    const orderCode = result.data.orderCode;
                    const successUrl = getSuccessReturnUrl(orderCode);
                    console.log('🚀 跳转成功页:', successUrl);
                    window.location.href = successUrl;
                    return;
                } else {
                    throw new Error(result.message || 'ポイントの精算に失敗しました');
                }

            } catch (error) {
                console.error('❌ ポイント決済エラー:', error);
                alert('ポイントの精算に失敗しました: ' + error.message);
                throw error;
            }
        }

        if (!totalAmount || totalAmount < 0) {
            throw new Error('金额计算错误 (Invalid amount calculated): ' + totalAmount);
        }

        // 获取临时订单号（如果存在）
        const tempOrderCode = window.OrderTemp && window.OrderTemp.getTempOrderCode
            ? window.OrderTemp.getTempOrderCode()
            : null;

        console.log('临时订单号:', tempOrderCode);

        // 准备完整支付数据（字段名与数据库保持一致）- Card Payment
        const paymentData = {
            amount: totalAmount,
            currency: 'jpy',
            orderData: {
                // 基本信息 - 优先使用临时订单号
                orderCode: tempOrderCode || orderData.orderCode || generateOrderCode(),
                userId: orderData.userId || null,

                // 预订者姓名
                guestLastName: orderData.guestLastName || '',
                guestFirstName: orderData.guestFirstName || '',
                guestLastNameKatakana: orderData.guestLastNameKatakana || orderData.guestLastNameKana || '',
                guestFirstNameKatakana: orderData.guestFirstNameKatakana || orderData.guestFirstNameKana || '',

                // 联系方式
                bookerEmail: orderData.bookerEmail,
                guestEmail: orderData.bookerEmail,
                guestPhone: orderData.guestPhone || orderData.bookerPhone || '',
                phoneCountryCode: orderData.phoneCountryCode || orderData.phone_country_code || '+81',

                // 地址信息
                country: orderData.country || '',
                postalCode: orderData.postalCode || orderData.postal_code || '',
                prefecture: orderData.prefecture || '',
                city: orderData.city || '',
                addressLine: orderData.addressLine || orderData.address_line || '',

                // 房间信息
                roomType: orderData.roomType,
                roomTypeCode: orderData.roomTypeCode || orderData.room_type_code || '',
                checkinDate: orderData.checkinDate,
                checkoutDate: orderData.checkoutDate,
                numRooms: orderData.numRooms || orderData.num_rooms || 1,
                adults: orderData.adults,
                children: orderData.children || 0,

                // 价格信息
                roomPrice: orderData.roomPrice || 0,

                // 附加服务
                breakfastSelected: orderData.breakfastSelected || orderData.breakfast || false,
                dinnerSelected: orderData.dinnerSelected || orderData.dinner || false,
                privateBathSelected: orderData.privateBathSelected || orderData.privateBath || false,
                serviceCost: orderData.serviceCost || orderData.service_cost || 0,

                // 特殊要求
                specialRequests: orderData.specialRequests || orderData.special_requests || '',

                // 服务详情（用于显示）
                services: orderData.services || []
            }
        };

        console.log('准备发送的支付数据:', JSON.stringify(paymentData, null, 2));

        // 调用后端API创建PaymentIntent
        const response = await fetch(window.getApiUrl('/stripe/create-payment-intent'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(paymentData)
        });

        // 先检查 HTTP 状态码
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ API エラー:', response.status, errorText);
            throw new Error(`サーバーエラー: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.message || 'PaymentIntentの作成に失敗しました');
        }

        clientSecret = result.data.clientSecret;
        console.log('PaymentIntent作成成功');

        // 创建Stripe Elements
        const appearance = {
            theme: 'stripe',
            variables: {
                colorPrimary: '#635BFF',
                colorBackground: '#ffffff',
                colorText: '#333333',
                fontFamily: '"Noto Sans JP", sans-serif',
                borderRadius: '8px'
            }
        };

        // 配置Elements - 使用 clientSecret
        const elementsOptions = {
            clientSecret: clientSecret,
            appearance,
        };

        elements = stripe.elements(elementsOptions);

        // 使用 Payment Element（Stripe 官方样式 - Accordion 布局）
        const paymentElementOptions = {
            layout: {
                type: 'accordion',
                defaultCollapsed: false,  // 默认展开卡片输入字段
                radios: false,            // 不显示单选按钮，允许点击收缩
                spacedAccordionItems: true
            },
            // 显示信用卡和微信支付
            paymentMethodOrder: ['card', 'wechat_pay'],
            // 禁用 Link（避免弹窗提示）
            wallets: {
                link: 'never'
            },
            // 自动填充邮箱
            defaultValues: {
                billingDetails: {
                    email: orderData.bookerEmail || ''
                }
            }
        };

        // 在 Payment Element 容器中显示加载动画
        const paymentContainer = document.getElementById('stripe-payment-element');
        paymentContainer.innerHTML = `
            <div id="payment-loading" style="display: flex; align-items: center; justify-content: center; padding: 40px 20px; background: #f8f9fa; border-radius: 8px;">
                <div style="text-align: center;">
                    <div style="display: inline-block; width: 40px; height: 40px; border: 3px solid #e0e0e0; border-top-color: #635BFF; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                    <p style="margin-top: 15px; color: #666; font-size: 14px;">決済フォームを読み込んでいます...</p>
                </div>
            </div>
            <style>
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            </style>
        `;

        paymentElement = elements.create('payment', paymentElementOptions);

        // 监听 Payment Element 准备完成事件
        paymentElement.on('ready', function() {
            console.log('Payment Element 加载完成');
            const loadingEl = document.getElementById('payment-loading');
            if (loadingEl) {
                loadingEl.remove();
            }
        });

        paymentElement.mount('#stripe-payment-element');

        // 创建表单包装
        const paymentForm = document.createElement('form');
        paymentForm.id = 'stripe-payment-form';

        // paymentContainer 已在上面声明
        paymentContainer.parentNode.insertBefore(paymentForm, paymentContainer);
        paymentForm.appendChild(paymentContainer);

        // 监听表单提交事件
        paymentForm.addEventListener('submit', handleStripePayment);

        // 添加 Stripe 官方风格的提交按钮
        const submitBtn = document.createElement('button');
        submitBtn.type = 'submit';
        submitBtn.id = 'stripe-submit-btn';
        submitBtn.innerHTML = '支払う';
        submitBtn.style.cssText = `
            background-color: #635BFF;
            color: white;
            border: none;
            padding: 12px 24px;
            font-size: 16px;
            font-weight: 600;
            border-radius: 5px;
            cursor: pointer;
            width: 100%;
            margin-top: 16px;
            transition: all 0.2s ease;
            box-shadow: 0 4px 6px rgba(99, 91, 255, 0.25);
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans JP", sans-serif;
        `;
        submitBtn.onmouseover = function() {
            this.style.backgroundColor = '#5851EA';
            this.style.boxShadow = '0 6px 10px rgba(99, 91, 255, 0.35)';
            this.style.transform = 'translateY(-1px)';
        };
        submitBtn.onmouseout = function() {
            this.style.backgroundColor = '#635BFF';
            this.style.boxShadow = '0 4px 6px rgba(99, 91, 255, 0.25)';
            this.style.transform = 'translateY(0)';
        };

        paymentForm.appendChild(submitBtn);

        // 标记为已初始化
        isStripeFormInitialized = true;

        console.log('Stripe Elements初始化完成');

    } catch (error) {
        console.error('Stripe支付表单初始化错误:', error);
        showStripeError('決済フォームの初期化に失敗しました。\n\nエラー: ' + error.message);
        throw error;
    }
}

// 处理Stripe支付确认
async function handleStripePayment(event) {
    try {
        // 阻止表单默认提交
        event.preventDefault();

        console.log('开始处理Stripe支付确认...');

        // 禁用支付按钮，防止重复提交
        const submitBtn = document.getElementById('stripe-submit-btn');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 処理中...';

        // 先提交 Payment Element
        const {error: submitError} = await elements.submit();
        if (submitError) {
            throw submitError;
        }

        // 收集账单信息
        const formData = window.collectFormData ? window.collectFormData() : {};
        const billingDetails = {
            name: `${formData.guestLastName || ''} ${formData.guestFirstName || ''}`.trim() || 'Guest',
            email: formData.bookerEmail || '',
            phone: formData.bookerPhone || '',
            address: {
                country: formData.country || 'JP',
                postal_code: formData.postalCode || '',
                state: formData.prefecture || '',
                city: formData.city || '',
                line1: formData.addressLine || ''
            }
        };

        console.log('传递的账单信息:', billingDetails);

        // 获取临时订单号
        const tempOrderCode = window.OrderTemp && window.OrderTemp.getTempOrderCode
            ? window.OrderTemp.getTempOrderCode()
            : (window.currentTempOrderData?.order_code || window.bookingOrderCode || '');

        // 使用 Payment Element 确认支付
        // 使用 redirect: 'if_required'，只有需要额外验证（如3D Secure）时才重定向
        // 这样可以在前端处理订单转移和支付捕获
        const { error, paymentIntent } = await stripe.confirmPayment({
            elements,
            confirmParams: {
                return_url: getSuccessReturnUrl(tempOrderCode),
                payment_method_data: {
                    billing_details: billingDetails
                }
            },
            redirect: 'if_required'
        });

        if (error) {
            // 支付失败，显示错误信息
            showStripeError(error.message);
            submitBtn.disabled = false;
            submitBtn.innerHTML = '支払う';
        } else if (paymentIntent) {
            console.log('PaymentIntent状态:', paymentIntent.status);
            console.log('PaymentIntent:', paymentIntent);

            // 检查是否需要显示二维码
            if (paymentIntent.status === 'requires_action' && paymentIntent.next_action) {
                const nextAction = paymentIntent.next_action;
                console.log('Next action:', nextAction);

                // 处理微信支付二维码（已禁用，使用专用的QR支付流程）
                if (nextAction.type === 'wechat_pay_display_qr_code') {
                    console.log('检测到微信支付二维码，但应使用proceedWithStripeQRPayment处理');
                    // 不在这里显示二维码，应该在proceedWithStripeQRPayment中处理
                }
                else {
                    // 其他需要action的情况，让Stripe自动处理
                    console.log('使用Stripe自动处理action');
                    await stripe.handleNextAction({clientSecret: paymentIntent.client_secret});
                }
            }
            // 支付成功（自动捕获模式）或授权成功（手动捕获模式）
            else if (paymentIntent.status === 'succeeded' || paymentIntent.status === 'requires_capture') {
                const isManualCapture = paymentIntent.status === 'requires_capture';
                console.log(isManualCapture ? '💳 授权成功（手动捕获模式），准备转移订单并捕获支付...' : '支付成功！准备创建订单...');
                try {
                    // 保存 PaymentIntent ID 用于可能的退款和订单记录
                    window.lastPaymentIntentId = paymentIntent.id;
                    console.log('✓ 已保存 PaymentIntent ID:', window.lastPaymentIntentId);
                    console.log('PaymentIntent 完整信息:', paymentIntent);

                    // 创建订单（如果还未创建）- 后端会处理支付捕获
                    await createOrderAfterPayment(paymentIntent);

                    // 验证订单号是否已设置
                    if (!window.bookingOrderCode) {
                        throw new Error('订单创建成功但订单号未设置');
                    }

                    // 显示处理中状态并开始轮询订单状态
                    showProcessingStatus();
                    await waitForOrderConfirmation(window.bookingOrderCode);
                } catch (orderError) {
                    console.error('订单创建失败:', orderError);
                    alert('決済は成功しましたが、予約の作成に失敗しました。\n\nお手数ですが、カスタマーサポートにお問い合わせください。\n\nエラー: ' + orderError.message);
                    // 不跳转到成功页面
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '支払う';
                }
            }
            // 支付处理中
            else if (paymentIntent.status === 'processing') {
                console.log('支付处理中...');
                // 可以显示处理中的提示
                alert('決済を処理しています。しばらくお待ちください。');
            }
        }

    } catch (error) {
        console.error('Payment Error:', error);
        alert(error.message);

        // 关键：出错时务必恢复按钮！
        const submitBtn = document.getElementById('stripe-submit-btn');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '支払う';
        }
    }
}

// 在Payment Element区域内显示二维码
function showQRCodeInline(qrCodeUrl, paymentName, paymentIntentId) {
    // 获取支付表单容器
    const paymentForm = document.getElementById('stripe-payment-form');
    if (!paymentForm) return;

    // 隐藏Payment Element
    const paymentElement = document.getElementById('stripe-payment-element');
    if (paymentElement) {
        paymentElement.style.display = 'none';
    }

    // 隐藏Pay按钮
    const submitBtn = document.getElementById('stripe-submit-btn');
    if (submitBtn) {
        submitBtn.style.display = 'none';
    }

    // 创建二维码显示区域
    const qrContainer = document.createElement('div');
    qrContainer.id = 'wechat-qr-container';
    qrContainer.style.cssText = `
        text-align: center;
        padding: 30px;
        background: #f8f9fa;
        border-radius: 12px;
        margin: 20px 0;
    `;

    qrContainer.innerHTML = `
        <h3 style="margin: 0 0 10px 0; color: #333; font-size: 20px;">
            <svg style="width: 24px; height: 24px; vertical-align: middle; margin-right: 8px;" viewBox="0 0 24 24" fill="#09BB07">
                <path d="M8.5 2C5.46 2 3 4.46 3 7.5c0 2.39 1.52 4.41 3.64 5.15l-.34 2.34 2.39-1.4c.44.08.9.13 1.38.13 3.04 0 5.5-2.46 5.5-5.5S11.54 2 8.5 2zm-.5 7.5c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm2.5 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"/>
                <path d="M15.5 9c-.17 0-.34.01-.51.02C14.99 9.68 15 10.33 15 11c0 2.72-1.49 5.09-3.68 6.34l2.93 1.72-.34-2.34c2.12-.74 3.64-2.76 3.64-5.15 0-3.04-2.46-5.5-5.5-5.5zm-1 7.5c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm3 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"/>
            </svg>
            WeChat Payで支払う
        </h3>
        <p style="color: #666; margin: 10px 0 20px 0; font-size: 14px;">
            WeChat アプリでQRコードをスキャンしてください
        </p>
        <div style="background: white; display: inline-block; padding: 20px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <img src="${qrCodeUrl}" alt="${paymentName} QR Code" style="width: 280px; height: 280px; display: block;">
        </div>
        <p id="qr-timer-inline" style="color: #666; font-size: 14px; margin: 20px 0 10px 0;">
            有効時間: 15:00
        </p>
        <div style="margin-top: 20px;">
            <button id="cancel-qr-payment" style="padding: 12px 24px; background: white; color: #666; border: 1px solid #ddd; border-radius: 6px; cursor: pointer; font-size: 14px; margin-right: 10px;">
                キャンセル
            </button>
            <span style="color: #999; font-size: 13px;">
                支払いを確認中...
                <span style="display: inline-block; animation: spin 1s linear infinite;">⟳</span>
            </span>
        </div>
        <style>
            @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
        </style>
    `;

    // 插入到表单中
    paymentForm.appendChild(qrContainer);

    // 取消按钮功能
    document.getElementById('cancel-qr-payment').addEventListener('click', () => {
        // 移除二维码区域
        qrContainer.remove();

        // 恢复Payment Element
        if (paymentElement) {
            paymentElement.style.display = 'block';
        }

        // 恢复Pay按钮
        if (submitBtn) {
            submitBtn.style.display = 'block';
        }

        // 停止轮询
        if (window.qrPaymentPollInterval) {
            clearInterval(window.qrPaymentPollInterval);
        }
        if (window.qrTimerInterval) {
            clearInterval(window.qrTimerInterval);
        }
    });

    // 启动倒计时
    let timeLeft = 15 * 60; // 15分钟
    const timerElement = document.getElementById('qr-timer-inline');
    window.qrTimerInterval = setInterval(() => {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        timerElement.textContent = `有効時間: ${minutes}:${seconds.toString().padStart(2, '0')}`;

        if (timeLeft <= 0) {
            clearInterval(window.qrTimerInterval);
            timerElement.textContent = window.i18n ? window.i18n.t('timer_expired') : '有効期限が切れました';
            timerElement.style.color = '#dc3545';
        }

        timeLeft--;
    }, 1000);

    // 开始轮询支付状态
    startPaymentPolling(paymentIntentId);
}

// 轮询支付状态
function startPaymentPolling(paymentIntentId) {
    let pollCount = 0;
    const maxPolls = 300; // 15分钟

    window.qrPaymentPollInterval = setInterval(async () => {
        pollCount++;
        console.log(`轮询支付状态 ${pollCount}/${maxPolls}`);

        try {
            const response = await fetch(window.getApiUrl(`/stripe/payment-intent/${paymentIntentId}`));
            const result = await response.json();

            if (result.success && result.data.status === 'succeeded') {
                console.log('支付成功！准备创建订单...');
                clearInterval(window.qrPaymentPollInterval);
                if (window.qrTimerInterval) {
                    clearInterval(window.qrTimerInterval);
                }

                // 保存 PaymentIntent ID 用于可能的退款和订单记录
                window.lastPaymentIntentId = paymentIntentId;
                console.log('✓ 已保存 PaymentIntent ID (QR轮询):', window.lastPaymentIntentId);

                // 创建订单（如果还未创建）
                await createOrderAfterPayment(result.data);

                // 跳转到成功页面（带订单号）
                const successUrl = window.isTLLincolnOrder
                    ? `reservation-success.html?orderCode=${window.bookingOrderCode}&source=tl-lincoln`
                    : `reservation-success.html?orderCode=${window.bookingOrderCode}`;
                window.location.href = successUrl;
            }
        } catch (error) {
            console.error('轮询错误:', error);
        }

        // 超时
        if (pollCount >= maxPolls) {
            clearInterval(window.qrPaymentPollInterval);
            if (window.qrTimerInterval) {
                clearInterval(window.qrTimerInterval);
            }
            alert('QRコードの有効期限が切れました。');
        }
    }, 3000); // 每3秒检查一次
}

// 显示Stripe错误信息
function showStripeError(message) {
    const errorDiv = document.getElementById('stripe-payment-errors');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';

    // 5秒后自动隐藏错误信息
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 5000);
}

// 初始化Link支付表单
async function initializeLinkPaymentForm(orderData) {
    try {
        // 如果已经初始化过，先清理
        if (isLinkFormInitialized) {
            console.log('检测到Link表单重复初始化，先清理...');
            if (linkPaymentElement) {
                linkPaymentElement.unmount();
                linkPaymentElement = null;
            }
            const existingForm = document.getElementById('link-payment-form');
            if (existingForm) {
                existingForm.remove();
            }
            linkElements = null;
            isLinkFormInitialized = false;
        }

        console.log('初始化Link支付表单...', orderData);

        // 验证必填字段
        if (!orderData) {
            throw new Error('订单数据缺失');
        }
        if (!orderData.bookerEmail) {
            throw new Error('预订者邮箱缺失');
        }

        // 使用 final_amount（已扣除积分的最终金额），如果没有则用 totalPrice（注意：0 也是有效金额）
        const rawAmount = (orderData.final_amount ?? orderData.totalPrice);
        const totalAmount = Math.round(parseFloat(rawAmount ?? calculateTotalAmount(orderData)));
        console.log('💰 Link支付金额:', totalAmount, '(final_amount:', orderData.final_amount, ', totalPrice:', orderData.totalPrice, ')');

        if (!totalAmount || totalAmount <= 0) {
            throw new Error('金额计算错误: ' + totalAmount);
        }

        // 准备完整支付数据（字段名与数据库保持一致）- Link Payment
        const paymentData = {
            amount: totalAmount,
            currency: 'jpy',
            orderData: {
                // 基本信息 - 使用已创建的临时订单号
                orderCode: orderData.orderCode,
                userId: orderData.userId || null,

                // 预订者姓名
                guestLastName: orderData.guestLastName || '',
                guestFirstName: orderData.guestFirstName || '',
                guestLastNameKatakana: orderData.guestLastNameKatakana || orderData.guestLastNameKana || '',
                guestFirstNameKatakana: orderData.guestFirstNameKatakana || orderData.guestFirstNameKana || '',

                // 联系方式
                bookerEmail: orderData.bookerEmail,
                guestEmail: orderData.bookerEmail,
                guestPhone: orderData.guestPhone || orderData.bookerPhone || '',
                phoneCountryCode: orderData.phoneCountryCode || orderData.phone_country_code || '+81',

                // 地址信息
                country: orderData.country || '',
                postalCode: orderData.postalCode || orderData.postal_code || '',
                prefecture: orderData.prefecture || '',
                city: orderData.city || '',
                addressLine: orderData.addressLine || orderData.address_line || '',

                // 房间信息
                roomType: orderData.roomType,
                roomTypeCode: orderData.roomTypeCode || orderData.room_type_code || '',
                checkinDate: orderData.checkinDate,
                checkoutDate: orderData.checkoutDate,
                numRooms: orderData.numRooms || orderData.num_rooms || 1,
                adults: orderData.adults,
                children: orderData.children || 0,

                // 价格信息
                roomPrice: orderData.roomPrice || 0,

                // 附加服务
                breakfastSelected: orderData.breakfastSelected || orderData.breakfast || false,
                dinnerSelected: orderData.dinnerSelected || orderData.dinner || false,
                privateBathSelected: orderData.privateBathSelected || orderData.privateBath || false,
                serviceCost: orderData.serviceCost || orderData.service_cost || 0,

                // 特殊要求
                specialRequests: orderData.specialRequests || orderData.special_requests || '',

                // 服务详情（用于显示）
                services: orderData.services || []
            }
        };

        console.log('准备发送的Link支付数据:', JSON.stringify(paymentData, null, 2));

        // 调用后端API创建PaymentIntent
        const response = await fetch(window.getApiUrl('/stripe/create-payment-intent'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(paymentData)
        });

        // 先检查 HTTP 状态码
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ API エラー:', response.status, errorText);
            throw new Error(`サーバーエラー: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.message || 'PaymentIntentの作成に失敗しました');
        }

        linkClientSecret = result.data.clientSecret;
        console.log('Link PaymentIntent作成成功');

        // 创建Link Payment Element，启用Link功能
        const appearance = {
            theme: 'stripe',
            variables: {
                colorPrimary: '#00D924',
                colorBackground: '#ffffff',
                colorText: '#333333',
                fontFamily: '"Noto Sans JP", sans-serif',
                borderRadius: '8px'
            }
        };

        // 配置Elements - 使用clientSecret，启用Link
        const elementsOptions = {
            clientSecret: linkClientSecret,
            appearance,
        };

        linkElements = stripe.elements(elementsOptions);

        // 使用Payment Element，配置为启用Link
        const linkPaymentElementOptions = {
            layout: {
                type: 'tabs',
                defaultCollapsed: false,
            },
            // 优先显示Link
            paymentMethodOrder: ['link', 'card'],
            // 自动填充邮箱，帮助Link识别用户
            defaultValues: {
                billingDetails: {
                    email: orderData.bookerEmail
                }
            }
        };

        linkPaymentElement = linkElements.create('payment', linkPaymentElementOptions);
        linkPaymentElement.mount('#link-payment-element');

        // 创建Link支付表单
        const paymentForm = document.createElement('form');
        paymentForm.id = 'link-payment-form';

        const paymentContainer = document.getElementById('link-payment-element');
        paymentContainer.parentNode.insertBefore(paymentForm, paymentContainer);
        paymentForm.appendChild(paymentContainer);

        // 监听表单提交事件
        paymentForm.addEventListener('submit', handleLinkPayment);

        // 添加提交按钮
        const submitBtn = document.createElement('button');
        submitBtn.type = 'submit';
        submitBtn.id = 'link-submit-btn';
        submitBtn.textContent = 'Pay with Link';
        submitBtn.style.cssText = `
            background-color: #00D924;
            color: white;
            border: none;
            padding: 12px 24px;
            font-size: 16px;
            font-weight: 600;
            border-radius: 6px;
            cursor: pointer;
            width: 100%;
            margin-top: 20px;
            transition: background-color 0.2s;
        `;
        submitBtn.onmouseover = function() { this.style.backgroundColor = '#00B81E'; };
        submitBtn.onmouseout = function() { this.style.backgroundColor = '#00D924'; };

        paymentForm.appendChild(submitBtn);

        // 标记为已初始化
        isLinkFormInitialized = true;

        console.log('Link Payment Element初始化完成');

    } catch (error) {
        console.error('Link支付表单初始化错误:', error);
        showLinkError('Link決済フォームの初期化に失敗しました。\n\nエラー: ' + error.message);
        throw error;
    }
}

// 处理Link支付确认
async function handleLinkPayment(event) {
    try {
        event.preventDefault();

        console.log('开始处理Link支付确认...');

        // 禁用支付按钮，防止重复提交
        const submitBtn = document.getElementById('link-submit-btn');
        submitBtn.disabled = true;
        submitBtn.style.opacity = '0.7';
        submitBtn.style.cursor = 'wait';
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin" style="margin-right: 8px;"></i> 処理中...';

        // 先提交Payment Element
        const {error: submitError} = await linkElements.submit();
        if (submitError) {
            throw submitError;
        }

        // 收集账单信息
        const formData = window.collectFormData ? window.collectFormData() : {};
        const billingDetails = {
            name: `${formData.guestLastName || ''} ${formData.guestFirstName || ''}`.trim() || 'Guest',
            email: formData.bookerEmail || '',
            phone: formData.bookerPhone || '',
            address: {
                country: formData.country || 'JP',
                postal_code: formData.postalCode || '',
                state: formData.prefecture || '',
                city: formData.city || '',
                line1: formData.addressLine || ''
            }
        };

        console.log('传递的账单信息:', billingDetails);

        // 获取当前订单号
        const currentOrderCode = window.currentTempOrderData?.order_code || window.bookingOrderCode || '';

        // 使用Payment Element确认支付
        const { error, paymentIntent } = await stripe.confirmPayment({
            elements: linkElements,
            confirmParams: {
                return_url: getSuccessReturnUrl(currentOrderCode),
                payment_method_data: {
                    billing_details: billingDetails
                }
            },
            redirect: 'always'
        });

        if (error) {
            // 支付失败，显示错误信息
            showLinkError(error.message);
            // 保持转圈状态，不恢复按钮
        } else if (paymentIntent) {
            console.log('PaymentIntent状态:', paymentIntent.status);

            // 支付成功
            if (paymentIntent.status === 'succeeded') {
                console.log('支付成功！准备创建订单...');
                try {
                    // 保存 PaymentIntent ID 用于可能的退款和订单记录
                    window.lastPaymentIntentId = paymentIntent.id;
                    console.log('✓ 已保存 PaymentIntent ID (Link):', window.lastPaymentIntentId);
                    console.log('PaymentIntent 完整信息 (Link):', paymentIntent);

                    // 创建订单
                    await createOrderAfterPayment(paymentIntent);
                    // 显示处理中状态并开始轮询订单状态
                    showProcessingStatus();
                    await waitForOrderConfirmation(window.bookingOrderCode);
                } catch (orderError) {
                    console.error('订单创建失败:', orderError);
                    alert('決済は成功しましたが、予約の作成に失敗しました。\n\nお手数ですが、カスタマーサポートにお問い合わせください。\n\nエラー: ' + orderError.message);
                    // 保持转圈状态，不恢复按钮
                }
            }
            // 支付处理中
            else if (paymentIntent.status === 'processing') {
                console.log('支付处理中...');
                alert('決済を処理しています。しばらくお待ちください。');
            }
        }

    } catch (error) {
        console.error('Link支付确认错误:', error);
        showLinkError('Link決済処理に失敗しました。\n\nエラー: ' + error.message);
        // 保持转圈状态，不恢复按钮
    }
}

// 显示Link错误信息
function showLinkError(message) {
    const errorDiv = document.getElementById('link-payment-errors');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';

        // 5秒后自动隐藏
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    }
}

// 兼容旧的函数名（用于向后兼容）
async function createStripeCheckoutSession(orderData) {
    return await initializeStripePaymentForm(orderData);
}

// 计算总金额（日元，不含小数点）
// 优先使用服务器计算的final_amount（扣除积分后的金额），确保支付金额准确
function calculateTotalAmount(orderData) {
    // 1. 最优先：使用 final_amount（来自orders表，已扣除积分）
    if (orderData.final_amount !== null && orderData.final_amount !== undefined) {
        const amount = Math.round(parseFloat(orderData.final_amount));
        console.log('💰 使用 final_amount (已扣除积分):', amount);
        console.log('   原始金额:', orderData.total_price, '使用积分:', orderData.points_used || 0);
        return amount;
    }

    // 2. 次优先：使用 totalPrice（来自orders表，已扣除积分）
    if (orderData.totalPrice) {
        const amount = Math.round(parseFloat(orderData.totalPrice));
        console.log('💰 使用 totalPrice (已扣除积分):', amount);
        return amount;
    }

    // 3. 后备方案：客户端计算（用于兼容旧代码）
    console.log('⚠️ 服务器价格不存在，使用客户端计算');

    // 从订单数据中获取房间价格（已含税）
    const roomPriceWithTax = parseFloat(orderData.roomPrice) || 0; // 不使用默认价格，必须从订单数据获取

    // 获取人数
    const adults = parseInt(orderData.adults) || 2;

    // 计算服务费用（服务费用也是含税价格）
    let serviceCostPerPerson = 0;
    const services = orderData.services || [];

    services.forEach(service => {
        if (service.name === '朝食バイキング') {
            serviceCostPerPerson += 2200; // 2000 * 1.1 = 2200 (含税)
        } else if (service.name === '夕食コース') {
            serviceCostPerPerson += 4950; // 4500 * 1.1 = 4950 (含税)
        }
    });

    // 贷切风吕（不按人数计算，含税价格）
    let privateBathCost = 0;
    services.forEach(service => {
        if (service.name === '貸切風呂') {
            privateBathCost += 3300; // 3000 * 1.1 = 3300 (含税)
        }
    });

    const totalServiceCost = (serviceCostPerPerson * adults) + privateBathCost;
    let total = Math.round(roomPriceWithTax + totalServiceCost);

    // 减去积分抵扣金额
    const pointsToUse = parseInt(document.getElementById('pointsToUse')?.value) || 0;
    if (pointsToUse > 0) {
        total = total - pointsToUse;
        console.log(`原始金额: ¥${Math.round(roomPriceWithTax + totalServiceCost)}, 使用积分: ${pointsToUse}, 实际支付金额: ¥${total}`);
    }

    return total; // 返回日元金额（整数，已含税，已减去积分）
}

// 生成订单编号
function generateOrderCode() {
    const prefix = 'YUZAWA';
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}${timestamp}${random}`;
}

// 验证Stripe支付会话
async function verifyStripeSession(sessionId) {
    try {
        const response = await fetch(window.getApiUrl(`/stripe/session/${sessionId}`));
        const result = await response.json();

        if (result.success) {
            console.log('支付状态:', result.data.payment_status);
            return result.data;
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        console.error('验证支付会话错误:', error);
        throw error;
    }
}

// 页面加载时初始化Stripe
document.addEventListener('DOMContentLoaded', function() {
    initializeStripe();
});

// 处理微信支付和支付宝二维码显示
async function proceedWithStripeQRPayment(paymentType) {
    // 获取点击的按钮并显示加载状态
    const clickedBtn = document.querySelector(`.payment-btn[data-payment="${paymentType}"]`);
    let originalBtnContent = '';
    if (clickedBtn) {
        originalBtnContent = clickedBtn.innerHTML;
        clickedBtn.disabled = true;
        clickedBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> <span class="payment-btn-text">処理中...</span>`;
    }

    try {
        console.log('=== 开始Stripe二维码支付流程 ===');
        console.log('支付类型:', paymentType);

        // 收集订单数据
        const formData = collectFormData();
        console.log('收集到的表单数据:', formData);

        // 验证必填字段（静默处理，使用之前步骤的数据）
        if (!formData.bookerEmail) {
            console.warn('邮箱地址缺失，尝试使用之前填写的数据');
        }
        if (!formData.guestLastName || !formData.guestFirstName) {
            console.warn('宿泊者姓名缺失，尝试使用之前填写的数据');
        }

        // 获取用户信息（如果已登录）
        let userId = null;
        try {
            const currentUser = window.safeStorage.getItem('currentUser');
            if (currentUser) {
                const userData = JSON.parse(currentUser);
                userId = userData.user_id;
            }
        } catch (e) {
            console.log('未找到登录用户');
        }

        // 准备完整订单数据（字段名与数据库保持一致）- QR Payment
        const urlParams = new URLSearchParams(window.location.search);

        // 使用已创建的临时订单的 orderCode，或者在 TL-Lincoln 模式下生成临时订单号
        let existingOrderCode = window.currentTempOrderData?.order_code;
        const apiProvider = window.getApiProvider ? window.getApiProvider() : 'local';
        if (!existingOrderCode) {
            if (apiProvider === 'tl-lincoln') {
                // TL-Lincoln 模式下生成临时订单号
                existingOrderCode = 'TL' + Date.now() + Math.random().toString(36).substr(2, 4).toUpperCase();
                console.log('📡 TL-Lincoln mode: 生成临时订单号:', existingOrderCode);
            } else {
                throw new Error('临时订单未创建，请先完成预订信息填写');
            }
        }
        console.log('使用订单号:', existingOrderCode);

        const orderData = {
            // 基本信息
            userId: userId,
            orderCode: existingOrderCode, // 使用已创建的临时订单的 orderCode

            // 预订者姓名
            guestLastName: formData.guestLastName || '',
            guestFirstName: formData.guestFirstName || '',
            guestLastNameKatakana: formData.guestLastNameKatakana || formData.guestLastNameKana || '',
            guestFirstNameKatakana: formData.guestFirstNameKatakana || formData.guestFirstNameKana || '',

            // 联系方式
            bookerEmail: formData.bookerEmail,
            guestEmail: formData.bookerEmail,
            guestPhone: formData.guestPhone || formData.bookerPhone || '',
            phoneCountryCode: formData.phoneCountryCode || formData.phone_country_code || '+81',

            // 地址信息
            country: formData.country || '',
            postalCode: formData.postalCode || formData.postal_code || '',
            prefecture: formData.prefecture || '',
            city: formData.city || '',
            addressLine: formData.addressLine || formData.address_line || '',

            // 房间信息
            roomType: formData.roomType || formData.room_type_name || window.currentTempOrderData?.room_type_name || '',
            roomTypeCode: formData.roomTypeCode || formData.room_type_code || '',
            checkinDate: formData.checkinDate,
            checkoutDate: formData.checkoutDate,
            numRooms: formData.numRooms || formData.num_rooms || 1,
            adults: formData.adults,
            children: formData.children || 0,

            // 价格信息（从临时订单数据中获取，确保与信用卡支付使用相同的金额）
            roomPrice: formData.roomPrice || 0,
            final_amount: window.currentTempOrderData?.final_amount,  // 已扣除积分的最终金额
            totalPrice: window.currentTempOrderData?.total_price,     // 总价（后备）
            points_used: window.currentTempOrderData?.points_used || 0,

            // 附加服务
            breakfastSelected: formData.breakfast || false,
            dinnerSelected: formData.dinner || false,
            privateBathSelected: formData.privateBath || false,
            serviceCost: formData.serviceCost || formData.service_cost || 0,

            // 特殊要求
            specialRequests: formData.specialRequests || formData.special_requests || '',

            // 服务详情（用于显示）
            services: []
        };

        // 添加选择的服务
        if (formData.breakfast) {
            orderData.services.push({ name: '朝食バイキング', price: 2000, quantity: parseInt(formData.adults) });
        }
        if (formData.dinner) {
            orderData.services.push({ name: '夕食コース', price: 4500, quantity: parseInt(formData.adults) });
        }
        if (formData.privateBath) {
            orderData.services.push({ name: '貸切風呂', price: 3000, quantity: 1 });
        }

        console.log('订单数据:', orderData);
        console.log('💰 临时订单数据 (currentTempOrderData):', window.currentTempOrderData);
        console.log('   - final_amount:', orderData.final_amount);
        console.log('   - totalPrice:', orderData.totalPrice);
        console.log('   - points_used:', orderData.points_used);

        // 计算总金额
        const totalAmount = calculateTotalAmount(orderData);
        console.log('💳 微信/支付宝支付金额:', totalAmount);

        if (!totalAmount || totalAmount <= 0) {
            throw new Error('金额计算错误 (Invalid amount calculated): ' + totalAmount);
        }

        // 准备支付数据 - 微信支付
        const paymentMethodType = 'wechat_pay';

        const paymentData = {
            amount: totalAmount,
            currency: 'jpy',
            paymentMethodType: paymentMethodType, // 告诉后端使用哪种支付方式
            orderData: orderData // 发送完整订单数据（已经包含所有字段）
        };

        console.log('准备发送的支付数据:', JSON.stringify(paymentData, null, 2));

        // 调用后端API创建PaymentIntent
        const response = await fetch(window.getApiUrl('/stripe/create-payment-intent'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(paymentData)
        });

        // 先检查 HTTP 状态码
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ API エラー:', response.status, errorText);
            throw new Error(`サーバーエラー: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.message || 'PaymentIntentの作成に失敗しました');
        }

        const clientSecret = result.data.clientSecret;
        const paymentIntentId = result.data.paymentIntentId;
        console.log('PaymentIntent作成成功, client_secret:', clientSecret, 'paymentIntentId:', paymentIntentId);

        // 使用Stripe.js API确认支付
        let confirmResult;

        // 使用 Stripe 弹窗显示二维码（PC 和移动端统一使用此方式）
        // 注意：直接跳转微信 App 需要配置 app_id，暂不支持
        console.log('使用 confirmWechatPayPayment (二维码弹窗)...');
        confirmResult = await stripe.confirmWechatPayPayment(
            clientSecret,
            {
                payment_method_options: {
                    wechat_pay: {
                        client: 'web'
                    }
                }
            }
        );

        console.log('支付确认结果:', confirmResult);

        if (confirmResult.error) {
            throw new Error(confirmResult.error.message);
        }

        const paymentIntent = confirmResult.paymentIntent;
        if (paymentIntent && paymentIntent.status === 'succeeded') {
            console.log('✅ 微信支付成功，开始创建订单...');

            try {
                // 保存 PaymentIntent ID 用于可能的退款和订单记录
                window.lastPaymentIntentId = paymentIntent.id;
                console.log('✓ 已保存 PaymentIntent ID:', window.lastPaymentIntentId);

                // 创建订单（如果还未创建）
                await createOrderAfterPayment(paymentIntent);

                // 验证订单号是否已设置
                if (!window.bookingOrderCode) {
                    throw new Error('订单创建成功但订单号未设置');
                }

                // 显示处理中状态并开始轮询订单状态
                showProcessingStatus();
                await waitForOrderConfirmation(window.bookingOrderCode);

            } catch (orderError) {
                console.error('订单创建失败:', orderError);
                alert('決済は成功しましたが、予約の作成に失敗しました。\n\nお手数ですが、カスタマーサポートにお問い合わせください。\n\nエラー: ' + orderError.message);

                // 恢复按钮状态
                if (clickedBtn && originalBtnContent) {
                    clickedBtn.disabled = false;
                    clickedBtn.innerHTML = originalBtnContent;
                }
            }
        } else {
            // 用户关闭了弹窗或支付未完成，恢复按钮状态允许重新选择
            console.log('支付未完成，状态:', paymentIntent?.status);
            if (clickedBtn && originalBtnContent) {
                clickedBtn.disabled = false;
                clickedBtn.innerHTML = originalBtnContent;
                clickedBtn.classList.remove('active');  // 移除激活状态，恢复颜色
            }
            // 恢复显示 Express Checkout Element
            const expressCheckoutEl = document.getElementById('express-checkout-element');
            if (expressCheckoutEl) {
                expressCheckoutEl.style.display = 'block';
            }
        }

    } catch (error) {
        console.error('Stripe二维码支付错误:', error);

        // 恢复按钮状态
        if (clickedBtn && originalBtnContent) {
            clickedBtn.disabled = false;
            clickedBtn.innerHTML = originalBtnContent;
            clickedBtn.classList.remove('active');  // 移除激活状态，恢复颜色
        }

        // 恢复显示 Express Checkout Element
        const expressCheckoutEl = document.getElementById('express-checkout-element');
        if (expressCheckoutEl) {
            expressCheckoutEl.style.display = 'block';
        }

        // 在页面上显示错误信息而不是alert弹窗
        const qrcodeSection = document.getElementById('qrcodeSection');
        if (qrcodeSection) {
            qrcodeSection.innerHTML = `
                <div style="text-align: center; padding: 40px 20px;">
                    <i class="fas fa-exclamation-circle" style="font-size: 48px; color: #dc3545; margin-bottom: 20px;"></i>
                    <h3 style="color: #dc3545; margin-bottom: 10px;">決済の開始に失敗しました</h3>
                    <p style="color: #666; margin-bottom: 20px;">${error.message}</p>
                    <button onclick="location.reload()" class="btn btn-primary" style="padding: 12px 30px;">
                        <i class="fas fa-redo"></i> もう一度お試しください
                    </button>
                </div>
            `;
            qrcodeSection.style.display = 'block';
        }
    }
}

// 显示二维码
function displayQRCode(qrCodeImageUrl, paymentName, amount) {
    console.log('=== displayQRCode 被调用 ===');
    console.log('二维码URL:', qrCodeImageUrl);
    console.log('支付方式:', paymentName);
    console.log('金额:', amount);

    const qrcodeSection = document.getElementById('qrcodeSection');
    const qrcodeImage = document.getElementById('qrcodeImage');
    const qrcodeLoading = document.getElementById('qrcodeLoading');
    const wechatPayAmount = document.getElementById('wechatPayAmount');
    const wechatPayContainer = document.getElementById('wechatPayContainer');
    const wechatPayHeader = wechatPayContainer?.querySelector('.wechat-pay-header h3');
    const wechatPayLogo = wechatPayContainer?.querySelector('.wechat-pay-logo i');

    // 设置金额
    if (wechatPayAmount && amount) {
        wechatPayAmount.textContent = amount.toLocaleString();
    }

    // 确保二维码区域显示
    if (qrcodeSection) {
        qrcodeSection.style.display = 'block';
        console.log('✓ qrcodeSection 已设置为 display: block');
    }

    if (qrcodeImage && qrcodeLoading) {
        // 显示加载动画
        qrcodeLoading.style.display = 'block';
        qrcodeImage.style.display = 'none';

        // 当图片加载完成时，隐藏加载动画并显示图片
        qrcodeImage.onload = function() {
            qrcodeLoading.style.display = 'none';
            qrcodeImage.style.display = 'block';
            console.log('✓ 二维码图片加载完成');

            // 滚动到二维码区域
            qrcodeSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        };

        // 图片加载失败
        qrcodeImage.onerror = function() {
            qrcodeLoading.innerHTML = `
                <div style="text-align: center; color: #ff4d4f;">
                    <i class="fas fa-exclamation-circle" style="font-size: 32px; margin-bottom: 10px;"></i>
                    <p>QRコードの読み込みに失敗しました</p>
                    <button onclick="location.reload()" style="margin-top: 15px; padding: 8px 20px; background: #07c160; color: #fff; border: none; border-radius: 4px; cursor: pointer;">
                        再試行
                    </button>
                </div>
            `;
        };

        // 设置图片源
        qrcodeImage.src = qrCodeImageUrl;
        qrcodeImage.alt = `${paymentName} QR Code`;
    }

    // 启动倒计时
    startQRCodeTimer();
}

// 显示 Stripe 官方样式的微信支付二维码（嵌入页面，不弹窗）
function displayStripeWeChatQRCode(qrData, amount, paymentIntentId) {
    console.log('=== 显示 Stripe 官方样式微信支付 ===');

    const qrcodeSection = document.getElementById('qrcodeSection');
    if (!qrcodeSection) {
        console.error('找不到 qrcodeSection');
        return;
    }

    // 获取二维码图片 URL
    const qrImageUrl = qrData.image_data_url;

    // Stripe 官方弹窗样式 - 嵌入页面
    qrcodeSection.innerHTML = `
        <div class="stripe-wechat-modal">
            <div class="stripe-wechat-content">
                <!-- 头部 -->
                <div class="stripe-wechat-header">
                    <svg class="stripe-wechat-logo" viewBox="0 0 24 24" width="32" height="32">
                        <path fill="#07C160" d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 01.213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.32.32 0 00.167-.054l1.903-1.114a.86.86 0 01.717-.098 10.16 10.16 0 002.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178A1.17 1.17 0 014.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178 1.17 1.17 0 01-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.72.72 0 01.598.082l1.584.926a.27.27 0 00.14.046c.133 0 .24-.11.24-.245 0-.06-.023-.12-.038-.177l-.327-1.233a.49.49 0 01.176-.553C23.287 18.254 24 16.926 24 15.469c0-3.299-3.047-6.502-7.062-6.611zm-1.377 2.79c.535 0 .969.44.969.982a.976.976 0 01-.969.983.976.976 0 01-.969-.983c0-.542.434-.982.97-.982zm4.844 0c.535 0 .969.44.969.982a.976.976 0 01-.969.983.976.976 0 01-.969-.983c0-.542.434-.982.969-.982z"/>
                    </svg>
                    <span class="stripe-wechat-title">WeChat Pay</span>
                </div>

                <!-- 金额 -->
                <div class="stripe-wechat-amount">
                    <span class="stripe-wechat-currency">¥</span>
                    <span class="stripe-wechat-value">${amount.toLocaleString()}</span>
                </div>

                <!-- 二维码 -->
                <div class="stripe-wechat-qr-container">
                    <img class="stripe-wechat-qr" src="${qrImageUrl}" alt="WeChat Pay QR Code" />
                </div>

                <!-- 说明文字 -->
                <div class="stripe-wechat-instructions">
                    <p>WeChatアプリでスキャンしてお支払いください</p>
                </div>

                <!-- 倒计时 -->
                <div class="stripe-wechat-timer">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M8 0C3.58 0 0 3.58 0 8s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zm0 14.4A6.4 6.4 0 118 1.6a6.4 6.4 0 010 12.8zm.4-10.4H7.2v5.2l4.4 2.64.6-1.04-3.8-2.28V4z" fill="#697386"/>
                    </svg>
                    <span id="stripeWechatTimer">5:00</span>
                </div>

                <!-- Stripe 品牌 -->
                <div class="stripe-wechat-footer">
                    <span>Powered by</span>
                    <svg class="stripe-logo" viewBox="0 0 60 25" width="50" height="21">
                        <path fill="#635BFF" d="M59.64 14.28h-8.06c.19 1.93 1.6 2.55 3.2 2.55 1.64 0 2.96-.37 4.05-.95v3.32a8.33 8.33 0 01-4.56 1.1c-4.01 0-6.83-2.5-6.83-7.48 0-4.19 2.39-7.52 6.3-7.52 3.92 0 5.96 3.28 5.96 7.5 0 .4-.02 1.04-.06 1.48zm-3.67-3.14c0-1.43-.7-2.48-1.88-2.48-1.2 0-2.03 1.04-2.17 2.48h4.05zM42.23 20.75h4.53V5.76h-4.53v14.99zM24.97 20.75h4.54v-8.83c0-1.75.77-2.95 2.28-2.95 1.37 0 2.02.98 2.02 2.95v8.83h4.54v-9.8c0-3.45-1.79-5.65-5-5.65-2.19 0-3.56.98-4.37 2.43V5.76h-4.01v14.99zM18.86 20.75h4.53V5.76h-4.53v14.99zM18.86 4.53h4.53V.48h-4.53v4.05zM9.65 9.16V5.76H5.86v14.99h4.53v-7.39c0-2.52 1.61-3.45 3.97-3.45h.38v-4.2c-.21-.03-.53-.05-.91-.05-1.61 0-3.24.55-4.18 3.5zM0 12.96c0 4.7 3.13 8.09 7.57 8.09 2.17 0 3.96-.72 5.15-1.72v-3.98c-1.16.98-2.58 1.65-4.33 1.65-2.53 0-4.03-1.88-4.03-4.04 0-2.24 1.61-4.04 4.03-4.04 1.75 0 3.15.67 4.33 1.65V6.59c-1.19-1-2.98-1.72-5.15-1.72C3.13 4.87 0 8.26 0 12.96z"/>
                    </svg>
                </div>
            </div>
        </div>
    `;

    qrcodeSection.style.display = 'block';

    // 滚动到二维码区域
    qrcodeSection.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // 启动倒计时（5分钟）
    let timeLeft = 300;
    const timerElement = document.getElementById('stripeWechatTimer');
    const timerInterval = setInterval(() => {
        timeLeft--;
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        if (timerElement) {
            timerElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            if (timerElement) {
                timerElement.textContent = window.i18n ? window.i18n.t('timer_short_expired') : '期限切れ';
            }
        }
    }, 1000);

    // 开始轮询支付状态
    pollPaymentStatus(paymentIntentId);
}

// 从URL生成二维码显示（用于支付宝）
function displayQRCodeFromUrl(url, paymentName, amount) {
    // 使用第三方二维码生成服务
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(url)}`;
    displayQRCode(qrCodeUrl, paymentName, amount);
}

// 轮询支付状态
function pollPaymentStatus(paymentIntentId) {
    console.log('=== 开始轮询支付状态 ===');
    console.log('PaymentIntent ID:', paymentIntentId);

    let pollCount = 0;
    const maxPolls = 300; // 15分钟 (每3秒一次)

    const pollInterval = setInterval(async () => {
        pollCount++;
        console.log(`轮询次数 ${pollCount}/${maxPolls}`);

        try {
            const response = await fetch(window.getApiUrl(`/stripe/payment-intent/${paymentIntentId}`));
            console.log('API 响应状态:', response.status);

            const result = await response.json();
            console.log('API 响应数据:', result);

            if (result.success) {
                const status = result.data.status;
                console.log('当前支付状态:', status, '| 完整数据:', result.data);

                // 处理各种支付状态
                if (status === 'succeeded') {
                    console.log('✅ 支付成功！准备创建订单并跳转...');
                    clearInterval(pollInterval);

                    // 保存 PaymentIntent ID 用于可能的退款和订单记录
                    window.lastPaymentIntentId = paymentIntentId;
                    console.log('✓ 已保存 PaymentIntent ID (轮询):', window.lastPaymentIntentId);
                    console.log('PaymentIntent ID:', paymentIntentId);

                    // 创建订单（如果还未创建）
                    await createOrderAfterPayment(result.data);

                    // 显示处理中状态并开始轮询订单状态
                    showProcessingStatus();
                    await waitForOrderConfirmation(window.bookingOrderCode);
                }
                else if (status === 'processing') {
                    console.log('⏳ 支付处理中，继续等待...');
                    // 继续轮询
                }
                else if (status === 'requires_payment_method') {
                    console.log('❌ 需要重新选择支付方式');
                    clearInterval(pollInterval);
                    alert('決済に失敗しました。もう一度お試しください。');
                }
                else if (status === 'canceled') {
                    console.log('❌ 支付已取消');
                    clearInterval(pollInterval);
                    alert('決済がキャンセルされました。');
                }
                else if (status === 'requires_action') {
                    console.log('⚠️ 需要用户操作（扫码）');
                    // 继续等待用户扫码
                }
                else if (status === 'requires_confirmation') {
                    console.log('⚠️ 需要确认');
                    // 继续等待
                }
                else {
                    console.log('ℹ️ 未知状态:', status);
                }
            } else {
                console.error('API 返回失败:', result.message);
            }
        } catch (error) {
            console.error('❌ 支付状态轮询错误:', error);
        }

        // 检查是否超过最大轮询次数
        if (pollCount >= maxPolls) {
            console.log('⏱️ 轮询超时，停止轮询');
            clearInterval(pollInterval);
            alert('QRコードの有効期限が切れました。もう一度お試しください。');
        }
    }, 3000); // 每3秒检查一次

    // 存储轮询 ID 以便后续清理
    window.currentPaymentPoll = pollInterval;
}

// 支付成功后创建订单
async function createOrderAfterPayment(paymentData) {
    console.log('=== 支付成功，开始处理订单 ===');
    console.log('支付数据:', paymentData);

    // 从 metadata 中获取订单信息
    const metadata = paymentData.metadata || {};
    console.log('Metadata:', metadata);

    // 防重复检查 1：订单号已存在
    if (window.bookingOrderCode) {
        console.log('⚠️ 订单已存在，跳过创建。订单号:', window.bookingOrderCode);
        return;
    }

    // 防重复检查 2：订单创建中标记
    if (window.creatingOrder === true) {
        console.log('⚠️ 订单正在创建中，跳过重复调用');
        return;
    }

    // 设置创建中标记
    window.creatingOrder = true;
    console.log('✓ 设置 creatingOrder = true，开始处理订单');

    try {
        // ==================== 新增: 临时订单系统支持（优先） ====================
        // 检查是否使用临时订单系统
        const tempOrderCode = window.OrderTemp && window.OrderTemp.getTempOrderCode
            ? window.OrderTemp.getTempOrderCode()
            : null;

        if (tempOrderCode) {
            // 使用临时订单系统 - 前端主动确认订单
            console.log('💾 检测到临时订单，开始确认订单...');
            console.log('临时订单编号:', tempOrderCode);
            console.log('PaymentIntent ID:', paymentData.id);

            // 设置全局订单号
            window.bookingOrderCode = tempOrderCode;
            window.orderCreatedViaTemp = true;

            try {
                // 调用 API 确认临时订单
                const transferResponse = await fetch(window.getApiUrl(`/order-temp/${tempOrderCode}/complete-payment`), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                        stripePaymentId: paymentData.id
                    })
                });

                const transferResult = await transferResponse.json();

                if (transferResult.success) {
                    console.log('✅ 临时订单已成功确认');
                    console.log('新订单号:', transferResult.data.orderCode);
                    window.bookingOrderCode = transferResult.data.orderCode;
                    return; // 成功转移，返回继续轮询
                } else {
                    console.error('❌ 临时订单转移失败:', transferResult.message);
                    // 检查是否是库存不足错误
                    const errorMsg = transferResult.message || '';
                    if (errorMsg.includes('库存不足') || errorMsg.includes('在庫') || errorMsg.includes('inventory')) {
                        // 跳转到失败页面 - 库存不足（使用不带 .html 后缀的 URL）
                        window.location.href = `reservation-failed.html?error=inventory&orderCode=${tempOrderCode}&refunded=true`;
                        return;
                    }
                    throw new Error('临时订单转移失败: ' + transferResult.message);
                }
            } catch (transferError) {
                console.error('❌ 临时订单转移API调用失败:', transferError);
                // 检查是否是库存不足错误
                const errorMsg = transferError.message || '';
                if (errorMsg.includes('库存不足') || errorMsg.includes('在庫') || errorMsg.includes('inventory')) {
                    window.location.href = `reservation-failed.html?error=inventory&orderCode=${tempOrderCode}&refunded=true`;
                    return;
                }
                throw transferError;
            }
        }

        // ==================== 传统订单创建流程（仅当没有临时订单时） ====================
        console.log('📝 未检测到临时订单，检查 metadata 中的订单号');

        // 检查是否为 TL-Lincoln 模式
        const apiProvider = window.getApiProvider ? window.getApiProvider() : 'local';
        const isTLLincoln = apiProvider === 'tl-lincoln';

        if (isTLLincoln) {
            console.log('📡 TL-Lincoln mode: 使用 TL-Lincoln API 创建订单');
        }

        // 从 metadata 中获取订单号（可能由 Webhook 已创建）
        const metadataOrderCode = metadata.order_code || metadata.orderCode;

        if (metadataOrderCode && !metadataOrderCode.startsWith('YUZAWA') && !isTLLincoln) {
            // metadata 中有 TMP 开头的临时订单号，说明 Webhook 正在处理
            console.log('⚠️ 检测到 Webhook 正在处理订单，订单号:', metadataOrderCode);
            window.bookingOrderCode = metadataOrderCode;
            console.log('✅ 使用 Webhook 创建的订单，前端跳过创建');
            return;
        }

        // 调用现有的订单创建函数（传统流程 - 仅在没有临时订单且 Webhook 未处理时）
        if (typeof window.submitFinalBooking === 'function') {
            console.log(isTLLincoln ? '📡 调用 TL-Lincoln API 创建订单...' : '⚠️ 警告：使用传统订单创建流程（可能导致重复）');
            console.log('调用 submitFinalBooking 创建订单...');
            try {
                const orderResult = await window.submitFinalBooking();
                console.log('submitFinalBooking返回值:', orderResult);
                console.log('订单创建成功，订单号:', window.bookingOrderCode);

                // 验证订单是否真的创建成功
                if (!window.bookingOrderCode) {
                    console.error('❌ 订单号未设置！');
                    console.error('orderResult:', orderResult);
                    throw new Error('订单创建失败：未获取到订单号');
                }

                // TL-Lincoln 模式：将订单数据存储到 sessionStorage，供成功页面使用
                if (isTLLincoln) {
                    console.log('📡 TL-Lincoln mode: 保存订单数据到 sessionStorage');
                    const tlOrderData = {
                        order_code: window.bookingOrderCode,
                        ...window.bookingOrderData,
                        // 合并 currentOrderData 中的客人信息
                        ...(window.currentOrderData || {}),
                        payment_status: 'paid',
                        source: 'tl-lincoln'
                    };
                    try {
                        sessionStorage.setItem('tl_lincoln_order', JSON.stringify(tlOrderData));
                        console.log('✅ TL-Lincoln 订单数据已保存到 sessionStorage');
                    } catch (e) {
                        console.warn('⚠️ sessionStorage 保存失败:', e);
                    }

                    // 标记为 TL-Lincoln 订单，跳过后续的本地 API 调用
                    window.isTLLincolnOrder = true;
                    return; // 直接返回，不执行本地 API 调用
                }
            } catch (submitError) {
                console.error('❌ submitFinalBooking调用失败:', submitError);
                throw submitError;
            }

            // 以下代码仅适用于自社 API 模式
            // 更新 Stripe PaymentIntent 的 metadata，使用数据库中的真实订单号
            console.log('同步订单数据到 Stripe metadata...');
            try {
                const updateResponse = await fetch(window.getApiUrl('/stripe/update-payment-metadata'), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        paymentIntentId: window.lastPaymentIntentId,
                        orderCode: window.bookingOrderCode,
                        orderData: window.bookingOrderData
                    })
                });

                const updateResult = await updateResponse.json();
                if (updateResult.success) {
                    console.log('✓ Stripe metadata 已同步真实订单号:', window.bookingOrderCode);
                } else {
                    console.warn('⚠️ Stripe metadata 同步失败:', updateResult.message);
                }
            } catch (metadataError) {
                console.error('✗ Stripe metadata 同步错误:', metadataError);
                // 不抛出错误，metadata 同步失败不影响订单创建
            }

            // 更新订单支付状态为已支付
            console.log('更新订单支付状态为已支付...');
            try {
                // 获取用户信息用于权限验证
                let userId = null;
                let userEmail = null;
                try {
                    const currentUser = window.safeStorage ? window.safeStorage.getItem('currentUser') : null;
                    if (currentUser) {
                        const userData = JSON.parse(currentUser);
                        userId = userData.user_id;
                        userEmail = userData.email;
                    }
                } catch (e) {
                    console.warn('无法获取用户信息:', e);
                }

                const response = await fetch(window.getApiUrl(`/user-orders/${window.bookingOrderCode}/status`), {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        order_status: 'pending',  // 保持pending状态,等待管理员确认
                        payment_status: 'paid',
                        userId: userId,
                        userEmail: userEmail
                    })
                });

                const result = await response.json();
                if (result.success) {
                    console.log('✓ 订单支付状态更新成功');
                } else {
                    console.error('✗ 订单支付状态更新失败:', result.message);
                    throw new Error('支付状态更新失败: ' + result.message);
                }
            } catch (error) {
                console.error('✗ 更新订单支付状态时出错:', error);
                throw new Error('支付状态更新失败: ' + error.message);
            }
        } else {
            throw new Error('submitFinalBooking 函数不存在');
        }
    } finally {
        // 清除创建中标记，无论成功或失败
        window.creatingOrder = false;
        console.log('✓ 清除 creatingOrder 标记');
    }
}

// 启动二维码倒计时（复用现有函数）
function startQRCodeTimer() {
    const qrcodeTimer = document.getElementById('qrcodeTimer');
    if (!qrcodeTimer) return;

    let timeLeft = 15 * 60; // 15分钟

    const timerInterval = setInterval(() => {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        qrcodeTimer.textContent = `有効時間: ${minutes}:${seconds.toString().padStart(2, '0')}`;

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            qrcodeTimer.textContent = window.i18n ? window.i18n.t('timer_expired') : '有効期限が切れました';
            qrcodeTimer.style.color = '#dc3545';
        }

        timeLeft--;
    }, 1000);
}

/**
 * 显示处理中状态（加载动画）
 * 已禁用 - 避免遮挡银行3DS验证页面
 */
function showProcessingStatus() {
    console.log('=== 处理中状态已禁用（避免遮挡3DS验证）===');
    // 不显示弹窗，避免遮挡银行验证页面
}

/**
 * 隐藏处理中状态
 */
function hideProcessingStatus() {
    const overlay = document.getElementById('payment-processing-overlay');
    if (overlay) {
        overlay.remove();
    }

    if (window.processingTimer) {
        clearInterval(window.processingTimer);
    }
}

/**
 * 处理退款
 */
async function processRefund(paymentIntentId, orderCode, reason) {
    console.log('=== 开始退款处理 ===');
    console.log('PaymentIntent ID:', paymentIntentId);
    console.log('订单号:', orderCode);
    console.log('原因:', reason);

    try {
        const response = await fetch(window.getApiUrl('/stripe/refund'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                paymentIntentId: paymentIntentId,
                orderCode: orderCode,
                reason: reason
            })
        });

        const result = await response.json();

        if (result.success) {
            console.log('✅ 退款成功:', result.data);
            return result.data;
        } else {
            throw new Error(result.message || '退款失败');
        }
    } catch (error) {
        console.error('❌ 退款处理错误:', error);
        throw error;
    }
}

/**
 * 等待订单确认（轮询订单状态直到数据库保存完成）
 */
async function waitForOrderConfirmation(orderCode) {
    console.log('=== 开始等待订单确认 ===');
    console.log('订单号:', orderCode);

    if (!orderCode) {
        throw new Error('订单号缺失');
    }

    // TL-Lincoln 模式：跳过轮询，直接跳转到成功页面
    // 使用不带 .html 后缀的 URL，避免服务器 URL 重写导致参数丢失
    if (window.isTLLincolnOrder) {
        console.log('📡 TL-Lincoln mode: 跳过订单轮询，直接跳转到成功页面');
        hideProcessingStatus();
        window.location.href = `reservation-success.html?orderCode=${orderCode}&source=tl-lincoln`;
        return;
    }

    // 获取用户信息用于API请求
    let userId = null;
    let userEmail = null;
    try {
        if (window.safeStorage) {
            const currentUser = window.safeStorage.getItem('currentUser');
            if (currentUser) {
                const userData = JSON.parse(currentUser);
                userId = userData.user_id;
                userEmail = userData.email;
            }
        }
    } catch (e) {
        console.log('未找到登录用户');
    }

    const maxAttempts = 60; // 最多轮询60次（2分钟）
    let attempts = 0;

    return new Promise((resolve, reject) => {
        const checkInterval = setInterval(async () => {
            attempts++;
            console.log(`轮询订单状态 ${attempts}/${maxAttempts}`);

            try {
                // 构建查询参数
                const queryParams = new URLSearchParams();
                if (userId) queryParams.append('userId', userId);
                if (userEmail) queryParams.append('userEmail', userEmail);

                const url = window.getApiUrl(`/payment-status/${orderCode}?${queryParams.toString()}`);
                console.log('请求URL:', url);

                const response = await fetch(url);
                const result = await response.json();

                console.log('订单状态响应:', result);

                if (result.success) {
                    const { paymentCompleted, databaseSaved, isConfirmed, status, orderStatus } = result.data;

                    console.log('订单状态:', {
                        paymentCompleted,
                        databaseSaved,
                        isConfirmed,
                        status,
                        orderStatus
                    });

                    // 检查是否完成（支付完成且数据库已保存）
                    // 注意：临时订单(orderStatus='temp')需要等待 Webhook 确认
                    if (orderStatus === 'temp') {
                        // 临时订单，检查是否已经被 Webhook 确认
                        if (paymentCompleted) {
                            console.log('⏳ 临时订单支付完成，等待 Webhook 确认...');
                        } else {
                            console.log('⏳ 临时订单等待支付确认...');
                        }
                    } else if (status === 'completed' || (paymentCompleted && databaseSaved)) {
                        console.log('✅ 订单已确认并保存到数据库！');
                        clearInterval(checkInterval);
                        hideProcessingStatus();

                        // 跳转到成功页面（使用不带 .html 后缀的 URL）
                        window.location.href = `reservation-success.html?orderCode=${orderCode}`;
                        resolve();
                    } else {
                        console.log('⏳ 订单处理中，继续等待...');
                    }
                } else {
                    console.error('获取订单状态失败:', result.message);
                }

            } catch (error) {
                console.error('轮询订单状态错误:', error);
            }

            // 超时处理
            if (attempts >= maxAttempts) {
                console.log('⏱️ 订单确认超时');
                clearInterval(checkInterval);
                hideProcessingStatus();

                // 尝试退款
                if (window.lastPaymentIntentId) {
                    console.log('订单确认超时，开始退款...');
                    try {
                        await processRefund(window.lastPaymentIntentId, orderCode, '订单确认超时');
                        alert('予約の確認に時間がかかったため、お支払いは返金されました。\n\nもう一度お試しいただくか、カスタマーサポートにお問い合わせください。');
                    } catch (refundError) {
                        console.error('退款失败:', refundError);
                        alert('予約の確認に時間がかかっています。\n\nお支払いの返金処理を開始しました。\n\nカスタマーサポートにお問い合わせください。');
                    }
                } else {
                    alert('予約の確認に時間がかかっています。\n\nお手数ですが、予約履歴ページでご確認いただくか、カスタマーサポートにお問い合わせください。');
                }

                reject(new Error('订单确认超时'));
            }
        }, 2000); // 每2秒检查一次
    });
}

/**
 * 更新卡片品牌显示
 */
function updateCardBrandDisplay(brand) {
    const brandIcon = document.getElementById('card-brand-icon');
    if (!brandIcon) return;

    // 卡片品牌映射
    const brandMapping = {
        'visa': {
            icon: 'fab fa-cc-visa',
            color: '#1A1F71',
            name: 'Visa'
        },
        'mastercard': {
            icon: 'fab fa-cc-mastercard',
            color: '#EB001B',
            name: 'Mastercard'
        },
        'amex': {
            icon: 'fab fa-cc-amex',
            color: '#006FCF',
            name: 'American Express'
        },
        'discover': {
            icon: 'fab fa-cc-discover',
            color: '#FF6000',
            name: 'Discover'
        },
        'diners': {
            icon: 'fab fa-cc-diners-club',
            color: '#0079BE',
            name: 'Diners Club'
        },
        'jcb': {
            icon: 'fab fa-cc-jcb',
            color: '#0E4C96',
            name: 'JCB'
        },
        'unionpay': {
            icon: 'fab fa-cc-stripe',  // Font Awesome没有UnionPay图标，使用通用图标
            color: '#E21836',
            name: 'UnionPay'
        }
    };

    if (brand && brand !== 'unknown' && brandMapping[brand]) {
        const brandInfo = brandMapping[brand];
        brandIcon.innerHTML = `<i class="${brandInfo.icon}" style="font-size: 28px; color: ${brandInfo.color};"></i>`;
        brandIcon.style.display = 'inline-block';
        console.log('✓ 检测到卡片品牌:', brandInfo.name);
    } else {
        // 未知品牌或无品牌，隐藏图标
        brandIcon.style.display = 'none';
    }
}

// ==================== Apple Pay / Google Pay 支持 ====================

let paymentRequest = null;
let paymentRequestButton = null;
let isExpressPaymentAvailable = false;
let expressPaymentType = null; // 'applePay' or 'googlePay'
let expressPaymentResult = null; // 保存检测结果
let paymentRequestButtonMounted = false; // 是否已挂载按钮

/**
 * 检查 Apple Pay / Google Pay 是否可用
 * 页面加载时自动调用，只检测可用性，不创建按钮
 */
async function checkExpressPaymentAvailability() {
    try {
        if (!stripe) {
            console.log('Stripe 未初始化，等待初始化...');
            await initializeStripe();
        }

        if (!stripe) {
            console.error('Stripe 初始化失败');
            return { applePay: false, googlePay: false };
        }

        // 创建临时 PaymentRequest 仅用于检测
        const testPaymentRequest = stripe.paymentRequest({
            country: 'JP',
            currency: 'jpy',
            total: {
                label: 'Trip7湯沢温泉ホテル',
                amount: 100, // 仅用于检测
            },
            requestPayerName: true,
            requestPayerEmail: true,
            disableWallets: ['googlePay'],  // 禁用 Google Pay，保留 Apple Pay + Link
        });

        const result = await testPaymentRequest.canMakePayment();

        console.log('=== Express Payment 检测 ===');
        console.log('Stripe 对象:', !!stripe);
        console.log('canMakePayment 结果:', result);
        console.log('result.applePay:', result?.applePay);
        console.log('result.googlePay:', result?.googlePay);
        console.log('result.link:', result?.link);
        console.log('当前协议:', window.location.protocol);
        console.log('当前主机:', window.location.hostname);

        if (result && result.applePay) {
            // Apple Pay 可用
            isExpressPaymentAvailable = true;
            expressPaymentResult = result;
            expressPaymentType = 'applePay';
            console.log('✓ Apple Pay 可用');

            // 显示 Apple Pay 容器
            const applePayContainer = document.getElementById('apple-pay-button-container');
            if (applePayContainer) {
                applePayContainer.style.display = 'block';
            }

            return {
                applePay: true,
                googlePay: result.googlePay || false,
                link: result.link || false
            };
        } else {
            // Apple Pay 不可用，隐藏容器
            console.log('⚠️ Apple Pay 不可用（Link 按钮始终显示）');
            isExpressPaymentAvailable = false;
            expressPaymentType = null;

            const applePayContainer = document.getElementById('apple-pay-button-container');
            if (applePayContainer) {
                applePayContainer.style.display = 'none';
            }

            return { applePay: false, googlePay: false, link: true };
        }
    } catch (error) {
        console.error('检测 Express Payment 可用性时出错:', error);
        return { applePay: false, googlePay: false };
    }
}

// Link 嵌入式 Payment Element 相关变量
let linkPaymentElementInstance = null;
let linkElementsInstance = null;
let linkClientSecretForElement = null;

/**
 * 挂载 Link 按钮（当只有 Link 可用时使用）
 * 点击按钮后才显示 Payment Element
 */
async function mountLinkPaymentElement() {
    console.log('>>> mountLinkPaymentElement 开始执行');

    // Link 按钮显示在 payment-request-button-inline 容器中（与 Apple Pay 按钮位置一致）
    const inlineContainer = document.getElementById('payment-request-button-inline');
    if (!inlineContainer) {
        console.log('找不到 payment-request-button-inline 容器');
        return;
    }

    // 在 inline 容器中显示 Link 按钮
    inlineContainer.innerHTML = `
        <button type="button" id="link-show-element-btn" style="
            background-color: #00D924;
            color: white;
            border: none;
            padding: 12px 24px;
            font-size: 16px;
            font-weight: 500;
            border-radius: 4px;
            cursor: pointer;
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            transition: background-color 0.2s;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        " onmouseover="this.style.backgroundColor='#00c220'" onmouseout="this.style.backgroundColor='#00D924'">
            <svg width="33" height="14" viewBox="0 0 33 14" fill="white" xmlns="http://www.w3.org/2000/svg">
                <path fill-rule="evenodd" clip-rule="evenodd" d="M0 1.39999C0 0.626793 0.626793 0 1.39999 0H2.79999C3.57319 0 4.19999 0.626793 4.19999 1.39999V12.6C4.19999 13.3732 3.57319 14 2.79999 14H1.39999C0.626793 14 0 13.3732 0 12.6V1.39999ZM6.29999 1.39999C6.29999 0.626793 6.92679 0 7.69999 0H9.09999C9.87319 0 10.5 0.626793 10.5 1.39999V12.6C10.5 13.3732 9.87319 14 9.09999 14H7.69999C6.92679 14 6.29999 13.3732 6.29999 12.6V1.39999ZM14 0C13.2268 0 12.6 0.626793 12.6 1.39999V12.6C12.6 13.3732 13.2268 14 14 14H15.4C16.1732 14 16.8 13.3732 16.8 12.6V1.39999C16.8 0.626793 16.1732 0 15.4 0H14ZM18.9 1.39999C18.9 0.626793 19.5268 0 20.3 0H21.7C22.4732 0 23.1 0.626793 23.1 1.39999V12.6C23.1 13.3732 22.4732 14 21.7 14H20.3C19.5268 14 18.9 13.3732 18.9 12.6V1.39999ZM26.6 0C25.8268 0 25.2 0.626793 25.2 1.39999V12.6C25.2 13.3732 25.8268 14 26.6 14H28C28.7732 14 29.4 13.3732 29.4 12.6V8.39999C29.4 7.62679 30.0268 6.99999 30.8 6.99999H31.6C32.3732 6.99999 33 6.3732 33 5.59999V1.39999C33 0.626793 32.3732 0 31.6 0H26.6Z"/>
            </svg>
            Pay with Link
        </button>
    `;

    // 绑定按钮点击事件
    const showBtn = document.getElementById('link-show-element-btn');
    showBtn.addEventListener('click', async () => {
        await showLinkPaymentElement();
    });

    paymentRequestButtonMounted = true;
}

/**
 * 显示 Link Payment Element（点击按钮后调用）
 */
async function showLinkPaymentElement() {
    console.log('>>> showLinkPaymentElement 开始执行');

    // 使用 linkPaymentSection 容器（与 booking-user.js 一致）
    const sectionContainer = document.getElementById('linkPaymentSection');
    if (!sectionContainer) {
        console.log('找不到 linkPaymentSection 容器');
        return;
    }

    // 显示容器
    sectionContainer.style.display = 'block';

    // 在 link-payment-element 元素中显示加载状态
    const mountElement = document.getElementById('link-payment-element');
    if (mountElement) {
        mountElement.innerHTML = `
            <div style="text-align: center; padding: 20px;">
                <div style="display: inline-block; width: 24px; height: 24px; border: 3px solid #00D924; border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                <p style="margin-top: 10px; color: #666;">Loading...</p>
            </div>
            <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
        `;
    }

    try {
        if (!stripe) {
            await initializeStripe();
        }

        if (!stripe) {
            console.log('>>> Stripe 初始化失败，退出');
            if (mountElement) {
                mountElement.innerHTML = '<div style="text-align:center;padding:12px;color:#dc3545;">Stripe 初期化に失敗しました</div>';
            }
            return;
        }

        // 获取临时订单编号
        const apiProvider = window.getApiProvider ? window.getApiProvider() : 'local';
        let tempOrder = null;

        if (apiProvider === 'tl-lincoln') {
            // TL-Lincoln 模式下从内存读取数据（客人信息已在 Step 1/2 保存到 window.currentOrderData）
            console.log('=== TL-Lincoln mode: 从内存读取订单数据 ===');
            const orderData = window.currentOrderData || window.currentTempOrderData || {};
            const urlParams = new URLSearchParams(window.location.search);

            tempOrder = {
                order_code: 'TL' + Date.now() + Math.random().toString(36).substr(2, 4).toUpperCase(),
                user_id: null,
                // 客人信息从 orderData 读取（已在 saveOrderDraft 中保存）
                guest_email: orderData.guest_email || '',
                guest_last_name: orderData.guest_last_name || '',
                guest_first_name: orderData.guest_first_name || '',
                guest_last_name_katakana: orderData.guest_last_name_katakana || '',
                guest_first_name_katakana: orderData.guest_first_name_katakana || '',
                guest_phone: orderData.guest_phone || '',
                phone_country_code: orderData.phone_country_code || '+81',
                country: orderData.country || '',
                postal_code: orderData.postal_code || '',
                prefecture: orderData.prefecture || '',
                city: orderData.city || '',
                address_line: orderData.address_line || '',
                // 预订信息
                room_type_name: orderData.room_type_name || '',
                room_type_code: orderData.room_type_code || urlParams.get('code') || '',
                checkin_date: orderData.checkin_date || urlParams.get('checkin') || '',
                checkout_date: orderData.checkout_date || urlParams.get('checkout') || '',
                num_adults: orderData.num_adults || parseInt(urlParams.get('adults')) || 2,
                num_children: orderData.num_children || parseInt(urlParams.get('children')) || 0,
                num_children_preschool: orderData.num_children_preschool || parseInt(urlParams.get('childrenPreschool')) || 0,
                num_children_elementary: orderData.num_children_elementary || parseInt(urlParams.get('childrenElementary')) || 0,
                num_rooms: orderData.num_rooms || parseInt(urlParams.get('rooms')) || 1,
                total_price: orderData.total_price || 0,
                room_price: orderData.total_price || 0,
                final_amount: orderData.total_price || 0,
                points_used: 0,
                service_cost: 0,
                // TL-Lincoln 特有数据
                tl_room_type_code: orderData.tl_room_type_code || '',
                tl_rate_plan_code: orderData.tl_rate_plan_code || orderData.plan_code || ''
            };
            console.log('✅ TL-Lincoln 订单数据:', tempOrder);
        } else {
            // 自社 API 模式：从数据库读取
            const tempOrderCode = window.OrderTemp && window.OrderTemp.getTempOrderCode
                ? window.OrderTemp.getTempOrderCode()
                : window.currentTempOrderCode;

            if (!tempOrderCode) {
                console.log('临时订单不存在');
                sectionContainer.innerHTML = '<div style="text-align:center;padding:12px;color:#999;font-size:14px;">订单数据加载中...</div>';
                return;
            }

            console.log('=== 挂载 Link Payment Element ===');
            console.log('从数据库读取订单:', tempOrderCode);

            // 从数据库读取临时订单数据
            const response = await fetch(window.getApiUrl(`/order-temp/${tempOrderCode}`), {
                credentials: 'include'
            });
            const result = await response.json();

            if (!result.success || !result.data) {
                console.log('无法读取订单数据');
                sectionContainer.innerHTML = '<div style="text-align:center;padding:12px;color:#dc3545;font-size:14px;">订单数据加载失败</div>';
                return;
            }

            tempOrder = result.data;
            console.log('✅ 临时订单数据:', tempOrder);
        }

        // 获取支付金额（注意：0 也是有效金额）
        const orderAmountRaw = (tempOrder.final_amount ?? tempOrder.total_price ?? 0);
        const orderAmount = Math.round(parseFloat(orderAmountRaw) || 0);
        console.log('💰 支付金额:', orderAmount, '日元');

        if (orderAmount <= 0) {
            console.log('金额无效');
            sectionContainer.innerHTML = '<div style="text-align:center;padding:12px;color:#dc3545;font-size:14px;">金额计算错误</div>';
            return;
        }

        // 构建订单数据
        const orderData = {
            userId: tempOrder.user_id,
            orderCode: tempOrder.order_code,
            bookerEmail: tempOrder.guest_email,
            guestLastName: tempOrder.guest_last_name,
            guestFirstName: tempOrder.guest_first_name,
            guestLastNameKatakana: tempOrder.guest_last_name_katakana || '',
            guestFirstNameKatakana: tempOrder.guest_first_name_katakana || '',
            guestPhone: tempOrder.guest_phone || '',
            phoneCountryCode: tempOrder.phone_country_code || '+81',
            country: tempOrder.country || '',
            postalCode: tempOrder.postal_code || '',
            prefecture: tempOrder.prefecture || '',
            city: tempOrder.city || '',
            addressLine: tempOrder.address_line || '',
            roomType: tempOrder.room_type_name || 'ツインルーム',
            roomTypeCode: tempOrder.room_type_code,
            checkinDate: tempOrder.checkin_date,
            checkoutDate: tempOrder.checkout_date,
            adults: tempOrder.num_adults,
            children: tempOrder.num_children || 0,
            numRooms: tempOrder.num_rooms || 1,
            totalPrice: parseFloat(tempOrder.total_price),
            roomPrice: parseFloat(tempOrder.room_price),
            final_amount: parseFloat(tempOrder.final_amount),
            points_used: parseInt(tempOrder.points_used) || 0,
            serviceCost: parseFloat(tempOrder.service_cost) || 0,
            breakfastSelected: tempOrder.breakfast_selected,
            dinnerSelected: tempOrder.dinner_selected,
            privateBathSelected: tempOrder.private_bath_selected,
            specialRequests: tempOrder.special_requests || ''
        };

        // 创建 PaymentIntent
        const piResponse = await fetch(window.getApiUrl('/stripe/create-payment-intent'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                amount: orderAmount,
                currency: 'jpy',
                paymentMethodType: 'card',
                tempOrderCode: tempOrder.order_code,
                orderData: orderData
            })
        });

        const piResult = await piResponse.json();

        if (!piResult.success) {
            throw new Error(piResult.message || 'PaymentIntent 作成失敗');
        }

        linkClientSecretForElement = piResult.data.clientSecret;
        console.log('✅ PaymentIntent 作成成功');

        // 在 link-payment-element 中创建 Payment Element
        const linkPaymentContainer = document.getElementById('link-payment-element');
        if (!linkPaymentContainer) {
            console.log('找不到 link-payment-element 容器');
            return;
        }

        // 清空容器并准备挂载
        linkPaymentContainer.innerHTML = `
            <div id="link-payment-element-mount" style="margin-bottom: 16px;"></div>
            <button type="button" id="link-element-submit-btn" style="
                background-color: #00D924;
                color: white;
                border: none;
                padding: 12px 24px;
                font-size: 16px;
                font-weight: 500;
                border-radius: 4px;
                cursor: pointer;
                width: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                transition: background-color 0.2s;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            " onmouseover="this.style.backgroundColor='#00c220'" onmouseout="this.style.backgroundColor='#00D924'">
                <svg width="33" height="14" viewBox="0 0 33 14" fill="white" xmlns="http://www.w3.org/2000/svg">
                    <path fill-rule="evenodd" clip-rule="evenodd" d="M0 1.39999C0 0.626793 0.626793 0 1.39999 0H2.79999C3.57319 0 4.19999 0.626793 4.19999 1.39999V12.6C4.19999 13.3732 3.57319 14 2.79999 14H1.39999C0.626793 14 0 13.3732 0 12.6V1.39999ZM6.29999 1.39999C6.29999 0.626793 6.92679 0 7.69999 0H9.09999C9.87319 0 10.5 0.626793 10.5 1.39999V12.6C10.5 13.3732 9.87319 14 9.09999 14H7.69999C6.92679 14 6.29999 13.3732 6.29999 12.6V1.39999ZM14 0C13.2268 0 12.6 0.626793 12.6 1.39999V12.6C12.6 13.3732 13.2268 14 14 14H15.4C16.1732 14 16.8 13.3732 16.8 12.6V1.39999C16.8 0.626793 16.1732 0 15.4 0H14ZM18.9 1.39999C18.9 0.626793 19.5268 0 20.3 0H21.7C22.4732 0 23.1 0.626793 23.1 1.39999V12.6C23.1 13.3732 22.4732 14 21.7 14H20.3C19.5268 14 18.9 13.3732 18.9 12.6V1.39999ZM26.6 0C25.8268 0 25.2 0.626793 25.2 1.39999V12.6C25.2 13.3732 25.8268 14 26.6 14H28C28.7732 14 29.4 13.3732 29.4 12.6V8.39999C29.4 7.62679 30.0268 6.99999 30.8 6.99999H31.6C32.3732 6.99999 33 6.3732 33 5.59999V1.39999C33 0.626793 32.3732 0 31.6 0H26.6Z"/>
                </svg>
                Pay with Link
            </button>
            <div id="link-element-error" style="color: #dc3545; margin-top: 10px; font-size: 14px; display: none;"></div>
        `;

        // 创建 Elements 实例
        const appearance = {
            theme: 'stripe',
            variables: {
                colorPrimary: '#00D924',
                colorBackground: '#ffffff',
                colorText: '#333333',
                fontFamily: '"Noto Sans JP", sans-serif',
                borderRadius: '8px'
            }
        };

        linkElementsInstance = stripe.elements({
            clientSecret: linkClientSecretForElement,
            appearance
        });

        // 创建 Payment Element，优先显示 Link
        linkPaymentElementInstance = linkElementsInstance.create('payment', {
            layout: {
                type: 'tabs',
                defaultCollapsed: false,
            },
            paymentMethodOrder: ['link', 'card'],
            defaultValues: {
                billingDetails: {
                    email: tempOrder.guest_email,
                    name: `${tempOrder.guest_last_name} ${tempOrder.guest_first_name}`.trim()
                }
            }
        });

        linkPaymentElementInstance.mount('#link-payment-element-mount');
        console.log('✅ Link Payment Element 已挂载');

        // 绑定提交按钮事件
        const submitBtn = document.getElementById('link-element-submit-btn');
        submitBtn.addEventListener('click', async () => {
            await handleLinkElementPayment(orderData, orderAmount);
        });

        paymentRequestButtonMounted = true;

    } catch (error) {
        console.error('挂载 Link Payment Element 失败:', error);
        const linkPaymentContainer = document.getElementById('link-payment-element');
        if (linkPaymentContainer) {
            linkPaymentContainer.innerHTML = `<div style="text-align:center;padding:12px;color:#dc3545;font-size:14px;">Link 決済の初期化に失敗しました</div>`;
        }
    }
}

/**
 * 处理 Link Payment Element 支付
 */
async function handleLinkElementPayment(orderData, orderAmount) {
    console.log('>>> handleLinkElementPayment 开始');

    const submitBtn = document.getElementById('link-element-submit-btn');
    const errorDiv = document.getElementById('link-element-error');

    try {
        // 禁用按钮并显示加载动画
        submitBtn.disabled = true;
        submitBtn.style.opacity = '0.7';
        submitBtn.style.cursor = 'wait';
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin" style="margin-right: 8px;"></i> 処理中...';
        errorDiv.style.display = 'none';

        // 提交 Payment Element
        const { error: submitError } = await linkElementsInstance.submit();
        if (submitError) {
            throw submitError;
        }

        // 确认支付
        const { error, paymentIntent } = await stripe.confirmPayment({
            elements: linkElementsInstance,
            confirmParams: {
                return_url: getSuccessReturnUrl(orderData.orderCode),
                payment_method_data: {
                    billing_details: {
                        name: `${orderData.guestLastName} ${orderData.guestFirstName}`.trim(),
                        email: orderData.bookerEmail,
                        phone: orderData.guestPhone || '',
                    }
                }
            },
            redirect: 'always'
        });

        if (error) {
            throw error;
        }

        if (paymentIntent && paymentIntent.status === 'succeeded') {
            console.log('✅ Link 支付成功');

            // 保存 PaymentIntent ID
            window.lastPaymentIntentId = paymentIntent.id;
            window.bookingOrderCode = orderData.orderCode;

            // 创建订单
            await createOrderAfterPayment(paymentIntent);

            // 显示处理中状态并轮询
            showProcessingStatus();
            await waitForOrderConfirmation(orderData.orderCode);

        } else if (paymentIntent && paymentIntent.status === 'processing') {
            console.log('支付处理中...');
            alert('決済を処理しています。しばらくお待ちください。');
        }

    } catch (error) {
        console.error('Link 支付失败:', error);
        errorDiv.textContent = error.message || '支付失败，请重试';
        errorDiv.style.display = 'block';
        // 保持转圈状态，不恢复按钮
    }
}

/**
 * 挂载 Apple Pay Button（在进入 Step 3 时调用）
 * 只处理 Apple Pay，Link 按钮始终显示在 HTML 中
 */
async function mountPaymentRequestButton() {
    console.log('>>> mountPaymentRequestButton (Apple Pay) 开始执行');
    console.log('>>> expressPaymentType:', expressPaymentType);

    // 如果 Apple Pay 不可用，直接返回（Link 按钮已在 HTML 中显示）
    if (expressPaymentType !== 'applePay') {
        console.log('>>> Apple Pay 不可用，跳过挂载');
        return;
    }

    try {
        // 如果已挂载，先销毁
        if (paymentRequestButtonMounted) {
            console.log('>>> 已挂载，先销毁');
            const inlineContainer = document.getElementById('payment-request-button-inline');
            if (inlineContainer) {
                inlineContainer.innerHTML = '';
            }
            paymentRequestButtonMounted = false;
        }

        console.log('>>> stripe:', !!stripe);

        if (!stripe) {
            console.log('>>> Stripe 未初始化，正在初始化...');
            await initializeStripe();
        }

        if (!stripe) {
            console.log('>>> Stripe 初始化失败，退出');
            return;
        }

        const inlineContainer = document.getElementById('payment-request-button-inline');
        if (!inlineContainer) {
            console.log('找不到 Apple Pay 按钮容器');
            return;
        }

        // 显示 Apple Pay 容器
        const applePayContainer = document.getElementById('apple-pay-button-container');
        if (applePayContainer) {
            applePayContainer.style.display = 'block';
        }

        // 获取订单数据
        const apiProvider = window.getApiProvider ? window.getApiProvider() : 'local';
        let tempOrder = null;

        if (apiProvider === 'tl-lincoln') {
            // TL-Lincoln 模式下从内存读取数据（客人信息已在 saveOrderDraft 中保存）
            console.log('=== TL-Lincoln mode: Payment Request Button 从内存读取 ===');
            const orderData = window.currentOrderData || window.currentTempOrderData || {};
            const urlParams = new URLSearchParams(window.location.search);

            tempOrder = {
                order_code: 'TL' + Date.now() + Math.random().toString(36).substr(2, 4).toUpperCase(),
                user_id: null,
                guest_email: orderData.guest_email || '',
                guest_last_name: orderData.guest_last_name || '',
                guest_first_name: orderData.guest_first_name || '',
                guest_last_name_katakana: orderData.guest_last_name_katakana || '',
                guest_first_name_katakana: orderData.guest_first_name_katakana || '',
                guest_phone: orderData.guest_phone || '',
                phone_country_code: orderData.phone_country_code || '+81',
                room_type_name: orderData.room_type_name || '',
                room_type_code: orderData.room_type_code || urlParams.get('code') || '',
                checkin_date: orderData.checkin_date || urlParams.get('checkin') || '',
                checkout_date: orderData.checkout_date || urlParams.get('checkout') || '',
                num_adults: orderData.num_adults || parseInt(urlParams.get('adults')) || 2,
                num_children: orderData.num_children || parseInt(urlParams.get('children')) || 0,
                num_children_preschool: orderData.num_children_preschool || parseInt(urlParams.get('childrenPreschool')) || 0,
                num_children_elementary: orderData.num_children_elementary || parseInt(urlParams.get('childrenElementary')) || 0,
                num_rooms: orderData.num_rooms || parseInt(urlParams.get('rooms')) || 1,
                total_price: orderData.total_price || 0,
                final_amount: orderData.total_price || 0,
                points_used: 0,
                tl_room_type_code: orderData.tl_room_type_code || '',
                tl_rate_plan_code: orderData.tl_rate_plan_code || orderData.plan_code || ''
            };
            console.log('✅ TL-Lincoln 订单数据:', tempOrder);
        } else {
            // 自社 API 模式：从数据库读取
            const tempOrderCode = window.OrderTemp && window.OrderTemp.getTempOrderCode
                ? window.OrderTemp.getTempOrderCode()
                : window.currentTempOrderCode;

            if (!tempOrderCode) {
                console.log('临时订单不存在');
                inlineContainer.innerHTML = '<div style="text-align:center;padding:12px;color:#999;font-size:14px;">订单数据加载中...</div>';
                return;
            }

            console.log('=== 挂载 Payment Request Button ===');
            console.log('从数据库读取订单:', tempOrderCode);

            const response = await fetch(window.getApiUrl(`/order-temp/${tempOrderCode}`), {
                credentials: 'include'
            });
            const result = await response.json();

            if (!result.success || !result.data) {
                console.log('无法读取订单数据');
                inlineContainer.innerHTML = '<div style="text-align:center;padding:12px;color:#dc3545;font-size:14px;">订单数据加载失败</div>';
                return;
            }

            tempOrder = result.data;
            console.log('✅ 临时订单数据:', tempOrder);
        }

        // 获取支付金额（优先使用 final_amount，与信用卡支付一致；注意：0 也是有效金额）
        const orderAmountRaw = (tempOrder.final_amount ?? tempOrder.total_price ?? 0);
        const orderAmount = Math.round(parseFloat(orderAmountRaw) || 0);
        console.log('💰 支付金额:', orderAmount, '日元');
        console.log('💰 final_amount:', tempOrder.final_amount);
        console.log('💰 total_price:', tempOrder.total_price);
        console.log('💰 points_used:', tempOrder.points_used);

        if (orderAmount <= 0) {
            console.log('金额无效');
            inlineContainer.innerHTML = '<div style="text-align:center;padding:12px;color:#dc3545;font-size:14px;">金额计算错误</div>';
            return;
        }

        // 创建新的 PaymentRequest（使用正确金额）
        const newPaymentRequest = stripe.paymentRequest({
            country: 'JP',
            currency: 'jpy',
            total: {
                label: 'Trip7湯沢温泉ホテル - 宿泊予約',
                amount: orderAmount,
            },
            requestPayerName: true,
            requestPayerEmail: true,
            disableWallets: ['googlePay'],  // 禁用 Google Pay，保留 Apple Pay + Link
        });

        // 保存到全局变量
        window.currentPaymentRequest = newPaymentRequest;

        // 再次检查可用性
        const canPayResult = await newPaymentRequest.canMakePayment();
        if (!canPayResult) {
            console.log('Payment Request 不可用');
            inlineContainer.style.display = 'none';
            return;
        }

        // 清空容器
        inlineContainer.innerHTML = '';

        // 创建 Payment Request Button
        const prButton = stripe.elements().create('paymentRequestButton', {
            paymentRequest: newPaymentRequest,
            style: {
                paymentRequestButton: {
                    type: 'default',
                    theme: 'dark',
                    height: '48px',
                },
            },
        });

        // 挂载按钮
        prButton.mount('#payment-request-button-inline');
        paymentRequestButtonMounted = true;
        console.log('✓ Payment Request Button 已挂载（金额: ¥' + orderAmount + '）');

        // 监听支付事件（使用闭包访问已获取的 tempOrder 数据）
        newPaymentRequest.on('paymentmethod', async (ev) => {
            console.log('=== Apple Pay / Google Pay 支付开始 ===');
            console.log('Payment Method:', ev.paymentMethod);

            try {
                // 使用已经从数据库获取的订单数据（与信用卡支付一致）
                console.log('💰 使用数据库订单数据');
                console.log('💰 订单编号:', tempOrder.order_code);
                console.log('💰 支付金额:', orderAmount);

                // 构建订单数据（与信用卡支付格式一致）
                const orderData = {
                    userId: tempOrder.user_id,
                    bookerEmail: tempOrder.guest_email,
                    guestLastName: tempOrder.guest_last_name,
                    guestFirstName: tempOrder.guest_first_name,
                    guestLastNameKana: tempOrder.guest_last_name_katakana || '',
                    guestFirstNameKana: tempOrder.guest_first_name_katakana || '',
                    roomType: tempOrder.room_type_name || 'ツインルーム',
                    roomTypeCode: tempOrder.room_type_code,
                    checkinDate: tempOrder.checkin_date,
                    checkoutDate: tempOrder.checkout_date,
                    adults: tempOrder.num_adults,
                    children: tempOrder.num_children || 0,
                    numRooms: tempOrder.num_rooms || 1,
                    totalPrice: parseFloat(tempOrder.total_price),
                    roomPrice: parseFloat(tempOrder.room_price),
                    final_amount: parseFloat(tempOrder.final_amount),
                    points_used: parseInt(tempOrder.points_used) || 0,
                    service_cost: parseFloat(tempOrder.service_cost) || 0,
                    orderCode: tempOrder.order_code
                };

                // 创建 PaymentIntent
                const response = await fetch(window.getApiUrl('/stripe/create-payment-intent'), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        amount: orderAmount,
                        currency: 'jpy',
                        paymentMethodType: 'card',
                        tempOrderCode: tempOrder.order_code,
                        orderData: orderData
                    })
                });

                const apiResult = await response.json();
                console.log('PaymentIntent API 响应:', apiResult);

                if (!apiResult.success) {
                    throw new Error(apiResult.message || 'PaymentIntent 创建失败');
                }

                const clientSecret = apiResult.data.clientSecret;
                if (!clientSecret) {
                    throw new Error('未获取到 clientSecret');
                }

                // 确认支付
                const { paymentIntent, error: confirmError } = await stripe.confirmCardPayment(
                    clientSecret,
                    { payment_method: ev.paymentMethod.id },
                    { handleActions: false }
                );

                if (confirmError) {
                    ev.complete('fail');
                    throw new Error(confirmError.message);
                }

                if (paymentIntent.status === 'requires_action') {
                    // 需要额外验证
                    const { error: actionError } = await stripe.confirmCardPayment(clientSecret);
                    if (actionError) {
                        ev.complete('fail');
                        throw new Error(actionError.message);
                    }
                }

                // 支付成功
                ev.complete('success');
                console.log('✓ Apple Pay / Google Pay 支付成功');

                // 检查是否为 TL-Lincoln 模式
                const isTLLincolnOrder = apiProvider === 'tl-lincoln' || (tempOrder.order_code && tempOrder.order_code.startsWith('TL'));

                if (isTLLincolnOrder) {
                    // TL-Lincoln 模式：调用 TL-Lincoln API 创建订单
                    console.log('📡 TL-Lincoln mode: 调用 TL-Lincoln API 创建订单');

                    // 保存 PaymentIntent ID
                    window.lastPaymentIntentId = paymentIntent.id;

                    // 设置必要的全局变量
                    window.currentOrderData = tempOrder;
                    window.currentTempOrderData = tempOrder;

                    // 调用 submitFinalBooking 创建 TL-Lincoln 订单
                    if (typeof window.submitFinalBooking === 'function') {
                        try {
                            const orderResult = await window.submitFinalBooking();
                            console.log('✅ TL-Lincoln 订单创建成功:', orderResult);

                            // 存储订单数据到 sessionStorage
                            const tlOrderData = {
                                order_code: window.bookingOrderCode,
                                ...window.bookingOrderData,
                                ...tempOrder,
                                payment_status: 'paid',
                                source: 'tl-lincoln'
                            };
                            sessionStorage.setItem('tl_lincoln_order', JSON.stringify(tlOrderData));

                            // 跳转到成功页面（使用不带 .html 后缀的 URL）
                            window.location.href = `reservation-success.html?orderCode=${window.bookingOrderCode}&source=tl-lincoln`;
                            return;
                        } catch (tlError) {
                            console.error('❌ TL-Lincoln 订单创建失败:', tlError);
                            alert('決済は成功しましたが、予約の作成に失敗しました。\n\nお手数ですが、カスタマーサポートにお問い合わせください。\n\nエラー: ' + tlError.message);
                            return;
                        }
                    }
                } else {
                    // 自社 API 模式：完成临时订单
                    if (tempOrder.order_code) {
                        const completeResponse = await fetch(window.getApiUrl(`/order-temp/${tempOrder.order_code}/complete-payment`), {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                paymentIntentId: paymentIntent.id,
                                paymentMethod: expressPaymentType === 'applePay' ? 'apple_pay' : 'google_pay'
                            })
                        });
                        const completeResult = await completeResponse.json();

                        // 检查是否成功，处理库存不足等错误
                        if (!completeResult.success) {
                            const errorMsg = completeResult.message || '';
                            if (errorMsg.includes('库存不足') || errorMsg.includes('在庫') || errorMsg.includes('inventory')) {
                                window.location.href = `reservation-failed.html?error=inventory&orderCode=${tempOrder.order_code}&refunded=true`;
                                return;
                            }
                            // 其他错误跳转到失败页面
                            window.location.href = `reservation-failed.html?error=system&orderCode=${tempOrder.order_code}&message=${encodeURIComponent(errorMsg)}`;
                            return;
                        }
                    }

                    // 跳转到成功页面（使用不带 .html 后缀的 URL）
                    window.location.href = `reservation-success.html?orderCode=${tempOrder.order_code || ''}&payment_intent=${paymentIntent.id}`;
                }

            } catch (error) {
                console.error('Apple Pay / Google Pay 支付失败:', error);
                ev.complete('fail');
                // 检查是否是库存不足错误
                const errorMsg = error.message || '';
                if (errorMsg.includes('库存不足') || errorMsg.includes('在庫') || errorMsg.includes('inventory')) {
                    window.location.href = `reservation-failed.html?error=inventory&orderCode=${tempOrder?.order_code || ''}&refunded=true`;
                    return;
                }
                alert('支払いに失敗しました: ' + error.message);
            }
        });
    } catch (error) {
        console.error('挂载 Payment Request Button 失败:', error);
    }
}

// 导出函数
window.mountPaymentRequestButton = mountPaymentRequestButton;

/**
 * 初始化 Apple Pay / Google Pay 支付
 * @param {Object} orderData - 订单数据
 * @param {string} paymentType - 'applepay' 或 'googlepay'
 */
async function initializeExpressPayment(orderData, paymentType) {
    try {
        console.log('=== 初始化 Express Payment ===');
        console.log('支付类型:', paymentType);
        console.log('订单数据:', orderData);

        if (!stripe) {
            await initializeStripe();
        }

        // 计算总金额
        const totalAmount = calculateTotalAmount(orderData);
        console.log('计算的总金额:', totalAmount);

        if (!totalAmount || totalAmount <= 0) {
            throw new Error('金额计算错误: ' + totalAmount);
        }

        // 获取临时订单号
        const tempOrderCode = window.OrderTemp && window.OrderTemp.getTempOrderCode
            ? window.OrderTemp.getTempOrderCode()
            : null;

        // 创建 PaymentRequest
        paymentRequest = stripe.paymentRequest({
            country: 'JP',
            currency: 'jpy',
            total: {
                label: 'Trip7湯沢温泉ホテル - 宿泊予約',
                amount: totalAmount,
            },
            requestPayerName: true,
            requestPayerEmail: true,
            requestPayerPhone: true,
        });

        // 检查是否可以使用该支付方式
        const canMakePayment = await paymentRequest.canMakePayment();
        console.log('=== initializeExpressPayment canMakePayment ===');
        console.log('canMakePayment 结果:', canMakePayment);
        console.log('applePay:', canMakePayment?.applePay);
        console.log('googlePay:', canMakePayment?.googlePay);

        if (!canMakePayment) {
            console.error('当前设备/浏览器不支持此支付方式');
            console.log('可能原因: 1.Chrome未登录Google账户 2.未启用"允许网站检查付款方式" 3.未保存信用卡');
            showExpressPaymentUnavailable();
            return false;
        }

        // 显示支付区域
        const expressSection = document.getElementById('expressPaymentSection');
        const unavailableDiv = document.getElementById('express-payment-unavailable');
        const buttonContainer = document.getElementById('payment-request-button');

        if (expressSection) {
            expressSection.style.display = 'block';
        }
        if (unavailableDiv) {
            unavailableDiv.style.display = 'none';
        }

        // 更新标题图标
        const icon = document.getElementById('expressPayIcon');
        const title = document.getElementById('expressPayTitle');
        if (paymentType === 'applepay') {
            if (icon) icon.className = 'fab fa-apple';
            if (title) title.textContent = window.i18n ? window.i18n.t('pay_with_apple') : 'Apple Pay で支払う';
        } else {
            if (icon) icon.className = 'fab fa-google';
            if (title) title.textContent = window.i18n ? window.i18n.t('pay_with_google') : 'Google Pay で支払う';
        }

        // 创建并挂载 Payment Request Button
        if (paymentRequestButton) {
            paymentRequestButton.unmount();
        }

        paymentRequestButton = elements ? elements.create('paymentRequestButton', {
            paymentRequest: paymentRequest,
            style: {
                paymentRequestButton: {
                    type: 'default',
                    theme: 'dark',
                    height: '48px',
                },
            },
        }) : stripe.elements().create('paymentRequestButton', {
            paymentRequest: paymentRequest,
            style: {
                paymentRequestButton: {
                    type: 'default',
                    theme: 'dark',
                    height: '48px',
                },
            },
        });

        // 清空按钮容器
        if (buttonContainer) {
            buttonContainer.innerHTML = '';
            paymentRequestButton.mount('#payment-request-button');
            console.log('✓ Payment Request Button 已挂载');
        }

        // 处理支付方式选择事件
        paymentRequest.on('paymentmethod', async (ev) => {
            console.log('=== 用户选择了支付方式 ===');
            console.log('PaymentMethod:', ev.paymentMethod);

            try {
                // 显示处理中状态
                showProcessingStatus();

                // 准备支付数据
                const paymentData = {
                    amount: totalAmount,
                    currency: 'jpy',
                    orderData: {
                        orderCode: tempOrderCode || orderData.orderCode || generateOrderCode(),
                        userId: orderData.userId || null,
                        guestLastName: orderData.guestLastName || '',
                        guestFirstName: orderData.guestFirstName || '',
                        guestLastNameKatakana: orderData.guestLastNameKatakana || '',
                        guestFirstNameKatakana: orderData.guestFirstNameKatakana || '',
                        bookerEmail: ev.payerEmail || orderData.bookerEmail,
                        guestEmail: ev.payerEmail || orderData.bookerEmail,
                        guestPhone: ev.payerPhone || orderData.guestPhone || '',
                        phoneCountryCode: orderData.phoneCountryCode || '+81',
                        country: orderData.country || 'JP',
                        postalCode: orderData.postalCode || '',
                        prefecture: orderData.prefecture || '',
                        city: orderData.city || '',
                        addressLine: orderData.addressLine || '',
                        roomType: orderData.roomType,
                        roomTypeCode: orderData.roomTypeCode || '',
                        checkinDate: orderData.checkinDate,
                        checkoutDate: orderData.checkoutDate,
                        numRooms: orderData.numRooms || 1,
                        adults: orderData.adults,
                        children: orderData.children || 0,
                        roomPrice: orderData.roomPrice || 0,
                        breakfastSelected: orderData.breakfastSelected || false,
                        dinnerSelected: orderData.dinnerSelected || false,
                        privateBathSelected: orderData.privateBathSelected || false,
                        serviceCost: orderData.serviceCost || 0,
                        specialRequests: orderData.specialRequests || '',
                    }
                };

                // 创建 PaymentIntent
                const response = await fetch(window.getApiUrl('/stripe/create-payment-intent'), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(paymentData)
                });

                const result = await response.json();

                if (!result.success) {
                    throw new Error(result.message || 'PaymentIntent 作成に失敗しました');
                }

                const clientSecret = result.data.clientSecret;
                console.log('PaymentIntent 作成成功');

                // 确认支付
                const { error, paymentIntent } = await stripe.confirmCardPayment(
                    clientSecret,
                    { payment_method: ev.paymentMethod.id },
                    { handleActions: false }
                );

                if (error) {
                    console.error('支付确认错误:', error);
                    ev.complete('fail');
                    hideProcessingStatus();
                    showExpressPaymentError(error.message);
                    return;
                }

                if (paymentIntent.status === 'requires_action') {
                    // 需要额外验证（3D Secure）
                    const { error: confirmError } = await stripe.confirmCardPayment(clientSecret);
                    if (confirmError) {
                        ev.complete('fail');
                        hideProcessingStatus();
                        showExpressPaymentError(confirmError.message);
                        return;
                    }
                }

                // 支付成功
                ev.complete('success');
                console.log('✅ Express Payment 支付成功！');

                // 保存 PaymentIntent ID
                window.lastPaymentIntentId = paymentIntent.id;

                // 创建订单
                await createOrderAfterPayment(paymentIntent);

                // 等待订单确认
                await waitForOrderConfirmation(window.bookingOrderCode);

            } catch (error) {
                console.error('Express Payment 处理错误:', error);
                ev.complete('fail');
                hideProcessingStatus();
                showExpressPaymentError(error.message);
            }
        });

        // 处理取消事件
        paymentRequest.on('cancel', () => {
            console.log('用户取消了 Express Payment');
        });

        console.log('✓ Express Payment 初始化完成');
        return true;

    } catch (error) {
        console.error('初始化 Express Payment 错误:', error);
        showExpressPaymentError(error.message);
        return false;
    }
}

/**
 * 显示 Express Payment 不可用消息
 */
function showExpressPaymentUnavailable() {
    const expressSection = document.getElementById('expressPaymentSection');
    const unavailableDiv = document.getElementById('express-payment-unavailable');
    const buttonContainer = document.getElementById('payment-request-button');

    if (expressSection) {
        expressSection.style.display = 'block';
    }
    if (unavailableDiv) {
        unavailableDiv.style.display = 'block';
    }
    if (buttonContainer) {
        buttonContainer.style.display = 'none';
    }
}

/**
 * 显示 Express Payment 错误
 */
function showExpressPaymentError(message) {
    const errorDiv = document.getElementById('express-payment-errors');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';

        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    }
}

/**
 * 处理 Apple Pay / Google Pay 支付流程
 * @param {string} paymentType - 'applepay' 或 'googlepay'
 */
async function proceedWithExpressPayment(paymentType) {
    console.log('=== 开始 Express Payment 流程 ===');
    console.log('支付类型:', paymentType);

    try {
        // 收集表单数据
        const formData = typeof window.collectFormData === 'function' ? window.collectFormData() : {};

        // 获取 URL 参数
        const urlParams = new URLSearchParams(window.location.search);

        // 准备订单数据
        const orderData = {
            userId: null,
            guestLastName: formData.guestLastName || '',
            guestFirstName: formData.guestFirstName || '',
            guestLastNameKatakana: formData.guestLastNameKatakana || formData.guestLastNameKana || '',
            guestFirstNameKatakana: formData.guestFirstNameKatakana || formData.guestFirstNameKana || '',
            bookerEmail: formData.bookerEmail,
            guestPhone: formData.guestPhone || formData.bookerPhone || '',
            phoneCountryCode: formData.phoneCountryCode || '+81',
            country: formData.country || 'JP',
            postalCode: formData.postalCode || '',
            prefecture: formData.prefecture || '',
            city: formData.city || '',
            addressLine: formData.addressLine || '',
            roomType: formData.roomType || formData.room_type_name || window.currentTempOrderData?.room_type_name || '',
            roomTypeCode: formData.roomTypeCode || '',
            checkinDate: formData.checkinDate,
            checkoutDate: formData.checkoutDate,
            numRooms: formData.numRooms || 1,
            adults: formData.adults,
            children: formData.children || 0,
            roomPrice: formData.roomPrice || 0,
            final_amount: window.currentTempOrderData?.final_amount,
            totalPrice: window.currentTempOrderData?.total_price,
            points_used: window.currentTempOrderData?.points_used || 0,
            breakfastSelected: formData.breakfast || false,
            dinnerSelected: formData.dinner || false,
            privateBathSelected: formData.privateBath || false,
            serviceCost: formData.serviceCost || 0,
            specialRequests: formData.specialRequests || '',
        };

        // 尝试获取登录用户信息
        try {
            const currentUser = window.safeStorage?.getItem('currentUser');
            if (currentUser) {
                const userData = JSON.parse(currentUser);
                orderData.userId = userData.user_id;
            }
        } catch (e) {
            console.log('未找到登录用户');
        }

        // 初始化 Express Payment
        const success = await initializeExpressPayment(orderData, paymentType);

        if (!success) {
            console.error('Express Payment 初始化失败');
        }

    } catch (error) {
        console.error('Express Payment 流程错误:', error);
        showExpressPaymentError(error.message);
    }
}

// 页面加载时检测 Apple Pay / Google Pay 可用性
document.addEventListener('DOMContentLoaded', function() {
    // 延迟检测，确保 Stripe 已初始化
    setTimeout(() => {
        checkExpressPaymentAvailability();
    }, 1000);
});

// ==================== Express Checkout Element ====================

/**
 * 在 Express Checkout 按钮上显示加载动画
 */
function showExpressCheckoutLoading() {
    const container = document.getElementById('express-checkout-element');
    if (!container) return;

    // 创建加载覆盖层
    let loadingOverlay = document.getElementById('express-checkout-loading');
    if (!loadingOverlay) {
        loadingOverlay = document.createElement('div');
        loadingOverlay.id = 'express-checkout-loading';
        loadingOverlay.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(255, 255, 255, 0.9);
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 4px;
            z-index: 10;
        `;
        loadingOverlay.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px; color: #333; font-size: 14px;">
                <i class="fas fa-spinner fa-spin" style="font-size: 18px;"></i>
                <span>処理中...</span>
            </div>
        `;

        // 确保容器有相对定位
        container.style.position = 'relative';
        container.appendChild(loadingOverlay);
    }
    loadingOverlay.style.display = 'flex';
}

/**
 * 隐藏 Express Checkout 加载动画
 */
function hideExpressCheckoutLoading() {
    const loadingOverlay = document.getElementById('express-checkout-loading');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
    }
}

/**
 * 初始化 Express Checkout Element (Apple Pay, Google Pay, Link 官方按钮)
 * 在进入 Step 3 时调用
 */
async function initializeExpressCheckoutElement() {
    console.log('>>> initializeExpressCheckoutElement 开始');

    // Reset ready state
    expressCheckoutReady = false;

    const container = document.getElementById('express-checkout-element');
    if (!container) {
        console.log('找不到 express-checkout-element 容器');
        expressCheckoutReady = true; // 没有容器，视为已准备好
        return Promise.resolve();
    }

    // Create a Promise that will resolve when Express Checkout is ready
    const readyPromise = new Promise((resolve) => {
        expressCheckoutReadyResolver = resolve;
    });

    try {
        // 初始化 Stripe
        if (!stripe) {
            await initializeStripe();
        }

        if (!stripe) {
            console.error('Stripe 初始化失败');
            container.innerHTML = '';
            expressCheckoutReady = true;
            if (expressCheckoutReadyResolver) { expressCheckoutReadyResolver(); expressCheckoutReadyResolver = null; }
            return Promise.resolve();
        }

        // 获取订单数据
        const apiProvider = window.getApiProvider ? window.getApiProvider() : 'local';
        let tempOrder = null;

        if (apiProvider === 'tl-lincoln') {
            // TL-Lincoln 模式下从内存读取数据（客人信息已在 saveOrderDraft 中保存）
            console.log('=== TL-Lincoln mode: Express Checkout 从内存读取 ===');
            const orderData = window.currentOrderData || window.currentTempOrderData || {};
            const urlParams = new URLSearchParams(window.location.search);

            tempOrder = {
                order_code: 'TL' + Date.now() + Math.random().toString(36).substr(2, 4).toUpperCase(),
                user_id: null,
                guest_email: orderData.guest_email || '',
                guest_last_name: orderData.guest_last_name || '',
                guest_first_name: orderData.guest_first_name || '',
                guest_last_name_katakana: orderData.guest_last_name_katakana || '',
                guest_first_name_katakana: orderData.guest_first_name_katakana || '',
                guest_phone: orderData.guest_phone || '',
                phone_country_code: orderData.phone_country_code || '+81',
                room_type_name: orderData.room_type_name || '',
                room_type_code: orderData.room_type_code || urlParams.get('code') || '',
                checkin_date: orderData.checkin_date || urlParams.get('checkin') || '',
                checkout_date: orderData.checkout_date || urlParams.get('checkout') || '',
                num_adults: orderData.num_adults || parseInt(urlParams.get('adults')) || 2,
                num_children: orderData.num_children || parseInt(urlParams.get('children')) || 0,
                num_children_preschool: orderData.num_children_preschool || parseInt(urlParams.get('childrenPreschool')) || 0,
                num_children_elementary: orderData.num_children_elementary || parseInt(urlParams.get('childrenElementary')) || 0,
                num_rooms: orderData.num_rooms || parseInt(urlParams.get('rooms')) || 1,
                total_price: orderData.total_price || 0,
                final_amount: orderData.total_price || 0,
                points_used: 0,
                tl_room_type_code: orderData.tl_room_type_code || '',
                tl_rate_plan_code: orderData.tl_rate_plan_code || orderData.plan_code || ''
            };
            console.log('✅ TL-Lincoln Express Checkout 订单数据:', tempOrder);
        } else {
            // 自社 API 模式：从数据库读取
            const tempOrderCode = window.OrderTemp && window.OrderTemp.getTempOrderCode
                ? window.OrderTemp.getTempOrderCode()
                : window.currentTempOrderCode;

            if (!tempOrderCode) {
                console.log('临时订单不存在，等待...');
                container.innerHTML = '<div style="text-align:center;padding:12px;color:#999;font-size:14px;">読み込み中...</div>';
                expressCheckoutReady = true;
                if (expressCheckoutReadyResolver) { expressCheckoutReadyResolver(); expressCheckoutReadyResolver = null; }
                return Promise.resolve();
            }

            const response = await fetch(window.getApiUrl(`/order-temp/${tempOrderCode}`), {
                credentials: 'include'
            });
            const result = await response.json();

            if (!result.success || !result.data) {
                console.log('无法读取订单数据');
                container.innerHTML = '';
                expressCheckoutReady = true;
                if (expressCheckoutReadyResolver) { expressCheckoutReadyResolver(); expressCheckoutReadyResolver = null; }
                return Promise.resolve();
            }

            tempOrder = result.data;
        }
        const orderAmountRaw = (tempOrder.final_amount ?? tempOrder.total_price ?? 0);
        const orderAmount = Math.round(parseFloat(orderAmountRaw) || 0);

        console.log('💰 Express Checkout 金额:', orderAmount, '日元');

        if (orderAmount <= 0) {
            console.log('金额无效');
            container.innerHTML = '';
            expressCheckoutReady = true;
            if (expressCheckoutReadyResolver) { expressCheckoutReadyResolver(); expressCheckoutReadyResolver = null; }
            return Promise.resolve();
        }

        // 构建订单数据
        const orderData = {
            userId: tempOrder.user_id,
            orderCode: tempOrder.order_code,
            bookerEmail: tempOrder.guest_email,
            guestLastName: tempOrder.guest_last_name,
            guestFirstName: tempOrder.guest_first_name,
            guestLastNameKatakana: tempOrder.guest_last_name_katakana || '',
            guestFirstNameKatakana: tempOrder.guest_first_name_katakana || '',
            guestPhone: tempOrder.guest_phone || '',
            phoneCountryCode: tempOrder.phone_country_code || '+81',
            country: tempOrder.country || '',
            postalCode: tempOrder.postal_code || '',
            prefecture: tempOrder.prefecture || '',
            city: tempOrder.city || '',
            addressLine: tempOrder.address_line || '',
            roomType: tempOrder.room_type_name || 'ツインルーム',
            roomTypeCode: tempOrder.room_type_code,
            checkinDate: tempOrder.checkin_date,
            checkoutDate: tempOrder.checkout_date,
            adults: tempOrder.num_adults,
            children: tempOrder.num_children || 0,
            numRooms: tempOrder.num_rooms || 1,
            totalPrice: parseFloat(tempOrder.total_price),
            roomPrice: parseFloat(tempOrder.room_price),
            final_amount: parseFloat(tempOrder.final_amount),
            points_used: parseInt(tempOrder.points_used) || 0,
            serviceCost: parseFloat(tempOrder.service_cost) || 0,
            breakfastSelected: tempOrder.breakfast_selected,
            dinnerSelected: tempOrder.dinner_selected,
            privateBathSelected: tempOrder.private_bath_selected,
            specialRequests: tempOrder.special_requests || ''
        };

        // 创建 PaymentIntent
        const piResponse = await fetch(window.getApiUrl('/stripe/create-payment-intent'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                amount: orderAmount,
                currency: 'jpy',
                paymentMethodType: 'card',
                tempOrderCode: tempOrder.order_code,
                orderData: orderData
            })
        });

        const piResult = await piResponse.json();

        if (!piResult.success) {
            throw new Error(piResult.message || 'PaymentIntent 作成失敗');
        }

        const expressClientSecret = piResult.data.clientSecret;
        console.log('✅ Express Checkout PaymentIntent 作成成功');

        // 创建 Elements 实例
        const appearance = {
            theme: 'stripe',
            variables: {
                colorPrimary: '#00D924',
                borderRadius: '4px'
            }
        };

        expressCheckoutElementsInstance = stripe.elements({
            clientSecret: expressClientSecret,
            appearance
        });

        // 创建 Express Checkout Element
        expressCheckoutElement = expressCheckoutElementsInstance.create('expressCheckout', {
            buttonType: {
                applePay: 'plain',
                googlePay: 'plain',
                paypal: 'paypal'
            },
            buttonTheme: {
                applePay: 'black',
                googlePay: 'black'
            },
            layout: {
                maxColumns: 1,
                maxRows: 4
            },
            paymentMethods: {
                applePay: 'auto',
                googlePay: 'auto',
                link: 'auto',
                paypal: 'auto'
            }
        });

        // 挂载到容器
        expressCheckoutElement.mount('#express-checkout-element');
        console.log('✅ Express Checkout Element 已挂载');

        // 监听 confirm 事件
        expressCheckoutElement.on('confirm', async (event) => {
            console.log('>>> Express Checkout confirm 事件:', event);

            // 检查是否为 TL-Lincoln 模式
            const isTLLincolnOrder = apiProvider === 'tl-lincoln' || (tempOrder.order_code && tempOrder.order_code.startsWith('TL'));

            try {
                // 在 Express Checkout 按钮上显示加载动画
                showExpressCheckoutLoading();

                // TL-Lincoln 模式：在 redirect 前保存数据到 sessionStorage
                if (isTLLincolnOrder) {
                    console.log('📡 TL-Lincoln mode: 保存订单数据到 sessionStorage (Express Checkout)');
                    const tlOrderData = {
                        ...tempOrder,
                        source: 'tl-lincoln',
                        pending_creation: true // 标记需要在成功页面创建订单
                    };
                    sessionStorage.setItem('tl_lincoln_order', JSON.stringify(tlOrderData));
                }

                // 确定重定向 URL
                const returnUrl = isTLLincolnOrder
                    ? `${window.location.origin}/reservation-success.html?orderCode=${tempOrder.order_code}&source=tl-lincoln`
                    : getSuccessReturnUrl(tempOrder.order_code);

                // 确认支付
                const { error, paymentIntent } = await stripe.confirmPayment({
                    elements: expressCheckoutElementsInstance,
                    clientSecret: expressClientSecret,
                    redirect: 'always',
                    confirmParams: {
                        return_url: returnUrl
                    }
                });

                if (error) {
                    console.error('Express Checkout 支付错误:', error);
                    hideProcessingStatus();
                    // 清除 sessionStorage
                    if (isTLLincolnOrder) {
                        sessionStorage.removeItem('tl_lincoln_order');
                    }
                    alert('決済エラー: ' + error.message);
                    return;
                }

                console.log('Express Checkout PaymentIntent:', paymentIntent);

                // 支付成功
                if (paymentIntent && paymentIntent.status === 'succeeded') {
                    console.log('✅ Express Checkout 支付成功！');

                    // 保存 PaymentIntent ID
                    window.lastPaymentIntentId = paymentIntent.id;
                    console.log('✓ 已保存 PaymentIntent ID:', window.lastPaymentIntentId);

                    try {
                        // 创建订单
                        await createOrderAfterPayment(paymentIntent);

                        // 验证订单号
                        if (!window.bookingOrderCode) {
                            throw new Error('订单创建成功但订单号未设置');
                        }

                        // 等待订单确认
                        await waitForOrderConfirmation(window.bookingOrderCode);
                    } catch (orderError) {
                        console.error('订单创建失败:', orderError);
                        hideProcessingStatus();
                        alert('決済は成功しましたが、予約の作成に失敗しました。\n\nお手数ですが、カスタマーサポートにお問い合わせください。\n\nエラー: ' + orderError.message);
                    }
                } else if (paymentIntent && paymentIntent.status === 'processing') {
                    console.log('支付处理中...');
                    alert('決済を処理しています。しばらくお待ちください。');
                } else if (paymentIntent && paymentIntent.status === 'requires_action') {
                    console.log('需要额外操作...');
                    // Stripe 会自动处理重定向
                }
            } catch (err) {
                console.error('Express Checkout 确认错误:', err);
                hideProcessingStatus();
                // 清除 sessionStorage
                if (isTLLincolnOrder) {
                    sessionStorage.removeItem('tl_lincoln_order');
                }
                alert('決済処理中にエラーが発生しました: ' + err.message);
            }
        });

        // 监听 cancel 事件
        expressCheckoutElement.on('cancel', () => {
            console.log('>>> Express Checkout 已取消');
        });

        // 监听 ready 事件
        expressCheckoutElement.on('ready', (event) => {
            console.log('>>> Express Checkout ready:', event);
            // 如果没有可用的支付方式，隐藏容器
            if (!event.availablePaymentMethods || Object.keys(event.availablePaymentMethods).length === 0) {
                container.style.display = 'none';
            }
            // Mark as ready and resolve the promise
            expressCheckoutReady = true;
            if (expressCheckoutReadyResolver) {
                expressCheckoutReadyResolver();
                expressCheckoutReadyResolver = null;
            }
        });

        // Return the ready promise with a timeout fallback
        return Promise.race([
            readyPromise,
            new Promise((resolve) => setTimeout(() => {
                console.log('>>> Express Checkout ready timeout (5s), proceeding anyway');
                expressCheckoutReady = true;
                resolve();
            }, 5000))
        ]);

    } catch (error) {
        console.error('初始化 Express Checkout Element 失败:', error);
        container.innerHTML = '';
        // Mark as ready even on error so the flow can continue
        expressCheckoutReady = true;
        if (expressCheckoutReadyResolver) {
            expressCheckoutReadyResolver();
            expressCheckoutReadyResolver = null;
        }
        return Promise.resolve();
    }
}

// 隐藏处理中状态
function hideProcessingStatus() {
    const processing = document.getElementById('paymentProcessing');
    if (processing) {
        processing.style.display = 'none';
    }
}

// 处理支付宝支付
async function proceedWithAlipayPayment() {
    // 获取点击的按钮并显示加载状态
    const clickedBtn = document.querySelector('.payment-btn[data-payment="alipay"]');
    let originalBtnContent = '';
    if (clickedBtn) {
        originalBtnContent = clickedBtn.innerHTML;
        clickedBtn.disabled = true;
        clickedBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> <span class="payment-btn-text">処理中...</span>`;
    }

    try {
        console.log('=== 开始支付宝支付流程 ===');
        console.log('当前 stripe 对象:', stripe);
        console.log('stripePublishableKey:', stripePublishableKey);

        // 确保 Stripe 已初始化
        if (!stripe) {
            console.log('Stripe 未初始化，正在初始化...');

            // 如果已有 publishableKey，直接创建 stripe 对象
            if (stripePublishableKey) {
                console.log('使用已有的 publishableKey 创建 Stripe 对象');
                stripe = Stripe(stripePublishableKey);
            } else {
                // 否则从后端获取
                try {
                    console.log('从后端获取 Stripe 配置...');
                    const response = await fetch(window.getApiUrl('/stripe/config'));
                    console.log('API 响应状态:', response.status);
                    const data = await response.json();
                    console.log('API 响应数据:', data);

                    if (data.success && data.data.publishableKey) {
                        stripePublishableKey = data.data.publishableKey;
                        stripe = Stripe(stripePublishableKey);
                        console.log('Stripe 初始化成功');
                    } else {
                        throw new Error('获取 Stripe 配置失败: ' + JSON.stringify(data));
                    }
                } catch (initError) {
                    console.error('Stripe 初始化异常:', initError);
                    throw new Error('Stripe の初期化に失敗しました: ' + initError.message);
                }
            }
        }

        if (!stripe) {
            throw new Error('Stripe の初期化に失敗しました。ページを再読み込みしてください。');
        }

        console.log('Stripe 初始化完成，继续支付流程');

        // 收集订单数据
        const formData = collectFormData();
        console.log('收集到的表单数据:', formData);

        // 获取用户信息（如果已登录）
        let userId = null;
        try {
            const currentUser = window.safeStorage.getItem('currentUser');
            if (currentUser) {
                const userData = JSON.parse(currentUser);
                userId = userData.user_id;
            }
        } catch (e) {
            console.log('未找到登录用户');
        }

        // 使用已创建的临时订单的 orderCode，或者在 TL-Lincoln 模式下生成临时订单号
        let existingOrderCode = window.currentTempOrderData?.order_code;
        const apiProvider = window.getApiProvider ? window.getApiProvider() : 'local';
        if (!existingOrderCode) {
            if (apiProvider === 'tl-lincoln') {
                existingOrderCode = 'TL' + Date.now() + Math.random().toString(36).substr(2, 4).toUpperCase();
                console.log('📡 TL-Lincoln mode: 生成临时订单号:', existingOrderCode);
            } else {
                throw new Error('临时订单未创建，请先完成预订信息填写');
            }
        }
        console.log('使用订单号:', existingOrderCode);

        const urlParams = new URLSearchParams(window.location.search);

        const orderData = {
            userId: userId,
            orderCode: existingOrderCode,
            guestLastName: formData.guestLastName || '',
            guestFirstName: formData.guestFirstName || '',
            guestLastNameKatakana: formData.guestLastNameKatakana || formData.guestLastNameKana || '',
            guestFirstNameKatakana: formData.guestFirstNameKatakana || formData.guestFirstNameKana || '',
            bookerEmail: formData.bookerEmail,
            guestEmail: formData.bookerEmail,
            guestPhone: formData.guestPhone || formData.bookerPhone || '',
            phoneCountryCode: formData.phoneCountryCode || formData.phone_country_code || '+81',
            country: formData.country || '',
            postalCode: formData.postalCode || formData.postal_code || '',
            prefecture: formData.prefecture || '',
            city: formData.city || '',
            addressLine: formData.addressLine || formData.address_line || '',
            roomType: formData.roomType || formData.room_type_name || window.currentTempOrderData?.room_type_name || '',
            roomTypeCode: formData.roomTypeCode || formData.room_type_code || '',
            checkinDate: formData.checkinDate,
            checkoutDate: formData.checkoutDate,
            numRooms: formData.numRooms || formData.num_rooms || 1,
            adults: formData.adults,
            children: formData.children || 0,
            roomPrice: formData.roomPrice || 0,
            final_amount: window.currentTempOrderData?.final_amount,
            totalPrice: window.currentTempOrderData?.total_price,
            points_used: window.currentTempOrderData?.points_used || 0,
            breakfastSelected: formData.breakfast || false,
            dinnerSelected: formData.dinner || false,
            privateBathSelected: formData.privateBath || false,
            serviceCost: formData.serviceCost || formData.service_cost || 0,
            specialRequests: formData.specialRequests || formData.special_requests || '',
            services: []
        };

        // 添加选择的服务
        if (formData.breakfast) {
            orderData.services.push({ name: '朝食バイキング', price: 2000, quantity: parseInt(formData.adults) });
        }
        if (formData.dinner) {
            orderData.services.push({ name: '夕食コース', price: 4500, quantity: parseInt(formData.adults) });
        }
        if (formData.privateBath) {
            orderData.services.push({ name: '貸切風呂', price: 3000, quantity: 1 });
        }

        console.log('订单数据:', orderData);

        // 计算总金额
        const totalAmount = calculateTotalAmount(orderData);
        console.log('💳 支付宝支付金额:', totalAmount);

        if (!totalAmount || totalAmount <= 0) {
            throw new Error('金额计算错误 (Invalid amount calculated): ' + totalAmount);
        }

        // 准备支付数据 - 支付宝
        const paymentData = {
            amount: totalAmount,
            currency: 'jpy',
            paymentMethodType: 'alipay',
            orderData: orderData
        };

        console.log('准备发送的支付数据:', JSON.stringify(paymentData, null, 2));

        // 调用后端API创建PaymentIntent
        const response = await fetch(window.getApiUrl('/stripe/create-payment-intent'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(paymentData)
        });

        // 先检查 HTTP 状态码
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ API エラー:', response.status, errorText);
            throw new Error(`サーバーエラー: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.message || 'PaymentIntentの作成に失敗しました');
        }

        const clientSecret = result.data.clientSecret;
        const paymentIntentId = result.data.paymentIntentId;
        console.log('PaymentIntent作成成功, client_secret:', clientSecret, 'paymentIntentId:', paymentIntentId);

        // 支付宝は redirect 型の支付方式 — 確認後ブラウザがリダイレクトされる
        // TL-Lincoln モードの場合、リダイレクト前にデータを sessionStorage に保存
        const isTLLincolnOrder = apiProvider === 'tl-lincoln' || (existingOrderCode && existingOrderCode.startsWith('TL'));
        let returnUrl;

        if (isTLLincolnOrder) {
            console.log('📡 TL-Lincoln mode: 保存订单数据到 sessionStorage (Alipay)');
            const tlOrderData = {
                ...window.currentTempOrderData,
                source: 'tl-lincoln',
                pending_creation: true
            };
            sessionStorage.setItem('tl_lincoln_order', JSON.stringify(tlOrderData));
            returnUrl = `${window.location.origin}/reservation-success.html?orderCode=${existingOrderCode}&source=tl-lincoln`;
        } else {
            returnUrl = getSuccessReturnUrl(existingOrderCode);
        }
        console.log('支付宝回调URL:', returnUrl);

        // 使用 Stripe.js 确认支付宝支付
        // 支付宝会跳转到支付宝页面完成支付，之后重定向回 returnUrl
        console.log('使用 confirmAlipayPayment...');
        const confirmResult = await stripe.confirmAlipayPayment(
            clientSecret,
            {
                return_url: returnUrl
            }
        );

        console.log('支付确认结果:', confirmResult);

        if (confirmResult.error) {
            // 支付失败或用户取消（未发生重定向时）
            // TL-Lincoln モードの場合、sessionStorage をクリア
            if (isTLLincolnOrder) {
                sessionStorage.removeItem('tl_lincoln_order');
            }
            throw new Error(confirmResult.error.message);
        }

        // 通常 Alipay はリダイレクトされるためここには到達しない
        // 万が一リダイレクトなしで完了した場合のフォールバック
        const paymentIntent = confirmResult.paymentIntent;
        if (paymentIntent && paymentIntent.status === 'succeeded') {
            console.log('✅ 支付宝支付成功（リダイレクトなし），开始创建订单...');

            try {
                window.lastPaymentIntentId = paymentIntent.id;

                if (isTLLincolnOrder) {
                    // TL-Lincoln: sessionStorage のデータを使って成功ページへ遷移
                    window.location.href = returnUrl;
                    return;
                }

                await createOrderAfterPayment(paymentIntent);

                if (!window.bookingOrderCode) {
                    throw new Error('订单创建成功但订单号未设置');
                }

                showProcessingStatus();
                await waitForOrderConfirmation(window.bookingOrderCode);

            } catch (orderError) {
                console.error('订单创建失败:', orderError);
                alert('決済は成功しましたが、予約の作成に失敗しました。\n\nお手数ですが、カスタマーサポートにお問い合わせください。\n\nエラー: ' + orderError.message);

                if (clickedBtn && originalBtnContent) {
                    clickedBtn.disabled = false;
                    clickedBtn.innerHTML = originalBtnContent;
                }
            }
        } else {
            // 用户取消或支付未完成
            console.log('支付未完成，状态:', paymentIntent?.status);
            if (isTLLincolnOrder) {
                sessionStorage.removeItem('tl_lincoln_order');
            }
            if (clickedBtn && originalBtnContent) {
                clickedBtn.disabled = false;
                clickedBtn.innerHTML = originalBtnContent;
                clickedBtn.classList.remove('active');
            }
            const expressCheckoutEl = document.getElementById('express-checkout-element');
            if (expressCheckoutEl) {
                expressCheckoutEl.style.display = 'block';
            }
        }

    } catch (error) {
        console.error('支付宝支付错误:', error);

        // エラー時は sessionStorage をクリア
        sessionStorage.removeItem('tl_lincoln_order');

        // 恢复按钮状态，让用户可以选择其他支付方式
        if (clickedBtn && originalBtnContent) {
            clickedBtn.disabled = false;
            clickedBtn.innerHTML = originalBtnContent;
            clickedBtn.classList.remove('active');
        }

        // 恢复显示 Express Checkout Element
        const expressCheckoutEl = document.getElementById('express-checkout-element');
        if (expressCheckoutEl) {
            expressCheckoutEl.style.display = 'block';
        }

        // 隐藏二维码区域
        const qrcodeSection = document.getElementById('qrcodeSection');
        if (qrcodeSection) {
            qrcodeSection.style.display = 'none';
            qrcodeSection.innerHTML = '';
        }

        // 显示错误提示（短暂显示后消失，不阻挡用户选择其他支付方式）
        const paymentMethodPrompt = document.getElementById('paymentMethodPrompt');
        if (paymentMethodPrompt) {
            paymentMethodPrompt.innerHTML = `
                <p style="margin: 0; color: #dc3545; font-size: 14px; font-weight: 500;">
                    <i class="fas fa-exclamation-circle" style="margin-right: 8px;"></i>
                    Alipay決済に失敗しました。他の支払い方法をお選びください。
                </p>
            `;
            paymentMethodPrompt.style.background = '#f8d7da';
            paymentMethodPrompt.style.borderColor = '#f5c6cb';

            // 5秒后恢复原始提示
            setTimeout(() => {
                paymentMethodPrompt.innerHTML = `
                    <p style="margin: 0; color: #856404; font-size: 14px; font-weight: 500;">
                        <i class="fas fa-hand-pointer" style="margin-right: 8px;"></i>
                        お支払い方法を選択してください
                    </p>
                `;
                paymentMethodPrompt.style.background = '#fff3cd';
                paymentMethodPrompt.style.borderColor = '#ffc107';
            }, 5000);
        }
    }
}

// 导出函数供全局使用
window.initializeStripe = initializeStripe;
window.createStripeCheckoutSession = createStripeCheckoutSession;
window.initializeLinkPaymentForm = initializeLinkPaymentForm;
window.verifyStripeSession = verifyStripeSession;
window.proceedWithStripeQRPayment = proceedWithStripeQRPayment;
window.proceedWithAlipayPayment = proceedWithAlipayPayment;
window.showProcessingStatus = showProcessingStatus;
window.waitForOrderConfirmation = waitForOrderConfirmation;
window.updateCardBrandDisplay = updateCardBrandDisplay;
window.checkExpressPaymentAvailability = checkExpressPaymentAvailability;
window.initializeExpressPayment = initializeExpressPayment;
window.proceedWithExpressPayment = proceedWithExpressPayment;
window.calculateTotalAmount = calculateTotalAmount;
window.initializeExpressCheckoutElement = initializeExpressCheckoutElement;
