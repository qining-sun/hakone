/**
 * Custom Calendar Component
 * A beautiful, modern date range picker
 */

class CustomCalendar {
    constructor(options = {}) {
        this.currentDate = new Date();
        this.selectedStart = null;
        this.selectedEnd = null;
        this.isSelectingEnd = false;
        this.priceData = {}; // 存储价格数据
        this.initialized = false; // 标记是否已初始化

        this.elements = {
            wrapper: options.wrapper,
            checkinDisplay: options.checkinDisplay,
            checkoutDisplay: options.checkoutDisplay,
            checkinInput: options.checkinInput,
            checkoutInput: options.checkoutInput,
            nightsBadge: options.nightsBadge,
            nightsCount: options.nightsCount,
            calendarPopup: options.calendarPopup,
            calendarTitle: options.calendarTitle,
            calendarTitle2: options.calendarTitle2,
            calendarDays: options.calendarDays,
            calendarDays2: options.calendarDays2,
            prevMonth: options.prevMonth,
            nextMonth: options.nextMonth
        };

        this.init();
    }

    async init() {
        // 首先绑定事件
        this.bindEvents();

        // 加载库存数据并设置默认日期
        await this.loadInitialInventory();

        this.initialized = true;
    }

    // 加载初始库存数据并设置第一个有库存的日期
    async loadInitialInventory() {
        console.log('🔍 开始加载库存数据...');

        // 首先检查 URL 参数是否有日期
        const urlParams = new URLSearchParams(window.location.search);
        const urlCheckin = urlParams.get('checkin');
        const urlCheckout = urlParams.get('checkout');

        // 日期格式验证函数
        const isValidDate = (dateStr) => {
            if (!dateStr) return false;
            const regex = /^\d{4}-\d{2}-\d{2}$/;
            if (!regex.test(dateStr)) return false;
            const date = new Date(dateStr);
            return date instanceof Date && !isNaN(date);
        };

        // 如果 URL 有有效的日期参数，直接使用
        if (isValidDate(urlCheckin) && isValidDate(urlCheckout)) {
            console.log('📅 使用 URL 参数中的日期');
            const [y1, m1, d1] = urlCheckin.split('-').map(Number);
            const [y2, m2, d2] = urlCheckout.split('-').map(Number);
            this.selectedStart = new Date(y1, m1 - 1, d1);
            this.selectedEnd = new Date(y2, m2 - 1, d2);
            this.currentDate = new Date(this.selectedStart);
            console.log(`✨ URL Checkin: ${urlCheckin}`);
            console.log(`✨ URL Checkout: ${urlCheckout}`);
            this.updateDisplay();
            this.renderCalendar();
            // 仍然加载价格数据用于日历显示
            this.loadPriceDataInBackground();
            return;
        }

        // 从今天开始搜索库存数据
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let allInventoryDates = []; // 存储所有有库存的日期

        // 向后搜索18个月的数据（从今天开始）
        for (let monthOffset = 0; monthOffset < 18; monthOffset++) {
            const checkDate = new Date(today);
            checkDate.setMonth(checkDate.getMonth() + monthOffset);

            const year = checkDate.getFullYear();
            const month = checkDate.getMonth() + 1;

            // 从人数选择器获取大人数
            const adultsSelect = document.getElementById('adults');
            const numAdults = adultsSelect ? parseInt(adultsSelect.value) : 2;

            try {
                const apiUrl = window.getApiUrl(`/rooms/calendar-prices/${year}/${month}?adults=${numAdults}`);
                console.log(`🌐 加载 ${year}年${month}月 数据: ${apiUrl}`);

                const response = await fetch(apiUrl);
                const result = await response.json();

                if (result.success && result.data) {
                    // 将数据合并到 priceData
                    Object.assign(this.priceData, result.data);

                    // 提取该月所有有库存的日期
                    const monthInventoryDates = Object.keys(result.data)
                        .filter(dateStr => result.data[dateStr]?.hasInventory === true)
                        .map(dateStr => {
                            const [y, m, d] = dateStr.split('-').map(Number);
                            return { dateStr, date: new Date(y, m - 1, d) };
                        });

                    allInventoryDates.push(...monthInventoryDates);

                    console.log(`✅ ${year}年${month}月 找到 ${monthInventoryDates.length} 个有库存的日期`);
                }
            } catch (error) {
                console.error(`❌ 获取${year}年${month}月数据失败:`, error);
            }
        }

        console.log(`📊 总共找到 ${allInventoryDates.length} 个有库存的日期`);

        // 按日期排序
        allInventoryDates.sort((a, b) => a.date - b.date);

        // 设置默认的 checkin 和 checkout 日期
        if (allInventoryDates.length >= 2) {
            // 使用第一个有库存的日期作为 checkin
            this.selectedStart = allInventoryDates[0].date;
            this.selectedStart.setHours(0, 0, 0, 0);

            // 使用第二个有库存的日期作为 checkout
            this.selectedEnd = allInventoryDates[1].date;
            this.selectedEnd.setHours(0, 0, 0, 0);

            // 设置日历显示月份为第一个有库存日期的月份
            this.currentDate = new Date(this.selectedStart);

            console.log(`✨ 默认 Checkin: ${this.selectedStart.toLocaleDateString()} (${allInventoryDates[0].dateStr})`);
            console.log(`✨ 默认 Checkout: ${this.selectedEnd.toLocaleDateString()} (${allInventoryDates[1].dateStr})`);
            console.log(`✨ 日历显示月份: ${this.currentDate.getFullYear()}年${this.currentDate.getMonth() + 1}月`);
        } else if (allInventoryDates.length === 1) {
            // 只有一个有库存的日期，使用它作为 checkin，次日作为 checkout
            this.selectedStart = allInventoryDates[0].date;
            this.selectedStart.setHours(0, 0, 0, 0);

            const nextDay = new Date(this.selectedStart);
            nextDay.setDate(nextDay.getDate() + 1);
            this.selectedEnd = nextDay;

            this.currentDate = new Date(this.selectedStart);

            console.log(`✨ 默认 Checkin: ${this.selectedStart.toLocaleDateString()}`);
            console.log(`✨ 默认 Checkout: ${this.selectedEnd.toLocaleDateString()} (次日)`);
        } else {
            // 没有找到有库存的日期，使用今天和明天
            console.warn('⚠️ 未找到任何有库存的日期，使用今天和明天作为默认值');
            this.selectedStart = today;
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            this.selectedEnd = tomorrow;
            this.currentDate = new Date(today);
        }

        this.updateDisplay();
        this.renderCalendar();
    }

