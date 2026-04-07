/**
 * 临时订单管理模块
 * 用于 booking-user.html 页面
 * 提供自动保存、恢复订单草稿、支付后转移订单等功能
 */

// ==================== 配置 ====================
// 使用 getApiUrl 函数处理 API URL，兼容本地和生产环境
const ORDER_TEMP_CONFIG = {
    getUrl: (endpoint) => window.getApiUrl ? window.getApiUrl(endpoint) : `/api${endpoint}`
};

// ==================== 状态管理 (仅使用内存，不使用 localStorage) ====================
let tempOrderCode = null; // 临时订单编号，仅存储在内存中
let bookingParams = null; // 预订基本信息（房型、日期、人数等），从 URL 读取后存储在内存中
let cachedOrderData = null; // 缓存的订单数据

// ==================== 初始化 ====================

/**
 * 初始化临时订单模块
 * 在页面加载时调用
 */
async function initOrderTemp() {
    console.log('🔄 Initializing Order Temp module...');
    console.log('📍 Current URL:', window.location.href);

    // 检查 URL 是否有临时订单编号（支持 temp_order 和 order_code 两种参数名）
    const urlParams = new URLSearchParams(window.location.search);
    const orderCodeFromUrl = urlParams.get('temp_order') || urlParams.get('order_code');

    if (orderCodeFromUrl) {
        // 如果 URL 中有订单编号，从数据库读取
        console.log('📋 Found temp order code in URL:', orderCodeFromUrl);
        tempOrderCode = orderCodeFromUrl;
        window.currentTempOrderCode = orderCodeFromUrl;
        await loadOrderDraft();
    } else {
        // 如果没有订单编号，创建新的临时订单
        console.log('📝 No temp order found, creating new one...');
        await createInitialTempOrder();
    }

    console.log('✅ Order Temp module initialized');
}

/**
 * 创建初始临时订单
 * 在页面加载时调用
 */
