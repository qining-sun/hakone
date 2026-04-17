// Plan Detail Page JavaScript

// 获取 API Provider
const apiProvider = window.getApiProvider ? window.getApiProvider() : 'local';
console.log('🔗 API Provider:', apiProvider);

// 从 TL-Lincoln API 获取房型数据
async function fetchTLLincolnRoomData(roomTypeCode, ratePlanCode, params) {
    try {
        const { checkin, checkout, adults, childrenPreschool = 0, childrenElementary = 0 } = params;
        const qs = new URLSearchParams({
            checkin,
            checkout,
            adults,
            childrenPreschool,
            childrenElementary
        }).toString();
        const apiUrl = window.getApiUrl(`tl-lincoln/rooms/${roomTypeCode}/${ratePlanCode}?${qs}`);

        console.log('📡 TL-Lincoln Room Detail API:', apiUrl);

        const response = await fetch(apiUrl);
        const result = await response.json();

        console.log('📥 TL-Lincoln 房型数据:', result);

        if (result.success && result.data) {
            const roomData = result.data;

            // 创建 TL-Lincoln 房型的 PLAN_DATA 条目
            const planKey = `tl_${roomTypeCode}_${ratePlanCode}`;

            PLAN_DATA[planKey] = {
                roomTypeCode: roomData.tl_lincoln_data.roomTypeCode,
                ratePlanCode: roomData.tl_lincoln_data.ratePlanCode,
                breadcrumb: `${roomData.room_type_name}【${roomData.plan_name}】`,
                title: roomData.room_type_name,
                planName: roomData.plan_name,
                subtitle: roomData.plan_name,
                roomSize: '33㎡', // TL-Lincoln 可能不返回这个，使用默认值
                bedType: roomData.bed_type || 'ベッド',
                capacity: `最大${roomData.max_occupancy || 2}名様`,
                view: '山景色ビュー',
                description: roomData.plan_description || roomData.room_description || '',
                priceWithTax: roomData.total_price || 0,
                maxGuests: `最大${roomData.max_occupancy || 2}名様`,
                meals: roomData.meal_info || '食事なし',
                area: '33㎡',
                bedSize: roomData.bed_type || 'ベッド',
                imagePath: null, // TL-Lincoln 可能需要单独处理图片
                checkin_time: roomData.checkin_time,
                checkout_time: roomData.checkout_time,
                available_rooms: roomData.available_rooms,
                source: 'tl-lincoln'
            };

            console.log('✅ TL-Lincoln PLAN_DATA 已更新:', PLAN_DATA[planKey]);
            return { success: true, planKey };
        } else {
            console.warn('⚠️ TL-Lincoln API 返回失败:', result.message);
            return { success: false };
        }
    } catch (error) {
        console.error('❌ 获取 TL-Lincoln 房型数据失败:', error);
        return { success: false };
    }
}

// 从数据库获取房型数据
async function fetchAndUpdateRoomData(roomTypeCode) {
    try {
        const response = await fetch(window.getApiUrl(`/rooms/${roomTypeCode}`));
        const result = await response.json();

        console.log('📥 从数据库获取的房型数据:', result);

        if (result.success && result.data) {
            const roomData = result.data;

            // 根据 room_type_code 创建或更新 PLAN_DATA
            // 如果 roomTypeCode 已经在 PLAN_DATA 中存在，则更新；否则创建新条目
            if (!PLAN_DATA[roomTypeCode]) {
                PLAN_DATA[roomTypeCode] = {};
            }

            // 使用数据库数据更新 PLAN_DATA
            PLAN_DATA[roomTypeCode] = {
                ...PLAN_DATA[roomTypeCode], // 保留默认数据作为备份
                roomTypeCode: roomData.room_type_code,
                breadcrumb: roomData.room_type_name,
                title: roomData.room_type_name,  // 从数据库读取房间名字
                subtitle: PLAN_DATA[roomTypeCode]?.subtitle || 'Room Details',
                roomSize: roomData.room_size || PLAN_DATA[roomTypeCode]?.roomSize || '',
                bedType: roomData.bed_type || PLAN_DATA[roomTypeCode]?.bedType || '',
                capacity: `最大${roomData.max_occupancy}名様`,
                view: roomData.view_type || PLAN_DATA[roomTypeCode]?.view || '山景色ビュー',
                description: roomData.description || PLAN_DATA[roomTypeCode]?.description || '',
                priceWithTax: roomData.base_price ? Math.floor(roomData.base_price * 1.1) : (PLAN_DATA[roomTypeCode]?.priceWithTax || 0),
                maxGuests: `最大${roomData.max_occupancy}名様`,
                meals: '食事なし',
                area: roomData.room_size || PLAN_DATA[roomTypeCode]?.area || '',
                bedSize: roomData.bed_type || PLAN_DATA[roomTypeCode]?.bedSize || '',
                imagePath: roomData.image_path  // 从数据库读取图片路径
            };

            console.log('✅ 已更新 PLAN_DATA，房间名字:', roomData.room_type_name);
            console.log('✅ 图片路径:', roomData.image_path);
            console.log('完整数据:', PLAN_DATA[roomTypeCode]);
            return true; // 返回成功状态
        } else {
            console.warn('⚠️ API 返回失败，使用默认数据');
            return false;
        }
    } catch (error) {
        console.error('❌ 获取房型数据失败，使用默认数据:', error);
        return false;
    }
}

