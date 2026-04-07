/**
 * 用户中心弹出框功能
 * User Center Modal
 */

// 订单状态映射（与 order-detail.js 保持一致）
const ORDER_STATUS = {
    'pending': { text: '確認待ち', class: 'pending', icon: 'fa-clock' },
    'paid': { text: '支払い済み', class: 'paid', icon: 'fa-check-circle' },
    'confirmed': { text: '確認済み', class: 'confirmed', icon: 'fa-check-circle' },
    'cancelled': { text: 'キャンセル済み', class: 'cancelled', icon: 'fa-times-circle' },
    'completed': { text: '完了', class: 'completed', icon: 'fa-flag-checkered' }
};

class UserCenter {
    constructor() {
        this.modal = null;
        this.overlay = null;
        this.currentTab = 'bookings'; // 'bookings', 'profile', 'favorites'
        this.currentUser = null;
        this.init();
    }

    init() {
        this.createModal();
        this.bindEvents();
    }

    createModal() {
        // 创建遮罩层
        this.overlay = document.createElement('div');
        this.overlay.className = 'user-center-overlay';

        // 创建模态框
        this.modal = document.createElement('div');
        this.modal.className = 'user-center-modal';
        this.modal.innerHTML = `
            <div class="user-center-content">
                <!-- 头部 -->
                <div class="user-center-header">
                    <button class="user-center-close-btn" type="button">
                        <i class="fas fa-times"></i>
                    </button>
                    <div class="user-info-card">
                        <div class="user-avatar">
                            <i class="fas fa-user"></i>
                        </div>
                        <div class="user-details">
                            <h3 id="userDisplayName">ゲスト</h3>
                            <p class="user-email" id="userDisplayEmail">guest@example.com</p>
                        </div>
                    </div>
                </div>

                <!-- 主体内容 -->
                <div class="user-center-body">
                    <!-- 标签导航 -->
                    <div class="user-center-tabs">
                        <button class="user-center-tab active" data-tab="bookings">
                            <i class="fas fa-calendar-check"></i> 予約管理
                        </button>
                        <button class="user-center-tab" data-tab="profile">
                            <i class="fas fa-user-edit"></i> 個人情報
                        </button>
                    </div>

                    <!-- 我的预约 -->
                    <div class="user-center-tab-content active" id="bookings-content">
                        <div class="booking-list" id="bookingList">
                            <!-- 动态加载预约列表 -->
                        </div>
                    </div>

                    <!-- 个人信息 -->
                    <div class="user-center-tab-content" id="profile-content">
                        <form class="profile-form" id="profileForm">
                            <div class="form-section">
                                <h4 class="form-section-title">基本情報</h4>
                                <div class="profile-form-group">
                                    <label for="profile-name">お名前</label>
                                    <input type="text" id="profile-name" name="name" required>
                                </div>
                                <div class="profile-form-group">
                                    <label for="profile-email">メールアドレス</label>
                                    <input type="email" id="profile-email" name="email" disabled>
                                </div>
                                <div class="profile-form-group">
                                    <label for="profile-phone">電話番号</label>
                                    <input type="tel" id="profile-phone" name="phone">
                                </div>
                            </div>

                            <div class="form-section">
                                <h4 class="form-section-title">パスワード変更</h4>
                                <div class="profile-form-group">
                                    <label for="profile-current-password">現在のパスワード</label>
                                    <input type="password" id="profile-current-password" name="currentPassword">
                                </div>
                                <div class="profile-form-group">
                                    <label for="profile-new-password">新しいパスワード</label>
                                    <input type="password" id="profile-new-password" name="newPassword" minlength="8">
                                </div>
                                <div class="profile-form-group">
                                    <label for="profile-confirm-password">パスワード確認</label>
                                    <input type="password" id="profile-confirm-password" name="confirmPassword">
                                </div>
                            </div>

                            <div class="form-actions">
                                <button type="submit" class="profile-submit-btn">保存する</button>
                            </div>
                        </form>
                    </div>
                </div>

                <!-- 退出登录 -->
                <div class="logout-section">
                    <button class="logout-btn" id="logoutBtn">
                        <i class="fas fa-sign-out-alt"></i> ログアウト
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(this.overlay);
        document.body.appendChild(this.modal);
    }

    bindEvents() {
        // 点击关闭按钮
        const closeBtn = this.modal.querySelector('.user-center-close-btn');
        closeBtn.addEventListener('click', () => {
            this.closeModal();
        });

        // 点击遮罩层关闭
        this.overlay.addEventListener('click', () => {
            this.closeModal();
        });

        // 阻止模态框内容区域的点击事件冒泡
        const modalContent = this.modal.querySelector('.user-center-content');
        modalContent.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        // 标签切换
        const tabs = this.modal.querySelectorAll('.user-center-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.dataset.tab;
                this.switchTab(tabName);
            });
        });

        // 个人信息表单提交
        const profileForm = this.modal.querySelector('#profileForm');
        profileForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleProfileUpdate(e);
        });

        // 退出登录
        const logoutBtn = this.modal.querySelector('#logoutBtn');
        logoutBtn.addEventListener('click', () => {
            this.handleLogout();
        });

        // ESC键关闭
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal.classList.contains('active')) {
                this.closeModal();
            }
        });
    }

    switchTab(tabName) {
        // 更新标签状态
        const tabs = this.modal.querySelectorAll('.user-center-tab');
        tabs.forEach(tab => {
            if (tab.dataset.tab === tabName) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });

        // 更新内容区域
        const contents = this.modal.querySelectorAll('.user-center-tab-content');
        contents.forEach(content => {
            content.classList.remove('active');
        });

        const targetContent = this.modal.querySelector(`#${tabName}-content`);
        if (targetContent) {
            targetContent.classList.add('active');
        }

        this.currentTab = tabName;

        // 加载对应内容
        if (tabName === 'bookings') {
            this.loadBookings();
        }
    }