async function createInitialTempOrder() {
    try {
        console.log('💾 Creating initial temp order...');

        // 从 URL 参数获取预订基本信息
        const urlParams = new URLSearchParams(window.location.search);

        // 获取用户 ID（优先从 sessionService 读取服务器端 session）
        let userId = null;
        let userData = null;

        // 优先使用 sessionService 获取服务器端登录状态
        if (window.sessionService) {
            try {
                userData = await window.sessionService.getCurrentUser();
                if (userData) {
                    userId = userData.user_id || null;
                    console.log('📋 Got user_id from sessionService:', userId);
                }
            } catch (e) {
                console.warn('⚠️ Failed to get user from sessionService:', e);
            }
        }

        // 如果 sessionService 没有用户，尝试从 safeStorage 获取
        if (!userId && window.safeStorage && typeof window.safeStorage.getItem === 'function') {
            const userDataStr = window.safeStorage.getItem('currentUser');
            if (userDataStr) {
                try {
                    userData = JSON.parse(userDataStr);
                    userId = userData.user_id || null;
                    console.log('📋 Got user_id from safeStorage:', userId);
                } catch (e) {
                    console.warn('⚠️ Failed to parse currentUser:', e);
                }
            }
        }

        // 如果还是没有，尝试从 sessionStorage 获取
        if (!userId) {
            userId = sessionStorage.getItem('user_id') || null;
            if (userId) {
                console.log('📋 Got user_id from sessionStorage:', userId);
            }
        }

        // 存储预订基本信息到内存（从 URL 参数读取一次）
        bookingParams = {
            room_type_code: urlParams.get('code') || urlParams.get('plan') || 'twin',
            checkin_date: urlParams.get('checkin') || '',
            checkout_date: urlParams.get('checkout') || '',
            num_rooms: parseInt(urlParams.get('rooms') || '1'),
            num_adults: parseInt(urlParams.get('adults') || '2'),
            num_children: parseInt(urlParams.get('children') || '0')
        };

        console.log('📋 Stored booking params in memory:', bookingParams);

        // 基本订单数据
        const orderData = {
            user_id: userId,
            ...bookingParams
        };

        // 如果是登录用户，获取用户信息并保存到临时订单
        if (userId && userData) {
            console.log('👤 User is logged in (user_id: ' + userId + '), adding user info to order...');

            try {
                // 直接使用已缓存的用户数据（userData 已经从 safeStorage 获取）
                console.log('✅ Using cached user data:', userData.email);

                // 保存用户信息到订单数据
                orderData.guest_last_name = userData.last_name || null;
                orderData.guest_first_name = userData.first_name || null;
                orderData.guest_last_name_katakana = userData.last_name_katakana || null;
                orderData.guest_first_name_katakana = userData.first_name_katakana || null;
                orderData.guest_email = userData.email || null;
                orderData.guest_phone = userData.phone || null;
                orderData.phone_country_code = userData.phone_country_code || '+81';
                orderData.country = userData.country || null;
                orderData.postal_code = userData.postal_code || null;
                orderData.prefecture = userData.prefecture || null;
                orderData.city = userData.city || null;
                orderData.address_line = userData.address_line || userData.address || null;

                console.log('📋 User info added to order:', {
                    user_id: userId,
                    email: userData.email,
                    name: userData.last_name + ' ' + userData.first_name
                });
            } catch (e) {
                console.warn('⚠️ Failed to get user data:', e);
            }
        } else {
            console.log('👤 User is not logged in, creating order without user info');
        }

        // 打印订单数据用于调试
        console.log('📦 Order data to be sent:', orderData);

        // 验证必填字段
        if (!orderData.room_type_code || !orderData.checkin_date ||
            !orderData.checkout_date || !orderData.num_rooms || !orderData.num_adults) {
            console.warn('⚠️ Required fields missing, skipping initial creation');
            console.warn('Missing fields:', {
                room_type_code: orderData.room_type_code,
                checkin_date: orderData.checkin_date,
                checkout_date: orderData.checkout_date,
                num_rooms: orderData.num_rooms,
                num_adults: orderData.num_adults
            });
            return;
        }

        // 发送请求创建临时订单
        console.log('🌐 Sending request to:', ORDER_TEMP_CONFIG.getUrl('/order-temp'));
        const response = await fetch(ORDER_TEMP_CONFIG.getUrl('/order-temp'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include', // 携带 session cookie
            body: JSON.stringify(orderData)
        });

        console.log('📡 Response status:', response.status);
        const result = await response.json();
        console.log('📨 Response data:', result);

        if (result.success) {
            // 保存订单编号到内存
            tempOrderCode = result.data.order_code;

            // 同时保存到全局 window 对象，方便其他模块访问
            window.currentTempOrderCode = tempOrderCode;

            // 更新显示的价格
            updatePriceDisplay(result.data);

            console.log('✅ Initial temp order created:', tempOrderCode);
            console.log('💰 Server calculated price:', result.data.total_price);

            // 立即从数据库读取并填充表单（确保显示的是数据库中的数据）
            console.log('📥 Loading order data from database to fill form...');
            await loadOrderDraft();
        } else {
            console.error('❌ Failed to create initial temp order:', result.message);
            showNotification('订单创建失败: ' + result.message, 'error');
        }

    } catch (error) {
        console.error('❌ Error creating initial temp order:', error);
    }
}

// ==================== 手动保存 (已移除自动保存) ====================
// 自动保存功能已移除，改为在点击"下一步"按钮时手动保存
// 这样可以减少不必要的API调用，并且保存时机更加明确

// ==================== 保存订单草稿 ====================

/**
 * 保存订单草稿到 orders_tmp 表
 */
