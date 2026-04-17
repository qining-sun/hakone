/**
 * 常驻预约按钮和弹出表单功能
 * Floating Booking Button and Modal
 */

class FloatingBooking {
    constructor() {
        this.modal = null;
        this.overlay = null;
        this.floatingBtn = null;
        this.init();
    }

    init() {
        this.createFloatingButton();
        this.createModal();
        this.bindEvents();
        this.setDefaultDates();
    }

    createFloatingButton() {
        // 创建常驻预约按钮
        this.floatingBtn = document.createElement('div');
        this.floatingBtn.className = 'floating-booking-btn';
        this.floatingBtn.innerHTML = `
            <div class="floating-btn-content">
                <i class="fas fa-calendar-check"></i>
                <span class="btn-text">宿泊予約</span>
                <span class="btn-subtext">ご予約はこちら</span>
            </div>
        `;
        document.body.appendChild(this.floatingBtn);
    }

    createModal() {
        // 创建遮罩层
        this.overlay = document.createElement('div');
        this.overlay.className = 'booking-modal-overlay';

        // 创建模态框
        this.modal = document.createElement('div');
        this.modal.className = 'booking-modal';
        this.modal.innerHTML = `
            <div class="booking-modal-content">
                <div class="booking-modal-header">
                    <h3>宿泊予約</h3>
                    <button class="modal-close-btn" type="button">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="booking-modal-body">
                    <form class="booking-form" id="floatingBookingForm">
                        <div class="booking-form-row">
                            <div class="booking-field">
                                <label for="modal-checkin">チェックイン</label>
                                <input type="date" id="modal-checkin" name="checkin" required>
                            </div>
                            <div class="booking-field">
                                <label for="modal-checkout">チェックアウト</label>
                                <input type="date" id="modal-checkout" name="checkout" required>
                            </div>
                        </div>
                        <div class="booking-form-row">
                            <div class="booking-field">
                                <label for="modal-rooms">お部屋数</label>
                                <select id="modal-rooms" name="rooms">
                                    <option value="1" selected>1室</option>
                                    <option value="2">2室</option>
                                    <option value="3">3室</option>
                                </select>
                            </div>
                            <div class="booking-field">
                                <label for="modal-adults">大人</label>
                                <select id="modal-adults" name="adults">
                                    <option value="1">1名</option>
                                    <option value="2" selected>2名</option>
                                    <option value="3">3名</option>
                                    <option value="4">4名</option>
                                    <option value="5">5名</option>
                                </select>
                            </div>
                            <div class="booking-field">
                                <label for="modal-children">子供</label>
                                <select id="modal-children" name="children">
                                    <option value="0" selected>0名</option>
                                    <option value="1">1名</option>
                                    <option value="2">2名</option>
                                    <option value="3">3名</option>
                                </select>
                            </div>
                        </div>
                        <div class="booking-form-notes">
                            <div class="booking-note-item">
                                <i class="fas fa-info-circle"></i>
                                <span>チェックイン：15:00～｜チェックアウト：～11:00</span>
                            </div>
                            <div class="booking-note-item">
                                <i class="fas fa-phone"></i>
                                <span>お電話でのご予約：025-784-xxxx</span>
                            </div>
                        </div>
                        <div class="booking-form-actions">
                            <button type="button" class="btn-cancel">キャンセル</button>
                            <button type="submit" class="btn-search">空室検索</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.appendChild(this.overlay);
        document.body.appendChild(this.modal);
    }

    bindEvents() {
        // 点击浮动按钮打开模态框
        this.floatingBtn.addEventListener('click', () => {
            this.openModal();
        });

        // 点击关闭按钮
        const closeBtn = this.modal.querySelector('.modal-close-btn');
        closeBtn.addEventListener('click', () => {
            this.closeModal();
        });

        // 点击取消按钮
        const cancelBtn = this.modal.querySelector('.btn-cancel');
        cancelBtn.addEventListener('click', () => {
            this.closeModal();
        });

        // 点击遮罩层关闭
        this.overlay.addEventListener('click', () => {
            this.closeModal();
        });

        // 阻止模态框内容区域的点击事件冒泡
        const modalContent = this.modal.querySelector('.booking-modal-content');
        modalContent.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        // 表单提交
        const form = this.modal.querySelector('#floatingBookingForm');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleBookingSubmit(e);
        });

        // 滚动事件 - 自动隐藏/显示浮动按钮
        let lastScrollTop = 0;
        window.addEventListener('scroll', () => {
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            if (scrollTop > lastScrollTop && scrollTop > 100) {
                // 向下滚动，隐藏按钮
                this.floatingBtn.classList.add('hidden');
            } else {
                // 向上滚动，显示按钮
                this.floatingBtn.classList.remove('hidden');
            }
            lastScrollTop = scrollTop;
        });
    }

    setDefaultDates() {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const checkinInput = this.modal.querySelector('#modal-checkin');
        const checkoutInput = this.modal.querySelector('#modal-checkout');

        checkinInput.value = this.formatDate(today);
        checkoutInput.value = this.formatDate(tomorrow);

        // 设置最小日期为今天
        checkinInput.min = this.formatDate(today);
        checkoutInput.min = this.formatDate(tomorrow);

        // 监听入住日期变化，自动更新退房日期的最小值
        checkinInput.addEventListener('change', () => {
            const checkinDate = new Date(checkinInput.value);
            const minCheckout = new Date(checkinDate);
            minCheckout.setDate(minCheckout.getDate() + 1);
            checkoutInput.min = this.formatDate(minCheckout);

            // 如果当前退房日期早于最小日期，自动更新
            if (checkoutInput.value <= checkinInput.value) {
                checkoutInput.value = this.formatDate(minCheckout);
            }
        });
    }

    formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    openModal() {
        this.overlay.classList.add('active');
        this.modal.classList.add('active');
        document.body.classList.add('modal-open');

        // 聚焦到第一个输入框
        setTimeout(() => {
            const firstInput = this.modal.querySelector('#modal-checkin');
            if (firstInput) {
                firstInput.focus();
            }
        }, 300);
    }

    closeModal() {
        this.overlay.classList.remove('active');
        this.modal.classList.remove('active');
        document.body.classList.remove('modal-open');
    }

    handleBookingSubmit(e) {
        const formData = new FormData(e.target);
        const bookingData = {
            checkin: formData.get('checkin'),
            checkout: formData.get('checkout'),
            rooms: formData.get('rooms'),
            adults: formData.get('adults'),
            children: formData.get('children')
        };

        // 验证数据
        if (!this.validateBookingData(bookingData)) {
            return;
        }

        // Check if user is logged in
        let isLoggedIn = false;
        try {
            if (window.safeStorage) {
                const currentUser = window.safeStorage.getItem('currentUser');
                isLoggedIn = !!currentUser;
            }
        } catch (e) {
            console.log('Could not check login status:', e);
        }

        // Redirect to appropriate booking page based on login status
        const params = new URLSearchParams(bookingData);
        // 直接跳转到 booking 页面，登录检查在该页面进行
        // 使用不带 .html 后缀的 URL，避免服务器 URL 重写导致参数丢失
        console.log('Redirecting to booking page');
        window.location.href = `booking?${params.toString()}`;
    }

    validateBookingData(data) {
        const checkinDate = new Date(data.checkin);
        const checkoutDate = new Date(data.checkout);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // 验证入住日期不能早于今天
        if (checkinDate < today) {
            alert('チェックイン日は本日以降を選択してください。');
            return false;
        }

        // 验证退房日期必须晚于入住日期
        if (checkoutDate <= checkinDate) {
            alert('チェックアウト日はチェックイン日より後を選択してください。');
            return false;
        }

        return true;
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    new FloatingBooking();
});