    openModal(userData) {
        this.currentUser = userData;
        this.updateUserInfo(userData);
        this.loadBookings();
        this.overlay.classList.add('active');
        this.modal.classList.add('active');
        document.body.classList.add('auth-modal-open');
    }

    closeModal() {
        this.overlay.classList.remove('active');
        this.modal.classList.remove('active');
        document.body.classList.remove('auth-modal-open');
    }

    updateUserInfo(userData) {
        // 更新头部显示
        const displayName = this.modal.querySelector('#userDisplayName');
        const displayEmail = this.modal.querySelector('#userDisplayEmail');

        displayName.textContent = userData.name || 'ゲスト';
        displayEmail.textContent = userData.email || '';

        // 更新个人信息表单
        const nameInput = this.modal.querySelector('#profile-name');
        const emailInput = this.modal.querySelector('#profile-email');
        const phoneInput = this.modal.querySelector('#profile-phone');

        nameInput.value = userData.name || '';
        emailInput.value = userData.email || '';
        phoneInput.value = userData.phone || '';
    }

    async loadBookings() {
        const bookingList = this.modal.querySelector('#bookingList');

        // 显示加载状态
        bookingList.innerHTML = `
            <div class="loading-state" style="text-align: center; padding: 40px;">
                <i class="fas fa-spinner fa-spin" style="font-size: 32px; color: #8a7a5e;"></i>
                <p style="margin-top: 16px; color: #666;">予約情報を読み込んでいます...</p>
            </div>
        `;

        try {
            // 从API获取真实数据
            const userEmail = this.currentUser?.email;
            if (!userEmail) {
                throw new Error('User email not found');
            }

            const response = await fetch(window.getApiUrl(`/orders?email=${encodeURIComponent(userEmail)}`));
            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || '订单加载失败');
            }

            const bookings = data.data || [];

            if (bookings.length === 0) {
                bookingList.innerHTML = `
                    <div class="empty-state" style="text-align: center; padding: 40px;">
                        <i class="fas fa-calendar-times" style="font-size: 48px; color: #ccc;"></i>
                        <h4 style="margin: 16px 0 8px; color: #666;">予約はありません</h4>
                        <p style="color: #999;">まだ予約がありません。お部屋を予約してみましょう。</p>
                    </div>
                `;
                return;
            }