async function saveOrderDraft() {
    try {
        console.log('💾 Saving order draft...');

        // 如果没有临时订单编号，无法保存
        if (!tempOrderCode) {
            console.error('❌ No temp order code found');
            throw new Error('临时订单不存在，请刷新页面重试');
        }

        console.log('📋 Using existing temp order:', tempOrderCode);

        // 从数据库读取现有的临时订单数据
        const response = await fetch(
            ORDER_TEMP_CONFIG.getUrl(`/order-temp/${tempOrderCode}`),
            { credentials: 'include' } // 携带 session cookie
        );
        const result = await response.json();

        if (!result.success) {
            console.error('❌ Failed to load existing temp order');
            throw new Error('无法读取临时订单，请刷新页面重试');
        }

        const existingOrder = result.data;
        console.log('✅ Loaded existing order from database:', {
            order_code: existingOrder.order_code,
            room_type_code: existingOrder.room_type_code,
            checkin_date: existingOrder.checkin_date,
            checkout_date: existingOrder.checkout_date
        });

        // 从 URL 参数获取正确的日期（避免数据库时区问题）
        const urlParams = new URLSearchParams(window.location.search);
        const checkinDate = urlParams.get('checkin') || null;
        const checkoutDate = urlParams.get('checkout') || null;

        console.log('📅 Using dates from URL:', {
            checkin: checkinDate,
            checkout: checkoutDate
        });

        // 收集表单中的客人信息和追加服务（不包括预订基本信息）
        const formData = collectFormDataFromForm();

        // 合并数据：使用数据库中的预订基本信息 + 表单中的客人信息
        const orderData = {
            order_code: existingOrder.order_code,
            user_id: existingOrder.user_id,

            // 预订基本信息（房型和人数从数据库，日期从 URL 避免时区问题）
            room_type_code: existingOrder.room_type_code,
            checkin_date: checkinDate,
            checkout_date: checkoutDate,
            num_rooms: existingOrder.num_rooms,
            num_adults: existingOrder.num_adults,
            num_children: existingOrder.num_children,

            // 客人信息和追加服务（从表单）
            ...formData
        };

        console.log('📦 Merged order data to save:', {
            order_code: orderData.order_code,
            room_type_code: orderData.room_type_code,
            guest_email: orderData.guest_email,
            guest_last_name: orderData.guest_last_name,
            points_used: orderData.points_used,
            final_amount: orderData.final_amount
        });

        console.log('💎 Points data:', {
            points_used: orderData.points_used,
            final_amount: orderData.final_amount,
            total_price: existingOrder.total_price
        });

        // 发送更新请求
        const updateResponse = await fetch(ORDER_TEMP_CONFIG.getUrl('/order-temp'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include', // 携带 session cookie
            body: JSON.stringify(orderData)
        });

        const updateResult = await updateResponse.json();

        if (updateResult.success) {
            // 缓存订单数据到内存和全局变量
            cachedOrderData = updateResult.data;
            window.currentOrderData = updateResult.data;
            console.log('💾 Order data cached after save');

            // 更新显示的价格（使用服务器计算的价格）
            updatePriceDisplay(updateResult.data);

            console.log('✅ Order draft saved successfully');
            console.log('💰 Server calculated price:', updateResult.data.total_price);
        } else {
            console.error('❌ Failed to save order draft:', updateResult.message);
            throw new Error(updateResult.message || '保存失败');
        }

    } catch (error) {
        console.error('❌ Error saving order draft:', error);
        throw error;
    }
}

/**
 * 收集表单中的客人信息和追加服务
 * 不包括预订基本信息（房型、日期等）
 * @returns {Object} 表单数据
 */
