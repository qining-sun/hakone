/**
 * Custom Calendar Component
 * Simple date range picker
 */

class CustomCalendar {
    constructor(options = {}) {
        this.currentDate = new Date();
        this.selectedStart = null;
        this.selectedEnd = null;
        this.isSelectingEnd = false;

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

    init() {
        this.bindEvents();

        // 检查 URL 参数
        const urlParams = new URLSearchParams(window.location.search);
        const urlCheckin = urlParams.get('checkin');
        const urlCheckout = urlParams.get('checkout');

        if (urlCheckin && urlCheckout && /^\d{4}-\d{2}-\d{2}$/.test(urlCheckin) && /^\d{4}-\d{2}-\d{2}$/.test(urlCheckout)) {
            const [y1, m1, d1] = urlCheckin.split('-').map(Number);
            const [y2, m2, d2] = urlCheckout.split('-').map(Number);
            this.selectedStart = new Date(y1, m1 - 1, d1);
            this.selectedEnd = new Date(y2, m2 - 1, d2);
            this.currentDate = new Date(this.selectedStart);
        } else {
            // 默认: 今天 → 明天
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            this.selectedStart = new Date(today);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            this.selectedEnd = tomorrow;
        }

        this.updateDisplay();
        this.renderCalendar();
    }

    bindEvents() {
        this.elements.wrapper.addEventListener('click', (e) => {
            if (!this.elements.calendarPopup.contains(e.target)) {
                this.toggleCalendar();
            }
        });

        this.elements.prevMonth.addEventListener('click', (e) => {
            e.stopPropagation();
            this.changeMonth(-1);
        });

        this.elements.nextMonth.addEventListener('click', (e) => {
            e.stopPropagation();
            this.changeMonth(1);
        });

        document.addEventListener('click', (e) => {
            if (!this.isMobile() && !this.elements.wrapper.contains(e.target)) {
                this.closeCalendar();
            }
        });

        this.createMobileOverlay();

        const confirmBtn = document.getElementById('calendarConfirmBtn');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.closeCalendar();
            });
        }

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
        if (!document.getElementById('calendarPopupOverlay')) {
            const overlay = document.createElement('div');
            overlay.id = 'calendarPopupOverlay';
            overlay.className = 'calendar-popup-overlay';
            document.body.appendChild(overlay);
            overlay.addEventListener('click', () => this.closeCalendar());
        }
    }

    toggleCalendar() {
        if (this.elements.calendarPopup.style.display === 'block') {
            this.closeCalendar();
        } else {
            this.openCalendar();
        }
    }

    openCalendar() {
        this.elements.calendarPopup.style.display = 'block';
        this.elements.wrapper.classList.add('active');

        if (this.isMobile()) {
            this.elements.calendarPopup.classList.add('mobile-open');
            const overlay = document.getElementById('calendarPopupOverlay');
            if (overlay) overlay.classList.add('active');
            document.body.classList.add('calendar-open');
        }

        const checkinBox = document.getElementById('checkinBox');
        const checkoutBox = document.getElementById('checkoutBox');
        if (checkinBox && checkoutBox) {
            if (this.isSelectingEnd && this.selectedStart && !this.selectedEnd) {
                checkinBox.classList.remove('active');
                checkoutBox.classList.add('active');
            } else {
                checkinBox.classList.add('active');
                checkoutBox.classList.remove('active');
            }
        }

        this.renderCalendar();
    }

    closeCalendar() {
        this.elements.calendarPopup.style.display = 'none';
        this.elements.calendarPopup.classList.remove('mobile-open');
        this.elements.wrapper.classList.remove('active');

        const overlay = document.getElementById('calendarPopupOverlay');
        if (overlay) overlay.classList.remove('active');
        document.body.classList.remove('calendar-open');

        const checkinBox = document.getElementById('checkinBox');
        const checkoutBox = document.getElementById('checkoutBox');
        if (checkinBox) checkinBox.classList.remove('active');
        if (checkoutBox) checkoutBox.classList.remove('active');
    }

    changeMonth(delta) {
        this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + delta, 1);
        this.renderCalendar();
    }

    renderCalendar() {
        if (this.isMobile()) {
            this.renderMobileCalendar();
            return;
        }

        // Desktop: 2 months
        this.renderMonth(this.currentDate, this.elements.calendarTitle, this.elements.calendarDays);
        const nextMonthDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 1);
        this.renderMonth(nextMonthDate, this.elements.calendarTitle2, this.elements.calendarDays2);
    }

    renderMobileCalendar() {
        const container = this.elements.calendarPopup.querySelector('.calendar-dual-container');
        if (!container) return;

        container.innerHTML = '';

        for (let i = 0; i < 12; i++) {
            const monthDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + i, 1);

            const monthPanel = document.createElement('div');
            monthPanel.className = 'calendar-month-panel mobile-month';

            // Header
            const header = document.createElement('div');
            header.className = 'calendar-header';
            const title = document.createElement('div');
            title.className = 'calendar-title';
            const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
            title.textContent = `${monthDate.getFullYear()}年${monthNames[monthDate.getMonth()]}`;
            header.appendChild(title);
            monthPanel.appendChild(header);

            // Weekdays
            const weekdays = document.createElement('div');
            weekdays.className = 'calendar-weekdays';
            const defaultNames = ['日', '月', '火', '水', '木', '金', '土'];
            const weekdayKeys = ['weekday_sun', 'weekday_mon', 'weekday_tue', 'weekday_wed', 'weekday_thu', 'weekday_fri', 'weekday_sat'];
            defaultNames.forEach((name, idx) => {
                const wd = document.createElement('div');
                wd.className = 'calendar-weekday';
                wd.textContent = window.i18n ? window.i18n.t(weekdayKeys[idx]) : name;
                weekdays.appendChild(wd);
            });
            monthPanel.appendChild(weekdays);

            // Days
            const daysContainer = document.createElement('div');
            daysContainer.className = 'calendar-days';
            this.renderMonthDays(monthDate, daysContainer);
            monthPanel.appendChild(daysContainer);

            container.appendChild(monthPanel);

            if (i === 0) {
                const scrollHint = document.createElement('div');
                scrollHint.className = 'calendar-scroll-hint';
                scrollHint.innerHTML = '<i class="fas fa-chevron-down"></i><span>スクロールで他の月を表示</span><i class="fas fa-chevron-down"></i>';
                container.appendChild(scrollHint);
            }
        }

        this.addMobileScrollTrack(container);
    }

    addMobileScrollTrack(container) {
        const existingTrack = this.elements.calendarPopup.querySelector('.calendar-scroll-track');
        if (existingTrack) existingTrack.remove();

        const scrollTrack = document.createElement('div');
        scrollTrack.className = 'calendar-scroll-track';
        scrollTrack.innerHTML = '<div class="calendar-scroll-thumb"></div>';
        this.elements.calendarPopup.appendChild(scrollTrack);

        const thumb = scrollTrack.querySelector('.calendar-scroll-thumb');
        container.addEventListener('scroll', () => {
            const scrollHeight = container.scrollHeight - container.clientHeight;
            const trackHeight = scrollTrack.clientHeight - thumb.clientHeight;
            thumb.style.top = (container.scrollTop / scrollHeight) * trackHeight + 'px';
        });
    }

    renderMonthDays(targetDate, daysElement) {
        const year = targetDate.getFullYear();
        const month = targetDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const startingDayOfWeek = new Date(year, month, 1).getDay();

        for (let i = 0; i < startingDayOfWeek; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.className = 'calendar-day empty-cell';
            daysElement.appendChild(emptyCell);
        }

        for (let day = 1; day <= daysInMonth; day++) {
            this.createDayElement(day, new Date(year, month, day), daysElement);
        }
    }

    renderMonth(targetDate, titleElement, daysElement) {
        const year = targetDate.getFullYear();
        const month = targetDate.getMonth();
        const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
        titleElement.textContent = `${year}年${monthNames[month]}`;

        daysElement.innerHTML = '';

        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const startingDayOfWeek = new Date(year, month, 1).getDay();

        for (let i = 0; i < startingDayOfWeek; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.className = 'calendar-day empty-cell';
            daysElement.appendChild(emptyCell);
        }

        for (let day = 1; day <= daysInMonth; day++) {
            this.createDayElement(day, new Date(year, month, day), daysElement);
        }
    }

    createDayElement(day, date, daysElement) {
        const dayEl = document.createElement('div');
        dayEl.className = 'calendar-day';
        dayEl.textContent = day;
        dayEl.dataset.date = date.toISOString();

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const compareDate = new Date(date);
        compareDate.setHours(0, 0, 0, 0);

        // 过去的日期禁用
        if (compareDate < today) {
            dayEl.classList.add('disabled');
        }

        // 今天
        if (compareDate.getTime() === today.getTime()) {
            dayEl.classList.add('today');
        }

        // 星期日/星期六
        const dayOfWeek = date.getDay();
        if (dayOfWeek === 0) dayEl.classList.add('sunday');
        if (dayOfWeek === 6) dayEl.classList.add('saturday');

        // 选中范围
        if (this.selectedStart && compareDate.getTime() === this.selectedStart.getTime()) {
            dayEl.classList.add('range-start');
        }
        if (this.selectedEnd && compareDate.getTime() === this.selectedEnd.getTime()) {
            dayEl.classList.add('range-end');
        }
        if (this.selectedStart && this.selectedEnd && compareDate > this.selectedStart && compareDate < this.selectedEnd) {
            dayEl.classList.add('in-range');
        }

        // 点击事件
        if (!dayEl.classList.contains('disabled')) {
            dayEl.addEventListener('click', (e) => {
                e.stopPropagation();
                this.selectDate(date);
            });

            if (this.isSelectingEnd && this.selectedStart && !this.selectedEnd) {
                dayEl.addEventListener('mouseenter', () => this.previewRange(date));
                dayEl.addEventListener('mouseleave', () => this.clearPreview());
            }
        }

        daysElement.appendChild(dayEl);
    }

    previewRange(hoverDate) {
        if (!this.selectedStart || this.selectedEnd) return;

        hoverDate.setHours(0, 0, 0, 0);
        const startDate = new Date(this.selectedStart);
        startDate.setHours(0, 0, 0, 0);

        const dayElements1 = this.elements.calendarDays.querySelectorAll('.calendar-day');
        const dayElements2 = this.elements.calendarDays2.querySelectorAll('.calendar-day');
        const allDayElements = [...dayElements1, ...dayElements2];

        allDayElements.forEach(dayEl => {
            if (dayEl.classList.contains('disabled') || dayEl.classList.contains('empty-cell')) return;
            const dayDate = new Date(dayEl.dataset.date);
            dayDate.setHours(0, 0, 0, 0);
            dayEl.classList.remove('preview-range', 'preview-end');

            if (hoverDate > startDate) {
                if (dayDate > startDate && dayDate < hoverDate) dayEl.classList.add('preview-range');
                else if (dayDate.getTime() === hoverDate.getTime()) dayEl.classList.add('preview-end');
            } else if (hoverDate < startDate) {
                if (dayDate > hoverDate && dayDate < startDate) dayEl.classList.add('preview-range');
                else if (dayDate.getTime() === hoverDate.getTime()) dayEl.classList.add('preview-end');
            }
        });
    }

    clearPreview() {
        const dayElements1 = this.elements.calendarDays.querySelectorAll('.calendar-day');
        const dayElements2 = this.elements.calendarDays2.querySelectorAll('.calendar-day');
        [...dayElements1, ...dayElements2].forEach(dayEl => {
            dayEl.classList.remove('preview-range', 'preview-end');
        });
    }

    selectDate(date) {
        date.setHours(0, 0, 0, 0);

        const checkinBox = document.getElementById('checkinBox');
        const checkoutBox = document.getElementById('checkoutBox');

        if (!this.selectedStart || (this.selectedStart && this.selectedEnd)) {
            this.selectedStart = date;
            this.selectedEnd = null;
            this.isSelectingEnd = true;
            this.clearPreview();
            if (checkinBox && checkoutBox) {
                checkinBox.classList.remove('active');
                checkoutBox.classList.add('active');
            }
        } else {
            if (date > this.selectedStart) {
                this.selectedEnd = date;
            } else {
                this.selectedEnd = this.selectedStart;
                this.selectedStart = date;
            }
            this.isSelectingEnd = false;
            this.clearPreview();
            if (checkinBox && checkoutBox) {
                checkinBox.classList.remove('active');
                checkoutBox.classList.remove('active');
            }
            if (!this.isMobile()) {
                setTimeout(() => this.closeCalendar(), 300);
            }
        }

        this.updateDisplay();
        this.renderCalendar();
    }

    updateDisplay() {
        if (this.selectedStart) {
            this.elements.checkinDisplay.textContent = this.formatDate(this.selectedStart);
            this.elements.checkinDisplay.classList.remove('placeholder');
            this.elements.checkinInput.value = this.formatDateISO(this.selectedStart);
        }

        if (this.selectedEnd) {
            this.elements.checkoutDisplay.textContent = this.formatDate(this.selectedEnd);
            this.elements.checkoutDisplay.classList.remove('placeholder');
            this.elements.checkoutInput.value = this.formatDateISO(this.selectedEnd);
            const nights = Math.ceil((this.selectedEnd - this.selectedStart) / (1000 * 60 * 60 * 24));
            this.elements.nightsCount.textContent = nights;
            this.elements.nightsBadge.style.display = 'block';
        } else {
            this.elements.checkoutDisplay.textContent = window.i18n ? window.i18n.t('select_date') : '日付を選択';
            this.elements.checkoutDisplay.classList.add('placeholder');
            this.elements.nightsBadge.style.display = 'none';
        }

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
                mobileCheckin.textContent = window.i18n ? window.i18n.t('select_date') : '日付を選択';
                mobileCheckin.classList.remove('has-date');
            }
        }

        if (mobileCheckout) {
            if (this.selectedEnd) {
                mobileCheckout.textContent = this.formatDateShort(this.selectedEnd);
                mobileCheckout.classList.add('has-date');
            } else {
                mobileCheckout.textContent = window.i18n ? window.i18n.t('select_date') : '日付を選択';
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
        const defaultNames = ['日', '月', '火', '水', '木', '金', '土'];
        const weekdayKeys = ['weekday_sun', 'weekday_mon', 'weekday_tue', 'weekday_wed', 'weekday_thu', 'weekday_fri', 'weekday_sat'];
        const weekday = window.i18n ? window.i18n.t(weekdayKeys[date.getDay()]) : defaultNames[date.getDay()];
        return `${month}/${day}(${weekday})`;
    }

    formatDate(date) {
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const defaultNames = ['日', '月', '火', '水', '木', '金', '土'];
        const weekdayKeys = ['weekday_sun', 'weekday_mon', 'weekday_tue', 'weekday_wed', 'weekday_thu', 'weekday_fri', 'weekday_sat'];
        const weekday = window.i18n ? window.i18n.t(weekdayKeys[date.getDay()]) : defaultNames[date.getDay()];
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