// Consolidated plan data structure - defined at top level for proper initialization
const PLAN_DATA = {
    twin: {
        breadcrumb: 'ツインルーム【セミダブルベッド】',
        title: 'ツインルーム【セミダブルベッド】',
        subtitle: 'Twin Room with Semi-Double Beds',
        roomSize: '33㎡',
        bedType: 'セミダブルベッド × 2台',
        capacity: '最大2名様',
        view: '山景色ビュー',
        description: '快適なセミダブルベッドを2台配置したツインルームです。33m²の広々とした空間で、ビジネスやカップルでのご利用に最適です。',
        priceWithTax: 0, // 不使用默认价格，必须从数据库获取
        // Additional properties for compatibility
        maxGuests: '最大2名様',
        meals: '食事なし',
        area: '33㎡',
        bedSize: 'セミダブル × 2台'
    },
    triple: {
        breadcrumb: 'トリプルルーム【シングルベッド】',
        title: 'トリプルルーム【シングルベッド】',
        subtitle: 'Triple Room with Single Beds',
        roomSize: '33㎡',
        bedType: 'シングルベッド × 3台',
        capacity: '最大3名様',
        view: '山景色ビュー',
        description: '3名様でのご利用に最適なトリプルルームです。シングルベッドを3台配置し、33m²の充分な広さでゆったりとお過ごしいただけます。',
        priceWithTax: 0, // 不使用默认价格，必须从数据库获取
        maxGuests: '最大3名様',
        meals: '食事なし',
        area: '33㎡',
        bedSize: 'シングル × 3台'
    },
    twin_japanese: {
        breadcrumb: '和洋室 6帖和室＋洋室ツイン',
        title: '和洋室 6帖和室＋洋室ツイン【シングルベッド】',
        subtitle: 'Japanese-Western Room',
        roomSize: '33㎡',
        bedType: '6帖和室＋シングルベッド × 2台',
        capacity: '最大4名様',
        view: '山景色ビュー',
        description: '和の落ち着きと洋の機能性を併せ持つ和洋室です。6帖の和室とシングルベッド2台の洋室を組み合わせ、多様なご利用シーンに対応いたします。',
        priceWithTax: 0, // 不使用默认价格，必须从数据库获取
        maxGuests: '最大4名様',
        meals: '食事なし',
        area: '33㎡',
        bedSize: '和室 + シングル × 2台'
    },
    family: {
        breadcrumb: 'ファミリー和洋室 15帖和洋室＋洋室ツイン',
        title: 'ファミリー和洋室 15帖和洋室＋洋室ツイン【セミダブルベッド】',
        subtitle: 'Family Japanese-Western Room',
        roomSize: '特大サイズ',
        bedType: '15帖和洋室＋セミダブルベッド × 2台',
        capacity: '最大6名様',
        view: '山景色ビュー',
        description: 'ご家族での滞在に最適な広々としたファミリー和洋室です。15帖の和洋室とセミダブルベッド2台の洋室を組み合わせ、大型テレビ（32インチ）を完備した特別なお部屋です。',
        priceWithTax: 0, // 不使用默认价格，必须从数据库获取
        maxGuests: '最大6名様',
        meals: '食事なし',
        area: '特大サイズ',
        bedSize: '和洋室 + セミダブル × 2台'
    }
};