function collectFormDataFromForm() {
    const pointsUsed = parseInt(document.getElementById('pointsToUse')?.value) || 0;
    const finalAmount = calculateFinalAmount();

    console.log('📋 Collecting form data...');
    console.log('💎 Points from input:', {
        pointsToUseValue: document.getElementById('pointsToUse')?.value,
        pointsUsedParsed: pointsUsed,
        finalAmountCalculated: finalAmount
    });

    const formData = {
        // 客人信息
        guest_last_name: document.getElementById('lastName')?.value || null,
        guest_first_name: document.getElementById('firstName')?.value || null,
        guest_last_name_katakana: document.getElementById('lastNameKana')?.value || null,
        guest_first_name_katakana: document.getElementById('firstNameKana')?.value || null,
        guest_email: document.getElementById('email')?.value || null,
        guest_phone: document.getElementById('phone')?.value || null,
        phone_country_code: document.getElementById('countryCode')?.value || '+81',

        // 地址信息
        country: getCountryValue(),
        postal_code: document.getElementById('postalCode')?.value || null,
        prefecture: document.getElementById('prefecture')?.value || null,
        city: document.getElementById('cityDistrict')?.value || null,
        address_line: document.getElementById('address')?.value ||
                      document.getElementById('streetAddress')?.value || null,

        // 追加服务
        breakfast_selected: document.getElementById('breakfast')?.checked || false,
        dinner_selected: document.getElementById('dinner')?.checked || false,
        private_bath_selected: document.getElementById('privateBath')?.checked || false,
        service_cost: calculateServiceCostFromForm(),

        // 积分使用
        points_used: pointsUsed,
        final_amount: finalAmount,

        // 特别要求
        special_requests: document.getElementById('specialRequests')?.value || null
    };

    console.log('✅ Form data collected:', {
        points_used: formData.points_used,
        final_amount: formData.final_amount
    });

    return formData;
}

/**
 * 收集表单数据（旧版本，保留用于兼容）
 * @returns {Object} 订单数据
 */
function collectFormData() {
    // 调试：打印 bookingParams 的实际值
    console.log('🔍 DEBUG: bookingParams at start of collectFormData:', bookingParams);
    console.log('🔍 DEBUG: typeof bookingParams:', typeof bookingParams);

    // 获取用户 ID（优先从 safeStorage 读取）
    let userId = null;

    if (window.safeStorage && typeof window.safeStorage.getItem === 'function') {
        const userDataStr = window.safeStorage.getItem('currentUser');
        if (userDataStr) {
            try {
                const userData = JSON.parse(userDataStr);
                userId = userData.user_id || null;
            } catch (e) {
                console.warn('⚠️ Failed to parse currentUser:', e);
            }
        }
    }

    // 如果 safeStorage 没有，尝试从 sessionStorage 获取
    if (!userId) {
        userId = sessionStorage.getItem('user_id') || null;
    }

    // 使用存储在内存中的预订参数（如果没有则尝试从 URL 读取）
    let bookingData = bookingParams;

    if (!bookingData) {
        console.warn('⚠️ No booking params in memory, trying to read from URL...');
        const urlParams = new URLSearchParams(window.location.search);
        bookingData = {
            room_type_code: urlParams.get('code') || urlParams.get('plan') || 'twin',
            checkin_date: urlParams.get('checkin') || '',
            checkout_date: urlParams.get('checkout') || '',
            num_rooms: parseInt(urlParams.get('rooms') || '1'),
            num_adults: parseInt(urlParams.get('adults') || '2'),
            num_children: parseInt(urlParams.get('children') || '0')
        };
    }

    console.log('📋 Using booking params:', bookingData);

    return {
        user_id: userId,
        ...bookingData,

        // 客人信息
        guest_last_name: document.getElementById('lastName')?.value || null,
        guest_first_name: document.getElementById('firstName')?.value || null,
        guest_last_name_katakana: document.getElementById('lastNameKana')?.value || null,
        guest_first_name_katakana: document.getElementById('firstNameKana')?.value || null,
        guest_email: document.getElementById('email')?.value || null,
        guest_phone: document.getElementById('phone')?.value || null,
        phone_country_code: document.getElementById('countryCode')?.value || '+81',

        // 地址信息
        country: getCountryValue(),
        postal_code: document.getElementById('postalCode')?.value || null,
        prefecture: document.getElementById('prefecture')?.value || null,
        city: document.getElementById('cityDistrict')?.value || null,
        address_line: document.getElementById('address')?.value ||
                      document.getElementById('streetAddress')?.value || null,

        // 追加服务
        breakfast_selected: document.getElementById('breakfast')?.checked || false,
        dinner_selected: document.getElementById('dinner')?.checked || false,
        private_bath_selected: document.getElementById('privateBath')?.checked || false,
        service_cost: calculateServiceCost(),

        // 特别要求
        special_requests: document.getElementById('specialRequests')?.value || null
    };
}

