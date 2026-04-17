// Booking API Integration
// 使用 api-config.js 配置或相对路径
const BOOKING_API_URL = window.API_CONFIG?.BOOKING_API || '/api';

// 获取当前 API Provider
function getCurrentApiProvider() {
    return window.getApiProvider ? window.getApiProvider() : 'local';
}

// 提交 TL-Lincoln 订单API
async function submitTLLincolnBookingToAPI(bookingData) {
    try {
        // 转换数据格式为 TL-Lincoln 需要的格式
        const tlLincolnData = {
            checkin: bookingData.checkin_date,
            checkout: bookingData.checkout_date,
            roomTypeCode: bookingData.tl_room_type_code || extractTLRoomTypeCode(bookingData.room_type_code),
            ratePlanCode: bookingData.plan_code,
            rooms: bookingData.num_rooms || 1,
            adults: bookingData.num_adults || 2,
            children: bookingData.num_children || 0,
            childrenPreschool: bookingData.num_children_preschool || 0,
            childrenElementary: bookingData.num_children_elementary || 0,
            breakfastSelected: bookingData.breakfast_selected || false,
            dinnerSelected: bookingData.dinner_selected || false,
            planBreakfast: bookingData.plan_breakfast || bookingData.breakfast || false,
            planDinner: bookingData.plan_dinner || bookingData.dinner || false,
            guestName: `${bookingData.guest_last_name || ''} ${bookingData.guest_first_name || ''}`.trim() || 'ゲスト',
            guestNameKana: `${bookingData.guest_last_name_katakana || ''} ${bookingData.guest_first_name_katakana || ''}`.trim(),
            guestLastName: bookingData.guest_last_name || '',
            guestFirstName: bookingData.guest_first_name || '',
            guestLastNameKana: bookingData.guest_last_name_katakana || '',
            guestFirstNameKana: bookingData.guest_first_name_katakana || '',
            guestEmail: bookingData.guest_email,
            guestPhone: bookingData.guest_phone,
            stripePaymentIntentId: bookingData.payment_id || null
        };

        console.log('📡 TL-Lincoln 订单提交:', tlLincolnData);

        const response = await fetch(`${BOOKING_API_URL}/tl-lincoln/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json; charset=UTF-8'
            },
            body: JSON.stringify(tlLincolnData)
        });

        const result = await response.json();
        console.log('📡 TL-Lincoln 订单响应:', result);
        return result;

    } catch (error) {
        console.error('TL-Lincoln Order API Error:', error);
        throw error;
    }
}

// 从 room_type_code 中提取 TL-Lincoln 房型代码（去掉 tl_ 前缀）
function extractTLRoomTypeCode(roomTypeCode) {
    if (!roomTypeCode) return '';
    if (roomTypeCode.startsWith('tl_')) {
        return roomTypeCode.substring(3);
    }
    return roomTypeCode;
}

// 提交访客订单API
async function submitBookingToAPI(bookingData) {
    try {
        const response = await fetch(`${BOOKING_API_URL}/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json; charset=UTF-8'
            },
            body: JSON.stringify(bookingData)
        });

        const result = await response.json();
        return result;

    } catch (error) {
        console.error('Guest Order API Error:', error);
        throw error;
    }
}