            bookingList.innerHTML = bookings.map(booking => `
                <div class="booking-item" style="margin-bottom: 16px; border: 1px solid #e0e0e0; border-radius: 8px; padding: 16px;">
                    <div class="booking-header" style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
                        <div>
                            <h4 class="booking-title" style="margin: 0 0 4px 0; font-size: 16px;">${booking.room_type_name || '客室'}</h4>
                            <p style="margin: 0; font-size: 13px; color: #999;">予約番号: ${booking.order_code}</p>
                        </div>
                        <span class="booking-status status-${this.getStatusClass(booking.order_status)}">
                            <i class="fas ${this.getStatusIcon(booking.order_status)}"></i>
                            ${this.getStatusText(booking.order_status)}
                        </span>
                    </div>
                    <div class="booking-details" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-bottom: 12px;">
                        <div class="booking-detail-item" style="font-size: 14px; color: #666;">
                            <i class="fas fa-calendar" style="margin-right: 4px;"></i>
                            <span>${booking.checkin_date} - ${booking.checkout_date}</span>
                        </div>
                        <div class="booking-detail-item" style="font-size: 14px; color: #666;">
                            <i class="fas fa-users" style="margin-right: 4px;"></i>
                            <span>${booking.num_adults}名</span>
                        </div>
                        <div class="booking-detail-item" style="font-size: 14px; color: #666;">
                            <i class="fas fa-door-open" style="margin-right: 4px;"></i>
                            <span>${booking.num_rooms}室</span>
                        </div>
                        <div class="booking-detail-item" style="font-size: 14px; color: #666;">
                            <i class="fas fa-yen-sign" style="margin-right: 4px;"></i>
                            <span>¥${parseFloat(booking.total_price).toLocaleString()}</span>
                        </div>
                    </div>
                    <div class="booking-actions" style="display: flex; gap: 8px;">
                        <button class="booking-action-btn btn-detail" onclick="window.location.href='order-detail.html?code=${booking.order_code}'" style="flex: 1; padding: 8px 16px; border: 1px solid #8a7a5e; background: white; color: #8a7a5e; border-radius: 4px; cursor: pointer;">
                            詳細を見る
                        </button>
                        ${booking.order_status === 'confirmed' ? `
                            <button class="booking-action-btn btn-cancel" onclick="userCenter.cancelBooking('${booking.order_code}')" style="padding: 8px 16px; border: 1px solid #d32f2f; background: white; color: #d32f2f; border-radius: 4px; cursor: pointer;">
                                キャンセル
                            </button>
                        ` : ''}
                        ${booking.order_status === 'completed' ? `
                            <button class="booking-action-btn btn-rebook" onclick="userCenter.rebookRoom('${booking.order_code}')" style="padding: 8px 16px; border: 1px solid #8a7a5e; background: #8a7a5e; color: white; border-radius: 4px; cursor: pointer;">
                                再予約
                            </button>
                        ` : ''}
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('订单加载错误:', error);
            bookingList.innerHTML = `
                <div class="error-state" style="text-align: center; padding: 40px;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: #f44336;"></i>
                    <h4 style="margin: 16px 0 8px; color: #666;">読み込みエラー</h4>
                    <p style="color: #999; margin-bottom: 16px;">予約情報の読み込みに失敗しました。</p>
                    <button class="retry-btn" onclick="userCenter.loadBookings()" style="padding: 8px 24px; background: #8a7a5e; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        <i class="fas fa-redo"></i> 再試行
                    </button>
                </div>
            `;
        }
    }

    handleProfileUpdate(e) {
        const formData = new FormData(e.target);
        const newPassword = formData.get('newPassword');
        const confirmPassword = formData.get('confirmPassword');

        // 如果要修改密码，验证密码
        if (newPassword || confirmPassword) {
            if (newPassword !== confirmPassword) {
                alert('新しいパスワードが一致しません。');
                return;
            }
            if (!formData.get('currentPassword')) {
                alert('現在のパスワードを入力してください。');
                return;
            }
        }

        const profileData = {
            name: formData.get('name'),
            phone: formData.get('phone'),
            currentPassword: formData.get('currentPassword'),
            newPassword: newPassword
        };

        console.log('プロフィール更新:', profileData);

        // 这里应该调用API更新数据
        // 模拟成功
        alert('プロフィールを更新しました！');

        // 清空密码字段
        e.target.querySelector('#profile-current-password').value = '';
        e.target.querySelector('#profile-new-password').value = '';
        e.target.querySelector('#profile-confirm-password').value = '';

        // 更新用户信息
        this.currentUser.name = profileData.name;
        this.updateUserInfo(this.currentUser);
    }

    handleLogout() {
        if (confirm('ログアウトしますか？')) {
            console.log('ログアウト');
            this.closeModal();

            // 清除用户数据
            this.currentUser = null;

            // 重新显示登录按钮
            if (window.authModal) {
                window.authModal.updateUIAfterLogout();
            }

            alert('ログアウトしました。');
        }
    }

    viewBookingDetail(bookingId) {
        console.log('予約詳細を表示:', bookingId);
        window.location.href = `order-detail.html?code=${bookingId}`;
    }

    cancelBooking(bookingId) {
        if (confirm('この予約をキャンセルしますか？')) {
            console.log('予約をキャンセル:', bookingId);
            alert('予約をキャンセルしました。');
            this.loadBookings();
        }
    }

    rebookRoom(bookingId) {
        console.log('再予約:', bookingId);
        alert('再予約画面に移動します（実装予定）');
        this.closeModal();
    }

    getStatusText(status) {
        const statusInfo = ORDER_STATUS[status] || ORDER_STATUS['pending'];
        return statusInfo.text;
    }

    getStatusIcon(status) {
        const statusInfo = ORDER_STATUS[status] || ORDER_STATUS['pending'];
        return statusInfo.icon;
    }

    getStatusClass(status) {
        const statusInfo = ORDER_STATUS[status] || ORDER_STATUS['pending'];
        return statusInfo.class;
    }

    // 保留模拟数据方法（备用）
    getMockBookings() {
        return [];
    }
}

// 全局实例
let userCenter;

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    userCenter = new UserCenter();
    window.userCenter = userCenter; // 使其全局可访问
});