/**
 * 获取国家值
 */
function getCountryValue() {
    const countrySelect = document.getElementById('country');
    if (!countrySelect) return null;

    const selectedOption = countrySelect.options[countrySelect.selectedIndex];
    return selectedOption ? selectedOption.text : null;
}

/**
 * 从表单计算追加服务费用
 * 注意：这里返回 0，因为服务费用需要根据大人数计算，而大人数在服务器端处理
 */
function calculateServiceCostFromForm() {
    // 服务费用由服务器端根据大人数计算
    // 这里只需要标记选中了哪些服务，费用计算在后端进行
    return 0;
}

/**
 * 计算追加服务费用（旧版本，保留用于兼容）
 */
function calculateServiceCost() {
    let total = 0;

    // 使用存储的预订参数获取大人数，如果没有则从 URL 读取
    let adults = 2;
    if (bookingParams && bookingParams.num_adults) {
        adults = bookingParams.num_adults;
    } else {
        adults = parseInt(new URLSearchParams(window.location.search).get('adults') || '2');
    }

    if (document.getElementById('breakfast')?.checked) {
        total += 2000 * adults; // 早餐 2000円/人
    }
    if (document.getElementById('dinner')?.checked) {
        total += 4500 * adults; // 晚餐 4500円/人
    }
    if (document.getElementById('privateBath')?.checked) {
        total += 3000; // 貸切風呂 3000円/回
    }

    return total;
}

/**
 * 计算扣除积分后的最终金额
 * @returns {number} 最终金额
 */
function calculateFinalAmount() {
    let totalAmount = 0;

    // 方法1: 尝试从 window 对象获取当前订单总额
    if (window.currentOrderTotal && window.currentOrderTotal > 0) {
        totalAmount = window.currentOrderTotal;
    }
    // 方法2: 尝试从订单数据对象获取
    else if (window.currentTempOrderData && window.currentTempOrderData.total_price) {
        totalAmount = parseInt(window.currentTempOrderData.total_price) || 0;
    }
    // 方法3: 尝试从右侧预订信息卡获取
    else {
        const totalPriceElement = document.getElementById('totalPrice');
        if (totalPriceElement && totalPriceElement.textContent) {
            const priceText = totalPriceElement.textContent.replace(/[¥,]/g, '');
            totalAmount = parseInt(priceText) || 0;
        }
    }

    // 计算最终金额（订单总额 - 积分）
    const pointsUsed = parseInt(document.getElementById('pointsToUse')?.value) || 0;
    const finalAmount = totalAmount - pointsUsed;

    console.log(`💰 calculateFinalAmount: totalAmount=${totalAmount}, pointsUsed=${pointsUsed}, finalAmount=${finalAmount}`);

    return Math.max(0, finalAmount);
}

// ==================== 加载订单草稿 ====================

/**
 * 加载订单草稿
 * 从 orders_tmp 表恢复之前保存的订单信息
 */
async function loadOrderDraft() {
    if (!tempOrderCode) {
        console.warn('⚠️ No temp order code to load');
        return;
    }

    try {
        console.log('📂 Loading order draft:', tempOrderCode);

        const response = await fetch(
            ORDER_TEMP_CONFIG.getUrl(`/order-temp/${tempOrderCode}`),
            { credentials: 'include' } // 携带 session cookie
        );

        const result = await response.json();

        if (result.success) {
            console.log('✅ Order draft loaded from database');
            console.log('📊 Order data:', result.data);

            // 缓存订单数据到内存和全局变量
            cachedOrderData = result.data;
            window.currentOrderData = result.data;
            console.log('💾 Order data cached to window.currentOrderData');

            // 恢复预订基本信息到内存
            bookingParams = {
                room_type_code: result.data.room_type_code,
                checkin_date: result.data.checkin_date,
                checkout_date: result.data.checkout_date,
                num_rooms: result.data.num_rooms,
                num_adults: result.data.num_adults,
                num_children: result.data.num_children || 0
            };
            console.log('📋 Restored booking params from database:', bookingParams);

            // 填充表单（从数据库数据）
            fillFormWithOrderData(result.data);

            // 更新价格显示（从数据库数据）
            updatePriceDisplay(result.data);

            // 启动倒计时（使用数据库的过期时间）
            if (result.data.expires_at && window.startExpirationTimer) {
                window.startExpirationTimer(result.data.expires_at);
            }

            console.log('✅ Form filled with database data');
        } else {
            console.warn('⚠️ Order draft not found or expired');
            // 清除内存中的订单编号
            tempOrderCode = null;
            window.currentTempOrderCode = null;
            bookingParams = null;

            // 如果订单不存在或已过期，使用默认倒计时
            if (window.startExpirationTimer) {
                window.startExpirationTimer();
            }
        }

    } catch (error) {
        console.error('❌ Error loading order draft:', error);
    }
}

