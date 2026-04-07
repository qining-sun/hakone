// Room Search API Integration
// 使用 api-config.js 配置或相对路径
window.API_BASE_URL = window.API_BASE_URL || window.API_CONFIG?.BOOKING_API || '/api';

// 执行房间搜索
async function searchRooms() {
    const checkin = document.getElementById('checkin').value;
    const checkout = document.getElementById('checkout').value;
    const rooms = document.getElementById('rooms').value;
    const adults = document.getElementById('adults').value;
    const children = document.getElementById('children').value;

    // 验证必填字段
    if (!checkin || !checkout) {
        alert('请选择入住和退房日期');
        return;
    }

    // 显示加载状态
    showLoadingState();

    try {
        // 构建查询参数
        const params = new URLSearchParams({
            checkin: checkin,
            checkout: checkout,
            adults: adults,
            children: children,
            rooms: rooms
        });

        // 调用API
        const response = await fetch(window.getApiUrl(`/rooms/search?${params}`));
        const result = await response.json();

        if (result.success) {
            // 显示搜索结果
            displaySearchResults(result.data, result.search_params);
            updateResultsCount(result.count);
        } else {
            showError(result.message || '搜索失败，请稍后重试');
        }
    } catch (error) {
        console.error('搜索错误:', error);
        showError('无法连接到服务器，请检查网络连接');
    } finally {
        hideLoadingState();
    }
}

// 显示搜索结果
function displaySearchResults(rooms, searchParams) {
    const plansList = document.getElementById('plansList');

    if (!rooms || rooms.length === 0) {
        plansList.innerHTML = `
            <div class="no-results">
                <i class="fas fa-search"></i>
                <h3>未找到符合条件的客房</h3>
                <p>请尝试修改搜索条件</p>
            </div>
        `;
        return;
    }

    // 清空现有结果
    plansList.innerHTML = '';

    // 为每个房型创建卡片
    rooms.forEach((room, index) => {
        const planCard = createPlanCard(room, searchParams, index === 0);
        plansList.appendChild(planCard);
    });
}

// 创建房型卡片
function createPlanCard(room, searchParams, isRecommended) {
    const card = document.createElement('div');
    card.className = 'plan-card';

    // 格式化价格
    const pricePerNight = Math.round(room.price_per_night).toLocaleString();
    const totalPrice = Math.round(room.total_price).toLocaleString();
    const totalPriceForRooms = Math.round(room.total_price_for_rooms).toLocaleString();

    card.innerHTML = `
        <div class="plan-image">
            <img src="img/rooms/${getRoomImage(room.room_type_code)}"
                 alt="${room.room_type_name}"
                 class="room-image"
                 onerror="this.src='img/rooms/default.jpg'">
            ${isRecommended ? '<div class="plan-badge">おすすめ</div>' : ''}
        </div>
        <div class="plan-details">
            <div class="plan-header">
                <h4 class="plan-name">${room.room_type_name}</h4>
                <div class="plan-capacity">
                    <i class="fas fa-users"></i>
                    最大 ${room.max_adults}名（大人）+ ${room.max_children}名（子供）
                </div>
            </div>
            <div class="plan-description">
                ${room.description || getRoomDescription(room.room_type_code)}
            </div>
            <div class="plan-features">
                <div class="feature-item">
                    <i class="fas fa-bed"></i>
                    <span>空室: ${room.available_rooms}室</span>
                </div>
                <div class="feature-item">
                    <i class="fas fa-moon"></i>
                    <span>${room.nights}泊</span>
                </div>
                <div class="feature-item">
                    <i class="fas fa-wifi"></i>
                    <span>無料Wi-Fi</span>
                </div>
            </div>
        </div>
        <div class="plan-pricing">
            <div class="price-section">
                <div class="price-per-night">
                    <span class="price-label">1泊あたり</span>
                    <span class="price-amount">¥${pricePerNight}<span class="tax-included-text">税込</span></span>
                </div>
                <div class="price-per-room">
                    <span class="price-label">1室 ${room.nights}泊</span>
                    <span class="price-amount">¥${totalPrice}<span class="tax-included-text">税込</span></span>
                </div>
                ${searchParams.rooms > 1 ? `
                <div class="total-price">
                    <span class="total-label">合計（${searchParams.rooms}室）</span>
                    <span class="total-amount">¥${totalPriceForRooms}<span class="tax-included-text">税込</span></span>
                </div>
                ` : ''}
            </div>
            <div class="plan-actions">
                <button class="plan-detail-btn" onclick="showRoomDetails('${room.room_type_code}')">
                    <i class="fas fa-info-circle"></i>
                    詳細を見る
                </button>
                <button class="plan-reserve-btn" onclick="reserveRoom('${room.room_type_code}', ${JSON.stringify(searchParams).replace(/"/g, '&quot;')})">
                    <i class="fas fa-calendar-check"></i>
                    予約する
                </button>
            </div>
        </div>
    `;

    return card;
}

// 获取房间图片路径
function getRoomImage(roomTypeCode) {
    const imageMap = {
        'twin': 'double room/room_2_500.jpg',
        'triple': 'triple room/room_3_500.jpg',
        'quad': 'Western japanese room/room_wayou500.jpg',
        'small_double': 'family japanese room/room_family_500.jpg'
    };
    return imageMap[roomTypeCode] || 'default.jpg';
}

