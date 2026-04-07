/**
 * Unified Navbar Loader
 * Loads the navbar component and initializes functionality
 */

document.addEventListener('DOMContentLoaded', function() {
    // Load navbar HTML
    const navbarPlaceholder = document.getElementById('navbar-placeholder');

    if (navbarPlaceholder) {
        // Add timestamp to prevent caching
        fetch(`components/navbar.html?v=${Date.now()}`)
            .then(response => response.text())
            .then(html => {
                navbarPlaceholder.innerHTML = html;
                initializeNavbar();
            })
            .catch(error => {
                console.error('Error loading navbar:', error);
            });
    }

    // 加载 Google One Tap 脚本
    loadGoogleOneTap();

    // 加载 AI Chat 服务脚本
    loadAiChatService();
});

// 加载 AI Chat 服务脚本
function loadAiChatService() {
    if (document.getElementById('ai-chat-service-script') || typeof AIFrontdeskService !== 'undefined') {
        return;
    }

    const script = document.createElement('script');
    script.id = 'ai-chat-service-script';
    script.src = 'js/ai-chat-service.js';
    script.onload = function() {
        console.log('✅ AI Chat 服务脚本已加载');
    };
    script.onerror = function() {
        console.warn('⚠️ AI Chat 服务脚本加载失败');
    };
    document.head.appendChild(script);
}

// 加载 Google One Tap 脚本
function loadGoogleOneTap() {
    // 检查是否已加载
    if (document.getElementById('google-one-tap-script')) {
        return;
    }

    const script = document.createElement('script');
    script.id = 'google-one-tap-script';
    script.src = 'js/google-one-tap.js?v=' + Date.now();
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
    console.log('[导航栏] Google One Tap 脚本加载中...');
}

function initializeNavbar() {
    const navbar = document.getElementById('modernNavbar');
    const navbarToggle = document.getElementById('navbarToggle');
    const navbarMenu = document.getElementById('navbarMenu');
    const navbarOverlay = document.querySelector('.navbar-overlay');
    const navItems = document.querySelectorAll('.nav-item');

    // Sticky navbar on scroll (桌面版)
    window.addEventListener('scroll', function() {
        if (window.scrollY > 50) {
            navbar.classList.add('sticky');
        } else {
            navbar.classList.remove('sticky');
        }
    });
    
    // Mobile menu toggle
    if (navbarToggle) {
        navbarToggle.addEventListener('click', function() {
            navbarMenu.classList.toggle('active');
            navbarOverlay.classList.toggle('active');
            navbarToggle.classList.toggle('active');
        });
    }
    
    // Close mobile menu on overlay click
    if (navbarOverlay) {
        navbarOverlay.addEventListener('click', function() {
            navbarMenu.classList.remove('active');
            navbarOverlay.classList.remove('active');
            navbarToggle.classList.remove('active');
        });
    }
    
    // Highlight current page in navbar
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    navItems.forEach(item => {
        const href = item.getAttribute('href');
        if (href === currentPage || (currentPage === '' && href === 'index.html')) {
            item.classList.add('active');
        }
    });
    
    // 等待 sessionService 加载完成后更新按钮显示状态
    // 使用 setTimeout 确保 session-service.js 已加载
    setTimeout(() => {
        updateAuthButtons();
    }, 100);
}

// 更新认证按钮显示状态
async function updateAuthButtons() {
    console.log('[导航栏] 开始更新按钮状态...');
    let currentUser = null;

    // 检查 sessionService 是否可用
    if (!window.sessionService) {
        console.warn('[导航栏] sessionService 未加载，稍后重试');
        // 如果 sessionService 还未加载，200ms 后重试
        setTimeout(() => updateAuthButtons(), 200);
        return;
    }

    // 使用 sessionService 获取当前用户
    try {
        currentUser = await window.sessionService.getCurrentUser();
        console.log('[导航栏] Session用户:', currentUser ? `${currentUser.email}` : 'null');
    } catch (error) {
        console.error('[导航栏] 获取session用户失败:', error);
    }

    // 生成头像 HTML
    const getAvatarHtml = (user, size = '24px', isHeader = false) => {
        if (user && user.profile_picture_url) {
            return `<img src="${user.profile_picture_url}" alt="Avatar" class="nav-avatar" referrerpolicy="no-referrer" style="width: ${size}; height: ${size}; border-radius: 50%; object-fit: cover; border: 2px solid #1e3a8a; box-shadow: 0 1px 3px rgba(0,0,0,0.2);">`;
        }
        // header 中的默认图标需要更大且为白色
        if (isHeader) {
            return `<i class="fas fa-user-circle" style="font-size: ${size}; color: white;"></i>`;
        }
        return `<i class="fas fa-user-circle"></i>`;
    };

    // 生成用户下拉菜单 HTML
    const getUserDropdownHtml = (user) => {
        const userName = user.last_name && user.first_name
            ? `${user.last_name} ${user.first_name}`
            : (user.email ? user.email.split('@')[0] : 'ユーザー');
        const displayName = `${userName}さん`;
        return `
            <div class="user-dropdown">
                <button class="auth-btn user-dropdown-btn">
                    ${getAvatarHtml(user, '32px')}
                    <span>${displayName}</span>
                    <i class="fas fa-chevron-down dropdown-arrow"></i>
                </button>
                <div class="user-dropdown-menu">
                    <div class="dropdown-header">
                        ${getAvatarHtml(user, '48px', true)}
                        <div class="dropdown-user-info">
                            <span class="dropdown-user-name">${displayName}</span>
                            <span class="dropdown-user-email">${user.email || ''}</span>
                        </div>
                    </div>
                    <div class="dropdown-divider"></div>
                    <a href="user-center.html#bookings" class="dropdown-item">
                        <i class="fas fa-calendar-check"></i>
                        <span>予約管理</span>
                    </a>
                    <a href="user-center.html#wallet" class="dropdown-item">
                        <i class="fas fa-wallet"></i>
                        <span>ポイントカード</span>
                    </a>
                    <a href="user-center.html#profile" class="dropdown-item">
                        <i class="fas fa-user-edit"></i>
                        <span>個人情報</span>
                    </a>
                    <a href="user-center.html#password" class="dropdown-item">
                        <i class="fas fa-key"></i>
                        <span>パスワード変更</span>
                    </a>
                    <a href="user-center.html#settings" class="dropdown-item">
                        <i class="fas fa-cog"></i>
                        <span>設定</span>
                    </a>
                    <div class="dropdown-divider"></div>
                    <a href="#" class="dropdown-item dropdown-logout">
                        <i class="fas fa-sign-out-alt"></i>
                        <span>ログアウト</span>
                    </a>
                </div>
            </div>
        `;
    };

    // 更新桌面端按钮容器
    const authButtonsContainer = document.querySelector('.auth-buttons');
    if (authButtonsContainer) {
        if (currentUser) {
            authButtonsContainer.innerHTML = getUserDropdownHtml(currentUser);
        } else {
            authButtonsContainer.innerHTML = `
                <button class="auth-btn login-nav-btn">
                    <i class="fas fa-sign-in-alt"></i>
                    <span>ログイン</span>
                </button>
            `;
        }
    }

    // 更新移动端按钮容器（侧边菜单）
    const mobileAuthButtonsContainer = document.querySelector('.mobile-auth-buttons');
    if (mobileAuthButtonsContainer) {
        if (currentUser) {
            mobileAuthButtonsContainer.innerHTML = `
                <button class="mobile-auth-btn user-info-btn">
                    ${getAvatarHtml(currentUser, '24px')}
                    <span>マイページ</span>
                </button>
            `;
        } else {
            mobileAuthButtonsContainer.innerHTML = `
                <button class="mobile-auth-btn login-nav-btn">
                    <i class="fas fa-sign-in-alt"></i>
                    <span>ログイン</span>
                </button>
            `;
        }
    }

    // 更新移动端顶部头像
    const mobileAvatarBtn = document.getElementById('mobileAvatarBtn');
    if (mobileAvatarBtn) {
        if (currentUser) {
            if (currentUser.profile_picture_url) {
                mobileAvatarBtn.innerHTML = `<img src="${currentUser.profile_picture_url}" alt="Avatar" referrerpolicy="no-referrer">`;
            } else {
                mobileAvatarBtn.innerHTML = `<i class="fas fa-user-circle"></i>`;
            }
        } else {
            mobileAvatarBtn.innerHTML = `<i class="fas fa-sign-in-alt"></i>`;
        }
    }

    // 重新绑定事件
    bindAuthButtonEvents();
}