/**
 * 用订单数据填充表单
 * @param {Object} orderData - 订单数据
 */
function fillFormWithOrderData(orderData) {
    // 填充客人信息
    if (orderData.guest_last_name) {
        document.getElementById('lastName').value = orderData.guest_last_name;
    }
    if (orderData.guest_first_name) {
        document.getElementById('firstName').value = orderData.guest_first_name;
    }
    if (orderData.guest_last_name_katakana) {
        document.getElementById('lastNameKana').value = orderData.guest_last_name_katakana;
    }
    if (orderData.guest_first_name_katakana) {
        document.getElementById('firstNameKana').value = orderData.guest_first_name_katakana;
    }
    if (orderData.guest_email) {
        document.getElementById('email').value = orderData.guest_email;
    }
    if (orderData.guest_phone) {
        document.getElementById('phone').value = orderData.guest_phone;
    }
    if (orderData.phone_country_code) {
        document.getElementById('countryCode').value = orderData.phone_country_code;
    }

    // 填充地址信息
    if (orderData.postal_code) {
        document.getElementById('postalCode').value = orderData.postal_code;
    }
    if (orderData.prefecture) {
        const prefectureField = document.getElementById('prefecture');
        if (prefectureField) {
            // 都道府县名称映射（日文 -> 英文value）
            const prefectureMap = {
                '北海道': 'hokkaido', '青森県': 'aomori', '岩手県': 'iwate', '宮城県': 'miyagi',
                '秋田県': 'akita', '山形県': 'yamagata', '福島県': 'fukushima', '茨城県': 'ibaraki',
                '栃木県': 'tochigi', '群馬県': 'gunma', '埼玉県': 'saitama', '千葉県': 'chiba',
                '東京都': 'tokyo', '神奈川県': 'kanagawa', '新潟県': 'niigata', '富山県': 'toyama',
                '石川県': 'ishikawa', '福井県': 'fukui', '山梨県': 'yamanashi', '長野県': 'nagano',
                '岐阜県': 'gifu', '静岡県': 'shizuoka', '愛知県': 'aichi', '三重県': 'mie',
                '滋賀県': 'shiga', '京都府': 'kyoto', '大阪府': 'osaka', '兵庫県': 'hyogo',
                '奈良県': 'nara', '和歌山県': 'wakayama', '鳥取県': 'tottori', '島根県': 'shimane',
                '岡山県': 'okayama', '広島県': 'hiroshima', '山口県': 'yamaguchi', '徳島県': 'tokushima',
                '香川県': 'kagawa', '愛媛県': 'ehime', '高知県': 'kochi', '福岡県': 'fukuoka',
                '佐賀県': 'saga', '長崎県': 'nagasaki', '熊本県': 'kumamoto', '大分県': 'oita',
                '宮崎県': 'miyazaki', '鹿児島県': 'kagoshima', '沖縄県': 'okinawa'
            };
            const englishValue = prefectureMap[orderData.prefecture] || orderData.prefecture;
            prefectureField.value = englishValue;
            console.log('✓ 都道府县已填充:', orderData.prefecture, '->', englishValue);
        }
    }
    if (orderData.address_line) {
        const addressField = document.getElementById('address') || document.getElementById('streetAddress');
        if (addressField) {
            addressField.value = orderData.address_line;
        }
    }

    // 填充追加服务
    if (orderData.breakfast_selected) {
        document.getElementById('breakfast').checked = true;
    }
    if (orderData.dinner_selected) {
        document.getElementById('dinner').checked = true;
    }
    if (orderData.private_bath_selected) {
        document.getElementById('privateBath').checked = true;
    }

    // 填充特别要求
    if (orderData.special_requests) {
        document.getElementById('specialRequests').value = orderData.special_requests;
    }

    // 更新预订信息显示（入住日期、退房日期、房型等）
    updateReservationInfoFromOrder(orderData);

    console.log('✅ Form filled with order data');
}