    bindEvents() {
        // Toggle calendar on input click
        this.elements.wrapper.addEventListener('click', (e) => {
            if (!this.elements.calendarPopup.contains(e.target)) {
                this.toggleCalendar();
            }
        });

        // Navigation buttons
        this.elements.prevMonth.addEventListener('click', (e) => {
            e.stopPropagation();
            this.changeMonth(-1);
        });

        this.elements.nextMonth.addEventListener('click', (e) => {
            e.stopPropagation();
            this.changeMonth(1);
        });

        // Close calendar when clicking outside (desktop only)
        document.addEventListener('click', (e) => {
            if (!this.isMobile() && !this.elements.wrapper.contains(e.target)) {
                this.closeCalendar();
            }
        });

        // Create overlay for mobile
        this.createMobileOverlay();

        // Confirm button for mobile
        const confirmBtn = document.getElementById('calendarConfirmBtn');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.closeCalendar();
            });
        }

        // Close button for mobile
        const closeBtn = document.getElementById('calendarCloseBtn');
        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.closeCalendar();
            });
        }
    }

    isMobile() {
        return window.innerWidth <= 768;
    }

    createMobileOverlay() {
        // Create overlay element if it doesn't exist
        if (!document.getElementById('calendarPopupOverlay')) {
            const overlay = document.createElement('div');
            overlay.id = 'calendarPopupOverlay';
            overlay.className = 'calendar-popup-overlay';
            document.body.appendChild(overlay);

            // Close calendar when clicking overlay
            overlay.addEventListener('click', () => {
                this.closeCalendar();
            });
        }
    }

    toggleCalendar() {
        const isOpen = this.elements.calendarPopup.style.display === 'block';
        if (isOpen) {
            this.closeCalendar();
        } else {
            this.openCalendar();
        }
    }

    openCalendar() {
        this.elements.calendarPopup.style.display = 'block';
        this.elements.wrapper.classList.add('active');

        // Mobile: show overlay, add mobile-open class, and lock body scroll
        if (this.isMobile()) {
            this.elements.calendarPopup.classList.add('mobile-open');
            const overlay = document.getElementById('calendarPopupOverlay');
            if (overlay) overlay.classList.add('active');
            document.body.classList.add('calendar-open');
        }

        // Set initial active state based on selection status
        const checkinBox = document.getElementById('checkinBox');
        const checkoutBox = document.getElementById('checkoutBox');

        if (checkinBox && checkoutBox) {
            if (this.isSelectingEnd && this.selectedStart && !this.selectedEnd) {
                // Already selected check-in, now selecting check-out
                checkinBox.classList.remove('active');
                checkoutBox.classList.add('active');
            } else {
                // Starting fresh or both selected, start with check-in
                checkinBox.classList.add('active');
                checkoutBox.classList.remove('active');
            }
        }

        this.loadPrices(); // 打开时加载价格
    }

    closeCalendar() {
        this.elements.calendarPopup.style.display = 'none';
        this.elements.calendarPopup.classList.remove('mobile-open');
        this.elements.wrapper.classList.remove('active');

        // Mobile: hide overlay and unlock body scroll
        const overlay = document.getElementById('calendarPopupOverlay');
        if (overlay) overlay.classList.remove('active');
        document.body.classList.remove('calendar-open');

        // Clear active states when closing
        const checkinBox = document.getElementById('checkinBox');
        const checkoutBox = document.getElementById('checkoutBox');
        if (checkinBox) checkinBox.classList.remove('active');
        if (checkoutBox) checkoutBox.classList.remove('active');
    }

    changeMonth(delta) {
        this.currentDate.setMonth(this.currentDate.getMonth() + delta);
        this.loadPrices(); // 加载新月份的价格
    }

    // 后台加载价格数据（不覆盖已选日期）
    async loadPriceDataInBackground() {
        const adultsSelect = document.getElementById('adults');
        const numAdults = adultsSelect ? parseInt(adultsSelect.value) : 2;

        // 加载当前选择日期周围的几个月数据
        const startMonth = this.selectedStart ? new Date(this.selectedStart) : new Date();

        try {
            const fetchPromises = [];
            for (let i = -1; i < 6; i++) {
                const monthDate = new Date(startMonth);
                monthDate.setMonth(monthDate.getMonth() + i);
                const year = monthDate.getFullYear();
                const month = monthDate.getMonth() + 1;
                fetchPromises.push(
                    fetch(window.getApiUrl(`/rooms/calendar-prices/${year}/${month}?adults=${numAdults}`))
                );
            }

            const responses = await Promise.all(fetchPromises);
            const results = await Promise.all(responses.map(r => r.json()));

            results.forEach(result => {
                if (result.success) {
                    Object.assign(this.priceData, result.data);
                }
            });

            // 重新渲染日历以显示价格
            this.renderCalendar();
            console.log('✅ 后台价格数据加载完成');
        } catch (error) {
            console.error('后台加载价格数据失败:', error);
        }
    }

    async loadPrices() {
        // 从人数选择器获取大人数
        const adultsSelect = document.getElementById('adults');
        const numAdults = adultsSelect ? parseInt(adultsSelect.value) : 2;

        // Mobile: load 12 months of data
        const monthsToLoad = this.isMobile() ? 12 : 2;

        try {
            const fetchPromises = [];
            for (let i = 0; i < monthsToLoad; i++) {
                const monthDate = new Date(this.currentDate);
                monthDate.setMonth(monthDate.getMonth() + i);
                const year = monthDate.getFullYear();
                const month = monthDate.getMonth() + 1;
                fetchPromises.push(
                    fetch(window.getApiUrl(`/rooms/calendar-prices/${year}/${month}?adults=${numAdults}`))
                );
            }

            const responses = await Promise.all(fetchPromises);
            const results = await Promise.all(responses.map(r => r.json()));

            results.forEach(result => {
                if (result.success) {
                    Object.assign(this.priceData, result.data);
                }
            });
        } catch (error) {
            console.error('获取价格数据失败:', error);
        }

        this.renderCalendar();
    }

    renderCalendar() {
        // Mobile: render multiple months for scrolling
        if (this.isMobile()) {
            this.renderMobileCalendar();
            return;
        }

        // Desktop: render 2 months as before
        // 渲染第一个月（当前月）
        this.renderMonth(this.currentDate, this.elements.calendarTitle, this.elements.calendarDays);

        // 渲染第二个月（下个月）
        const nextMonthDate = new Date(this.currentDate);
        nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
        this.renderMonth(nextMonthDate, this.elements.calendarTitle2, this.elements.calendarDays2);

        console.log(`✅ 双月日历渲染完成`);
    }

    renderMobileCalendar() {
        // Get the container
        const container = this.elements.calendarPopup.querySelector('.calendar-dual-container');
        if (!container) return;

        // Clear existing content
        container.innerHTML = '';

        // Render 12 months starting from current month
        const monthsToRender = 12;
        for (let i = 0; i < monthsToRender; i++) {
            const monthDate = new Date(this.currentDate);
            monthDate.setMonth(monthDate.getMonth() + i);

            // Create month panel
            const monthPanel = document.createElement('div');
            monthPanel.className = 'calendar-month-panel mobile-month';

            // Create header
            const header = document.createElement('div');
            header.className = 'calendar-header';
            const title = document.createElement('div');
            title.className = 'calendar-title';
            const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月',
                               '7月', '8月', '9月', '10月', '11月', '12月'];
            title.textContent = `${monthDate.getFullYear()}年${monthNames[monthDate.getMonth()]}`;
            header.appendChild(title);
            monthPanel.appendChild(header);

            // Create weekdays
            const weekdays = document.createElement('div');
            weekdays.className = 'calendar-weekdays';
            const weekdayNames = ['日', '月', '火', '水', '木', '金', '土'];
            weekdayNames.forEach(name => {
                const wd = document.createElement('div');
                wd.className = 'calendar-weekday';
                wd.textContent = name;
                weekdays.appendChild(wd);
            });
            monthPanel.appendChild(weekdays);

            // Create days container
            const daysContainer = document.createElement('div');
            daysContainer.className = 'calendar-days';
            this.renderMonthDays(monthDate, daysContainer);
            monthPanel.appendChild(daysContainer);

            container.appendChild(monthPanel);

            // Add scroll hint after first month
            if (i === 0) {
                const scrollHint = document.createElement('div');
                scrollHint.className = 'calendar-scroll-hint';
                scrollHint.innerHTML = '<i class="fas fa-chevron-down"></i><span>スクロールで他の月を表示</span><i class="fas fa-chevron-down"></i>';
                container.appendChild(scrollHint);
            }
        }

        console.log(`✅ モバイル用 ${monthsToRender} ヶ月カレンダー渲染完了`);

        // Add custom scroll track
        this.addMobileScrollTrack(container);
    }

    addMobileScrollTrack(container) {
        // Remove existing scroll track if any
        const existingTrack = this.elements.calendarPopup.querySelector('.calendar-scroll-track');
        if (existingTrack) existingTrack.remove();

        // Create scroll track
        const scrollTrack = document.createElement('div');
        scrollTrack.className = 'calendar-scroll-track';
        scrollTrack.innerHTML = '<div class="calendar-scroll-thumb"></div>';
        this.elements.calendarPopup.appendChild(scrollTrack);

        const thumb = scrollTrack.querySelector('.calendar-scroll-thumb');

        // Update thumb position on scroll
        container.addEventListener('scroll', () => {
            const scrollTop = container.scrollTop;
            const scrollHeight = container.scrollHeight - container.clientHeight;
            const trackHeight = scrollTrack.clientHeight - thumb.clientHeight;
            const thumbTop = (scrollTop / scrollHeight) * trackHeight;
            thumb.style.top = thumbTop + 'px';
        });
    }

    renderMonthDays(targetDate, daysElement) {
        const year = targetDate.getFullYear();
        const month = targetDate.getMonth();

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        // Add empty cells for alignment
        for (let i = 0; i < startingDayOfWeek; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.className = 'calendar-day empty-cell';
            daysElement.appendChild(emptyCell);
        }

        // Add days
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            this.createDayElement(day, date, false, daysElement);
        }
    }

    renderMonth(targetDate, titleElement, daysElement) {
        const year = targetDate.getFullYear();
        const month = targetDate.getMonth();

        console.log(`📆 渲染日历: ${year}年${month + 1}月`);

        // Update title
        const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月',
                           '7月', '8月', '9月', '10月', '11月', '12月'];
        titleElement.textContent = `${year}年${monthNames[month]}`;

        // Get first day of month and number of days
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        // 统计该月有多少天在 priceData 中
        let daysWithData = 0;
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            if (this.priceData[dateStr]) {
                daysWithData++;
            }
        }

        console.log(`📊 该月共 ${daysInMonth} 天, 有 ${daysWithData} 天在库存表中, 起始星期: ${startingDayOfWeek}`);

        // Clear calendar
        daysElement.innerHTML = '';

        // Add empty cells for previous month days (for alignment)
        for (let i = 0; i < startingDayOfWeek; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.className = 'calendar-day empty-cell';
            daysElement.appendChild(emptyCell);
        }

        // Add current month days - show all days, gray out unavailable ones
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            this.createDayElement(day, date, false, daysElement);
        }
    }

    createDayElement(day, date, isOtherMonth, daysElement) {
        const dayEl = document.createElement('div');
        dayEl.className = 'calendar-day';

        // 创建日期数字
        const dayNumber = document.createElement('div');
        dayNumber.className = 'day-number';
        dayNumber.textContent = day;
        dayEl.appendChild(dayNumber);

        dayEl.dataset.date = date.toISOString();

        // 使用本地日期格式，避免 UTC 时区转换问题
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const dayNum = date.getDate();
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;

        // 检查是否有价格数据和库存
        const hasPriceData = !!this.priceData[dateStr];
        const hasInventory = this.priceData[dateStr]?.hasInventory || false;

        // 检查是否是过去的日期
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const compareDate = new Date(date);
        compareDate.setHours(0, 0, 0, 0);
        const isPast = compareDate < today;

        // 添加价格标签（只为有库存的日期显示价格）
        if (hasPriceData && !isOtherMonth && hasInventory && !isPast) {
            const priceLabel = document.createElement('div');
            priceLabel.className = 'day-price';
            if (this.priceData[dateStr].isHoliday) {
                priceLabel.classList.add('holiday-price');
            }
            priceLabel.textContent = `¥${this.priceData[dateStr].price.toLocaleString()}/人`;
            dayEl.appendChild(priceLabel);
        }

        // Add classes
        if (isOtherMonth) {
            dayEl.classList.add('other-month');
        }

        // 禁用条件：过去的日期、没有库存、或没有价格数据
        if (isPast || !hasInventory || !hasPriceData) {
            dayEl.classList.add('disabled');
            if (!hasInventory || !hasPriceData) {
                dayEl.classList.add('no-inventory');
            }
        }

        // 标记今天
        if (compareDate.getTime() === today.getTime()) {
            dayEl.classList.add('today');
        }

        // Sunday (0) and Saturday (6)
        const dayOfWeek = date.getDay();
        if (dayOfWeek === 0) dayEl.classList.add('sunday');
        if (dayOfWeek === 6) dayEl.classList.add('saturday');

        // Selected dates
        if (this.selectedStart && compareDate.getTime() === this.selectedStart.getTime()) {
            dayEl.classList.add('range-start');
        }

        if (this.selectedEnd && compareDate.getTime() === this.selectedEnd.getTime()) {
            dayEl.classList.add('range-end');
        }

        // In range
        if (this.selectedStart && this.selectedEnd) {
            if (compareDate > this.selectedStart && compareDate < this.selectedEnd) {
                dayEl.classList.add('in-range');
            }
        }

        // Click event
        if (!dayEl.classList.contains('disabled')) {
            dayEl.addEventListener('click', (e) => {
                e.stopPropagation();
                this.selectDate(date);
            });

            // Hover preview when selecting end date
            if (this.isSelectingEnd && this.selectedStart && !this.selectedEnd) {
                dayEl.addEventListener('mouseenter', () => {
                    this.previewRange(date);
                });

                dayEl.addEventListener('mouseleave', () => {
                    this.clearPreview();
                });
            }
        }

        daysElement.appendChild(dayEl);
    }

    previewRange(hoverDate) {
        if (!this.selectedStart || this.selectedEnd) return;

        hoverDate.setHours(0, 0, 0, 0);
        const startDate = new Date(this.selectedStart);
        startDate.setHours(0, 0, 0, 0);

        // Get all day elements from both calendars
        const dayElements1 = this.elements.calendarDays.querySelectorAll('.calendar-day');
        const dayElements2 = this.elements.calendarDays2.querySelectorAll('.calendar-day');
        const allDayElements = [...dayElements1, ...dayElements2];

        allDayElements.forEach(dayEl => {
            if (dayEl.classList.contains('disabled') || dayEl.classList.contains('other-month')) return;

            const dayDate = new Date(dayEl.dataset.date);
            dayDate.setHours(0, 0, 0, 0);

            // Remove previous preview classes
            dayEl.classList.remove('preview-range', 'preview-end');

            // Add preview classes
            if (hoverDate > startDate) {
                if (dayDate > startDate && dayDate < hoverDate) {
                    dayEl.classList.add('preview-range');
                } else if (dayDate.getTime() === hoverDate.getTime()) {
                    dayEl.classList.add('preview-end');
                }
            } else if (hoverDate < startDate) {
                if (dayDate > hoverDate && dayDate < startDate) {
                    dayEl.classList.add('preview-range');
                } else if (dayDate.getTime() === hoverDate.getTime()) {
                    dayEl.classList.add('preview-end');
                }
            }
        });
    }

    clearPreview() {
        const dayElements1 = this.elements.calendarDays.querySelectorAll('.calendar-day');
        const dayElements2 = this.elements.calendarDays2.querySelectorAll('.calendar-day');
        const allDayElements = [...dayElements1, ...dayElements2];
        allDayElements.forEach(dayEl => {
            dayEl.classList.remove('preview-range', 'preview-end');
        });
    }

    selectDate(date) {
        date.setHours(0, 0, 0, 0);

        const checkinBox = document.getElementById('checkinBox');
        const checkoutBox = document.getElementById('checkoutBox');

        if (!this.selectedStart || (this.selectedStart && this.selectedEnd)) {
            // Start new selection - selecting check-in date
            this.selectedStart = date;
            this.selectedEnd = null;
            this.isSelectingEnd = true;
            this.clearPreview();

            // Switch active state: check-in -> check-out
            if (checkinBox && checkoutBox) {
                checkinBox.classList.remove('active');
                checkoutBox.classList.add('active');
            }
        } else {
            // Select end date - selecting check-out date
            if (date > this.selectedStart) {
                this.selectedEnd = date;
            } else {
                this.selectedEnd = this.selectedStart;
                this.selectedStart = date;
            }
            this.isSelectingEnd = false;
            this.clearPreview();

            // Remove active state from both
            if (checkinBox && checkoutBox) {
                checkinBox.classList.remove('active');
                checkoutBox.classList.remove('active');
            }

            // Close calendar after selecting range (desktop only)
            // On mobile, user needs to click confirm button
            if (!this.isMobile()) {
                setTimeout(() => {
                    this.closeCalendar();
                }, 300);
            }
        }

        this.updateDisplay();
        this.renderCalendar();
    }

    updateDisplay() {
        // Update main display
        if (this.selectedStart) {
            this.elements.checkinDisplay.textContent = this.formatDate(this.selectedStart);
            this.elements.checkinDisplay.classList.remove('placeholder');
            this.elements.checkinInput.value = this.formatDateISO(this.selectedStart);
        }

        if (this.selectedEnd) {
            this.elements.checkoutDisplay.textContent = this.formatDate(this.selectedEnd);
            this.elements.checkoutDisplay.classList.remove('placeholder');
            this.elements.checkoutInput.value = this.formatDateISO(this.selectedEnd);

            // Calculate nights
            const nights = Math.ceil((this.selectedEnd - this.selectedStart) / (1000 * 60 * 60 * 24));
            this.elements.nightsCount.textContent = nights;
            this.elements.nightsBadge.style.display = 'block';
        } else {
            this.elements.checkoutDisplay.textContent = '日付を選択';
            this.elements.checkoutDisplay.classList.add('placeholder');
            this.elements.nightsBadge.style.display = 'none';
        }

        // Update mobile calendar confirm section display
        this.updateMobileSelectedDates();
    }

    updateMobileSelectedDates() {
        const mobileCheckin = document.getElementById('mobileSelectedCheckin');
        const mobileCheckout = document.getElementById('mobileSelectedCheckout');
        const mobileNights = document.getElementById('mobileSelectedNights');
        const mobileNightsCount = document.getElementById('mobileSelectedNightsCount');

        if (mobileCheckin) {
            if (this.selectedStart) {
                mobileCheckin.textContent = this.formatDateShort(this.selectedStart);
                mobileCheckin.classList.add('has-date');
            } else {
                mobileCheckin.textContent = '日付を選択';
                mobileCheckin.classList.remove('has-date');
            }
        }

        if (mobileCheckout) {
            if (this.selectedEnd) {
                mobileCheckout.textContent = this.formatDateShort(this.selectedEnd);
                mobileCheckout.classList.add('has-date');
            } else {
                mobileCheckout.textContent = '日付を選択';
                mobileCheckout.classList.remove('has-date');
            }
        }

        if (mobileNights && mobileNightsCount) {
            if (this.selectedStart && this.selectedEnd) {
                const nights = Math.ceil((this.selectedEnd - this.selectedStart) / (1000 * 60 * 60 * 24));
                mobileNightsCount.textContent = nights;
                mobileNights.style.display = 'block';
            } else {
                mobileNights.style.display = 'none';
            }
        }
    }

    formatDateShort(date) {
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
        const weekday = weekdays[date.getDay()];
        return `${month}/${day}(${weekday})`;
    }

    formatDate(date) {
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
        const weekday = weekdays[date.getDay()];
        return `${month}月${day}日（${weekday}）`;
    }

    formatDateISO(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
}

// Initialize calendar when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    const customDatePicker = document.getElementById('customDatePicker');

    if (customDatePicker) {
        window.customCalendar = new CustomCalendar({
            wrapper: customDatePicker,
            checkinDisplay: document.getElementById('checkinDisplay'),
            checkoutDisplay: document.getElementById('checkoutDisplay'),
            checkinInput: document.getElementById('checkin'),
            checkoutInput: document.getElementById('checkout'),
            nightsBadge: document.getElementById('nightsBadge'),
            nightsCount: document.getElementById('nightsCount'),
            calendarPopup: document.getElementById('calendarPopup'),
            calendarTitle: document.getElementById('calendarTitle'),
            calendarTitle2: document.getElementById('calendarTitle2'),
            calendarDays: document.getElementById('calendarDays'),
            calendarDays2: document.getElementById('calendarDays2'),
            prevMonth: document.getElementById('prevMonth'),
            nextMonth: document.getElementById('nextMonth')
        });
    }
});