document.addEventListener('DOMContentLoaded', function() {
    // Cache DOM elements to avoid repeated queries
    const elements = {
        carouselTrack: document.getElementById('carouselTrack'),
        carouselPrev: document.getElementById('carouselPrev'),
        carouselNext: document.getElementById('carouselNext'),
        roomPriceElement: document.getElementById('roomPrice'),
        backBtn: document.querySelector('.back-btn')
    };

    // Get URL parameters - 支持多种参数格式
    const urlParams = new URLSearchParams(window.location.search);

    // TL-Lincoln 参数
    const tlRoomTypeCode = urlParams.get('roomTypeCode');
    const tlRatePlanCode = urlParams.get('ratePlanCode');
    const checkin = urlParams.get('checkin');
    const checkout = urlParams.get('checkout');
    const adults = urlParams.get('adults') || '2';
    const childrenPreschool = urlParams.get('childrenPreschool') || '0';
    const childrenElementary = urlParams.get('childrenElementary') || '0';

    // 自社 API 参数
    const roomTypeCode = urlParams.get('code') || urlParams.get('plan') || 'twin';

    // 判断是否使用 TL-Lincoln
    const isTLLincoln = apiProvider === 'tl-lincoln' && tlRoomTypeCode && tlRatePlanCode;

    console.log('📋 URL Params:', { tlRoomTypeCode, tlRatePlanCode, checkin, checkout, adults, roomTypeCode });
    console.log('🔗 使用 TL-Lincoln:', isTLLincoln);

    // 设置返回按钮链接，保留搜索参数
    if (elements.backBtn) {
        const searchParams = new URLSearchParams();
        // 保留 checkin, checkout, adults, children 等搜索参数
        ['checkin', 'checkout', 'adults', 'children', 'childrenPreschool', 'childrenElementary'].forEach(key => {
            const value = urlParams.get(key);
            if (value) searchParams.set(key, value);
        });
        const backUrl = searchParams.toString()
            ? `reservation.html?${searchParams.toString()}`
            : 'reservation.html';
        elements.backBtn.href = backUrl;
    }

    // 根据 API Provider 获取数据
    if (isTLLincoln) {
        // TL-Lincoln 模式
        const planKey = `tl_${tlRoomTypeCode}_${tlRatePlanCode}`;

        // 显示加载状态
        const planTitle = document.querySelector('.plan-title');
        if (planTitle) planTitle.textContent = '読み込み中...';

        // 获取 TL-Lincoln 房型数据
        fetchTLLincolnRoomData(tlRoomTypeCode, tlRatePlanCode, { checkin, checkout, adults, childrenPreschool, childrenElementary }).then((result) => {
            if (result.success) {
                updatePageContent(result.planKey);
                updateCarouselForPlan(result.planKey);
            } else {
                // 显示错误信息
                if (planTitle) planTitle.textContent = 'データの取得に失敗しました';
            }
        });
    } else {
        // 自社 API 模式（原有逻辑）
        // 先用默认数据渲染页面，避免阻塞
        updatePageContent(roomTypeCode);

        // 请求房型数据
        fetchAndUpdateRoomData(roomTypeCode).then((roomDataSuccess) => {
            if (roomDataSuccess) {
                updatePageContent(roomTypeCode);
                updateCarouselForPlan(roomTypeCode);
            }
        });
    }

    // 日历功能已禁用
    // setTimeout(() => {
    //     loadAllInventoryDataAsync(roomTypeCode);
    // }, 100);

    // Image Carousel functionality
    let currentSlide = 0;
    let totalSlides = 2; // Default to 2 slides
    let carouselInitialized = false;

    // Update carousel for the current room type
    updateCarouselForPlan(roomTypeCode);

    // Update slide count based on plan type
    function updateCarouselForPlan(planType) {
        const carouselData = getCarouselData(planType);
        totalSlides = carouselData.images.length;

        // Use document fragment for better performance
        updateCarouselHTML(carouselData);

        // Reset to first slide
        currentSlide = 0;
        updateCarousel();

        // Initialize carousel events only once
        if (!carouselInitialized) {
            initializeCarouselEvents();
            carouselInitialized = true;
        }
    }

    // Optimized carousel HTML update using document fragments
    function updateCarouselHTML(carouselData) {
        // Update carousel track
        if (elements.carouselTrack) {
            const fragment = document.createDocumentFragment();

            carouselData.images.forEach(img => {
                const slide = document.createElement('div');
                slide.className = 'carousel-slide';
                slide.style.width = `${100 / totalSlides}%`;

                const image = document.createElement('img');
                image.src = img.src;
                image.alt = img.alt;
                image.className = 'carousel-image';

                slide.appendChild(image);
                fragment.appendChild(slide);
            });

            elements.carouselTrack.innerHTML = '';
            elements.carouselTrack.appendChild(fragment);
            elements.carouselTrack.style.width = `${totalSlides * 100}%`;
        }

        // Update indicators efficiently
        updateIndicators(carouselData.images.length);

        // Update thumbnails efficiently
        updateThumbnails(carouselData.images);
    }

    function updateIndicators(count) {
        const indicatorsContainer = document.getElementById('carouselIndicators');
        if (!indicatorsContainer) return;

        const fragment = document.createDocumentFragment();
        for (let i = 0; i < count; i++) {
            const indicator = document.createElement('span');
            indicator.className = `indicator ${i === 0 ? 'active' : ''}`;
            indicator.setAttribute('data-slide', i);
            fragment.appendChild(indicator);
        }

        indicatorsContainer.innerHTML = '';
        indicatorsContainer.appendChild(fragment);
    }

    function updateThumbnails(images) {
        const thumbnailsContainer = document.querySelector('.gallery-thumbnails');
        if (!thumbnailsContainer) return;

        const fragment = document.createDocumentFragment();
        images.forEach((img, index) => {
            const thumbnail = document.createElement('img');
            thumbnail.src = img.src;
            thumbnail.alt = img.alt;
            thumbnail.className = `thumbnail ${index === 0 ? 'active' : ''}`;
            thumbnail.setAttribute('data-slide', index);
            fragment.appendChild(thumbnail);
        });

        thumbnailsContainer.innerHTML = '';
        thumbnailsContainer.appendChild(fragment);
    }

    function getCarouselData(roomTypeCode) {
        // 优先使用数据库的图片路径
        const currentPlan = PLAN_DATA[roomTypeCode] || PLAN_DATA.twin;

        if (currentPlan.imagePath) {
            console.log('✅ 使用数据库图片路径:', currentPlan.imagePath);
            // 使用数据库的图片路径
            return {
                images: [
                    { src: currentPlan.imagePath, alt: `${currentPlan.title} - 客室全体` }
                ]
            };
        }

        // 如果数据库没有图片路径，使用默认配置（备用方案）
        console.log('⚠️ 数据库无图片路径，使用默认配置');
        const carouselData = {
            twin: {
                images: [
                    { src: 'img/rooms/double/room_2_500.jpg', alt: 'ツインルーム【セミダブルベッド】- 客室全体' },
                    { src: 'img/rooms/double/room_2_500 - Copy.jpg', alt: 'ツインルーム【セミダブルベッド】- ベッドエリア' }
                ]
            },
            triple: {
                images: [
                    { src: 'img/rooms/triple/room_3_500.jpg', alt: 'トリプルルーム【シングルベッド】- 客室全体' },
                    { src: 'img/rooms/triple/room_3_500 - Copy.jpg', alt: 'トリプルルーム【シングルベッド】- ベッドエリア' }
                ]
            },
            twin_japanese: {
                images: [
                    { src: 'img/rooms/twin_japanese/room_wayou500.jpg', alt: '和洋室 6帖和室＋洋室ツイン - 和洋室全体' },
                    { src: 'img/rooms/twin_japanese/room_wayou500 - Copy.jpg', alt: '和洋室 6帖和室＋洋室ツイン - 和室エリア' }
                ]
            },
            family: {
                images: [
                    { src: 'img/rooms/family/room_family_500.jpg', alt: 'ファミリー和洋室 15帖和洋室＋洋室ツイン - ファミリー和洋室全体' },
                    { src: 'img/rooms/family/room_family_500 - Copy.jpg', alt: 'ファミリー和洋室 15帖和洋室＋洋室ツイン - リビングエリア' }
                ]
            }
        };

        return carouselData[roomTypeCode] || carouselData.twin;
    }


    function updatePageContent(roomTypeCode) {
        console.log('=== updatePageContent 被调用 ===');
        console.log('roomTypeCode:', roomTypeCode);
        console.log('PLAN_DATA[roomTypeCode]:', PLAN_DATA[roomTypeCode]);

        // 获取当前房型数据，如果不存在则使用 twin 作为备选
        const currentPlan = PLAN_DATA[roomTypeCode] || PLAN_DATA.twin;
        console.log('currentPlan:', currentPlan);
        console.log('使用的房间名字 (title):', currentPlan.title);

        // Update breadcrumb - 显示从数据库读取的房间名字
        const breadcrumbCurrent = document.querySelector('.breadcrumb .current');
        if (breadcrumbCurrent) {
            breadcrumbCurrent.textContent = currentPlan.breadcrumb || currentPlan.title;
            console.log('✅ 已更新 breadcrumb:', currentPlan.breadcrumb || currentPlan.title);
        }

        // Update page title - 这是关键！显示从数据库读取的房间名字
        const planTitle = document.querySelector('.plan-title');
        if (planTitle) {
            planTitle.textContent = currentPlan.title;
            console.log('✅ 已更新 plan-title:', currentPlan.title);
        }

        // Update subtitle
        const planSubtitle = document.querySelector('.plan-subtitle');
        if (planSubtitle) {
            planSubtitle.textContent = currentPlan.subtitle;
        }

        // Update room specifications
        const roomSpecs = document.querySelectorAll('.spec-value');
        if (roomSpecs.length >= 5) {
            roomSpecs[0].textContent = currentPlan.roomSize || currentPlan.area; // 客室面積
            roomSpecs[1].textContent = currentPlan.bedType || currentPlan.bedSize; // ベッドサイズ
            roomSpecs[2].textContent = currentPlan.capacity || currentPlan.maxGuests; // 定員
            roomSpecs[3].textContent = currentPlan.view; // 眺望
        }

        // Update base pricing (已含税)
        window.currentPriceWithTax = currentPlan.priceWithTax;
        if (elements.roomPriceElement) {
            elements.roomPriceElement.textContent = currentPlan.priceWithTax.toLocaleString();
        }
    }

    function initializeCarouselEvents() {
        // Carousel navigation buttons
        if (elements.carouselPrev) {
            elements.carouselPrev.addEventListener('click', () => {
                currentSlide = currentSlide > 0 ? currentSlide - 1 : totalSlides - 1;
                updateCarousel();
            });
        }

        if (elements.carouselNext) {
            elements.carouselNext.addEventListener('click', () => {
                currentSlide = currentSlide < totalSlides - 1 ? currentSlide + 1 : 0;
                updateCarousel();
            });
        }

        // Use event delegation for dynamic content
        document.addEventListener('click', function(e) {
            if (e.target.classList.contains('indicator')) {
                currentSlide = parseInt(e.target.getAttribute('data-slide'));
                updateCarousel();
            }
            if (e.target.classList.contains('thumbnail')) {
                currentSlide = parseInt(e.target.getAttribute('data-slide'));
                updateCarousel();
            }
        });
    }

    function updateCarousel() {
        if (elements.carouselTrack) {
            const translateX = -(currentSlide * (100 / totalSlides));
            elements.carouselTrack.style.transform = `translateX(${translateX}%)`;
        }

        // Update indicators
        document.querySelectorAll('.indicator').forEach((indicator, index) => {
            indicator.classList.toggle('active', index === currentSlide);
        });

        // Update thumbnails
        document.querySelectorAll('.thumbnail').forEach((thumbnail, index) => {
            thumbnail.classList.toggle('active', index === currentSlide);
        });
    }

    // Auto-slide functionality removed - manual control only

    // Smooth scroll for back to top
    if (elements.backBtn) {
        elements.backBtn.addEventListener('click', function(e) {
            // Allow normal navigation but add smooth scroll to top of target page
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // Simplified card animations - use CSS instead of JS for better performance
    const cards = document.querySelectorAll('.plan-header-card, .room-gallery-card, .room-details-card, .amenities-card, .facilities-card, .policies-card');
    if (cards.length > 0) {
        // Add CSS animation class instead of JS observer
        cards.forEach((card, index) => {
            card.style.animationDelay = `${index * 100}ms`;
            card.classList.add('fade-in-up');
        });
    }

    // Simplified hover effects using CSS classes
    const facilityItems = document.querySelectorAll('.facility-item');
    facilityItems.forEach(item => {
        item.classList.add('hover-slide');
    });

    // Function to update page content based on plan type (using consolidated data)
    function updatePlanContent(planType) {
        const planData = PLAN_DATA[planType] || PLAN_DATA.standard;

        if (planData) {
            // Update plan title and subtitle
            const planTitle = document.querySelector('.plan-title');
            const planSubtitle = document.querySelector('.plan-subtitle');
            const breadcrumbCurrent = document.querySelector('.breadcrumb .current');

            if (planTitle) planTitle.textContent = planData.title;
            if (planSubtitle) planSubtitle.textContent = planData.subtitle;
            if (breadcrumbCurrent) breadcrumbCurrent.textContent = planData.breadcrumb;

            // Update basic info
            const infoItems = document.querySelectorAll('.info-item');
            if (infoItems.length >= 4) {
                infoItems[0].querySelector('span').textContent = planData.bedType;
                infoItems[1].querySelector('span').textContent = planData.maxGuests;
                infoItems[3].querySelector('span').textContent = planData.meals;
            }

            // Update room specs
            const specValues = document.querySelectorAll('.spec-value');
            if (specValues.length >= 3) {
                specValues[0].textContent = planData.area;
                specValues[1].textContent = planData.bedSize;
                specValues[2].textContent = planData.maxGuests;
            }

            // Update pricing
            window.currentBasePrice = planData.basePrice;

            // Update description
            const description = document.querySelector('.plan-description');
            if (description) {
                description.textContent = planData.description;
            }
        }
    }

    // 日历导航按钮事件绑定（数据已在上面延迟加载）
    const prevBtn = document.getElementById('prevMonthBtn');
    const nextBtn = document.getElementById('nextMonthBtn');
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            currentCalendarMonth.setMonth(currentCalendarMonth.getMonth() - 1);
            renderCalendarFromCache();
        });
    }
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            currentCalendarMonth.setMonth(currentCalendarMonth.getMonth() + 1);
            renderCalendarFromCache();
        });
    }

    console.log('Plan detail page initialized successfully');
});