/**
 * 从订单数据更新预订信息显示
 * @param {Object} orderData - 订单数据
 */
function updateReservationInfoFromOrder(orderData) {
    console.log('📅 Updating reservation info from order data:', orderData);

    // 格式化日期为日文格式
    function formatDateJapanese(dateStr) {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
        const weekday = weekdays[date.getDay()];
        return `${year}年${month}月${day}日（${weekday}）`;
    }

    // 更新入住日期
    const checkinElement = document.getElementById('checkinDate');
    if (checkinElement && orderData.checkin_date) {
        checkinElement.textContent = formatDateJapanese(orderData.checkin_date);
        console.log('✓ 更新入住日期:', formatDateJapanese(orderData.checkin_date));
    }

    // 更新退房日期
    const checkoutElement = document.getElementById('checkoutDate');
    if (checkoutElement && orderData.checkout_date) {
        checkoutElement.textContent = formatDateJapanese(orderData.checkout_date);
        console.log('✓ 更新退房日期:', formatDateJapanese(orderData.checkout_date));
    }

    // 更新住宿天数
    const nightsElement = document.getElementById('nightsCount');
    if (nightsElement && orderData.num_nights) {
        nightsElement.textContent = `${orderData.num_nights}泊`;
        console.log('✓ 更新宿泊数:', `${orderData.num_nights}泊`);
    }

    // 更新房型
    const roomTypeElement = document.getElementById('roomType');
    if (roomTypeElement && orderData.room_type_code) {
        const roomTypeNames = {
            'twin': 'ツインルーム【セミダブルベッド】',
            'triple': 'トリプルルーム【シングルベッド】',
            'twin_japanese': '和洋室　6帖和室＋洋室ツイン【シングルベッド】',
            'family': 'ファミリー和洋室　15帖和洋室＋洋室ツイン【セミダブルベッド】'
        };
        const roomTypeName = roomTypeNames[orderData.room_type_code] || orderData.room_type_code;
        roomTypeElement.textContent = roomTypeName;
        console.log('✓ 更新客室类型:', roomTypeName);
    }

    // 更新人数
    const guestCountElement = document.getElementById('guestCount');
    if (guestCountElement) {
        let guestText = `大人${orderData.num_adults || 2}名`;
        if (orderData.num_children && orderData.num_children > 0) {
            guestText += ` 子供${orderData.num_children}名`;
        }
        guestCountElement.textContent = guestText;
        console.log('✓ 更新宾客人数:', guestText);
    }

    // 更新房间数
    const roomCountElement = document.getElementById('roomCount');
    if (roomCountElement && orderData.num_rooms) {
        roomCountElement.textContent = `${orderData.num_rooms}室`;
        console.log('✓ 更新房间数:', `${orderData.num_rooms}室`);
    }

    console.log('📅 Reservation info updated from order data');
}

/**
 * 更新价格显示
 * @param {Object} orderData - 订单数据
 */