// 绑定认证按钮事件
function bindAuthButtonEvents() {
    // 绑定所有历史按钮（桌面端和移动端）
    const historyBtns = document.querySelectorAll('.history-nav-btn');
    historyBtns.forEach(btn => {
        btn.addEventListener('click', async function() {
            const currentUser = await getCurrentUser();
            if (currentUser) {
                window.location.href = 'user-center.html';
            } else {
                if (confirm('予約確認・取消にはログインが必要です。ログインページに移動しますか？')) {
                    window.location.href = 'login.html';
                }
            }
        });
    });

    // 绑定所有Google登录按钮
    const googleLoginBtns = document.querySelectorAll('.google-login-btn');
    googleLoginBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            // TODO: 实现Google OAuth登录
            window.location.href = 'login.html?method=google';
        });
    });

    // 绑定所有登录按钮
    const loginBtns = document.querySelectorAll('.login-nav-btn');
    loginBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            window.location.href = 'login.html';
        });
    });

    // 绑定所有用户信息按钮
    const userInfoBtns = document.querySelectorAll('.user-info-btn');
    userInfoBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            window.location.href = 'user-center.html';
        });
    });

    // 绑定移动端顶部头像按钮
    const mobileAvatarBtn = document.getElementById('mobileAvatarBtn');
    if (mobileAvatarBtn) {
        mobileAvatarBtn.addEventListener('click', async function() {
            const currentUser = await getCurrentUser();
            if (currentUser) {
                window.location.href = 'user-center.html';
            } else {
                window.location.href = 'login.html';
            }
        });
    }

    // 绑定用户下拉菜单按钮
    const dropdownBtns = document.querySelectorAll('.user-dropdown-btn');
    dropdownBtns.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const dropdown = this.closest('.user-dropdown');
            if (dropdown) {
                dropdown.classList.toggle('active');
            }
        });
    });

    // 点击页面其他地方关闭下拉菜单
    document.addEventListener('click', function(e) {
        const dropdowns = document.querySelectorAll('.user-dropdown');
        dropdowns.forEach(dropdown => {
            if (!dropdown.contains(e.target)) {
                dropdown.classList.remove('active');
            }
        });
    });

    // 绑定下拉菜单的登出按钮
    const logoutBtns = document.querySelectorAll('.dropdown-logout');
    logoutBtns.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            handleLogout();
        });
    });
}

// 获取当前用户
async function getCurrentUser() {
    // 使用 sessionService 获取当前用户
    if (window.sessionService) {
        try {
            return await window.sessionService.getCurrentUser();
        } catch (error) {
            console.error('[导航栏] 获取session用户失败:', error);
            return null;
        }
    }
    return null;
}

// 处理登出
async function handleLogout() {
    if (confirm('ログアウトしてもよろしいですか？')) {
        // 使用 sessionService 登出
        if (window.sessionService) {
            try {
                await window.sessionService.logout();
                console.log('[导航栏] 用户已登出');
            } catch (error) {
                console.error('[导航栏] 登出失败:', error);
            }
        }

        // 更新导航栏
        await updateAuthButtons();

        // 如果在用户中心页面，跳转到首页
        if (window.location.pathname.includes('user-center')) {
            window.location.href = 'index.html';
        }

        // 显示成功消息
        alert('ログアウトしました');
    }
}

// 监听登录事件，更新导航栏（已弃用，登录后直接跳转不需要更新当前页面）
// window.addEventListener('userLoggedIn', () => {
//     updateAuthButtons();
// });

// 导出函数供其他脚本使用
window.updateNavbarAuth = updateAuthButtons;
window.handleLogout = handleLogout;

// =============================================
// Mobile Booking Panel 功能 (从顶部宿泊予約按钮展开)
// =============================================