// ========== Price Calendar Functions ==========

let currentCalendarMonth = new Date();
let currentRoomType = null;
let allInventoryData = []; // 缓存所有库存数据

function initializePriceCalendar() {
    // Get room type from URL
    const urlParams = new URLSearchParams(window.location.search);
    currentRoomType = urlParams.get('plan') || urlParams.get('code') || 'twin';

    // Setup calendar navigation
    document.getElementById('prevMonthBtn').addEventListener('click', () => {
        currentCalendarMonth.setMonth(currentCalendarMonth.getMonth() - 1);
        renderCalendarFromCache();
    });

    document.getElementById('nextMonthBtn').addEventListener('click', () => {
        currentCalendarMonth.setMonth(currentCalendarMonth.getMonth() + 1);
        renderCalendarFromCache();
    });

    // 数据已通过并行请求加载，这里只渲染
    if (allInventoryData.length > 0) {
        renderCalendarFromCache();
    }
    // 不再重复请求，数据由 DOMContentLoaded 并行加载
}

async function loadAllInventoryData() {
    return loadAllInventoryDataAsync(currentRoomType);
}

// 异步加载库存数据（可并行调用）
async function loadAllInventoryDataAsync(roomType) {
    try {
        currentRoomType = roomType;
        const response = await fetch(window.getApiUrl(`/inventory/calendar?room_type=${roomType}`));
        const result = await response.json();

        if (result.success) {
            allInventoryData = result.data;
            console.log(`✓ 已加载 ${allInventoryData.length} 条库存记录`);
            renderCalendarFromCache();
            return true;
        } else {
            console.error('Failed to load calendar data:', result.message);
            showCalendarError();
            return false;
        }
    } catch (error) {
        console.error('Error loading calendar:', error);
        showCalendarError();
        return false;
    }
}