function updatePriceDisplay(orderData) {
    // 保存订单数据和总额到全局变量，供积分计算使用
    window.currentTempOrderData = orderData;
    if (typeof window.currentOrderTotal !== 'undefined') {
        window.currentOrderTotal = parseInt(orderData.total_price) || 0;
        console.log('💰 Updated currentOrderTotal to:', window.currentOrderTotal);
    }

    // 更新右侧预订信息卡的价格 - 显示最终金额（扣除积分后）
    const totalPriceElement = document.getElementById('totalPrice');
    if (totalPriceElement) {
        // 优先显示 final_amount（扣除积分后的金额），如果不存在则显示 total_price
        const displayPrice = orderData.final_amount || orderData.total_price;
        if (displayPrice) {
            totalPriceElement.textContent = `¥${parseFloat(displayPrice).toLocaleString()}`;
            console.log('💰 Updated price display:', {
                total_price: orderData.total_price,
                points_used: orderData.points_used,
                final_amount: orderData.final_amount,
                displayed: displayPrice
            });
        }
    }

    // 如果有追加服务，更新服务费用显示
    if (orderData.service_cost > 0) {
        // 这里可以添加显示服务费用的逻辑
        console.log('Service cost:', orderData.service_cost);
    }
}

// ==================== 支付完成处理 ====================

/**
 * 支付成功后转移订单
 * 在 Stripe 支付成功回调中调用
 * @param {string} stripePaymentId - Stripe 支付 ID
 * @returns {Promise<string>} 新的正式订单编号
 */
async function completePayment(stripePaymentId) {
    try {
        console.log('💳 Completing payment for temp order:', tempOrderCode);

        if (!tempOrderCode) {
            throw new Error('临时订单编号不存在');
        }

        const response = await fetch(
            ORDER_TEMP_CONFIG.getUrl(`/order-temp/${tempOrderCode}/complete-payment`),
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include', // 携带 session cookie
                body: JSON.stringify({
                    stripePaymentId: stripePaymentId
                })
            }
        );

        const result = await response.json();

        if (result.success) {
            console.log('✅ Payment completed, new order code:', result.data.orderCode);

            // 清除内存中的临时订单编号和预订参数
            tempOrderCode = null;
            window.currentTempOrderCode = null;
            bookingParams = null;

            return result.data.orderCode;
        } else {
            throw new Error(result.message || '订单转移失败');
        }

    } catch (error) {
        console.error('❌ Error completing payment:', error);
        throw error;
    }
}

// ==================== 工具函数 ====================

/**
 * 显示通知消息
 * @param {string} message - 消息内容
 * @param {string} type - 消息类型 ('success', 'error', 'warning')
 */
function showNotification(message, type = 'info') {
    // 这里可以集成现有的通知系统
    // 或者创建一个简单的通知提示
    console.log(`[${type.toUpperCase()}]`, message);

    // 简单的 alert 提示（可以替换为更美观的通知组件）
    if (type === 'error') {
        // alert(message);
    }
}

/**
 * 获取当前临时订单编号
 * @returns {string|null}
 */
function getTempOrderCode() {
    return tempOrderCode;
}

/**
 * 获取缓存的订单数据
 * @returns {Object|null}
 */
function getOrderData() {
    return cachedOrderData || window.currentOrderData || null;
}

/**
 * 删除临时订单
 */
async function deleteTempOrder() {
    if (!tempOrderCode) return;

    try {
        await fetch(
            ORDER_TEMP_CONFIG.getUrl(`/order-temp/${tempOrderCode}`),
            { method: 'DELETE', credentials: 'include' }
        );

        // 清除内存中的订单编号和预订参数
        tempOrderCode = null;
        window.currentTempOrderCode = null;
        bookingParams = null;

        console.log('✅ Temp order deleted');
    } catch (error) {
        console.error('❌ Error deleting temp order:', error);
    }
}

// ==================== 导出 ====================

// 将函数暴露到全局作用域
window.OrderTemp = {
    init: initOrderTemp,
    save: saveOrderDraft,
    load: loadOrderDraft,
    completePayment: completePayment,
    getTempOrderCode: getTempOrderCode,
    getOrderData: getOrderData,
    deleteTempOrder: deleteTempOrder
};

console.log('📦 Order Temp module loaded');
