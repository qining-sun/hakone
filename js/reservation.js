// Reservation Page JavaScript

// 使用动态主机名构建API地址，支持通过IP访问
window.API_BASE_URL = window.API_BASE_URL || window.API_CONFIG?.BOOKING_API || '/api';

document.addEventListener('DOMContentLoaded', function() {
    // Custom calendar is now handled by custom-calendar.js

    // 标记是否已执行过搜索
    let hasSearched = false;

    // Plans search form handling
    const searchForm = document.getElementById('plansSearchForm');
    if (searchForm) {
        searchForm.addEventListener('submit', function(e) {
            e.preventDefault();
            performSearch();
        });

        // 监听人数和房间数的变化，搜索后修改时提醒用户
        const adultsSelect = document.getElementById('adults');
        const childrenSelect = document.getElementById('children');
        const roomsSelect = document.getElementById('rooms');
        const childrenPreschoolSelect = document.getElementById('childrenPreschool');
        const childrenElementarySelect = document.getElementById('childrenElementary');

        function showResearchReminder() {
            if (!hasSearched) return;

            // 检查是否已经有弹窗
            if (document.getElementById('researchModal')) return;

            const modal = document.createElement('div');
            modal.id = 'researchModal';
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                animation: fadeIn 0.2s ease;
            `;
            modal.innerHTML = `
                <div style="
                    background: white;
                    border-radius: 16px;
                    padding: 30px;
                    max-width: 400px;
                    width: 90%;
                    text-align: center;
                    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                    animation: scaleIn 0.3s ease;
                ">
                    <div style="
                        width: 60px;
                        height: 60px;
                        background: linear-gradient(135deg, #fff3cd 0%, #ffeeba 100%);
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        margin: 0 auto 20px;
                    ">
                        <i class="fas fa-exclamation-triangle" style="color: #856404; font-size: 28px;"></i>
                    </div>
                    <h3 style="color: #333; font-size: 18px; margin-bottom: 12px; font-weight: 600;">${window.i18n ? window.i18n.t('res_conditions_changed') : '条件が変更されました'}</h3>
                    <p style="color: #666; font-size: 14px; margin-bottom: 25px; line-height: 1.6;">${window.i18n ? window.i18n.t('res_conditions_changed_desc') : '人数または部屋数を変更しました。<br>正確な料金を表示するには再検索してください。'}</p>
                    <div style="display: flex; justify-content: center;">
                        <button id="researchNowBtn" style="
                            background: linear-gradient(135deg, #D2691E 0%, #FF8C42 100%);
                            color: white;
                            border: none;
                            padding: 12px 32px;
                            border-radius: 25px;
                            font-size: 14px;
                            font-weight: 600;
                            cursor: pointer;
                        ">${window.i18n ? window.i18n.t('res_research_now') : '再検索する'}</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            // 绑定按钮事件
            document.getElementById('researchNowBtn').addEventListener('click', function() {
                removeResearchReminder();
                performSearch();
            });
        }

        function removeResearchReminder() {
            const modal = document.getElementById('researchModal');
            if (modal) {
                modal.remove();
            }
        }

        if (adultsSelect) {
            adultsSelect.addEventListener('change', showResearchReminder);
        }
        if (childrenSelect) {
            childrenSelect.addEventListener('change', showResearchReminder);
        }
        if (roomsSelect) {
            roomsSelect.addEventListener('change', showResearchReminder);
        }
        if (childrenPreschoolSelect) {
            childrenPreschoolSelect.addEventListener('change', showResearchReminder);
        }
        if (childrenElementarySelect) {
            childrenElementarySelect.addEventListener('change', showResearchReminder);
        }

        // 从URL读取搜索参数并自动搜索
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('checkin') && urlParams.has('checkout')) {
            // 填充表单
            const checkin = urlParams.get('checkin');
            const checkout = urlParams.get('checkout');
            const adults = urlParams.get('adults') || '2';
            const children = urlParams.get('children') || '0';
            const rooms = urlParams.get('rooms') || '1';
            const childrenPreschool = urlParams.get('childrenPreschool') || '0';
            const childrenElementary = urlParams.get('childrenElementary') || '0';

            document.querySelector('[name="checkin"]').value = checkin;
            document.querySelector('[name="checkout"]').value = checkout;
            document.querySelector('[name="adults"]').value = adults;
            document.querySelector('[name="children"]').value = children;
            document.querySelector('[name="rooms"]').value = rooms;

            // 填充儿童分类参数
            const childrenPreschoolInput = document.querySelector('[name="childrenPreschool"]');
            const childrenElementaryInput = document.querySelector('[name="childrenElementary"]');
            if (childrenPreschoolInput) childrenPreschoolInput.value = childrenPreschool;
            if (childrenElementaryInput) childrenElementaryInput.value = childrenElementary;

            // 自动执行搜索
            performSearch();
        }
    }

    // Plan action buttons
    const detailButtons = document.querySelectorAll('.plan-detail-btn');
    const reserveButtons = document.querySelectorAll('.plan-reserve-btn');

    detailButtons.forEach(button => {
        button.addEventListener('click', function() {
            const planCard = this.closest('.plan-card');
            const planName = planCard.querySelector('.plan-name').textContent;
            showPlanDetails(planName);
        });
    });

    // 预订按钮：直接跳转到 booking.html，登录检查在该页面进行
    reserveButtons.forEach(button => {
        button.addEventListener('click', function() {
            const planCard = this.closest('.plan-card');
            const planName = planCard.querySelector('.plan-name').textContent;
            console.log('预约按钮被点击, planName:', planName);
            reservePlan(planName);
        });
    });

    async function performSearch() {
        // 移除重新搜索提醒
        removeResearchReminder();

        // Get form values
        const formData = new FormData(searchForm);
        const searchParams = {
            checkin: formData.get('checkin'),
            checkout: formData.get('checkout'),
            rooms: formData.get('rooms'),
            adults: formData.get('adults'),
            children: formData.get('children'),
            childrenPreschool: formData.get('childrenPreschool') || '0',
            childrenElementary: formData.get('childrenElementary') || '0'
        };

        // Validate dates
        if (!searchParams.checkin || !searchParams.checkout) {
            const msg = window.i18n ? window.i18n.t('res_select_dates') : 'チェックイン・チェックアウト日を選択してください。';
            alert(msg);
            return;
        }

        if (new Date(searchParams.checkin) >= new Date(searchParams.checkout)) {
            const msg = window.i18n ? window.i18n.t('res_checkout_after_checkin') : 'チェックアウト日はチェックイン日より後の日付を選択してください。';
            alert(msg);
            return;
        }

        // 更新URL，保存搜索参数
        const urlParams = new URLSearchParams(searchParams);
        const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
        window.history.pushState({ searchParams }, '', newUrl);

        // Show loading state
        showLoading();

        try {
            // 获取 API Provider 设置
            const apiProvider = window.getApiProvider ? window.getApiProvider() : 'local';
            console.log('🔗 API Provider:', apiProvider);

            const queryString = new URLSearchParams(searchParams).toString();
            const apiBase = window.API_BASE_URL.includes('/api') ? window.API_BASE_URL : `${window.API_BASE_URL}/api`;

            let response;
            let result;

            if (apiProvider === 'tl-lincoln') {
                // 使用 TL-Lincoln API (OTA_HotelAvail)
                console.log('📡 使用 TL-Lincoln OTA_HotelAvail API');
                response = await fetch(`${apiBase}/tl-lincoln/rooms/search?${queryString}`, {
                    headers: window.getApiHeaders ? window.getApiHeaders() : {}
                });
                result = await response.json();
                console.log('TL-Lincoln 搜索结果:', result);
            } else {
                // 使用自社 API
                console.log('📡 使用自社 API');
                response = await fetch(`${apiBase}/rooms/search?${queryString}`, {
                    headers: window.getApiHeaders ? window.getApiHeaders() : {}
                });
                result = await response.json();
                console.log('自社 API 搜索结果:', result);
            }

            if (result.success) {
                // 标记已搜索
                hasSearched = true;
                // 显示搜索结果
                displaySearchResults(result.data, searchParams, result.notice);
            } else {
                const failMsg = window.i18n ? window.i18n.t('res_search_failed') : '検索に失敗しました';
                alert(result.message || failMsg);
            }
        } catch (error) {
            console.error('搜索错误:', error);
            const errorMsg = window.i18n ? window.i18n.t('res_search_error') : '検索中にエラーが発生しました。もう一度お試しください。';
            alert(errorMsg);
        } finally {
            hideLoading();
        }
    }

    // 按房型分组
    function groupRoomsByType(rooms) {
        const grouped = {};
        rooms.forEach(room => {
            const key = room.room_type_code;
            if (!grouped[key]) {
                grouped[key] = {
                    room_type_code: room.room_type_code,
                    room_type_name: room.room_type_name,
                    image_path: room.image_path,
                    image_urls: room.image_urls || [],
                    bed_type: room.bed_type,
                    non_smoking: room.non_smoking,
                    room_description: room.room_description,
                    description: room.description,
                    checkin_time: room.checkin_time,
                    checkout_time: room.checkout_time,
                    available_rooms: room.available_rooms,
                    sold_out: room.sold_out || false,
                    plans: []
                };
            }
            // 添加计划信息
            grouped[key].plans.push({
                plan_code: room.plan_code || room.tl_lincoln_data?.ratePlanCode || null,
                plan_name: room.plan_name || '素泊まりプラン',
                description: room.plan_description || '',
                meal_description: room.meal_description || '素泊まり',
                breakfast: room.breakfast,
                dinner: room.dinner,
                total_price: room.total_price_for_rooms || room.total_price,
                tl_lincoln_data: room.tl_lincoln_data || null
            });
            // 更新可用房间数（取最小值）
            if (room.available_rooms < grouped[key].available_rooms) {
                grouped[key].available_rooms = room.available_rooms;
            }
        });
        return Object.values(grouped);
    }

    // 显示搜索结果
    function displaySearchResults(rooms, searchParams, notice) {
        const plansList = document.getElementById('plansList');
        const resultsCount = document.getElementById('resultsCount');

        // 清空现有结果
        plansList.innerHTML = '';

        // 显示通告
        if (notice) {
            const noticeDiv = document.createElement('div');
            noticeDiv.style.cssText = 'width:100%;background:#fff8e1;border:1px solid #ffe082;border-radius:8px;padding:20px 24px;margin-bottom:20px;';
            noticeDiv.innerHTML = '<div style="font-weight:bold;color:#e65100;margin-bottom:10px;">' + notice.title + '</div>' +
                '<div style="color:#555;white-space:pre-line;line-height:1.8;">' + notice.message + '</div>';
            plansList.appendChild(noticeDiv);
        }

        // 如果没有结果
        if (rooms.length === 0) {
            plansList.innerHTML = `
                <div style="text-align: center; padding: 60px 20px; width: 100%;">
                    <i class="fas fa-bed" style="font-size: 4rem; color: #ccc; margin-bottom: 20px;"></i>
                    <h3 style="color: #666; margin-bottom: 10px;">該当する部屋が見つかりませんでした</h3>
                    <p style="color: #999;">検索条件を変更してお試しください</p>
                </div>
            `;
            resultsCount.textContent = '0';
            return;
        }

        // 按房型分组
        const groupedRooms = groupRoomsByType(rooms);

        // 有库存的排前面，售罄的排后面
        groupedRooms.sort((a, b) => (a.sold_out ? 1 : 0) - (b.sold_out ? 1 : 0));

        // 更新结果计数（显示有库存的房型数量）
        const availableCount = groupedRooms.filter(r => !r.sold_out).length;
        resultsCount.textContent = availableCount;

        // 生成房间卡片（带多个 plan）
        groupedRooms.forEach((roomGroup, index) => {
            const card = createRoomCardWithPlans(roomGroup, searchParams);
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            plansList.appendChild(card);

            // 渐进动画
            setTimeout(() => {
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, index * 50);
        });

        // 平滑滚动到结果
        setTimeout(() => {
            document.querySelector('.plans-results-section').scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }, 100);
    }

    // 为动态生成的按钮添加事件委托（只绑定一次）
    const plansList = document.getElementById('plansList');
    if (plansList && !plansList.dataset.eventBound) {
        plansList.dataset.eventBound = 'true';
        plansList.addEventListener('click', function(e) {
            const detailBtn = e.target.closest('.plan-detail-btn');
            const reserveBtn = e.target.closest('.plan-reserve-btn');

            if (detailBtn) {
                const roomName = detailBtn.dataset.roomName;
                const roomCode = detailBtn.dataset.roomCode;
                // TL-Lincoln: 获取房型代码和计划代码
                const tlRoomType = detailBtn.dataset.tlRoomType || null;
                const tlRatePlan = detailBtn.dataset.tlRatePlan || null;

                console.log('详情按钮点击:', roomName, roomCode, 'TL:', tlRoomType, tlRatePlan);
                showPlanDetails(roomName, { tlRoomType, tlRatePlan });
            }

            if (reserveBtn) {
                const roomName = reserveBtn.dataset.roomName;
                const roomCode = reserveBtn.dataset.roomCode;
                // TL-Lincoln: 直接从按钮获取 plan_code
                const planCode = reserveBtn.dataset.planCode || null;
                const tlRoomType = reserveBtn.dataset.tlRoomType || null;

                console.log('预约按钮点击:', roomName, roomCode, '计划:', planCode);
                handleReservationWithCode(roomCode, roomName, planCode, tlRoomType);
            }
        });
    }

    // 使用房型代码进行预约（更可靠）
    function handleReservationWithCode(roomCode, roomName, planCode) {
        console.log('=== handleReservationWithCode 被调用 ===');
        console.log('roomCode:', roomCode);
        console.log('roomName:', roomName);
        console.log('planCode:', planCode);
        console.log('当前 URL:', window.location.href);
        console.log('window.location.search:', window.location.search);

        const urlParams = new URLSearchParams(window.location.search);
        const params = new URLSearchParams();

        // 获取参数并打印调试信息
        const checkin = urlParams.get('checkin') || '';
        const checkout = urlParams.get('checkout') || '';
        console.log('从 URL 获取的 checkin:', checkin);
        console.log('从 URL 获取的 checkout:', checkout);

        params.append('checkin', checkin);
        params.append('checkout', checkout);
        params.append('rooms', urlParams.get('rooms') || '1');
        params.append('adults', urlParams.get('adults') || '2');
        params.append('children', urlParams.get('children') || '0');
        params.append('childrenPreschool', urlParams.get('childrenPreschool') || '0');
        params.append('childrenElementary', urlParams.get('childrenElementary') || '0');
        params.append('code', roomCode);

        // 如果有计划代码，添加到参数
        if (planCode) {
            params.append('plan', planCode);
        }

        // 跳转到 booking.html
        const finalURL = `booking.html?${params.toString()}`;
        console.log('最终跳转 URL:', finalURL);
        window.location.href = finalURL;
    }

    // 创建房间卡片
    function createRoomCard(room, searchParams) {
        const card = document.createElement('div');
        card.className = 'plan-card';

        // 判断是否为 TL-Lincoln 数据（通过 room_type_code 前缀判断）
        const isTLLincoln = room.room_type_code && room.room_type_code.startsWith('tl_');

        // 优先使用数据库的图片路径，如果没有则使用默认映射
        const roomImages = {
            'twin': 'img/rooms/double/room_2_500.jpg',
            'triple': 'img/rooms/triple/room_3_500.jpg',
            'twin_japanese': 'img/rooms/twin_japanese/room_wayou500.jpg',
            'family': 'img/rooms/family/room_family_500.jpg'
        };

        // 使用数据库的 image_path，如果没有则使用默认映射
        const imageSrc = room.image_path || roomImages[room.room_type_code] || 'img/rooms/double/room_2_500.jpg';

        // 房型尺寸和床型信息
        let roomSize;
        if (isTLLincoln && room.bed_type) {
            roomSize = room.bed_type;
            if (room.non_smoking !== undefined) {
                roomSize += room.non_smoking ? '・禁煙' : '・喫煙可';
            }
        } else {
            const roomSizeInfo = {
                'twin': '33m²・セミダブルベッド×2',
                'triple': '33m²・シングルベッド×3',
                'twin_japanese': '33m²・6帖和室＋洋室ツイン',
                'family': '15帖和洋室＋洋室ツイン・セミダブルベッド×2'
            };
            roomSize = roomSizeInfo[room.room_type_code] || '33m²';
        }

        // 构建描述内容
        let descriptionHtml = '';
        if (isTLLincoln && room.room_description) {
            descriptionHtml = `<div class="room-desc">${room.room_description}</div>`;
        } else {
            descriptionHtml = room.description || '';
        }

        // 计算住宿晚数
        const checkinDate = new Date(searchParams.checkin);
        const checkoutDate = new Date(searchParams.checkout);
        const nights = Math.ceil((checkoutDate - checkinDate) / (1000 * 60 * 60 * 24));

        const totalPrice = Math.floor(room.total_price_for_rooms || room.total_price);
        const adults = parseInt(searchParams.adults) || 2;
        const children = parseInt(searchParams.children) || 0;
        const roomsCount = parseInt(searchParams.rooms) || 1;

        // 房型定员信息
        const roomCapacityInfo = {
            'twin': '定員2名',
            'triple': '定員3名',
            'twin_japanese': '定員4名',
            'family': '定員4名'
        };
        const roomCapacity = roomCapacityInfo[room.room_type_code] || '定員2名';

        const limitedBadge = window.i18n ? window.i18n.t('res_limited_availability') : '残りわずか';
        const checkinLabel = window.i18n ? window.i18n.t('res_checkin_label') : 'チェックイン：';
        const checkoutLabel = window.i18n ? window.i18n.t('res_checkout_label') : 'チェックアウト：';

        // Check-in/Check-out 时间
        const checkinTime = room.checkin_time || '15:00～';
        const checkoutTime = room.checkout_time || '～10:00';

        // TL-Lincoln: 显示计划名称和餐食信息
        let planInfoHtml = '';
        if (isTLLincoln) {
            planInfoHtml = `
                <div class="plan-name-sub" style="font-size: 14px; color: #D2691E; font-weight: 500; margin-top: 5px;">${room.plan_name || ''}</div>
                <div class="meal-info" style="margin-top: 8px;">
                    <span style="display: inline-block; background: ${room.breakfast || room.dinner ? '#D2691E' : '#999'}; color: white; padding: 2px 10px; border-radius: 12px; font-size: 12px;">
                        ${room.meal_description || '素泊まり'}
                    </span>
                </div>
            `;
        }

        card.innerHTML = `
            <div class="plan-image">
                <img src="${imageSrc}" alt="${room.room_type_name}" class="room-image">
                ${room.available_rooms <= 3 ? `<div class="plan-badge">${limitedBadge}</div>` : ''}
            </div>
            <div class="plan-details" style="flex: 1;">
                <div class="plan-header">
                    <h4 class="plan-name">${room.room_type_name}</h4>
                    <div class="plan-size">${roomSize}</div>
                    <div class="plan-capacity">${roomCapacity}</div>
                </div>
                ${planInfoHtml}
                <div class="plan-description" style="margin-top: 8px;">
                    ${descriptionHtml}
                </div>
                <div class="plan-times" style="margin-top: 10px;">
                    <div class="time-info">
                        <span class="time-label">${checkinLabel}</span>
                        <span>${checkinTime}</span>
                    </div>
                    <div class="time-info">
                        <span class="time-label">${checkoutLabel}</span>
                        <span>${checkoutTime}</span>
                    </div>
                </div>
            </div>
            <div class="plan-pricing">
                <div class="price-section">
                    <div class="total-price">
                        <span class="total-label">${(() => {
                            const adultsText = `大人${adults}名`;
                            const childrenText = children > 0 ? `・子供${children}名` : '';
                            return `合計（${nights}泊・${roomsCount}室・${adultsText}${childrenText}）`;
                        })()}</span>
                        <span class="total-amount">${totalPrice > 0 ? `¥${totalPrice.toLocaleString()}` : '料金未定'}<span class="tax-included-label">${totalPrice > 0 ? '（税込）' : ''}</span></span>
                    </div>
                </div>
                <div class="plan-actions">
                    <button class="plan-detail-btn" data-room-code="${room.room_type_code}" data-room-name="${room.room_type_name.replace(/'/g, '&#39;')}" ${isTLLincoln ? `data-tl-room-type="${room.tl_lincoln_data?.roomTypeCode || ''}" data-tl-rate-plan="${room.tl_lincoln_data?.ratePlanCode || ''}"` : ''}>詳細を見る</button>
                    <button class="plan-reserve-btn" data-room-code="${room.room_type_code}" data-room-name="${room.room_type_name.replace(/'/g, '&#39;')}" data-plan-code="${room.plan_code || room.tl_lincoln_data?.ratePlanCode || ''}" ${isTLLincoln ? `data-tl-room-type="${room.tl_lincoln_data?.roomTypeCode || ''}"` : ''}>予約する</button>
                </div>
            </div>
        `;

        return card;
    }

    // 创建带多个 Plan 列表的房间卡片
    function createRoomCardWithPlans(roomGroup, searchParams) {
        const card = document.createElement('div');
        card.className = 'plan-card plan-card-with-plans';

        // 判断是否为 TL-Lincoln 数据
        const isTLLincoln = roomGroup.room_type_code && roomGroup.room_type_code.startsWith('tl_');

        // 图片路径
        const roomImages = {
            'twin': 'img/rooms/double/room_2_500.jpg',
            'triple': 'img/rooms/triple/room_3_500.jpg',
            'twin_japanese': 'img/rooms/twin_japanese/room_wayou500.jpg',
            'family': 'img/rooms/family/room_family_500.jpg'
        };
        const defaultImage = roomGroup.image_path || roomImages[roomGroup.room_type_code] || 'img/rooms/double/room_2_500.jpg';

        // 图片数组（支持多张图片轮播）
        const imageUrls = roomGroup.image_urls && roomGroup.image_urls.length > 0
            ? roomGroup.image_urls
            : [defaultImage];
        const hasMultipleImages = imageUrls.length > 1;

        // 房型尺寸信息
        let roomSize;
        if (isTLLincoln && roomGroup.bed_type) {
            roomSize = roomGroup.bed_type;
            if (roomGroup.non_smoking !== undefined) {
                roomSize += roomGroup.non_smoking ? '・禁煙' : '・喫煙可';
            }
        } else {
            const roomSizeInfo = {
                'twin': '33m²・セミダブルベッド×2',
                'triple': '33m²・シングルベッド×3',
                'twin_japanese': '33m²・6帖和室＋洋室ツイン',
                'family': '15帖和洋室＋洋室ツイン・セミダブルベッド×2'
            };
            roomSize = roomSizeInfo[roomGroup.room_type_code] || '33m²';
        }

        // 房型定员信息
        const roomCapacityInfo = {
            'twin': '定員2名',
            'triple': '定員3名',
            'twin_japanese': '定員4名',
            'family': '定員4名'
        };
        const roomCapacity = roomCapacityInfo[roomGroup.room_type_code] || '定員2名';

        // 描述
        let descriptionHtml = '';
        if (isTLLincoln && roomGroup.room_description) {
            descriptionHtml = `<div class="room-desc">${roomGroup.room_description}</div>`;
        } else {
            descriptionHtml = roomGroup.description || '';
        }

        // 计算住宿信息
        const checkinDate = new Date(searchParams.checkin);
        const checkoutDate = new Date(searchParams.checkout);
        const nights = Math.ceil((checkoutDate - checkinDate) / (1000 * 60 * 60 * 24));
        const adults = parseInt(searchParams.adults) || 2;
        const children = parseInt(searchParams.children) || 0;
        const roomsCount = parseInt(searchParams.rooms) || 1;

        const limitedBadge = window.i18n ? window.i18n.t('res_limited_availability') : '残りわずか';
        const checkinLabel = window.i18n ? window.i18n.t('res_checkin_label') : 'チェックイン：';
        const checkoutLabel = window.i18n ? window.i18n.t('res_checkout_label') : 'チェックアウト：';
        const checkinTime = roomGroup.checkin_time || '15:00～';
        const checkoutTime = roomGroup.checkout_time || '～10:00';

        // 判断是否售罄
        const isSoldOut = roomGroup.sold_out === true;

        // 生成 Plan 列表 HTML
        const plansListHtml = roomGroup.plans.map((plan, index) => {
            const totalPrice = Math.floor(plan.total_price);
            const mealBadgeColor = (plan.breakfast || plan.dinner) ? '#D2691E' : '#999';
            const mealText = plan.meal_description || '素泊まり';

            // 获取 TL-Lincoln 数据
            const tlRoomType = plan.tl_lincoln_data?.roomTypeCode || '';
            const tlRatePlan = plan.tl_lincoln_data?.ratePlanCode || '';

            const planDescription = plan.description || '';

            if (isSoldOut) {
                return `
                    <div class="plan-list-item ${index === 0 ? 'first' : ''}" style="opacity: 0.5;">
                        <div class="plan-item-left">
                            <div class="plan-item-info">
                                <span class="plan-item-name">${plan.plan_name}</span>
                            </div>
                            ${planDescription ? `<div class="plan-item-description">${planDescription}</div>` : ''}
                        </div>
                        <div class="plan-item-right">
                            <div class="plan-item-price">
                                <span class="plan-item-amount sold-out-label" style="color: #cc0000; font-weight: bold;">売り切れ</span>
                            </div>
                        </div>
                    </div>
                `;
            }

            return `
                <div class="plan-list-item ${index === 0 ? 'first' : ''}">
                    <div class="plan-item-left">
                        <div class="plan-item-info">
                            <span class="plan-item-name">${plan.plan_name}</span>
                        </div>
                        ${planDescription ? `<div class="plan-item-description">${planDescription}</div>` : ''}
                    </div>
                    <div class="plan-item-right">
                        <div class="plan-item-price">
                            <span class="plan-item-amount">${totalPrice > 0 ? `¥${totalPrice.toLocaleString()}` : '料金未定'}</span>
                            <span class="plan-item-tax">${totalPrice > 0 ? '（税込）' : ''}</span>
                        </div>
                        <div class="plan-item-actions">
                            <button class="plan-reserve-btn plan-item-btn"
                                data-room-code="${roomGroup.room_type_code}"
                                data-room-name="${roomGroup.room_type_name.replace(/'/g, '&#39;')}"
                                data-plan-code="${plan.plan_code || tlRatePlan}"
                                data-tl-room-type="${tlRoomType}">
                                予約する
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // 住宿信息文本
        const stayInfoText = (() => {
            const adultsText = `大人${adults}名`;
            const childrenText = children > 0 ? `・子供${children}名` : '';
            return `${nights}泊・${roomsCount}室・${adultsText}${childrenText}`;
        })();

        // 生成图片轮播 HTML
        const imageSliderHtml = hasMultipleImages ? `
            <div class="image-slider" data-current="0">
                <div class="slider-container">
                    ${imageUrls.map((url, i) => `<img src="${url}" alt="${roomGroup.room_type_name}" class="slider-image ${i === 0 ? 'active' : ''}" data-index="${i}">`).join('')}
                </div>
                <button class="slider-btn slider-prev" aria-label="前の画像"><i class="fas fa-chevron-left"></i></button>
                <button class="slider-btn slider-next" aria-label="次の画像"><i class="fas fa-chevron-right"></i></button>
                <div class="slider-dots">
                    ${imageUrls.map((_, i) => `<span class="slider-dot ${i === 0 ? 'active' : ''}" data-index="${i}"></span>`).join('')}
                </div>
            </div>
        ` : `<img src="${imageUrls[0]}" alt="${roomGroup.room_type_name}" class="room-image">`;

        card.innerHTML = `
            <div class="plan-card-main"${isSoldOut ? ' style="opacity: 0.6;"' : ''}>
                <div class="plan-image">
                    ${imageSliderHtml}
                    ${isSoldOut ? '<div class="plan-badge" style="background: #cc0000;">売り切れ</div>' : (roomGroup.available_rooms <= 3 ? `<div class="plan-badge">${limitedBadge}</div>` : '')}
                </div>
                <div class="plan-details">
                    <div class="plan-header">
                        <h4 class="plan-name">${roomGroup.room_type_name}</h4>
                        <div class="plan-size">${roomSize}</div>
                        <div class="plan-capacity">${roomCapacity}</div>
                    </div>
                    <div class="plan-description" style="margin-top: 8px;">
                        ${descriptionHtml}
                    </div>
                    <div class="plan-times" style="margin-top: 10px;">
                        <div class="time-info">
                            <span class="time-label">${checkinLabel}</span>
                            <span>${checkinTime}</span>
                        </div>
                        <div class="time-info">
                            <span class="time-label">${checkoutLabel}</span>
                            <span>${checkoutTime}</span>
                        </div>
                    </div>
                </div>
            </div>
            <div class="plan-list-section">
                <div class="plan-list-header">
                    <span class="plan-list-title"><i class="fas fa-list-ul"></i> プラン一覧</span>
                    <span class="plan-list-stay-info">${stayInfoText}</span>
                </div>
                <div class="plan-list-container">
                    ${plansListHtml}
                </div>
            </div>
        `;

        // 添加图片轮播事件处理
        if (hasMultipleImages) {
            const slider = card.querySelector('.image-slider');
            const images = slider.querySelectorAll('.slider-image');
            const dots = slider.querySelectorAll('.slider-dot');
            const prevBtn = slider.querySelector('.slider-prev');
            const nextBtn = slider.querySelector('.slider-next');
            let currentIndex = 0;

            const showImage = (index) => {
                images.forEach((img, i) => img.classList.toggle('active', i === index));
                dots.forEach((dot, i) => dot.classList.toggle('active', i === index));
                currentIndex = index;
            };

            prevBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const newIndex = currentIndex === 0 ? images.length - 1 : currentIndex - 1;
                showImage(newIndex);
            });

            nextBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const newIndex = currentIndex === images.length - 1 ? 0 : currentIndex + 1;
                showImage(newIndex);
            });

            dots.forEach((dot, i) => {
                dot.addEventListener('click', (e) => {
                    e.stopPropagation();
                    showImage(i);
                });
            });

            // 支持触摸滑动
            let touchStartX = 0;
            slider.addEventListener('touchstart', (e) => {
                touchStartX = e.touches[0].clientX;
            }, { passive: true });

            slider.addEventListener('touchend', (e) => {
                const touchEndX = e.changedTouches[0].clientX;
                const diff = touchStartX - touchEndX;
                if (Math.abs(diff) > 50) {
                    if (diff > 0) {
                        // 向左滑 → 下一张
                        const newIndex = currentIndex === images.length - 1 ? 0 : currentIndex + 1;
                        showImage(newIndex);
                    } else {
                        // 向右滑 → 上一张
                        const newIndex = currentIndex === 0 ? images.length - 1 : currentIndex - 1;
                        showImage(newIndex);
                    }
                }
            }, { passive: true });
        }

        return card;
    }

    function showPlanDetails(planName, tlLincolnData = {}) {
        // Get current search parameters to pass to detail page
        const searchParams = new URLSearchParams();
        const formData = new FormData(searchForm);

        // 优先从 URL 参数获取日期，其次从表单获取
        const urlParams = new URLSearchParams(window.location.search);

        // 日期格式验证函数
        const isValidDate = (dateStr) => {
            if (!dateStr) return false;
            const regex = /^\d{4}-\d{2}-\d{2}$/;
            if (!regex.test(dateStr)) return false;
            const date = new Date(dateStr);
            return date instanceof Date && !isNaN(date);
        };

        // Add search parameters (带验证)
        const urlCheckin = urlParams.get('checkin');
        const urlCheckout = urlParams.get('checkout');
        const checkin = (isValidDate(urlCheckin) ? urlCheckin : null) || formData.get('checkin') || document.getElementById('checkin')?.value;
        const checkout = (isValidDate(urlCheckout) ? urlCheckout : null) || formData.get('checkout') || document.getElementById('checkout')?.value;
        const adults = urlParams.get('adults')?.replace(/\D/g, '') || formData.get('adults') || '2';
        const children = urlParams.get('children')?.replace(/\D/g, '') || formData.get('children') || '0';
        const childrenPreschool = urlParams.get('childrenPreschool')?.replace(/\D/g, '') || formData.get('childrenPreschool') || '0';
        const childrenElementary = urlParams.get('childrenElementary')?.replace(/\D/g, '') || formData.get('childrenElementary') || '0';

        if (checkin) searchParams.append('checkin', checkin);
        if (checkout) searchParams.append('checkout', checkout);
        if (adults) searchParams.append('adults', adults);
        if (children) searchParams.append('children', children);
        if (childrenPreschool) searchParams.append('childrenPreschool', childrenPreschool);
        if (childrenElementary) searchParams.append('childrenElementary', childrenElementary);

        // 检查是否为 TL-Lincoln 模式
        const { tlRoomType, tlRatePlan } = tlLincolnData;
        const isTLLincoln = tlRoomType && tlRatePlan;

        console.log('=== showPlanDetails Debug ===');
        console.log('planName:', planName);
        console.log('TL-Lincoln:', isTLLincoln, { tlRoomType, tlRatePlan });

        if (isTLLincoln) {
            // TL-Lincoln 模式：使用 roomTypeCode 和 ratePlanCode 参数
            searchParams.append('roomTypeCode', tlRoomType);
            searchParams.append('ratePlanCode', tlRatePlan);
        } else {
            // 自社 API 模式：使用 plan 参数
            // Map plan name to plan type for URL (匹配数据库中的实际代码)
            let planType = 'twin';
            if (planName.includes('和洋室') && planName.includes('6帖')) {
                planType = 'twin_japanese';
            } else if (planName.includes('ファミリー') || planName.includes('15帖')) {
                planType = 'family';
            } else if (planName.includes('トリプルルーム')) {
                planType = 'triple';
            }

            console.log('planType:', planType);
            searchParams.append('plan', planType);
        }

        // Redirect to plan detail page
        window.location.href = `plan-detail.html?${searchParams.toString()}`;
    }

    // 暴露为全局函数，供动态生成的卡片使用
    window.showPlanDetails = showPlanDetails;

    function reservePlan(planName) {
        const searchParams = new URLSearchParams();

        // 优先从 URL 参数获取日期，其次从表单获取
        const urlParams = new URLSearchParams(window.location.search);

        // 日期格式验证函数
        const isValidDate = (dateStr) => {
            if (!dateStr) return false;
            const regex = /^\d{4}-\d{2}-\d{2}$/;
            if (!regex.test(dateStr)) return false;
            const date = new Date(dateStr);
            return date instanceof Date && !isNaN(date);
        };

        // 从 URL 或表单获取参数（带验证）
        const urlCheckin = urlParams.get('checkin');
        const urlCheckout = urlParams.get('checkout');
        const checkin = (isValidDate(urlCheckin) ? urlCheckin : null) || document.getElementById('checkin')?.value || '';
        const checkout = (isValidDate(urlCheckout) ? urlCheckout : null) || document.getElementById('checkout')?.value || '';
        const rooms = urlParams.get('rooms')?.replace(/\D/g, '') || document.getElementById('rooms')?.value || '1';
        const adults = urlParams.get('adults')?.replace(/\D/g, '') || document.getElementById('adults')?.value || '2';
        const children = urlParams.get('children')?.replace(/\D/g, '') || document.getElementById('children')?.value || '0';
        const childrenPreschool = urlParams.get('childrenPreschool')?.replace(/\D/g, '') || document.getElementById('childrenPreschool')?.value || '0';
        const childrenElementary = urlParams.get('childrenElementary')?.replace(/\D/g, '') || document.getElementById('childrenElementary')?.value || '0';

        // 添加基本参数到 URL
        if (checkin) searchParams.append('checkin', checkin);
        if (checkout) searchParams.append('checkout', checkout);
        if (rooms) searchParams.append('rooms', rooms);
        if (adults) searchParams.append('adults', adults);
        if (children) searchParams.append('children', children);
        if (childrenPreschool) searchParams.append('childrenPreschool', childrenPreschool);
        if (childrenElementary) searchParams.append('childrenElementary', childrenElementary);

        // Map plan name to room type code (匹配数据库中的实际代码)
        // 注意：检查顺序很重要，更具体的条件要放在前面
        let roomTypeCode = 'twin';  // 默认: ツインルーム
        if (planName.includes('和洋室') && planName.includes('6帖')) {
            roomTypeCode = 'twin_japanese';  // 和洋室【6帖】
        } else if (planName.includes('ファミリー') || planName.includes('15帖')) {
            roomTypeCode = 'family';  // ファミリー和洋室【15帖】
        } else if (planName.includes('トリプルルーム')) {
            roomTypeCode = 'triple';  // トリプルルーム
        }

        searchParams.append('code', roomTypeCode);  // 添加房型代码

        // 添加详细的调试日志
        console.log('=== reservePlan 调试信息 ===');
        console.log('planName:', planName);
        console.log('roomTypeCode:', roomTypeCode);
        console.log('所有 URL 参数:');
        for (let [key, value] of searchParams.entries()) {
            console.log(`  ${key}: ${value}`);
        }
        console.log('完整 URL 参数字符串:', searchParams.toString());

        // 直接跳转到 booking 页面
        const finalURL = `booking.html?${searchParams.toString()}`;
        console.log('跳转到预订页面:', finalURL);
        window.location.href = finalURL;
    }

    // 暴露为全局函数，供动态生成的卡片使用
    window.reservePlanGlobal = reservePlan;

    // Member Modal Functions
    let selectedPlanName = null;

    function showMemberModal(planName) {
        console.log('showMemberModal 被调用, planName:', planName);
        selectedPlanName = planName;
        const modal = document.getElementById('memberModal');
        console.log('找到的 modal 元素:', modal);
        if (modal) {
            console.log('添加 show 类到 modal');
            modal.classList.add('show');
            document.body.style.overflow = 'hidden'; // Prevent body scroll
            console.log('modal 的 display 样式:', window.getComputedStyle(modal).display);
        } else {
            console.error('错误: 找不到 memberModal 元素!');
        }
    }

    // 暴露为全局函数，供动态生成的卡片使用
    window.showMemberModalGlobal = showMemberModal;

    function hideMemberModal() {
        const modal = document.getElementById('memberModal');
        if (modal) {
            modal.classList.remove('show');
            document.body.style.overflow = ''; // Restore body scroll
        }
    }

    // Modal event listeners
    const memberModal = document.getElementById('memberModal');
    if (memberModal) {
        // Close button
        const closeBtn = memberModal.querySelector('.modal-close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', hideMemberModal);
        }

        // Overlay click to close
        const overlay = memberModal.querySelector('.member-modal-overlay');
        if (overlay) {
            overlay.addEventListener('click', hideMemberModal);
        }

        // Login button - open unified auth modal (login tab)
        const loginBtn = memberModal.querySelector('#memberLoginBtn');
        if (loginBtn) {
            loginBtn.addEventListener('click', function() {
                // 关闭会员选择弹窗
                hideMemberModal();
                // 打开统一的认证弹窗(登录标签)
                setTimeout(() => {
                    if (window.authModal && typeof window.authModal.openModal === 'function') {
                        window.authModal.openModal('login');
                    }
                }, 100);
            });
        }

        // Register button - open unified auth modal (register tab)
        const registerBtn = memberModal.querySelector('#memberRegisterBtn');
        if (registerBtn) {
            registerBtn.addEventListener('click', function() {
                // 关闭会员选择弹窗
                hideMemberModal();
                // 打开统一的认证弹窗(注册标签)
                setTimeout(() => {
                    if (window.authModal && typeof window.authModal.openModal === 'function') {
                        window.authModal.openModal('register');
                    }
                }, 100);
            });
        }

        // Forgot password link
        const forgotPasswordLink = memberModal.querySelector('.forgot-password-link');
        if (forgotPasswordLink) {
            forgotPasswordLink.addEventListener('click', function(e) {
                e.preventDefault();
                // Redirect to forgot password page
                const returnUrl = encodeURIComponent(window.location.href);
                window.location.href = `../hotel/forgot-password.html?return=${returnUrl}`;
            });
        }

        // Guest booking - send link directly from main modal
        const sendGuestLinkBtn = document.getElementById('sendGuestLinkBtn');
        if (sendGuestLinkBtn) {
            sendGuestLinkBtn.addEventListener('click', async function() {
                const emailInput = document.getElementById('guestEmailInput');
                const statusDiv = document.getElementById('guestEmailStatus');
                const email = emailInput.value.trim();

                if (!email) {
                    statusDiv.innerHTML = '<span style="color: #dc3545;">メールアドレスを入力してください</span>';
                    return;
                }

                // Validate email format
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(email)) {
                    statusDiv.innerHTML = '<span style="color: #dc3545;">有効なメールアドレスを入力してください</span>';
                    return;
                }

                // Disable button and show loading state
                sendGuestLinkBtn.disabled = true;
                sendGuestLinkBtn.textContent = window.i18n ? window.i18n.t('sending') : '送信中...';
                statusDiv.innerHTML = '';

                try {
                    // Get current search parameters
                    const searchParams = new URLSearchParams();
                    const formData = new FormData(searchForm);
                    for (let [key, value] of formData.entries()) {
                        if (value) {
                            searchParams.append(key, value);
                        }
                    }

                    // Send request to backend API
                    const apiBase = window.API_BASE_URL.includes('/api') ? window.API_BASE_URL : `${window.API_BASE_URL}/api`;
                    const response = await fetch(`${apiBase}/guest/send-booking-link`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            email: email,
                            reservationParams: Object.fromEntries(searchParams)
                        })
                    });

                    const result = await response.json();

                    if (response.ok && result.success) {
                        // Success
                        statusDiv.innerHTML = '<span style="color: #28a745;"><i class="fas fa-check-circle"></i> 予約リンクを送信しました！メールをご確認ください。</span>';
                        emailInput.value = '';

                        // Show success toast
                        const successMsg = window.i18n ? window.i18n.t('res_link_sent') : '予約リンクをメールで送信しました';
                        showSuccessToast(successMsg);

                        // Close modal after 2 seconds
                        setTimeout(() => {
                            hideMemberModal();
                            statusDiv.innerHTML = '';
                        }, 2000);
                    } else {
                        // Error
                        const failMsg = window.i18n ? window.i18n.t('res_send_failed') : '送信に失敗しました';
                        statusDiv.innerHTML = `<span style="color: #dc3545;">${result.message || failMsg}</span>`;
                    }
                } catch (error) {
                    console.error('Error sending guest booking link:', error);
                    const errorMsg = window.i18n ? window.i18n.t('res_search_error') : '送信中にエラーが発生しました';
                    statusDiv.innerHTML = `<span style="color: #dc3545;">${errorMsg}</span>`;
                } finally {
                    // Re-enable button
                    sendGuestLinkBtn.disabled = false;
                    sendGuestLinkBtn.textContent = window.i18n ? window.i18n.t('send_booking_link') : '予約リンクを送信';
                }
            });
        }

        // Google login button
        const googleBtn = memberModal.querySelector('.google-login');
        if (googleBtn) {
            googleBtn.addEventListener('click', function() {
                // Redirect to Google OAuth login
                const returnUrl = encodeURIComponent(window.location.href);
                window.location.href = `../hotel/login.html?provider=google&return=${returnUrl}`;
            });
        }

        // Yahoo login button
        const yahooBtn = memberModal.querySelector('.yahoo-login');
        if (yahooBtn) {
            yahooBtn.addEventListener('click', function() {
                // Redirect to Yahoo OAuth login
                const returnUrl = encodeURIComponent(window.location.href);
                window.location.href = `../hotel/login.html?provider=yahoo&return=${returnUrl}`;
            });
        }

        // LINE login button
        const lineBtn = memberModal.querySelector('.line-login');
        if (lineBtn) {
            lineBtn.addEventListener('click', function() {
                // Redirect to LINE OAuth login
                const returnUrl = encodeURIComponent(window.location.href);
                window.location.href = `../hotel/login.html?provider=line&return=${returnUrl}`;
            });
        }

        // Apple login button
        const appleBtn = memberModal.querySelector('.apple-login');
        if (appleBtn) {
            appleBtn.addEventListener('click', function() {
                // Redirect to Apple Sign In
                const returnUrl = encodeURIComponent(window.location.href);
                window.location.href = `../hotel/login.html?provider=apple&return=${returnUrl}`;
            });
        }

        // ESC key to close
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && memberModal.classList.contains('show')) {
                hideMemberModal();
            }
        });
    }

    function showLoading() {
        const resultsSection = document.querySelector('.plans-results-section');

        // 检查是否已经存在loading动画，如果存在则不重复添加
        if (document.getElementById('searchLoading')) {
            return;
        }

        const loadingDiv = document.createElement('div');
        loadingDiv.id = 'searchLoading';
        loadingDiv.innerHTML = `
            <div style="text-align: center; padding: 40px; font-family: 'Noto Sans JP', sans-serif;">
                <i class="fas fa-spinner fa-spin" style="font-size: 2rem; color: #D2691E; margin-bottom: 15px;"></i>
                <div>検索中...</div>
            </div>
        `;

        resultsSection.style.opacity = '0.5';
        resultsSection.appendChild(loadingDiv);
    }

    function hideLoading() {
        const loadingDiv = document.getElementById('searchLoading');
        const resultsSection = document.querySelector('.plans-results-section');

        if (loadingDiv) {
            loadingDiv.remove();
        }

        resultsSection.style.opacity = '1';
    }

    // Initialize plan cards with transition styles
    const planCards = document.querySelectorAll('.plan-card');
    planCards.forEach(card => {
        card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    });

    // Handle URL parameters (if coming from homepage search)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('checkin')) {
        // Populate form with URL parameters
        for (let [key, value] of urlParams.entries()) {
            const input = document.querySelector(`[name="${key}"]`);
            if (input) {
                input.value = value;
            }
        }

        // Automatically perform search
        setTimeout(() => {
            performSearch();
        }, 500);
    }

    // Language switching functionality
    const languageBtn = document.getElementById('languageBtn');
    const languageDropdown = document.getElementById('languageDropdown');
    const currentLanguageSpan = document.getElementById('currentLanguage');

    // Translation data
    const translations = {
        ja: {
            'current-language': '日本語',
            'hero.title': '心に響く、特別な時間。',
            'hero.subtitle': '宿泊をもっと特別に。',
            'search.title': 'プラン検索',
            'search.dates': '宿泊日',
            'search.guests': '人数',
            'search.rooms': '部屋数',
            'search.adults': '大人',
            'search.children': '子供',
            'search.button': '検索',
            'history.nav': '予約履歴',
            'login.nav': 'ログイン',
            'register.nav': '新規登録',
            'plan.standard': 'ツインルーム【セミダブルベッド】',
            'plan.deluxe': 'トリプルルーム【シングルベッド】',
            'plan.suite': '和洋室【6帖】',
            'plan.onsen': 'ファミリー和洋室【15帖】',
            'plan.detail': '詳細を見る',
            'plan.reserve': '予約する',
            'results.showing': '件表示',
            'results.count': '検索結果：',
            'member.title': 'ご予約方法をお選びください',
            'member.login': 'ログイン',
            'member.register': '新規登録',
            'member.guest': 'ゲストとして予約',
            'breadcrumb.home': 'ホーム',
            'breadcrumb.reservation': '宿泊プラン一覧',
            'auth.login.title': 'ログイン',
            'auth.login.subtitle': 'アカウントにログインしてください',
            'auth.register.title': '新規登録',
            'auth.register.subtitle': '新しいアカウントを作成してください',
            'auth.email': 'メールアドレス',
            'auth.password': 'パスワード',
            'auth.confirm_password': 'パスワード確認',
            'auth.first_name': '名前（姓）',
            'auth.last_name': '名前（名）',
            'auth.remember': 'ログイン状態を保持',
            'auth.forgot': 'パスワードを忘れた方',
            'auth.login.button': 'ログイン',
            'auth.register.button': '新規登録',
            'auth.or': 'または',
            'auth.google': 'Googleでログイン',
            'auth.line': 'LINEでログイン',
            'auth.no_account': 'アカウントをお持ちでない方は',
            'auth.have_account': 'すでにアカウントをお持ちの方は',
            'auth.register.link': '新規登録',
            'auth.login.link': 'ログイン',
            'auth.agree_terms': '利用規約とプライバシーポリシーに同意します'
        },
        en: {
            'current-language': 'English',
            'hero.title': 'Memorable moments, special times.',
            'hero.subtitle': 'Make your stay more special.',
            'search.title': 'Plan Search',
            'search.dates': 'Check-in/out Dates',
            'search.guests': 'Guests',
            'search.rooms': 'Rooms',
            'search.adults': 'Adults',
            'search.children': 'Children',
            'search.button': 'Search',
            'history.nav': 'Reservation History',
            'login.nav': 'Login',
            'register.nav': 'Sign Up',
            'plan.standard': 'Twin Room [Semi-Double Bed]',
            'plan.deluxe': 'Triple Room [Single Bed]',
            'plan.suite': 'Japanese-Western Room [6 Tatami]',
            'plan.onsen': 'Family Japanese-Western Room [15 Tatami]',
            'plan.detail': 'View Details',
            'plan.reserve': 'Reserve',
            'results.showing': 'results',
            'results.count': 'Search Results: ',
            'member.title': 'Please choose your booking method',
            'member.login': 'Login',
            'member.register': 'Sign Up',
            'member.guest': 'Book as Guest',
            'breadcrumb.home': 'Home',
            'breadcrumb.reservation': 'Accommodation Plans',
            'auth.login.title': 'Login',
            'auth.login.subtitle': 'Please login to your account',
            'auth.register.title': 'Sign Up',
            'auth.register.subtitle': 'Create a new account',
            'auth.email': 'Email Address',
            'auth.password': 'Password',
            'auth.confirm_password': 'Confirm Password',
            'auth.first_name': 'First Name',
            'auth.last_name': 'Last Name',
            'auth.remember': 'Remember me',
            'auth.forgot': 'Forgot password?',
            'auth.login.button': 'Login',
            'auth.register.button': 'Sign Up',
            'auth.or': 'or',
            'auth.google': 'Login with Google',
            'auth.line': 'Login with LINE',
            'auth.no_account': "Don't have an account?",
            'auth.have_account': 'Already have an account?',
            'auth.register.link': 'Sign up',
            'auth.login.link': 'Login',
            'auth.agree_terms': 'I agree to the Terms of Service and Privacy Policy'
        },
        zh: {
            'current-language': '中文',
            'hero.title': '触动心灵的特别时光',
            'hero.subtitle': '让住宿更加特别',
            'search.title': '方案搜索',
            'search.dates': '入住日期',
            'search.guests': '客人数',
            'search.rooms': '房间数',
            'search.adults': '成人',
            'search.children': '儿童',
            'search.button': '搜索',
            'history.nav': '预约履历',
            'login.nav': '登录',
            'register.nav': '注册',
            'plan.standard': '双床房【半双人床】',
            'plan.deluxe': '三床房【单人床】',
            'plan.suite': '和洋室【6帖】',
            'plan.onsen': '家庭和洋室【15帖】',
            'plan.detail': '查看详情',
            'plan.reserve': '预订',
            'results.showing': '项结果',
            'results.count': '搜索结果：',
            'member.title': '请选择您的预订方式',
            'member.login': '登录',
            'member.register': '注册',
            'member.guest': '作为客人预订',
            'breadcrumb.home': '首页',
            'breadcrumb.reservation': '住宿方案',
            'auth.login.title': '登录',
            'auth.login.subtitle': '请登录您的账户',
            'auth.register.title': '注册',
            'auth.register.subtitle': '创建新账户',
            'auth.email': '邮箱地址',
            'auth.password': '密码',
            'auth.confirm_password': '确认密码',
            'auth.first_name': '姓',
            'auth.last_name': '名',
            'auth.remember': '记住我',
            'auth.forgot': '忘记密码？',
            'auth.login.button': '登录',
            'auth.register.button': '注册',
            'auth.or': '或',
            'auth.google': '使用Google登录',
            'auth.line': '使用LINE登录',
            'auth.no_account': '还没有账户？',
            'auth.have_account': '已有账户？',
            'auth.register.link': '注册',
            'auth.login.link': '登录',
            'auth.agree_terms': '我同意服务条款和隐私政策'
        },
        ko: {
            'current-language': '한국어',
            'hero.title': '마음에 울리는 특별한 시간',
            'hero.subtitle': '숙박을 더욱 특별하게',
            'search.title': '플랜 검색',
            'search.dates': '체크인/아웃 날짜',
            'search.guests': '인원수',
            'search.rooms': '객실수',
            'search.adults': '성인',
            'search.children': '어린이',
            'search.button': '검색',
            'history.nav': '예약 내역',
            'login.nav': '로그인',
            'register.nav': '회원가입',
            'plan.standard': '트윈룸【세미더블베드】',
            'plan.deluxe': '트리플룸【싱글베드】',
            'plan.suite': '화양실【6첩】',
            'plan.onsen': '패밀리 화양실【15첩】',
            'plan.detail': '자세히 보기',
            'plan.reserve': '예약하기',
            'results.showing': '개 결과',
            'results.count': '검색 결과: ',
            'member.title': '예약 방법을 선택해주세요',
            'member.login': '로그인',
            'member.register': '회원가입',
            'member.guest': '게스트로 예약',
            'breadcrumb.home': '홈',
            'breadcrumb.reservation': '숙박 플랜',
            'auth.login.title': '로그인',
            'auth.login.subtitle': '계정에 로그인해주세요',
            'auth.register.title': '회원가입',
            'auth.register.subtitle': '새 계정을 만들어주세요',
            'auth.email': '이메일 주소',
            'auth.password': '비밀번호',
            'auth.confirm_password': '비밀번호 확인',
            'auth.first_name': '성',
            'auth.last_name': '이름',
            'auth.remember': '로그인 상태 유지',
            'auth.forgot': '비밀번호를 잊으셨나요?',
            'auth.login.button': '로그인',
            'auth.register.button': '회원가입',
            'auth.or': '또는',
            'auth.google': 'Google로 로그인',
            'auth.line': 'LINE으로 로그인',
            'auth.no_account': '계정이 없으신가요?',
            'auth.have_account': '이미 계정이 있으신가요?',
            'auth.register.link': '회원가입',
            'auth.login.link': '로그인',
            'auth.agree_terms': '서비스 약관 및 개인정보 처리방침에 동의합니다'
        }
    };

    let currentLang = 'ja';

    function changeLanguage(lang) {
        currentLang = lang;
        const langTranslations = translations[lang];

        // Update current language display
        if (currentLanguageSpan) {
            currentLanguageSpan.textContent = langTranslations['current-language'];
        }

        // Update all elements with data-i18n attributes
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            if (langTranslations[key]) {
                if (element.hasAttribute('placeholder')) {
                    element.placeholder = langTranslations[key];
                } else {
                    element.textContent = langTranslations[key];
                }
            }
        });

        // Store language preference
        window.safeStorage.setItem('preferred-language', lang);

        // Close dropdown
        languageDropdown.classList.remove('show');
    }

    // Language dropdown event listeners
    if (languageBtn && languageDropdown) {
        languageBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            languageDropdown.classList.toggle('show');
        });

        // Language option click handlers
        document.querySelectorAll('.language-option').forEach(option => {
            option.addEventListener('click', function() {
                const lang = this.getAttribute('data-lang');
                changeLanguage(lang);
            });
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', function(e) {
            if (!languageBtn.contains(e.target) && !languageDropdown.contains(e.target)) {
                languageDropdown.classList.remove('show');
            }
        });
    }

    // Load saved language preference
    const savedLang = window.safeStorage.getItem('preferred-language');
    if (savedLang && translations[savedLang]) {
        changeLanguage(savedLang);
    }

    // History navigation button
    const historyNavBtn = document.querySelector('.history-nav-btn');
    if (historyNavBtn) {
        historyNavBtn.addEventListener('click', function(e) {
            e.preventDefault();
            // Redirect to reservation history page
            window.location.href = 'reservation-history.html';
        });
    }

    // Toast notification functions
    function showSuccessToast(message) {
        showToast(message, 'success');
    }

    function showErrorToast(message) {
        showToast(message, 'error');
    }

    function showToast(message, type = 'info') {
        // 创建toast元素
        const toast = document.createElement('div');
        toast.className = `toast-notification toast-${type}`;
        toast.innerHTML = `
            <div class="toast-icon">
                ${type === 'success' ? '<i class="fas fa-check-circle"></i>' : '<i class="fas fa-exclamation-circle"></i>'}
            </div>
            <div class="toast-message">${message}</div>
        `;

        // 添加样式
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#28a745' : '#dc3545'};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10001;
            display: flex;
            align-items: center;
            gap: 12px;
            font-family: 'Noto Sans JP', sans-serif;
            font-size: 14px;
            max-width: 400px;
            animation: slideInRight 0.3s ease;
        `;

        document.body.appendChild(toast);

        // 3秒后自动移除
        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }


    // Currency Conversion Functionality
    const currencyRates = {
        JPY: 1,
        USD: 0.0067,  // 1 JPY = 0.0067 USD (example rate)
        EUR: 0.0061,  // 1 JPY = 0.0061 EUR (example rate)
        CNY: 0.048,   // 1 JPY = 0.048 CNY (example rate)
        KRW: 8.9      // 1 JPY = 8.9 KRW (example rate)
    };

    const currencySymbols = {
        JPY: '¥',
        USD: '$',
        EUR: '€',
        CNY: '¥',
        KRW: '₩'
    };

    let currentCurrency = 'JPY';
    let originalPrices = [];

    // Store original prices
    function storeOriginalPrices() {
        const priceElements = document.querySelectorAll('.price-amount, .total-amount');
        priceElements.forEach((element, index) => {
            const priceText = element.textContent.trim();
            const priceMatch = priceText.match(/¥([\d,]+)/);
            if (priceMatch) {
                const priceValue = parseInt(priceMatch[1].replace(/,/g, ''));
                originalPrices[index] = {
                    element: element,
                    originalPrice: priceValue,
                    originalText: priceText
                };
            }
        });
    }

    function changeCurrency(newCurrency) {
        if (newCurrency === currentCurrency) return;

        const rate = currencyRates[newCurrency];
        const symbol = currencySymbols[newCurrency];

        // Update the currency display
        document.getElementById('currentCurrency').textContent = newCurrency;

        // Update all prices
        originalPrices.forEach(priceData => {
            const convertedPrice = priceData.originalPrice * rate;
            const formattedPrice = formatPrice(convertedPrice, newCurrency);
            priceData.element.textContent = `${symbol}${formattedPrice}`;
        });

        currentCurrency = newCurrency;
    }

    function formatPrice(price, currency) {
        switch(currency) {
            case 'JPY':
            case 'KRW':
                return price.toLocaleString();
            case 'USD':
            case 'EUR':
            case 'CNY':
                return price.toFixed(2);
            default:
                return price.toString();
        }
    }

    // Currency dropdown functionality
    const currencyBtn = document.getElementById('currencyBtn');
    const currencyDropdown = document.getElementById('currencyDropdown');
    const currencyOptions = document.querySelectorAll('.currency-option');

    if (currencyBtn && currencyDropdown) {
        // Store original prices
        storeOriginalPrices();

        // Toggle dropdown
        currencyBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            currencyDropdown.classList.toggle('show');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', function() {
            currencyDropdown.classList.remove('show');
        });

        // Handle currency selection
        currencyOptions.forEach(option => {
            option.addEventListener('click', function() {
                const selectedCurrency = this.dataset.currency;
                changeCurrency(selectedCurrency);
                currencyDropdown.classList.remove('show');

                // Update active state
                currencyOptions.forEach(opt => opt.classList.remove('active'));
                this.classList.add('active');
            });
        });

        // Set initial active state
        document.querySelector(`[data-currency="${currentCurrency}"]`).classList.add('active');
    }
});

// 全局函数：处理预订按钮点击（用于动态生成的卡片）
// 直接跳转到 booking.html，登录检查在该页面进行
window.handleReservation = function(planName) {
    console.log('=== handleReservation 被调用 ===');
    console.log('planName:', planName);
    console.log('window.reservePlanGlobal 存在:', !!window.reservePlanGlobal);

    // 直接调用 reservePlan 跳转到 booking.html
    if (window.reservePlanGlobal) {
        window.reservePlanGlobal(planName);
    } else {
        console.error('❌ window.reservePlanGlobal 未定义！');
        // 备用方案：直接构建URL跳转
        const urlParams = new URLSearchParams(window.location.search);
        const params = new URLSearchParams();

        params.append('checkin', urlParams.get('checkin') || '');
        params.append('checkout', urlParams.get('checkout') || '');
        params.append('rooms', urlParams.get('rooms') || '1');
        params.append('adults', urlParams.get('adults') || '2');
        params.append('children', urlParams.get('children') || '0');
        params.append('childrenPreschool', urlParams.get('childrenPreschool') || '0');
        params.append('childrenElementary', urlParams.get('childrenElementary') || '0');

        // 确定房型代码
        let roomTypeCode = 'twin';
        if (planName && planName.includes('和洋室') && planName.includes('6帖')) {
            roomTypeCode = 'twin_japanese';
        } else if (planName && (planName.includes('ファミリー') || planName.includes('15帖'))) {
            roomTypeCode = 'family';
        } else if (planName && planName.includes('トリプルルーム')) {
            roomTypeCode = 'triple';
        }
        params.append('code', roomTypeCode);

        // 跳转到 booking.html
        const finalURL = `booking.html?${params.toString()}`;
        console.log('使用备用方案跳转:', finalURL);
        window.location.href = finalURL;
    }
};

// Hide loading screen when all resources are loaded
window.addEventListener('load', function() {
    const loadingScreen = document.getElementById('loadingScreen');
    const mainContent = document.getElementById('mainContent');

    if (loadingScreen && mainContent) {
        // Show main content
        mainContent.style.display = 'block';

        // Fade out loading screen
        loadingScreen.style.opacity = '0';
        loadingScreen.style.visibility = 'hidden';

        // Remove loading screen after fade out
        setTimeout(() => {
            loadingScreen.style.display = 'none';
        }, 300);
    }
});