function renderCalendarFromCache() {
    const year = currentCalendarMonth.getFullYear();
    const month = currentCalendarMonth.getMonth() + 1;

    // Update month display
    document.getElementById('currentMonth').textContent = `${year}年${month}月`;

    // Filter data for current month
    const monthData = allInventoryData.filter(item => {
        const itemDate = new Date(item.date);
        return itemDate.getFullYear() === year && itemDate.getMonth() + 1 === month;
    });

    // 用 requestAnimationFrame 避免阻塞主线程
    requestAnimationFrame(() => {
        renderCalendar(monthData, year, month);
    });
}

function renderCalendar(inventoryData, year, month) {
    const calendarContainer = document.getElementById('priceCalendar');

    // 把库存数据转成 Map，避免循环中重复 find
    const inventoryMap = new Map();
    inventoryData.forEach(inv => inventoryMap.set(inv.date, inv));

    // Create calendar grid
    const grid = document.createElement('div');
    grid.className = 'calendar-grid';

    // Add weekday headers
    const weekdayKeys = ['weekday_sun', 'weekday_mon', 'weekday_tue', 'weekday_wed', 'weekday_thu', 'weekday_fri', 'weekday_sat'];
    const weekdays = weekdayKeys.map(key => window.i18n ? window.i18n.t(key) : ['日', '月', '火', '水', '木', '金', '土'][weekdayKeys.indexOf(key)]);
    weekdays.forEach((day, index) => {
        const weekdayEl = document.createElement('div');
        weekdayEl.className = 'calendar-weekday';
        if (index === 0) weekdayEl.classList.add('sunday');
        if (index === 6) weekdayEl.classList.add('saturday');
        weekdayEl.textContent = day;
        grid.appendChild(weekdayEl);
    });

    // Get first day of month and total days
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const firstDayOfWeek = firstDay.getDay();
    const totalDays = lastDay.getDate();

    // Add empty cells for days before month starts
    for (let i = 0; i < firstDayOfWeek; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'calendar-day empty';
        grid.appendChild(emptyCell);
    }

    // Add days of month
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monthStr = String(month).padStart(2, '0');

    for (let day = 1; day <= totalDays; day++) {
        const date = new Date(year, month - 1, day);
        const dateString = `${year}-${monthStr}-${String(day).padStart(2, '0')}`;

        // 用 Map 查找，O(1) 复杂度
        const inventory = inventoryMap.get(dateString);

        const dayCell = document.createElement('div');
        dayCell.className = 'calendar-day';

        // Check if past date
        if (date < today) {
            dayCell.classList.add('past');
        } else if (inventory && inventory.available_rooms > 0) {
            dayCell.classList.add('available');
        } else {
            dayCell.classList.add('soldout');
        }

        // Add Sunday/Saturday classes
        const dayOfWeek = date.getDay();
        if (dayOfWeek === 0) dayCell.classList.add('sunday');
        if (dayOfWeek === 6) dayCell.classList.add('saturday');

        // Day number
        const dayNumber = document.createElement('div');
        dayNumber.className = 'day-number';
        dayNumber.textContent = day;
        dayCell.appendChild(dayNumber);

        // Price
        const dayPrice = document.createElement('div');
        dayPrice.className = 'day-price';
        if (date < today) {
            dayPrice.textContent = '-';
        } else if (inventory && inventory.available_rooms > 0) {
            const price = Math.floor(inventory.price);
            dayPrice.textContent = `¥${price.toLocaleString()}`;
        } else {
            dayPrice.textContent = window.i18n ? window.i18n.t('room_full') : '満室';
        }
        dayCell.appendChild(dayPrice);

        grid.appendChild(dayCell);
    }

    // Clear and update calendar
    calendarContainer.innerHTML = '';
    calendarContainer.appendChild(grid);
}

function showCalendarError() {
    const calendarContainer = document.getElementById('priceCalendar');
    calendarContainer.innerHTML = `
        <div class="calendar-loading">
            <i class="fas fa-exclamation-triangle"></i>
            <p>カレンダーの読み込みに失敗しました</p>
        </div>
    `;
}