// 获取房间描述
function getRoomDescription(roomTypeCode) {
    const descriptions = {
        'twin': '快適なセミダブルベッドを2台配置したツインルームです。33m²の広々とした空間で、ビジネスやカップルでのご利用に最適です。',
        'triple': '3名様でご利用いただけるトリプルルームです。シングルベッド3台を配置し、ご家族やグループでのご宿泊に最適です。',
        'quad': '4名様でご利用いただける広々としたクアッドルームです。シングルベッド4台を配置し、大人数でのご宿泊に便利です。',
        'small_double': 'カップルやお一人様に最適なスモールダブルルームです。セミダブルベッド1台で快適にお過ごしいただけます。'
    };
    return descriptions[roomTypeCode] || '快適な客室でゆっくりとお過ごしいただけます。';
}

// 更新结果数量
function updateResultsCount(count) {
    const resultsCount = document.getElementById('resultsCount');
    if (resultsCount) {
        resultsCount.textContent = count;
    }
}

// 显示加载状态
function showLoadingState() {
    const plansList = document.getElementById('plansList');
    const searchBtn = document.querySelector('.search-plans-btn');

    if (searchBtn) {
        searchBtn.disabled = true;
        searchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 検索中...';
    }

    if (plansList) {
        plansList.innerHTML = `
            <div class="loading-state">
                <i class="fas fa-spinner fa-spin"></i>
                <p>検索中...</p>
            </div>
        `;
    }
}

// 隐藏加载状态
function hideLoadingState() {
    const searchBtn = document.querySelector('.search-plans-btn');
    if (searchBtn) {
        searchBtn.disabled = false;
        searchBtn.innerHTML = '<i class="fas fa-search"></i> <span data-i18n="search.button">検索する</span>';
    }
}

// 显示错误信息
function showError(message) {
    const plansList = document.getElementById('plansList');
    if (plansList) {
        plansList.innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-circle"></i>
                <h3>エラー</h3>
                <p>${message}</p>
            </div>
        `;
    }
    alert(message);
}

// 显示房间详情
function showRoomDetails(roomTypeCode) {
    // 获取当前搜索参数
    const checkin = document.getElementById('checkin').value;
    const checkout = document.getElementById('checkout').value;
    const rooms = document.getElementById('rooms').value;
    const adults = document.getElementById('adults').value;
    const children = document.getElementById('children').value;

    // 跳转到详情页
    window.location.href = `plan-detail.html?code=${roomTypeCode}&checkin=${checkin}&checkout=${checkout}&rooms=${rooms}&adults=${adults}&children=${children}`;
}

// 预订房间
function reserveRoom(roomTypeCode, searchParams) {
    // 保存预订参数到全局变量
    window.currentReservation = {
        code: roomTypeCode,
        checkin: searchParams.checkin,
        checkout: searchParams.checkout,
        rooms: searchParams.rooms,
        adults: searchParams.adults,
        children: searchParams.children
    };

    // 检查用户是否已登录
    const currentUser = window.safeStorage ? window.safeStorage.getItem('currentUser') : null;
    console.log('reserveRoom 被调用, currentUser:', currentUser);

    if (currentUser) {
        // 用户已登录，跳转到会员预订页面
        console.log('用户已登录，跳转到会员预订页面');
        const params = new URLSearchParams(window.currentReservation);
        window.location.href = `booking-user.html?${params.toString()}`;
    } else {
        // 用户未登录，显示会员/游客选择弹窗
        console.log('用户未登录，显示会员选择弹窗');
        const modal = document.getElementById('memberModal');
        if (modal) {
            modal.classList.add('show');
            document.body.style.overflow = 'hidden';
        } else {
            // 如果弹窗不存在，跳转到游客预订页面
            const params = new URLSearchParams(window.currentReservation);
            window.location.href = `booking.html?${params.toString()}`;
        }
    }
}

// 页面加载时执行初始搜索
document.addEventListener('DOMContentLoaded', function() {
    // 绑定搜索表单提交事件
    const searchForm = document.getElementById('plansSearchForm');
    if (searchForm) {
        searchForm.addEventListener('submit', function(e) {
            e.preventDefault();
            searchRooms();
        });
    }

    // 显示初始提示信息（未搜索状态）
    const plansList = document.getElementById('plansList');
    if (plansList) {
        plansList.innerHTML = `
            <div class="search-prompt">
                <i class="fas fa-search-location" style="font-size: 48px; color: #8a7a5e; margin-bottom: 15px;"></i>
                <h3>お部屋を検索してください</h3>
                <p>チェックイン・チェックアウト日、人数を選択して検索ボタンをクリックしてください</p>
            </div>
        `;
    }

    // 隐藏结果数量
    const resultsCount = document.getElementById('resultsCount');
    if (resultsCount) {
        resultsCount.textContent = '0';
    }

    // 如果有URL参数，自动执行搜索
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('checkin') && urlParams.has('checkout')) {
        // 从URL设置表单值
        document.getElementById('checkin').value = urlParams.get('checkin');
        document.getElementById('checkout').value = urlParams.get('checkout');
        if (urlParams.has('rooms')) document.getElementById('rooms').value = urlParams.get('rooms');
        if (urlParams.has('adults')) document.getElementById('adults').value = urlParams.get('adults');
        if (urlParams.has('children')) document.getElementById('children').value = urlParams.get('children');

        // 执行搜索
        searchRooms();
    }
});