function initMobileBookingPanel() {
    const panel = document.getElementById('mobileBookingPanel');
    const overlay = document.getElementById('bookingPanelOverlay');
    const closeBtn = document.getElementById('panelCloseBtn');
    const searchBtn = document.getElementById('mobileSearchBtn');
    const checkinInput = document.getElementById('mobileCheckin');
    const checkoutInput = document.getElementById('mobileCheckout');

    // 获取手机端导航栏的"宿泊予約"按钮
    const mobileReserveBtn = document.querySelector('.mobile-reserve-btn');

    if (!panel) return;

    // 日历相关元素
    const datePicker = document.getElementById('mobileDatePicker');
    const dateDisplayRow = datePicker?.querySelector('.date-display-row');
    const checkinBox = document.getElementById('mobileCheckinBox');
    const checkoutBox = document.getElementById('mobileCheckoutBox');
    const checkinDisplay = document.getElementById('mobileCheckinDisplay');
    const checkoutDisplay = document.getElementById('mobileCheckoutDisplay');
    const nightsBadge = document.getElementById('mobileNightsBadge');
    const nightsCount = document.getElementById('mobileNightsCount');
    const calendarPopup = document.getElementById('mobileCalendarPopup');
    const calendarTitle = document.getElementById('mobileCalendarTitle');
    const calendarDays = document.getElementById('mobileCalendarDays');
    const prevMonthBtn = document.getElementById('mobilePrevMonth');
    const nextMonthBtn = document.getElementById('mobileNextMonth');

    // 日历状态
    let currentDate = new Date();
    let selectedStart = null;
    let selectedEnd = null;
    let isSelectingEnd = false;
    let priceData = {}; // 存储价格数据

    // 从 URL 参数读取日期和人数
    const urlParams = new URLSearchParams(window.location.search);
    const urlCheckin = urlParams.get('checkin');
    const urlCheckout = urlParams.get('checkout');
    const urlRooms = urlParams.get('rooms');
    const urlAdults = urlParams.get('adults');

    // 设置默认日期（优先使用 URL 参数）
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (urlCheckin) {
        selectedStart = new Date(urlCheckin);
        selectedStart.setHours(0, 0, 0, 0);
    } else {
        selectedStart = today;
    }

    if (urlCheckout) {
        selectedEnd = new Date(urlCheckout);
        selectedEnd.setHours(0, 0, 0, 0);
    } else {
        selectedEnd = tomorrow;
    }

    // 设置房间数和人数
    const roomsSelect = document.getElementById('mobileRooms');
    const adultsSelect = document.getElementById('mobileAdults');
    if (roomsSelect && urlRooms) {
        roomsSelect.value = urlRooms;
    }
    if (adultsSelect && urlAdults) {
        adultsSelect.value = urlAdults;
    }

    updateDateDisplay();

    // 点击手机端导航栏"宿泊予約"按钮展开面板
    if (mobileReserveBtn) {
        mobileReserveBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            openBookingPanel();
        });
    }

    // 打开面板
    function openBookingPanel() {
        panel.style.display = 'block';
        if (overlay) overlay.style.display = 'block';

        // 触发重绘后添加 active 类以启动动画
        requestAnimationFrame(() => {
            panel.classList.add('active');
            if (overlay) overlay.classList.add('active');
        });

        // 关闭移动菜单（如果打开的话）
        const navbarMenu = document.getElementById('navbarMenu');
        const navbarToggle = document.getElementById('navbarToggle');
        const navbarOverlay = document.getElementById('navbarOverlay');
        if (navbarMenu) navbarMenu.classList.remove('active');
        if (navbarToggle) navbarToggle.classList.remove('active');
        if (navbarOverlay) navbarOverlay.classList.remove('active');
        document.body.classList.remove('navbar-open');
    }

    // 关闭面板
    function closeBookingPanel() {
        panel.classList.remove('active');
        if (overlay) overlay.classList.remove('active');

        // 更新底部导航栏按钮状态
        const bottomReserveBtn = document.getElementById('bottomReserveBtn');
        if (bottomReserveBtn) bottomReserveBtn.classList.remove('active');

        // 动画结束后隐藏
        setTimeout(() => {
            panel.style.display = 'none';
            if (overlay) overlay.style.display = 'none';
        }, 300);
    }

    // 点击关闭按钮收起面板
    if (closeBtn) {
        closeBtn.addEventListener('click', closeBookingPanel);
    }

    // 点击遮罩关闭面板
    if (overlay) {
        overlay.addEventListener('click', closeBookingPanel);
    }

    // ==================== 全屏日历面板功能 ====================

    const calendarPanel = document.getElementById('navbarCalendarPanel');
    const calendarOverlay = document.getElementById('navbarCalendarOverlay');
    const calendarContainer = document.getElementById('navbarCalendarContainer');
    const calendarCloseBtn = document.getElementById('navbarCalendarClose');
    const calendarConfirmBtn = document.getElementById('navbarCalendarConfirm');
    const navbarDateTrigger = document.getElementById('navbarDateTrigger');

    // 点击日期显示区域打开全屏日历
    if (navbarDateTrigger) {
        navbarDateTrigger.addEventListener('click', function(e) {
            e.stopPropagation();
            openFullCalendar();
        });
    }

    // 关闭按钮
    if (calendarCloseBtn) {
        calendarCloseBtn.addEventListener('click', closeFullCalendar);
    }

    // 确认按钮
    if (calendarConfirmBtn) {
        calendarConfirmBtn.addEventListener('click', closeFullCalendar);
    }

    // 点击遮罩关闭
    if (calendarOverlay) {
        calendarOverlay.addEventListener('click', closeFullCalendar);
    }

    async function openFullCalendar() {
        if (!calendarPanel || !calendarOverlay) return;

        calendarOverlay.classList.add('active');
        calendarPanel.classList.add('active');
        document.body.style.overflow = 'hidden';

        // 设置当前显示月份
        if (selectedStart) {
            currentDate = new Date(selectedStart);
        }

        // 加载价格数据后渲染日历
        await loadPrices();
    }

    async function loadPrices() {
        const adultsSelect = document.getElementById('mobileAdults');
        const numAdults = adultsSelect ? parseInt(adultsSelect.value) : 2;
        const monthsToLoad = 12;

        try {
            const fetchPromises = [];
            for (let i = 0; i < monthsToLoad; i++) {
                const monthDate = new Date(currentDate);
                monthDate.setMonth(monthDate.getMonth() + i);
                const year = monthDate.getFullYear();
                const month = monthDate.getMonth() + 1;

                if (window.getApiUrl) {
                    fetchPromises.push(
                        fetch(window.getApiUrl(`/rooms/calendar-prices/${year}/${month}?adults=${numAdults}`))
                            .catch(() => null)
                    );
                }
            }

            if (fetchPromises.length > 0) {
                const responses = await Promise.all(fetchPromises);
                for (const response of responses) {
                    if (response && response.ok) {
                        const result = await response.json();
                        if (result.success && result.data) {
                            Object.assign(priceData, result.data);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('価格データの取得に失敗:', error);
        }

        renderFullCalendar();
    }

    function closeFullCalendar() {
        if (!calendarPanel || !calendarOverlay) return;

        calendarPanel.classList.remove('active');
        calendarOverlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    function renderFullCalendar() {
        if (!calendarContainer) return;

        calendarContainer.innerHTML = '';

        // 渲染12个月
        const monthsToRender = 12;
        for (let i = 0; i < monthsToRender; i++) {
            const monthDate = new Date(currentDate);
            monthDate.setMonth(monthDate.getMonth() + i);

            const monthPanel = createMonthPanel(monthDate);
            calendarContainer.appendChild(monthPanel);

            // 第一个月后添加滚动提示
            if (i === 0) {
                const scrollHint = document.createElement('div');
                scrollHint.className = 'navbar-calendar-scroll-hint';
                scrollHint.innerHTML = '<i class="fas fa-chevron-down"></i><span>スクロールで他の月を表示</span><i class="fas fa-chevron-down"></i>';
                calendarContainer.appendChild(scrollHint);
            }
        }

    }

    function createMonthPanel(monthDate) {
        const year = monthDate.getFullYear();
        const month = monthDate.getMonth();
        const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月',
                           '7月', '8月', '9月', '10月', '11月', '12月'];

        const panel = document.createElement('div');
        panel.className = 'navbar-calendar-month';

        // 月份标题
        const header = document.createElement('div');
        header.className = 'navbar-calendar-month-header';
        header.innerHTML = `<div class="navbar-calendar-month-title">${year}年${monthNames[month]}</div>`;
        panel.appendChild(header);

        // 星期标题
        const weekdays = document.createElement('div');
        weekdays.className = 'navbar-calendar-weekdays';
        const weekdayNames = ['日', '月', '火', '水', '木', '金', '土'];
        weekdayNames.forEach((name, index) => {
            const wd = document.createElement('div');
            wd.className = 'navbar-calendar-weekday';
            if (index === 0) wd.classList.add('sun');
            if (index === 6) wd.classList.add('sat');
            wd.textContent = name;
            weekdays.appendChild(wd);
        });
        panel.appendChild(weekdays);

        // 日期格子
        const daysContainer = document.createElement('div');
        daysContainer.className = 'navbar-calendar-days';

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        // 空白格子
        for (let i = 0; i < startingDayOfWeek; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.className = 'navbar-calendar-day empty';
            daysContainer.appendChild(emptyCell);
        }

        // 日期
        const todayDate = new Date();
        todayDate.setHours(0, 0, 0, 0);

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            date.setHours(0, 0, 0, 0);

            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayPriceData = priceData[dateStr];
            const hasInventory = dayPriceData?.hasInventory || false;
            const price = dayPriceData?.price;
            const isHoliday = dayPriceData?.isHoliday || false;

            const dayEl = document.createElement('div');
            dayEl.className = 'navbar-calendar-day';

            // 日期数字
            const dayNumber = document.createElement('div');
            dayNumber.className = 'navbar-day-number';
            dayNumber.textContent = day;
            dayEl.appendChild(dayNumber);

            const dayOfWeek = date.getDay();
            if (dayOfWeek === 0) dayEl.classList.add('sun');
            if (dayOfWeek === 6) dayEl.classList.add('sat');

            const isPast = date < todayDate;

            // 禁用条件：过去日期或无库存
            if (isPast || !hasInventory) {
                dayEl.classList.add('disabled');
                if (!hasInventory && !isPast) {
                    dayEl.classList.add('no-inventory');
                }
            } else {
                // 显示价格
                if (price) {
                    const priceLabel = document.createElement('div');
                    priceLabel.className = 'navbar-day-price';
                    if (isHoliday) priceLabel.classList.add('holiday');
                    priceLabel.textContent = `¥${price.toLocaleString()}`;
                    dayEl.appendChild(priceLabel);
                }

                if (date.getTime() === todayDate.getTime()) {
                    dayEl.classList.add('today');
                }

                if (selectedStart && date.getTime() === selectedStart.getTime()) {
                    dayEl.classList.add('range-start');
                }

                if (selectedEnd && date.getTime() === selectedEnd.getTime()) {
                    dayEl.classList.add('range-end');
                }

                if (selectedStart && selectedEnd && date > selectedStart && date < selectedEnd) {
                    dayEl.classList.add('in-range');
                }

                dayEl.addEventListener('click', () => selectDate(date));
            }

            daysContainer.appendChild(dayEl);
        }

        panel.appendChild(daysContainer);
        return panel;
    }

    function selectDate(date) {
        if (!selectedStart || (selectedStart && selectedEnd) || !isSelectingEnd) {
            selectedStart = date;
            selectedEnd = null;
            isSelectingEnd = true;
        } else {
            if (date > selectedStart) {
                selectedEnd = date;
            } else {
                selectedEnd = selectedStart;
                selectedStart = date;
            }
            isSelectingEnd = false;
        }

        updateDateDisplay();
        updateNavbarSelectedDates();
        renderFullCalendar();
    }

    function updateNavbarSelectedDates() {
        const navCheckin = document.getElementById('navbarSelectedCheckin');
        const navCheckout = document.getElementById('navbarSelectedCheckout');
        const navNights = document.getElementById('navbarSelectedNights');
        const navNightsCount = document.getElementById('navbarSelectedNightsCount');

        if (navCheckin) {
            if (selectedStart) {
                navCheckin.textContent = formatDateDisplay(selectedStart);
                navCheckin.classList.add('has-date');
            } else {
                navCheckin.textContent = '日付を選択';
                navCheckin.classList.remove('has-date');
            }
        }

        if (navCheckout) {
            if (selectedEnd) {
                navCheckout.textContent = formatDateDisplay(selectedEnd);
                navCheckout.classList.add('has-date');
            } else {
                navCheckout.textContent = '日付を選択';
                navCheckout.classList.remove('has-date');
            }
        }

        if (navNights && navNightsCount && selectedStart && selectedEnd) {
            const nights = Math.ceil((selectedEnd - selectedStart) / (1000 * 60 * 60 * 24));
            navNightsCount.textContent = nights;
            navNights.style.display = 'block';
        } else if (navNights) {
            navNights.style.display = 'none';
        }
    }

    function updateDateDisplay() {
        if (selectedStart && checkinDisplay) {
            checkinDisplay.textContent = formatDateDisplay(selectedStart);
            checkinDisplay.classList.remove('placeholder');
            if (checkinInput) checkinInput.value = formatDateISO(selectedStart);
        }

        if (selectedEnd && checkoutDisplay) {
            checkoutDisplay.textContent = formatDateDisplay(selectedEnd);
            checkoutDisplay.classList.remove('placeholder');
            if (checkoutInput) checkoutInput.value = formatDateISO(selectedEnd);

            if (selectedStart && nightsBadge && nightsCount) {
                const nights = Math.ceil((selectedEnd - selectedStart) / (1000 * 60 * 60 * 24));
                nightsCount.textContent = nights;
                nightsBadge.style.display = 'block';
            }
        } else {
            if (checkoutDisplay) {
                checkoutDisplay.textContent = '日付を選択';
                checkoutDisplay.classList.add('placeholder');
            }
            if (nightsBadge) nightsBadge.style.display = 'none';
        }
    }

    function formatDateDisplay(date) {
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
        const weekday = weekdays[date.getDay()];
        return `${month}/${day}(${weekday})`;
    }

    function formatDateISO(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // 点击搜索按钮
    if (searchBtn) {
        searchBtn.addEventListener('click', function() {
            const checkin = checkinInput ? checkinInput.value : '';
            const checkout = checkoutInput ? checkoutInput.value : '';
            const rooms = document.getElementById('mobileRooms')?.value || '1';
            const adults = document.getElementById('mobileAdults')?.value || '2';

            // 构建 URL 参数
            const params = new URLSearchParams({
                checkin: checkin,
                checkout: checkout,
                rooms: rooms,
                adults: adults
            });

            // 跳转到预约页面
            window.location.href = `reservation.html?${params.toString()}`;
        });
    }
}

// =============================================
// Mobile Bottom Navigation Bar 功能
// =============================================

function initMobileBottomNav() {
    const bottomNav = document.getElementById('mobileBottomNav');
    const reserveBtn = document.getElementById('bottomReserveBtn');
    const aiBtn = document.getElementById('bottomAiBtn');
    const menuBtn = document.getElementById('bottomMenuBtn');
    const logoRow = document.getElementById('bottomNavLogoRow');
    const topNavbar = document.getElementById('modernNavbar');

    if (!bottomNav) return;

    // 滚动检测 - 当顶部导航栏滑出视野时显示logo行
    if (topNavbar && bottomNav) {
        window.addEventListener('scroll', function() {
            if (window.innerWidth <= 768) {
                const navbarRect = topNavbar.getBoundingClientRect();
                const bookingPanel = document.getElementById('mobileBookingPanel');
                const aiChatPanel = document.getElementById('aiChatPanel');
                // 当导航栏底部滑出视野时，整体上移显示logo行
                if (navbarRect.bottom < 0) {
                    bottomNav.classList.add('show-logo');
                    // 同步更新面板位置
                    if (bookingPanel) bookingPanel.classList.add('nav-expanded');
                    if (aiChatPanel) aiChatPanel.classList.add('nav-expanded');
                } else {
                    bottomNav.classList.remove('show-logo');
                    if (bookingPanel) bookingPanel.classList.remove('nav-expanded');
                    if (aiChatPanel) aiChatPanel.classList.remove('nav-expanded');
                }
            }
        });
    }

    // 宿泊予約按钮 - 切换预约面板
    if (reserveBtn) {
        reserveBtn.addEventListener('click', function() {
            const panel = document.getElementById('mobileBookingPanel');
            const overlay = document.getElementById('bookingPanelOverlay');

            if (panel) {
                // 切换面板状态
                if (panel.classList.contains('active')) {
                    // 关闭面板
                    panel.classList.remove('active');
                    if (overlay) overlay.classList.remove('active');
                    reserveBtn.classList.remove('active');

                    setTimeout(() => {
                        panel.style.display = 'none';
                        if (overlay) overlay.style.display = 'none';
                    }, 300);
                } else {
                    // 打开面板
                    panel.style.display = 'block';
                    if (overlay) overlay.style.display = 'block';

                    requestAnimationFrame(() => {
                        panel.classList.add('active');
                        if (overlay) overlay.classList.add('active');
                        reserveBtn.classList.add('active');
                    });
                }
            }
        });
    }

    // Trip7 AI按钮 - 切换AI聊天面板
    if (aiBtn) {
        aiBtn.addEventListener('click', function() {
            const panel = document.getElementById('aiChatPanel');
            if (panel && panel.classList.contains('active')) {
                closeAiChatPanel();
                aiBtn.classList.remove('active');
            } else {
                openAiChatPanel();
                aiBtn.classList.add('active');
            }
        });
    }

    // メニュー按钮 - 切换侧边菜单
    if (menuBtn) {
        menuBtn.addEventListener('click', function() {
            const navbarMenu = document.getElementById('navbarMenu');
            const navbarOverlay = document.querySelector('.navbar-overlay');

            if (navbarMenu) {
                navbarMenu.classList.toggle('active');
                if (navbarOverlay) navbarOverlay.classList.toggle('active');
                // 切换按钮状态
                menuBtn.classList.toggle('active');
            }
        });

        // 点击遮罩关闭时也要更新按钮状态
        const navbarOverlay = document.querySelector('.navbar-overlay');
        if (navbarOverlay) {
            navbarOverlay.addEventListener('click', function() {
                menuBtn.classList.remove('active');
            });
        }
    }
}

// =============================================
// AI Chat Panel 功能
// =============================================

// 用于存储初始视口高度，防止键盘弹出时的缩放效果
let aiChatPanelInitialHeight = null;
let visualViewportResizeHandler = null;
let preventScrollHandler = null;

// 阻止背景滚动
function preventBackgroundScroll(e) {
    const panel = document.getElementById('aiChatPanel');
    const messagesArea = document.getElementById('aiChatMessages');

    // 如果触摸的是消息区域内部，允许滚动
    if (messagesArea && messagesArea.contains(e.target)) {
        return;
    }

    // 否则阻止默认行为
    e.preventDefault();
}

function openAiChatPanel() {
    const panel = document.getElementById('aiChatPanel');
    const overlay = document.getElementById('aiChatOverlay');
    const themeColor = document.getElementById('themeColor');

    if (panel) {
        // 灵动岛区域变蓝色
        if (themeColor) themeColor.content = '#1e3a8a';

        // 重置样式
        panel.style.height = '';
        panel.classList.remove('no-transition');

        panel.style.display = 'flex';
        if (overlay) overlay.style.display = 'block';

        requestAnimationFrame(() => {
            panel.classList.add('active');
            if (overlay) overlay.classList.add('active');

            // 动画完成后，锁定高度并禁用过渡
            setTimeout(() => {
                if (window.innerWidth <= 768) {
                    // 计算并锁定当前高度
                    const rect = panel.getBoundingClientRect();
                    aiChatPanelInitialHeight = rect.height;
                    panel.style.height = aiChatPanelInitialHeight + 'px';
                    panel.classList.add('no-transition');

                    // 监听 visualViewport 变化（键盘弹出/收起）
                    if (window.visualViewport) {
                        visualViewportResizeHandler = function() {
                            // 保持面板高度不变
                            if (aiChatPanelInitialHeight && panel.classList.contains('active')) {
                                panel.style.height = aiChatPanelInitialHeight + 'px';
                            }
                        };
                        window.visualViewport.addEventListener('resize', visualViewportResizeHandler);
                    }
                }
            }, 350); // 等待动画完成（300ms transition + 50ms buffer）
        });

        // 阻止背景滚动（但允许键盘弹出时适当上移）
        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';

        // 添加触摸事件监听
        document.addEventListener('touchmove', preventBackgroundScroll, { passive: false });
    }
}

function closeAiChatPanel() {
    const panel = document.getElementById('aiChatPanel');
    const overlay = document.getElementById('aiChatOverlay');
    const themeColor = document.getElementById('themeColor');

    if (panel) {
        // 灵动岛区域恢复白色
        if (themeColor) themeColor.content = '#ffffff';

        // 移除 visualViewport 监听器
        if (window.visualViewport && visualViewportResizeHandler) {
            window.visualViewport.removeEventListener('resize', visualViewportResizeHandler);
            visualViewportResizeHandler = null;
        }

        // 移除触摸事件监听
        document.removeEventListener('touchmove', preventBackgroundScroll);

        // 更新底部导航栏按钮状态
        const bottomAiBtn = document.getElementById('bottomAiBtn');
        if (bottomAiBtn) bottomAiBtn.classList.remove('active');

        // 恢复原始样式以便动画
        panel.classList.remove('no-transition');
        panel.style.height = '';
        aiChatPanelInitialHeight = null;

        // 延迟一帧后开始关闭动画
        requestAnimationFrame(() => {
            panel.classList.remove('active');
            if (overlay) overlay.classList.remove('active');

            setTimeout(() => {
                panel.style.display = 'none';
                if (overlay) overlay.style.display = 'none';
            }, 300);
        });

        // 恢复背景滚动
        document.body.style.overflow = '';
        document.documentElement.style.overflow = '';
    }
}

// Mobile AI Chat 服务实例
let mobileAiService = null;

function initAiChatPanel() {
    const panel = document.getElementById('aiChatPanel');
    const overlay = document.getElementById('aiChatOverlay');
    const closeBtn = document.getElementById('aiChatClose');
    const input = document.getElementById('aiChatInput');
    const sendBtn = document.getElementById('aiChatSend');
    const messagesContainer = document.getElementById('aiChatMessages');
    const quickBtns = document.querySelectorAll('.ai-quick-btn');

    if (!panel) return;

    // 初始化 AI 服务（使用与桌面版相同的 AIFrontdeskService）
    if (typeof AIFrontdeskService !== 'undefined') {
        mobileAiService = new AIFrontdeskService({
            onMessage: (message, sender) => {
                if (sender === 'ai') {
                    hideTypingIndicator();
                    addAiMessage(parseMarkdown(message));
                }
                // 用户消息已在 sendMessage 中处理，不需要重复添加
            },
            onLoading: (isLoading) => {
                if (isLoading) {
                    showTypingIndicator();
                } else {
                    hideTypingIndicator();
                }
            },
            onError: (error) => {
                hideTypingIndicator();
                addAiMessage(`申し訳ございません。エラーが発生しました。<br><br>しばらくしてからもう一度お試しください。<br><br><small style="color: #999;">${escapeHtml(error.message)}</small>`);
            }
        });
        console.log('📱 Mobile AI Chat 服务已初始化');
    } else {
        console.warn('⚠️ AIFrontdeskService 未加载，使用离线模式');
    }

    let isSending = false;

    // 限制输入框聚焦时页面上移量
    if (input) {
        // 最大允许上移的像素数
        const MAX_SCROLL_OFFSET = 250;
        let savedScrollY = 0;

        input.addEventListener('focus', function(e) {
            // 保存当前滚动位置
            savedScrollY = window.scrollY;

            // 限制上移量的函数
            const limitScroll = () => {
                const currentScroll = window.scrollY;
                const scrollDiff = currentScroll - savedScrollY;

                // 如果上移超过最大值，则限制到最大值
                if (scrollDiff > MAX_SCROLL_OFFSET) {
                    window.scrollTo(0, savedScrollY + MAX_SCROLL_OFFSET);
                }
            };

            // 多次检查并限制上移量
            setTimeout(limitScroll, 50);
            setTimeout(limitScroll, 100);
            setTimeout(limitScroll, 200);
            setTimeout(limitScroll, 300);
            setTimeout(limitScroll, 400);

            // 滚动消息区域到底部
            setTimeout(() => {
                if (messagesContainer) {
                    messagesContainer.scrollTop = messagesContainer.scrollHeight;
                }
            }, 350);
        });

        // 使用 visualViewport API 来限制键盘弹出时的上移
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', () => {
                const panel = document.getElementById('aiChatPanel');
                if (!panel || !panel.classList.contains('active')) return;

                // 限制上移量
                const currentScroll = window.scrollY;
                const scrollDiff = currentScroll - savedScrollY;

                if (scrollDiff > MAX_SCROLL_OFFSET) {
                    window.scrollTo(0, savedScrollY + MAX_SCROLL_OFFSET);
                }
            });
        }
    }

    // 关闭按钮
    if (closeBtn) {
        closeBtn.addEventListener('click', closeAiChatPanel);
    }

    // 点击遮罩关闭
    if (overlay) {
        overlay.addEventListener('click', closeAiChatPanel);
    }

    // 输入框自动调整高度
    if (input) {
        input.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 100) + 'px';
        });

        // 回车发送消息
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }

    // 发送按钮
    if (sendBtn) {
        sendBtn.addEventListener('click', sendMessage);
    }

    // 语音输入按钮
    const voiceBtn = document.getElementById('aiChatVoice');
    if (voiceBtn) {
        initVoiceInput(voiceBtn, input, sendMessage);
    }

    // 快捷按钮
    quickBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const action = this.dataset.action;
            handleQuickAction(action);
        });
    });

    // 发送消息
    async function sendMessage() {
        const message = input.value.trim();
        if (!message) return;

        // 防止重复发送
        if (isSending) {
            console.log('⚠️ 消息正在发送中，跳过重复请求');
            return;
        }

        isSending = true;

        // 添加用户消息到界面
        addUserMessage(message);
        input.value = '';
        input.style.height = 'auto';

        // 使用 AI 服务发送消息
        if (mobileAiService) {
            try {
                // showUserMessage: false 因为我们已经手动添加了用户消息
                await mobileAiService.sendMessage(message, { showUserMessage: false });
            } catch (error) {
                console.error('❌ 发送消息失败:', error);
            }
        } else {
            // 离线模式：使用本地响应
            showTypingIndicator();
            setTimeout(() => {
                hideTypingIndicator();
                const response = getOfflineResponse(message);
                addAiMessage(response);
            }, 1000 + Math.random() * 1000);
        }

        isSending = false;
    }

    // 添加用户消息
    function addUserMessage(text) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'user-message';
        messageDiv.innerHTML = `
            <div>
                <div class="user-message-bubble">${escapeHtml(text)}</div>
                <div class="user-message-time">${getCurrentTime()}</div>
            </div>
        `;

        // 移除快捷按钮（如果存在）
        const quickActions = messagesContainer.querySelector('.ai-quick-actions');
        if (quickActions) {
            quickActions.remove();
        }

        messagesContainer.appendChild(messageDiv);
        scrollToBottom();
    }

    // 添加 AI 消息
    function addAiMessage(text) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'ai-message';
        messageDiv.innerHTML = `
            <div class="ai-message-avatar">
                <img src="img/logo.ico" alt="AI">
            </div>
            <div class="ai-message-content">
                <div class="ai-message-bubble">${text}</div>
                <div class="ai-message-time">${getCurrentTime()}</div>
            </div>
        `;
        messagesContainer.appendChild(messageDiv);
        scrollToBottom();
    }

    // 显示正在输入指示器
    function showTypingIndicator() {
        // 先移除现有的指示器
        hideTypingIndicator();

        const typingDiv = document.createElement('div');
        typingDiv.className = 'ai-typing';
        typingDiv.id = 'aiTypingIndicator';
        typingDiv.innerHTML = `
            <div class="ai-message-avatar">
                <img src="img/logo.ico" alt="AI">
            </div>
            <div class="ai-typing-bubble">
                <div class="ai-typing-dot"></div>
                <div class="ai-typing-dot"></div>
                <div class="ai-typing-dot"></div>
            </div>
        `;
        messagesContainer.appendChild(typingDiv);
        scrollToBottom();
    }

    // 隐藏正在输入指示器
    function hideTypingIndicator() {
        const typingIndicator = document.getElementById('aiTypingIndicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    // 滚动到底部
    function scrollToBottom() {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // 获取当前时间
    function getCurrentTime() {
        const now = new Date();
        return `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
    }

    // HTML转义
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // 解析 Markdown（如果 marked 库可用）
    function parseMarkdown(text) {
        try {
            if (typeof marked !== 'undefined') {
                if (marked.setOptions) {
                    marked.setOptions({
                        breaks: true,
                        gfm: true,
                        sanitize: false
                    });
                }
                return marked.parse(text);
            }
        } catch (error) {
            console.warn('Markdown 解析失败:', error);
        }
        // 回退：简单的换行处理
        return text.replace(/\n/g, '<br>');
    }

    // 处理快捷按钮
    function handleQuickAction(action) {
        const actions = {
            'reservation': '予約について教えてください',
            'rooms': '客室の種類を教えてください',
            'onsen': '温泉について教えてください',
            'access': 'アクセス方法を教えてください'
        };

        const message = actions[action];
        if (message) {
            input.value = message;
            sendMessage();
        }
    }

    // 离线模式响应（当 AI 服务不可用时使用）
    function getOfflineResponse(message) {
        const lowerMessage = message.toLowerCase();

        if (lowerMessage.includes('予約') || lowerMessage.includes('reservation')) {
            return `ご予約についてのお問い合わせありがとうございます。<br><br>
                    <b>🏨 ご予約方法</b><br>
                    • 公式サイトからのオンライン予約<br>
                    • お電話でのご予約: 03-6404-8788<br><br>
                    <b>📅 チェックイン/アウト</b><br>
                    • チェックイン: 15:00〜<br>
                    • チェックアウト: 〜11:00<br><br>
                    詳しくは<a href="reservation.html" style="color: #2563eb;">宿泊予約ページ</a>をご覧ください。`;
        }

        if (lowerMessage.includes('客室') || lowerMessage.includes('部屋') || lowerMessage.includes('room')) {
            return `客室についてのお問い合わせありがとうございます。<br><br>
                    <b>🛏️ 客室タイプ</b><br>
                    • スタンダード和室<br>
                    • デラックス和洋室<br>
                    • プレミアムスイート<br><br>
                    全室から越後湯沢の美しい景色をお楽しみいただけます。<br><br>
                    詳しくは<a href="rooms.html" style="color: #2563eb;">客室ページ</a>をご覧ください。`;
        }

        if (lowerMessage.includes('温泉') || lowerMessage.includes('onsen') || lowerMessage.includes('お風呂')) {
            return `温泉についてのお問い合わせありがとうございます。<br><br>
                    <b>♨️ 天空の湯</b><br>
                    標高800mの絶景露天風呂で、四季折々の景色をお楽しみいただけます。<br><br>
                    <b>⏰ 営業時間</b><br>
                    • 大浴場: 5:00〜24:00<br>
                    • 露天風呂: 6:00〜23:00<br><br>
                    詳しくは<a href="onsen.html" style="color: #2563eb;">温泉ページ</a>をご覧ください。`;
        }

        if (lowerMessage.includes('アクセス') || lowerMessage.includes('行き方') || lowerMessage.includes('access')) {
            return `アクセスについてのお問い合わせありがとうございます。<br><br>
                    <b>🚄 電車でお越しの場合</b><br>
                    東京駅から上越新幹線で約70分、越後湯沢駅下車<br><br>
                    <b>🚗 お車でお越しの場合</b><br>
                    関越自動車道 湯沢ICから約10分<br><br>
                    <b>🚌 送迎</b><br>
                    越後湯沢駅から無料シャトルバスあり（要予約）<br><br>
                    詳しくは<a href="access.html" style="color: #2563eb;">アクセスページ</a>をご覧ください。`;
        }

        if (lowerMessage.includes('料理') || lowerMessage.includes('食事') || lowerMessage.includes('dining')) {
            return `お食事についてのお問い合わせありがとうございます。<br><br>
                    <b>🍽️ 特徴</b><br>
                    地元新潟の新鮮な食材を使った会席料理をご提供しております。<br><br>
                    <b>⏰ 食事時間</b><br>
                    • 朝食: 7:00〜9:30<br>
                    • 夕食: 18:00〜21:00<br><br>
                    詳しくは<a href="dining.html" style="color: #2563eb;">お食事ページ</a>をご覧ください。`;
        }

        // デフォルトの応答
        return `お問い合わせありがとうございます。<br><br>
                ご質問の内容について、詳しくお答えするために以下の方法でお問い合わせください。<br><br>
                <b>📞 電話</b>: 03-6404-8788<br>
                <b>📧 メール</b>: info@trip7-yuzawa.com<br><br>
                または、以下のボタンから該当するカテゴリをお選びください。`;
    }
}

// 导出函数
window.openAiChatPanel = openAiChatPanel;
window.closeAiChatPanel = closeAiChatPanel;

// =============================================
// 语音输入功能
// =============================================

function initVoiceInput(voiceBtn, inputElement, sendCallback) {
    // 检查浏览器是否支持语音识别
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    // 检测是否为iOS（iOS上所有浏览器都不支持Web Speech API）
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

    // 不支持时隐藏按钮
    if (!SpeechRecognition || isIOS) {
        console.log('🎤 音声入力非対応 - ボタンを非表示');
        voiceBtn.style.display = 'none';
        return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'ja-JP'; // 日语
    recognition.continuous = false; // 单次识别
    recognition.interimResults = true; // 显示中间结果

    let isRecording = false;
    let finalTranscript = '';

    // 点击语音按钮
    voiceBtn.addEventListener('click', function() {
        if (isRecording) {
            // 停止录音
            recognition.stop();
        } else {
            // 开始录音
            try {
                recognition.start();
                console.log('🎤 音声認識を開始...');
            } catch (error) {
                console.error('音声認識の開始に失敗:', error);
            }
        }
    });

    // 录音开始
    recognition.onstart = function() {
        isRecording = true;
        voiceBtn.classList.add('recording');
        voiceBtn.innerHTML = '<i class="fas fa-stop"></i>';
        finalTranscript = '';
        inputElement.placeholder = '話してください...';
    };

    // 录音结束
    recognition.onend = function() {
        isRecording = false;
        voiceBtn.classList.remove('recording');
        voiceBtn.innerHTML = '<i class="fas fa-microphone"></i>';
        inputElement.placeholder = 'メッセージを入力...';

        // 如果有最终结果，自动发送
        if (finalTranscript.trim()) {
            inputElement.value = finalTranscript.trim();
            // 触发 input 事件以调整高度
            inputElement.dispatchEvent(new Event('input'));
            // 自动发送消息
            if (sendCallback) {
                sendCallback();
            }
        }
    };

    // 识别结果
    recognition.onresult = function(event) {
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                finalTranscript += transcript;
            } else {
                interimTranscript += transcript;
            }
        }

        // 实时显示识别结果
        inputElement.value = finalTranscript + interimTranscript;
        inputElement.dispatchEvent(new Event('input'));
    };

    // 错误处理
    recognition.onerror = function(event) {
        console.error('音声認識エラー:', event.error);
        isRecording = false;
        voiceBtn.classList.remove('recording');
        voiceBtn.innerHTML = '<i class="fas fa-microphone"></i>';
        inputElement.placeholder = 'メッセージを入力...';

        switch (event.error) {
            case 'not-allowed':
                alert('マイクへのアクセスが許可されていません。\n\nブラウザの設定でマイクへのアクセスを許可してください。');
                break;
            case 'no-speech':
                // 没有检测到语音，静默处理
                console.log('音声が検出されませんでした');
                break;
            case 'network':
                alert('ネットワークエラーが発生しました。\n\nインターネット接続を確認してください。');
                break;
            default:
                console.warn('音声認識エラー:', event.error);
        }
    };
}

// 在 navbar 加载完成后初始化
const originalInitializeNavbar = initializeNavbar;
initializeNavbar = function() {
    originalInitializeNavbar();
    initMobileBookingPanel();
    initMobileBottomNav();
    initAiChatPanel();
};