// 提交注册用户订单API
async function submitUserBookingToAPI(bookingData, userId) {
    try {
        const requestBody = {
                user_id: userId,
                room_type_code: bookingData.room_type_code,
                plan_code: bookingData.plan_code,
                checkin_date: bookingData.checkin_date,
                checkout_date: bookingData.checkout_date,
                num_rooms: bookingData.num_rooms,
                num_adults: bookingData.num_adults,
                num_children: bookingData.num_children,
                special_requests: bookingData.special_requests,
                breakfast_selected: bookingData.breakfast_selected,
                dinner_selected: bookingData.dinner_selected,
                private_bath_selected: bookingData.private_bath_selected,
                service_cost: bookingData.service_cost,
                payment_method: bookingData.payment_method,
                payment_id: bookingData.payment_id,
                // 积分抵扣
                points_to_use: bookingData.points_to_use || 0,
                // 预约者信息
                guest_last_name: bookingData.guest_last_name,
                guest_first_name: bookingData.guest_first_name,
                guest_last_name_katakana: bookingData.guest_last_name_katakana,
                guest_first_name_katakana: bookingData.guest_first_name_katakana,
                guest_email: bookingData.guest_email,
                guest_phone: bookingData.guest_phone,
                phone_country_code: bookingData.phone_country_code,
                country: bookingData.country,
                postal_code: bookingData.postal_code,
                prefecture: bookingData.prefecture,
                city: bookingData.city,
                address_line: bookingData.address_line
        };

        console.log('>>> 提交用户订单API, 请求体:', requestBody);
        console.log('>>> plan_code in request:', requestBody.plan_code);
        console.log('>>> payment_id in request:', requestBody.payment_id);

        const response = await fetch(`${BOOKING_API_URL}/user-orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json; charset=UTF-8'
            },
            body: JSON.stringify(requestBody)
        });

        const result = await response.json();
        return result;

    } catch (error) {
        console.error('User Order API Error:', error);
        throw error;
    }
}

// 从booking页面提交最终预订
window.submitFinalBooking = async function() {
    try {
        // 收集所有预订数据
        const bookingData = collectBookingData();

        console.log('Submitting booking:', bookingData);

        // 显示加载状态
        showLoadingOverlay('予約処理中...');

        // 获取当前 API Provider
        const apiProvider = getCurrentApiProvider();
        console.log('🔗 API Provider:', apiProvider);

        let result;

        // 根据 API Provider 选择不同的提交方式
        if (apiProvider === 'tl-lincoln') {
            // TL-Lincoln 模式 - 使用 TL-Lincoln OTA_HotelRes API
            console.log('📡 使用 TL-Lincoln API 提交预约');
            result = await submitTLLincolnBookingToAPI(bookingData);
        } else {
            // 自社 API 模式
            // 检查用户是否已登录
            const currentUser = window.safeStorage ? window.safeStorage.getItem('currentUser') : null;

            if (currentUser) {
                // 用户已登录 - 使用用户订单API
                try {
                    const userData = JSON.parse(currentUser);
                    console.log('User is logged in, creating user order for:', userData.email);

                    // 调用注册用户订单API
                    result = await submitUserBookingToAPI(bookingData, userData.user_id);
                } catch (parseError) {
                    console.error('Error parsing user data:', parseError);
                    // 如果解析失败,回退到访客订单
                    result = await submitBookingToAPI(bookingData);
                }
            } else {
                // 用户未登录 - 使用访客订单API
                console.log('User is not logged in, creating guest order');
                result = await submitBookingToAPI(bookingData);
            }
        }

        hideLoadingOverlay();

        if (result.success) {
            // 预订成功 - 保存订单号到全局变量
            window.bookingOrderCode = result.data.order_code;
            window.bookingOrderData = result.data;

            console.log('Booking successful:', result.data);
            console.log('✓ window.bookingOrderCode设置为:', window.bookingOrderCode);

            // 验证订单号是否正确设置
            if (!window.bookingOrderCode) {
                console.error('❌ 订单号未设置！result.data:', result.data);
                throw new Error('订单创建成功但订单号未返回');
            }

            // 返回成功，让调用方继续流程
            return result.data;
        } else {
            // 抛出错误，让调用方处理
            console.error('❌ API返回失败:', result);
            throw new Error(result.message || '予約に失敗しました');
        }

    } catch (error) {
        hideLoadingOverlay();
        console.error('Booking submission error:', error);
        throw error;
    }
};

// 收集预订数据
function collectBookingData() {
    // 从URL参数获取基本信息
    const urlParams = new URLSearchParams(window.location.search);

    console.log('=== collectBookingData 开始收集 ===');
    console.log('当前 URL:', window.location.href);
    console.log('URL 参数:', window.location.search);
    console.log('window.bookingParams:', window.bookingParams);
    console.log('urlParams.get("code"):', urlParams.get('code'));
    console.log('document.getElementById("roomTypeCode")?.value:', document.getElementById('roomTypeCode')?.value);

    // 获取 TL-Lincoln 相关数据
    const currentOrderData = window.currentOrderData || window.currentTempOrderData || {};

    // 判断是否为 TL-Lincoln 模式
    const apiProvider = window.getApiProvider ? window.getApiProvider() : 'local';
    const isTLLincoln = apiProvider === 'tl-lincoln';

    if (isTLLincoln) {
        console.log('📡 TL-Lincoln mode: 从 window.currentOrderData 读取客人信息');
        console.log('currentOrderData:', currentOrderData);
    }

    const data = {
        // 房间信息 - 优先使用保存的参数
        room_type_code: window.bookingParams?.room_type_code || urlParams.get('code') || document.getElementById('roomTypeCode')?.value,
        plan_code: window.bookingParams?.plan_code || urlParams.get('plan') || null,
        checkin_date: window.bookingParams?.checkin_date || urlParams.get('checkin') || document.getElementById('checkinDate')?.textContent,
        checkout_date: window.bookingParams?.checkout_date || urlParams.get('checkout') || document.getElementById('checkoutDate')?.textContent,
        num_rooms: window.bookingParams?.num_rooms || parseInt(urlParams.get('rooms')) || 1,
        num_adults: window.bookingParams?.num_adults || parseInt(urlParams.get('adults')) || 2,
        num_children: window.bookingParams?.num_children || parseInt(urlParams.get('children')) || 0,
        num_children_preschool: currentOrderData.num_children_preschool || window.bookingParams?.num_children_preschool || parseInt(urlParams.get('childrenPreschool')) || 0,
        num_children_elementary: currentOrderData.num_children_elementary || window.bookingParams?.num_children_elementary || parseInt(urlParams.get('childrenElementary')) || 0,

        // TL-Lincoln 相关数据
        tl_room_type_code: currentOrderData.tl_room_type_code || '',
        tl_rate_plan_code: currentOrderData.tl_rate_plan_code || '',

        // 客人信息 - TL-Lincoln 模式优先从 currentOrderData 读取
        guest_last_name: isTLLincoln
            ? (currentOrderData.guest_last_name || document.getElementById('lastName')?.value || '')
            : (document.getElementById('lastName')?.value || ''),
        guest_first_name: isTLLincoln
            ? (currentOrderData.guest_first_name || document.getElementById('firstName')?.value || '')
            : (document.getElementById('firstName')?.value || ''),
        guest_last_name_katakana: isTLLincoln
            ? (currentOrderData.guest_last_name_katakana || document.getElementById('lastNameKana')?.value || '')
            : (document.getElementById('lastNameKana')?.value || ''),
        guest_first_name_katakana: isTLLincoln
            ? (currentOrderData.guest_first_name_katakana || document.getElementById('firstNameKana')?.value || '')
            : (document.getElementById('firstNameKana')?.value || ''),
        guest_email: isTLLincoln
            ? (currentOrderData.guest_email || document.getElementById('email')?.value || '')
            : (document.getElementById('email')?.value || ''),
        guest_phone: isTLLincoln
            ? (currentOrderData.guest_phone || document.getElementById('phone')?.value || '')
            : (document.getElementById('phone')?.value || ''),
        phone_country_code: isTLLincoln
            ? (currentOrderData.phone_country_code || document.getElementById('countryCode')?.value || '+81')
            : (document.getElementById('countryCode')?.value || '+81'),

        // 地址信息 - TL-Lincoln 模式优先从 currentOrderData 读取
        country: isTLLincoln
            ? (currentOrderData.country || document.getElementById('country')?.value || '')
            : (document.getElementById('country')?.value || ''),
        postal_code: isTLLincoln
            ? (currentOrderData.postal_code || document.getElementById('postalCode')?.value || '')
            : (document.getElementById('postalCode')?.value || ''),
        prefecture: isTLLincoln
            ? (currentOrderData.prefecture || document.getElementById('prefecture')?.value || '')
            : (document.getElementById('prefecture')?.value || ''),
        city: isTLLincoln
            ? (currentOrderData.city || document.getElementById('city')?.value || document.getElementById('cityDistrict')?.value || '')
            : (document.getElementById('city')?.value || document.getElementById('cityDistrict')?.value || ''),
        address_line: isTLLincoln
            ? (currentOrderData.address_line || document.getElementById('address')?.value || document.getElementById('streetAddress')?.value || '')
            : (document.getElementById('address')?.value || document.getElementById('streetAddress')?.value || ''),

        // 附加服务
        breakfast_selected: document.getElementById('breakfast')?.checked || false,
        dinner_selected: document.getElementById('dinner')?.checked || false,
        private_bath_selected: document.getElementById('privateBath')?.checked || false,
        service_cost: calculateServiceCost(),

        // 特殊要求
        special_requests: collectSpecialRequests(),

        // 支付方式 - 总是在线支付
        payment_method: window.selectedOnlinePaymentType || 'online',
        // Stripe PaymentIntent ID (如果有)
        payment_id: window.lastPaymentIntentId || null,

        // 积分抵扣
        points_to_use: parseInt(document.getElementById('pointsToUse')?.value) || 0
    };

    console.log('=== collectBookingData collected ===', data);
    console.log('>>> plan_code:', data.plan_code);
    console.log('>>> urlParams.get("plan"):', urlParams.get('plan'));
    console.log('>>> window.bookingParams?.plan_code:', window.bookingParams?.plan_code);
    console.log('>>> payment_method:', data.payment_method);
    console.log('>>> payment_id:', data.payment_id);
    console.log('>>> window.lastPaymentIntentId:', window.lastPaymentIntentId);
    console.log('>>> window.selectedOnlinePaymentType:', window.selectedOnlinePaymentType);

    // 验证必填字段
    const requiredFields = {
        room_type_code: data.room_type_code,
        guest_email: data.guest_email,
        guest_phone: data.guest_phone,
        checkin_date: data.checkin_date,
        checkout_date: data.checkout_date,
        num_adults: data.num_adults
    };

    console.log('=== 验证必填字段 ===', requiredFields);

    const missingFields = [];
    for (const [key, value] of Object.entries(requiredFields)) {
        if (!value) {
            missingFields.push(key);
            console.error(`❌ 缺少必填字段: ${key}`);
        }
    }

    if (missingFields.length > 0) {
        console.error('❌ 缺少以下必填字段:', missingFields);
        alert(`以下字段为必填项，请填写：\n${missingFields.join('\n')}`);
        throw new Error(`缺少必填参数: ${missingFields.join(', ')}`);
    }

    return data;
}

// 计算附加服务费用
function calculateServiceCost() {
    const urlParams = new URLSearchParams(window.location.search);
    const adults = parseInt(urlParams.get('adults')) || 2;

    let serviceCost = 0;

    // 早餐 - 按人头收费
    if (document.getElementById('breakfast')?.checked) {
        serviceCost += 2000 * adults;
    }

    // 晚餐 - 按人头收费
    if (document.getElementById('dinner')?.checked) {
        serviceCost += 4500 * adults;
    }

    // 包场温泉 - 固定费用
    if (document.getElementById('privateBath')?.checked) {
        serviceCost += 3000;
    }

    return serviceCost;
}

// 获取电话号码
function getPhoneNumber() {
    const countryCode = document.getElementById('countryCode')?.value || '+81';
    const phone = document.getElementById('phone')?.value || '';
    return `${countryCode} ${phone}`.trim();
}

// 收集特殊要求
function collectSpecialRequests() {
    const requests = [];

    // 住宿目的
    const purpose = document.querySelector('input[name="purpose"]:checked');
    if (purpose) {
        requests.push(`目的: ${purpose.value}`);
    }

    // 到着時間
    const arrivalTime = document.querySelector('input[name="arrivalTime"]:checked');
    if (arrivalTime) {
        requests.push(`到着時間: ${arrivalTime.value}`);
    }

    // その他のリクエスト
    const otherRequests = document.getElementById('specialRequests')?.value;
    if (otherRequests) {
        requests.push(otherRequests);
    }

    return requests.join('; ');
}

// 显示加载遮罩
function showLoadingOverlay(message = '処理中...') {
    let overlay = document.getElementById('loadingOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'loadingOverlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 2147483647;
        `;
        overlay.innerHTML = `
            <div style="background: white; padding: 30px 50px; border-radius: 10px; text-align: center;">
                <i class="fas fa-spinner fa-spin" style="font-size: 48px; color: #8a7a5e; margin-bottom: 20px;"></i>
                <p style="font-size: 18px; color: #333; margin: 0;">${message}</p>
            </div>
        `;
        document.body.appendChild(overlay);
    }
    overlay.style.display = 'flex';
}

// 隐藏加载遮罩
function hideLoadingOverlay() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

// 在页面加载时保存URL参数到window对象
(function() {
    console.log('=== booking-api.js 页面加载初始化 ===');
    console.log('当前完整 URL:', window.location.href);
    console.log('URL 搜索参数:', window.location.search);

    const urlParams = new URLSearchParams(window.location.search);

    console.log('从 URL 解析的各个参数:');
    console.log('  code:', urlParams.get('code'));
    console.log('  checkin:', urlParams.get('checkin'));
    console.log('  checkout:', urlParams.get('checkout'));
    console.log('  rooms:', urlParams.get('rooms'));
    console.log('  adults:', urlParams.get('adults'));
    console.log('  children:', urlParams.get('children'));
    console.log('  plan:', urlParams.get('plan'));

    window.bookingParams = {
        room_type_code: urlParams.get('code'),
        plan_code: urlParams.get('plan'),
        checkin_date: urlParams.get('checkin'),
        checkout_date: urlParams.get('checkout'),
        num_rooms: parseInt(urlParams.get('rooms')) || 1,
        num_adults: parseInt(urlParams.get('adults')) || 2,
        num_children: parseInt(urlParams.get('children')) || 0,
        num_children_preschool: parseInt(urlParams.get('childrenPreschool')) || 0,
        num_children_elementary: parseInt(urlParams.get('childrenElementary')) || 0
    };
    console.log('Booking params saved:', window.bookingParams);
    console.log('window.bookingParams.room_type_code:', window.bookingParams.room_type_code);
    console.log('window.bookingParams.plan_code:', window.bookingParams.plan_code);
})();

console.log('Booking API integration loaded');
