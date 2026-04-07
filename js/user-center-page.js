/**
 * 用户中心页面功能
 * User Center Page Functionality
 */

// API_BASE_URL 由 api-config.js 统一配置，这里不再重复设置
// 确保 api-config.js 在此文件之前加载
window.API_BASE_URL = window.API_BASE_URL || window.API_CONFIG?.BOOKING_API || '/api';

// 订单状态映射（与 order-detail.js 保持一致）
const ORDER_STATUS = {
    'pending': { text: '確認待ち', class: 'pending', icon: 'fa-clock' },
    'paid': { text: '支払い済み', class: 'paid', icon: 'fa-check-circle' },
    'confirmed': { text: '確認済み', class: 'confirmed', icon: 'fa-check-circle' },
    'cancelled': { text: 'キャンセル済み', class: 'cancelled', icon: 'fa-times-circle' },
    'completed': { text: '完了', class: 'completed', icon: 'fa-flag-checkered' }
};

class UserCenterPage {
    constructor() {
        this.currentSection = 'bookings';
        this.cachedUserData = null; // 缓存的用户数据
        this.init();
    }

    async init() {
        console.log('=== UserCenterPage initialized ===');

        // 立即强制清除所有可能的遮罩层
        this.forceRemoveAllOverlays();

        // 设置超时保护：10秒后强制隐藏加载屏幕
        const loadingTimeout = setTimeout(() => {
            console.warn('加载超时，强制隐藏加载屏幕');
            this.hideLoadingScreen();
        }, 10000);

        // 保存timeout引用，以便成功加载时可以清除
        this.loadingTimeout = loadingTimeout;

        // 使用 sessionService 检查登录状态
        console.log('检查 session 登录状态...');
        const userData = await window.sessionService.getCurrentUser();
        console.log('Session 用户数据:', userData);

        if (!userData) {
            // 未登录,重定向到登录页面
            console.warn('未登录,重定向到登录页面');
            clearTimeout(this.loadingTimeout); // 清除超时
            alert('ログインが必要です。ログインページに移動します。');
            window.location.href = 'login.html';
            return;
        }

        // 缓存用户数据供其他方法使用
        this.cachedUserData = userData;

        // 导航栏由 load-navbar.js 统一管理，不需要在这里处理

        this.loadUserData();
        this.bindEvents();
        this.loadBookings();
        this.loadWalletData();
        this.loadTransactions();

        // 处理 URL hash 跳转（从导航栏下拉菜单点击过来）
        this.handleHashNavigation();

        // 监听 hash 变化（hashchange 事件）
        window.addEventListener('hashchange', () => {
            this.handleHashNavigation();
        });

        // 监听浏览器后退/前进按钮（popstate 事件）
        window.addEventListener('popstate', () => {
            this.handleHashNavigation();
        });
    }

    // 处理 URL hash 导航
    handleHashNavigation() {
        const hash = window.location.hash.replace('#', '');
        const validSections = ['bookings', 'wallet', 'profile', 'password', 'settings'];
        if (hash && validSections.includes(hash)) {
            console.log('Hash 导航到:', hash);
            this.switchSection(hash);
        } else if (!hash) {
            // 没有 hash 时默认显示 bookings
            this.switchSection('bookings');
        }
    }

    async loadUserData() {
        // 使用 sessionService 获取用户信息
        const userData = await window.sessionService.getCurrentUser();
        if (!userData || !userData.user_id) {
            console.warn('未找到用户数据');
            this.hideLoadingScreen();
            return;
        }

        try {
            // 从数据库API获取完整的用户信息
            console.log('从数据库获取用户数据...');
            const response = await fetch(window.getApiUrl(`/auth/me?userId=${userData.user_id}`), {
                credentials: 'include'
            });
            const result = await response.json();

            if (result.success && result.data && result.data.user) {
                const dbUser = result.data.user;
                console.log('成功获取数据库用户数据:', dbUser);

                // 更新页面显示的用户名和邮箱
                document.getElementById('userName').textContent = dbUser.name || '未設定';
                document.getElementById('userEmail').textContent = dbUser.email || '';

                // 更新头像显示
                const avatarImage = document.getElementById('avatarImage');
                const avatarIcon = document.getElementById('avatarIcon');
                if (dbUser.profile_picture_url) {
                    avatarImage.src = dbUser.profile_picture_url;
                    avatarImage.style.display = 'block';
                    avatarIcon.style.display = 'none';
                    console.log('✅ 头像已加载:', dbUser.profile_picture_url);
                } else {
                    avatarImage.style.display = 'none';
                    avatarIcon.style.display = 'flex';
                    console.log('ℹ️ 无头像，显示默认图标');
                }

                // 填充个人信息表单 - 基本信息
                const lastNameInput = document.getElementById('lastName');
                const firstNameInput = document.getElementById('firstName');
                const lastNameKatakanaInput = document.getElementById('lastNameKatakana');
                const firstNameKatakanaInput = document.getElementById('firstNameKatakana');
                const phoneInput = document.getElementById('phone');
                const phoneCountryCodeSelect = document.getElementById('phoneCountryCode');
                const emailInput = document.getElementById('email');
                const countrySelect = document.getElementById('country');

                // 日本地址字段
                const postalCodeInput = document.getElementById('postalCode');
                const prefectureSelect = document.getElementById('prefecture');
                const addressInput = document.getElementById('address');

                // 国际地址字段
                const stateProvinceInput = document.getElementById('stateProvince');
                const cityDistrictInput = document.getElementById('cityDistrict');
                const streetAddressInput = document.getElementById('streetAddress');
                const internationalPostalCodeInput = document.getElementById('internationalPostalCode');

                if (lastNameInput) lastNameInput.value = dbUser.last_name || '';
                if (firstNameInput) firstNameInput.value = dbUser.first_name || '';
                if (lastNameKatakanaInput) lastNameKatakanaInput.value = dbUser.last_name_katakana || '';
                if (firstNameKatakanaInput) firstNameKatakanaInput.value = dbUser.first_name_katakana || '';
                if (phoneInput) phoneInput.value = dbUser.phone || '';
                if (phoneCountryCodeSelect) phoneCountryCodeSelect.value = dbUser.phone_country_code || '+81';

                // 更新邮箱显示
                const emailDisplay = document.getElementById('emailDisplay');
                if (emailDisplay) emailDisplay.textContent = dbUser.email || '';
                if (emailInput) emailInput.value = dbUser.email || '';

                if (countrySelect) countrySelect.value = dbUser.country || 'japan';

                // 填充日本地址
                if (postalCodeInput) postalCodeInput.value = dbUser.postal_code || '';
                if (prefectureSelect) prefectureSelect.value = dbUser.prefecture || '';
                if (addressInput) addressInput.value = dbUser.address_line || '';

                // 填充国际地址
                if (stateProvinceInput) stateProvinceInput.value = dbUser.state_province || '';
                if (cityDistrictInput) cityDistrictInput.value = dbUser.city_district || '';
                if (streetAddressInput) streetAddressInput.value = dbUser.street_address || '';
                if (internationalPostalCodeInput) internationalPostalCodeInput.value = dbUser.international_postal_code || '';

                // 外国人复选框 - 从数据库读取
                const isForeignerCheckbox = document.getElementById('isForeigner');
                if (isForeignerCheckbox) {
                    // 使用数据库中的 is_foreigner 字段
                    const isForeigner = dbUser.is_foreigner === 1 || dbUser.is_foreigner === true;
                    isForeignerCheckbox.checked = isForeigner;
                    this.handleForeignerToggle(isForeigner);
                }

                // 触发国家选择事件以正确显示地址字段
                this.handleCountryChange(dbUser.country || 'japan');

                // 更新钱包余额和积分（从数据库获取）
                const walletBalanceEl = document.getElementById('walletBalance');
                const pointsBalanceEl = document.getElementById('pointsBalance');
                if (walletBalanceEl) walletBalanceEl.textContent = (dbUser.wallet_balance || 0).toLocaleString();
                if (pointsBalanceEl) pointsBalanceEl.textContent = (dbUser.loyalty_points || 0).toLocaleString();

                // 更新卡片持有者姓名
                const cardHolderNameEl = document.getElementById('cardHolderName');
                if (cardHolderNameEl) {
                    const holderName = dbUser.last_name && dbUser.first_name
                        ? `${dbUser.last_name} ${dbUser.first_name} 様`
                        : (dbUser.name ? `${dbUser.name} 様` : '');
                    cardHolderNameEl.textContent = holderName;
                }

                // 更新会员等级显示
                const memberLevelEl = document.querySelector('.member-level');
                if (memberLevelEl) {
                    const levelText = {
                        'regular': 'レギュラー',
                        'silver': 'シルバー',
                        'gold': 'ゴールド',
                        'platinum': 'プラチナ'
                    };
                    memberLevelEl.textContent = levelText[dbUser.member_level] || 'レギュラー';
                }

                // 更新localStorage和Cookie中的用户数据（仅用于保持会话状态）
                const updatedUserData = {
                    user_id: dbUser.user_id,
                    name: dbUser.name,
                    email: dbUser.email,
                    phone: dbUser.phone,
                    phone_country_code: dbUser.phone_country_code,
                    last_name: dbUser.last_name,
                    first_name: dbUser.first_name,
                    last_name_katakana: dbUser.last_name_katakana,
                    first_name_katakana: dbUser.first_name_katakana,
                    country: dbUser.country,
                    postal_code: dbUser.postal_code,
                    prefecture: dbUser.prefecture,
                    city: dbUser.city,
                    address_line: dbUser.address_line,
                    wallet_balance: dbUser.wallet_balance,
                    loyalty_points: dbUser.loyalty_points,
                    member_level: dbUser.member_level,
                    email_verified: dbUser.email_verified,
                    is_foreigner: dbUser.is_foreigner
                };

                // 保存到localStorage
                try {
                    window.safeStorage.setItem('currentUser', JSON.stringify(updatedUserData));
                } catch (e) {
                    console.warn('localStorage保存失败:', e);
                }

                // 保存到Cookie
                const expires = new Date();
                expires.setTime(expires.getTime() + (30 * 24 * 60 * 60 * 1000));
                document.cookie = `currentUser=${encodeURIComponent(JSON.stringify(updatedUserData))}; expires=${expires.toUTCString()}; path=/`;

                // 数据加载完成,隐藏加载屏幕,显示内容
                this.hideLoadingScreen();

            } else {
                console.error('获取用户数据失败:', result.message);
                // 不使用缓存数据，直接显示错误
                this.hideLoadingScreen();
                this.showDatabaseError('データベースからユーザー情報を読み込めませんでした。\nページを再読み込みしてください。');
            }
        } catch (error) {
            console.error('加载用户数据错误:', error);
            // 不使用缓存数据，直接显示错误
            this.hideLoadingScreen();
            this.showDatabaseError('データベース接続エラー。\nページを再読み込みしてください。');
        }
    }

    // 强制移除所有遮罩层
    forceRemoveAllOverlays() {
        console.log('强制清除所有遮罩层...');

        // 移除 auth-modal 相关遮罩
        const authOverlay = document.querySelector('.auth-modal-overlay');
        const authModal = document.querySelector('.auth-modal');
        if (authOverlay) {
            authOverlay.classList.remove('active');
            authOverlay.style.display = 'none';
            console.log('✓ 移除 auth-modal-overlay');
        }
        if (authModal) {
            authModal.classList.remove('active');
            authModal.style.display = 'none';
            console.log('✓ 移除 auth-modal');
        }

        // 移除 user-center-overlay
        const userCenterOverlay = document.querySelector('.user-center-overlay');
        if (userCenterOverlay) {
            userCenterOverlay.classList.remove('active');
            userCenterOverlay.style.display = 'none';
            console.log('✓ 移除 user-center-overlay');
        }

        // 移除 body 上可能的类
        document.body.classList.remove('auth-modal-open');
        document.body.classList.remove('modal-open');

        console.log('所有遮罩层已清除');
    }

    // 隐藏加载屏幕,显示内容
    hideLoadingScreen() {
        console.log('hideLoadingScreen 被调用');

        // 清除超时保护
        if (this.loadingTimeout) {
            clearTimeout(this.loadingTimeout);
            console.log('已清除加载超时保护');
        }

        const loadingScreen = document.getElementById('loadingScreen');
        const userCenterContent = document.getElementById('userCenterContent');

        console.log('loadingScreen 元素:', loadingScreen);
        console.log('userCenterContent 元素:', userCenterContent);

        if (loadingScreen) {
            loadingScreen.style.display = 'none';
            console.log('✓ 加载屏幕已隐藏');
        } else {
            console.warn('找不到 loadingScreen 元素');
        }

        if (userCenterContent) {
            userCenterContent.style.display = 'block';
            console.log('✓ 用户中心内容已显示');
        } else {
            console.warn('找不到 userCenterContent 元素');
        }

        // 同时关闭可能打开的 auth-modal 遮罩
        const authOverlay = document.querySelector('.auth-modal-overlay');
        const authModal = document.querySelector('.auth-modal');
        if (authOverlay) {
            authOverlay.classList.remove('active');
            console.log('✓ 已关闭 auth-modal 遮罩层');
        }
        if (authModal) {
            authModal.classList.remove('active');
        }
        document.body.classList.remove('auth-modal-open');
    }

    // 显示数据库错误
    showDatabaseError(message) {
        const userCenterContent = document.getElementById('userCenterContent');
        if (userCenterContent) {
            userCenterContent.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: center; height: 60vh; text-align: center;">
                    <div>
                        <i class="fas fa-database" style="font-size: 64px; color: #dc3545; margin-bottom: 20px;"></i>
                        <h2 style="color: #333; margin-bottom: 15px;">データベースエラー</h2>
                        <p style="color: #666; white-space: pre-line; margin-bottom: 30px;">${message}</p>
                        <button onclick="window.location.reload()" style="padding: 12px 30px; background: #8a7a5e; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 16px;">
                            <i class="fas fa-redo"></i> ページを再読み込み
                        </button>
                    </div>
                </div>
            `;
        }
    }

    // 统一的数据获取方法
    getUserData() {
        console.log('getUserData 被调用');

        // 返回缓存的用户数据（在init时从session获取）
        if (this.cachedUserData) {
            console.log('返回缓存的用户数据:', this.cachedUserData);
            return this.cachedUserData;
        }

        console.warn('没有缓存的用户数据');
        return null;
    }

    getCookie(name) {
        const nameEQ = name + '=';
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            cookie = cookie.trim();
            if (cookie.indexOf(nameEQ) === 0) {
                return cookie.substring(nameEQ.length);
            }
        }
        return null;
    }

    // hideAuthButtons() 和 showUserInfo() 已删除
    // 导航栏现在由 load-navbar.js 统一管理

    bindEvents() {
        // 侧边栏导航 - 点击时更新 URL hash
        const navItems = document.querySelectorAll('.user-nav-item:not(.logout-item)');
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const section = item.dataset.section;
                // 更新 URL hash（不会触发页面刷新）
                window.history.pushState(null, '', `#${section}`);
                this.switchSection(section);
            });
        });

        // 退出登录
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleLogout();
            });
        }

        // 个人信息表单
        const profileForm = document.getElementById('profileForm');
        if (profileForm) {
            profileForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleProfileUpdate(e);
            });
        }

        const cancelProfileBtn = document.getElementById('cancelProfileBtn');
        if (cancelProfileBtn) {
            cancelProfileBtn.addEventListener('click', () => {
                profileForm.reset();
            });
        }

        // 密码表单
        const passwordForm = document.getElementById('passwordForm');
        if (passwordForm) {
            passwordForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handlePasswordChange(e);
            });
        }

        const cancelPasswordBtn = document.getElementById('cancelPasswordBtn');
        if (cancelPasswordBtn) {
            cancelPasswordBtn.addEventListener('click', () => {
                passwordForm.reset();
                this.updatePasswordStrength('');
            });
        }

        // 密码强度检测
        const newPasswordInput = document.getElementById('newPassword');
        if (newPasswordInput) {
            newPasswordInput.addEventListener('input', (e) => {
                this.updatePasswordStrength(e.target.value);
            });
        }

        // 设置保存
        const saveSettingsBtn = document.getElementById('saveSettingsBtn');
        if (saveSettingsBtn) {
            saveSettingsBtn.addEventListener('click', () => {
                this.handleSaveSettings();
            });
        }

        // 邮箱修改按钮
        const changeEmailBtn = document.getElementById('changeEmailBtn');
        if (changeEmailBtn) {
            changeEmailBtn.addEventListener('click', () => {
                this.showEmailChangeModal();
            });
        }

        // 郵便番号自動入力
        const postalCodeInput = document.getElementById('postalCode');
        if (postalCodeInput) {
            postalCodeInput.addEventListener('input', (e) => {
                this.handlePostalCodeInput(e.target.value);
            });
        }

        // 片假名输入框实时验证
        const lastNameKatakanaInput = document.getElementById('lastNameKatakana');
        if (lastNameKatakanaInput) {
            lastNameKatakanaInput.addEventListener('input', (e) => {
                this.validateKatakanaField('lastNameKatakana', 'lastNameKatakanaError', e.target.value, 'セイ');
            });
            lastNameKatakanaInput.addEventListener('blur', (e) => {
                this.validateKatakanaField('lastNameKatakana', 'lastNameKatakanaError', e.target.value, 'セイ');
            });
        }

        const firstNameKatakanaInput = document.getElementById('firstNameKatakana');
        if (firstNameKatakanaInput) {
            firstNameKatakanaInput.addEventListener('input', (e) => {
                this.validateKatakanaField('firstNameKatakana', 'firstNameKatakanaError', e.target.value, 'メイ');
            });
            firstNameKatakanaInput.addEventListener('blur', (e) => {
                this.validateKatakanaField('firstNameKatakana', 'firstNameKatakanaError', e.target.value, 'メイ');
            });
        }

        // 国選択の変更監視
        const countrySelect = document.getElementById('country');
        if (countrySelect) {
            countrySelect.addEventListener('change', (e) => {
                this.handleCountryChange(e.target.value);
            });
            // 初期状態の設定
            this.handleCountryChange(countrySelect.value);
        }

        // 外国人チェックボックスの監視
        const isForeignerCheckbox = document.getElementById('isForeigner');
        if (isForeignerCheckbox) {
            isForeignerCheckbox.addEventListener('change', (e) => {
                this.handleForeignerToggle(e.target.checked);
            });
        }
    }

    switchSection(section) {
        // 更新导航状态
        const navItems = document.querySelectorAll('.user-nav-item');
        navItems.forEach(item => {
            item.classList.remove('active');
            if (item.dataset.section === section) {
                item.classList.add('active');
            }
        });

        // 更新内容区域
        const sections = document.querySelectorAll('.content-section');
        sections.forEach(sec => {
            sec.classList.remove('active');
        });

        const targetSection = document.getElementById(`${section}-section`);
        if (targetSection) {
            targetSection.classList.add('active');
        }

        this.currentSection = section;

        // 滚动到顶部
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }


    async loadBookings() {
        console.log('Loading all bookings');
        const container = document.getElementById('bookingsContainer');
        if (!container) {
            console.error('Bookings container not found');
            return;
        }

        // 显示加载状态
        container.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> 読み込み中...</div>';

        try {
            const bookings = await this.getAllBookings();
            console.log('Found bookings:', bookings.length);

            if (bookings.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-calendar-times"></i>
                        <h3>予約はありません</h3>
                        <p>新しい予約を作成しましょう</p>
                    </div>
                `;
                return;
            }

            container.innerHTML = bookings.map(booking => `
                <div class="booking-card">
                    <div class="booking-card-image">
                        <img src="${booking.roomImage}" alt="${booking.roomName}" />
                    </div>
                    <div class="booking-card-content">
                    <div class="booking-card-header">
                        <div class="booking-info">
                            <h3>${booking.roomName}</h3>
                            <p class="booking-id">予約番号: ${booking.id}</p>
                            <p class="booking-created-time"><i class="fas fa-clock"></i> 作成日時: ${booking.createdAtFormatted}</p>
                        </div>
                        <span class="booking-status status-${this.getStatusClass(booking.status)}">
                            <i class="fas ${this.getStatusIcon(booking.status)}"></i>
                            ${this.getStatusText(booking.status)}
                        </span>
                    </div>
                    <div class="booking-actions">
                        <div class="booking-price">
                            <i class="fas fa-yen-sign"></i>
                            <span>${booking.final_amount.toLocaleString()}<span class="tax-included-text">税込</span></span>
                        </div>
                        <div class="booking-buttons">
                            <button class="btn-booking btn-view" onclick="userCenterPage.viewBookingDetail('${booking.id}')">
                                <i class="fas fa-eye"></i>
                                詳細を見る
                            </button>
                            ${booking.status === 'completed' ? `
                                <button class="btn-booking btn-rebook" onclick="userCenterPage.rebookRoom('${booking.id}')">
                                    <i class="fas fa-redo"></i>
                                    再予約
                                </button>
                            ` : ''}
                        </div>
                    </div>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('Failed to load bookings:', error);
            container.innerHTML = `
                <div class="error-state">
                    <i class="fas fa-exclamation-circle"></i>
                    <h3>予約の読み込みに失敗しました</h3>
                    <p>しばらくしてから再度お試しください。</p>
                </div>
            `;
        }
    }

    // 显示错误信息的辅助函数
    showError(inputId, errorId, message) {
        const input = document.getElementById(inputId);
        const errorElement = document.getElementById(errorId);

        if (input) {
            input.style.borderColor = '#dc3545';
        }
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }
    }

    // 清除错误信息的辅助函数
    clearError(inputId, errorId) {
        const input = document.getElementById(inputId);
        const errorElement = document.getElementById(errorId);

        if (input) {
            input.style.borderColor = '';
        }
        if (errorElement) {
            errorElement.textContent = '';
            errorElement.style.display = 'none';
        }
    }

    // 实时验证片假名字段
    validateKatakanaField(inputId, errorId, value, fieldName) {
        // 如果外国人复选框被勾选，不需要验证
        const isForeigner = document.getElementById('isForeigner');
        if (isForeigner && isForeigner.checked) {
            this.clearError(inputId, errorId);
            return true;
        }

        // 如果输入为空，清除错误（空值检查由 required 属性处理）
        if (!value || value.trim() === '') {
            this.clearError(inputId, errorId);
            return true;
        }

        // 验证是否为全角片假名
        const katakanaRegex = /^[\u30A0-\u30FF]+$/;
        if (!katakanaRegex.test(value)) {
            this.showError(inputId, errorId, `${fieldName}は全角カタカナで入力してください（例：ヤマダ、タロウ）`);
            return false;
        } else {
            this.clearError(inputId, errorId);
            return true;
        }
    }

    async handleProfileUpdate(e) {
        const formData = new FormData(e.target);

        const country = formData.get('country');
        const isForeigner = document.getElementById('isForeigner').checked;
        const lastNameKatakana = formData.get('lastNameKatakana');
        const firstNameKatakana = formData.get('firstNameKatakana');

        // 清除之前的错误
        this.clearError('lastNameKatakana', 'lastNameKatakanaError');
        this.clearError('firstNameKatakana', 'firstNameKatakanaError');

        // 片假名验证：如果不是外国人，必须填写片假名
        if (!isForeigner) {
            let hasError = false;

            if (!lastNameKatakana) {
                this.showError('lastNameKatakana', 'lastNameKatakanaError', 'セイ（カタカナ）を入力してください。');
                hasError = true;
            }
            if (!firstNameKatakana) {
                this.showError('firstNameKatakana', 'firstNameKatakanaError', 'メイ（カタカナ）を入力してください。');
                hasError = true;
            }

            if (hasError) {
                return;
            }

            // 验证是否为片假名（全角片假名）
            const katakanaRegex = /^[\u30A0-\u30FF]+$/;
            if (!katakanaRegex.test(lastNameKatakana)) {
                this.showError('lastNameKatakana', 'lastNameKatakanaError', '全角カタカナで入力してください（例：ヤマダ）');
                document.getElementById('lastNameKatakana').focus();
                return;
            }
            if (!katakanaRegex.test(firstNameKatakana)) {
                this.showError('firstNameKatakana', 'firstNameKatakanaError', '全角カタカナで入力してください（例：タロウ）');
                document.getElementById('firstNameKatakana').focus();
                return;
            }
        }

        const profileData = {
            userId: this.getUserData()?.user_id,
            email: formData.get('email'),
            last_name: formData.get('lastName'),
            first_name: formData.get('firstName'),
            last_name_katakana: isForeigner ? null : lastNameKatakana,
            first_name_katakana: isForeigner ? null : firstNameKatakana,
            phone: formData.get('phone'),
            phone_country_code: formData.get('phoneCountryCode') || '+81',
            country: country,
            is_foreigner: isForeigner ? 1 : 0
        };

        // 根据选择的国家添加相应的地址字段
        if (country === 'japan') {
            // 日本地址
            profileData.postal_code = formData.get('postalCode');
            profileData.prefecture = formData.get('prefecture');
            profileData.address_line = formData.get('address');
            profileData.city = ''; // 从address中提取
            // 清空国际地址字段
            profileData.state_province = null;
            profileData.city_district = null;
            profileData.street_address = null;
            profileData.international_postal_code = null;
        } else {
            // 国际地址
            profileData.state_province = formData.get('stateProvince');
            profileData.city_district = formData.get('cityDistrict');
            profileData.street_address = formData.get('streetAddress');
            profileData.international_postal_code = formData.get('internationalPostalCode');
            // 清空日本地址字段
            profileData.postal_code = null;
            profileData.prefecture = null;
            profileData.address_line = null;
            profileData.city = null;
        }

        console.log('プロフィール更新:', profileData);

        try {
            const response = await fetch(window.getApiUrl('/auth/profile'), {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(profileData)
            });

            const result = await response.json();

            if (result.success) {
                console.log('更新成功:', result);

                // 更新显示的用户名
                document.getElementById('userName').textContent = result.data.user.name;

                // 更新localStorage和Cookie
                const updatedUserData = {
                    user_id: result.data.user.user_id,
                    name: result.data.user.name,
                    email: result.data.user.email,
                    phone: result.data.user.phone,
                    phone_country_code: result.data.user.phone_country_code || '+81',
                    last_name: result.data.user.last_name,
                    first_name: result.data.user.first_name,
                    last_name_katakana: result.data.user.last_name_katakana,
                    first_name_katakana: result.data.user.first_name_katakana,
                    country: result.data.user.country,
                    postal_code: result.data.user.postal_code,
                    prefecture: result.data.user.prefecture,
                    city: result.data.user.city,
                    address_line: result.data.user.address_line,
                    email_verified: result.data.user.email_verified,
                    is_foreigner: result.data.user.is_foreigner
                };

                // 保存到localStorage
                try {
                    window.safeStorage.setItem('currentUser', JSON.stringify(updatedUserData));
                } catch (e) {
                    console.warn('localStorage not available:', e);
                }

                // 保存到Cookie
                const expires = new Date();
                expires.setTime(expires.getTime() + (30 * 24 * 60 * 60 * 1000));
                document.cookie = `currentUser=${encodeURIComponent(JSON.stringify(updatedUserData))}; expires=${expires.toUTCString()}; path=/`;

                // 显示成功提示
                this.showSuccessMessage('個人情報を更新しました！');
            } else {
                this.showErrorMessage(result.message || '更新に失敗しました');
            }
        } catch (error) {
            console.error('更新エラー:', error);
            this.showErrorMessage('更新に失敗しました。もう一度お試しください。');
        }
    }

    showSuccessMessage(message) {
        // 创建成功提示
        const toast = document.createElement('div');
        toast.className = 'toast-message success';
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #28a745;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    showErrorMessage(message) {
        // 创建错误提示
        const toast = document.createElement('div');
        toast.className = 'toast-message error';
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #dc3545;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    async handlePasswordChange(e) {
        const formData = new FormData(e.target);
        const currentPassword = formData.get('currentPassword');
        const newPassword = formData.get('newPassword');
        const confirmPassword = formData.get('confirmPassword');

        // 验证
        if (newPassword !== confirmPassword) {
            this.showErrorMessage('新しいパスワードが一致しません。');
            return;
        }

        if (newPassword.length < 8) {
            this.showErrorMessage('パスワードは8文字以上で入力してください。');
            return;
        }

        console.log('パスワード変更');

        try {
            const response = await fetch(window.getApiUrl('/auth/password'), {
                method: 'PUT',
                credentials: 'include', // 发送session cookie
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId: this.getUserData()?.user_id,
                    currentPassword: currentPassword,
                    newPassword: newPassword
                })
            });

            const result = await response.json();

            if (result.success) {
                this.showSuccessMessage('パスワードを変更しました！次回ログイン時から新しいパスワードをご使用ください。');
                e.target.reset();
                this.updatePasswordStrength('');
            } else {
                this.showErrorMessage(result.message || 'パスワードの変更に失敗しました');
            }
        } catch (error) {
            console.error('パスワード変更エラー:', error);
            this.showErrorMessage('パスワードの変更に失敗しました。もう一度お試しください。');
        }
    }

    updatePasswordStrength(password) {
        const strengthFill = document.getElementById('strengthFill');
        const strengthText = document.getElementById('strengthText');

        if (!strengthFill || !strengthText) return;

        if (!password) {
            strengthFill.className = 'strength-fill';
            strengthText.textContent = 'パスワードを入力してください';
            return;
        }

        let strength = 0;
        if (password.length >= 8) strength++;
        if (password.length >= 12) strength++;
        if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
        if (/\d/.test(password)) strength++;
        if (/[^a-zA-Z0-9]/.test(password)) strength++;

        if (strength <= 2) {
            strengthFill.className = 'strength-fill weak';
            strengthText.textContent = '弱い - より安全なパスワードをお勧めします';
        } else if (strength <= 3) {
            strengthFill.className = 'strength-fill medium';
            strengthText.textContent = '普通 - 良好なパスワードです';
        } else {
            strengthFill.className = 'strength-fill strong';
            strengthText.textContent = '強い - 非常に安全なパスワードです';
        }
    }

    handleSaveSettings() {
        console.log('設定を保存');
        alert('設定を保存しました！');
    }

    async handleLogout() {
        if (window.sessionService) {
            try {
                await window.sessionService.logout();
                console.log('[ユーザーセンター] ユーザーがログアウトしました');
            } catch (error) {
                console.error('[ユーザーセンター] ログアウトに失敗しました:', error);
            }
        }

        window.location.href = 'index.html';
    }

    viewBookingDetail(bookingId) {
        console.log('予約詳細を表示:', bookingId);
        // 跳转到订单详情页面，传递订单代码
        window.location.href = `order-detail.html?code=${bookingId}`;
    }

    rebookRoom(bookingId) {
        console.log('再予約:', bookingId);
        if (confirm('同じ部屋を再度予約しますか？')) {
            window.location.href = 'reservation.html';
        }
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

    getPaymentStatusText(paymentStatus) {
        const statusMap = {
            'unpaid': '未払い',
            'paid': '支払い済み',
            'refunded': '返金済み'
        };
        return statusMap[paymentStatus] || paymentStatus;
    }

    async payBooking(bookingId, amount) {
        console.log('支払処理:', bookingId, 'Amount:', amount);

        if (!confirm(`¥${amount.toLocaleString()}を支払いますか？`)) {
            return;
        }

        try {
            // TODO: 实际的支付处理逻辑
            // 这里暂时模拟支付成功,更新订单状态
            const response = await fetch(window.getApiUrl(`/user-orders/${bookingId}/pay`), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    amount: amount,
                    paymentMethod: 'wallet' // 使用钱包支付
                })
            });

            const result = await response.json();

            if (result.success) {
                this.showSuccessMessage('支払いが完了しました！');
                // 重新加载订单列表
                this.loadBookings();
                // 重新加载钱包数据
                this.loadUserData();
            } else {
                this.showErrorMessage(result.message || '支払いに失敗しました。');
            }
        } catch (error) {
            console.error('支払エラー:', error);
            this.showErrorMessage('支払いに失敗しました。もう一度お試しください。');
        }
    }

    async getAllBookings() {
        const userData = this.getUserData();
        if (!userData || !userData.user_id) {
            console.error('User not logged in');
            return [];
        }

        try {
            // 从数据库API获取用户的所有预约记录
            const response = await fetch(window.getApiUrl(`/user-orders/user/${userData.user_id}`));
            const result = await response.json();

            if (!result.success || !result.data) {
                console.error('Failed to fetch bookings:', result.message);
                return [];
            }

            const allBookings = result.data;
            console.log('从数据库获取到的所有预约记录:', allBookings);

            // 将数据库记录转换为页面显示格式
            const formattedBookings = allBookings.map(order => {
                // 格式化日期 (YYYY-MM-DD)
                const checkinDate = new Date(order.checkin_date);
                const checkoutDate = new Date(order.checkout_date);
                const createdAt = new Date(order.created_at);

                // 根据数据来源和字段确定订单状态
                let orderStatus = 'pending';  // 默认为pending
                let paymentStatus = 'unpaid'; // 默认为未支付

                // 检查paid_at字段确定支付状态
                if (order.paid_at) {
                    paymentStatus = 'paid';
                }

                // 如果有order_status字段，使用它；否则保持默认
                if (order.order_status) {
                    orderStatus = order.order_status;
                }

                // 如果有payment_status字段，使用它
                if (order.payment_status) {
                    paymentStatus = order.payment_status;
                }

                // 获取房型名称
                let roomName = order.room_type_code;
                if (order.room_type_name) {
                    roomName = order.room_type_name;
                } else {
                    // 根据房型代码返回对应的日文名称
                    const roomTypeNames = {
                        'twin': 'ツインルーム【セミダブルベッド】',
                        'japanese_western': '和洋室　6帖和室＋洋室ツイン',
                        'single': 'シングルルーム'
                    };
                    roomName = roomTypeNames[order.room_type_code] || order.room_type_code;
                }

                return {
                    id: order.order_code,
                    roomName: roomName,
                    roomTypeCode: order.room_type_code,
                    roomImage: this.getRoomImage(order.room_type_code),
                    checkin: this.formatDate(checkinDate),
                    checkout: this.formatDate(checkoutDate),
                    guests: order.num_adults + (order.num_children || 0),
                    rooms: order.num_rooms,
                    nights: order.num_nights,
                    price: parseFloat(order.final_amount || order.total_price || 0),
                    final_amount: parseFloat(order.final_amount || order.total_price || 0),
                    status: orderStatus,
                    paymentStatus: paymentStatus,
                    createdAt: createdAt.getTime(), // 转换为时间戳用于排序
                    createdAtFormatted: this.formatDateTime(createdAt) // 格式化的创建时间用于显示
                };
            });

            // 按创建时间降序排序（最新的订单在最前面）
            formattedBookings.sort((a, b) => b.createdAt - a.createdAt);

            return formattedBookings;
        } catch (error) {
            console.error('Error fetching bookings:', error);
            throw error;
        }
    }

    // 格式化日期为 YYYY-MM-DD
    formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // 格式化日期时间为 YYYY-MM-DD HH:mm
    formatDateTime(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}`;
    }
n    // 根据房间类型代码获取房间图片
    getRoomImage(roomTypeCode) {
        const roomImages = {
            'twin': 'img/rooms/double/room_2_500.jpg',
            'triple': 'img/rooms/triple/room_3_500.jpg',
            'twin_japanese': 'img/rooms/twin_japanese/room_wayou500.jpg',
            'japanese_western': 'img/rooms/twin_japanese/room_wayou500.jpg',
            'family': 'img/rooms/family/room_family_500.jpg',
            'single': 'img/rooms/double/room_2_500.jpg' // 默认使用twin图片
        };
        return roomImages[roomTypeCode] || 'img/rooms/double/room_2_500.jpg'; // 默认图片
    }

    // Wallet functions
    loadWalletData() {
        // 钱包积分已经在loadUserData()中从数据库加载
        // 这里不需要额外操作，数据会自动从数据库获取并显示
        console.log('钱包数据已从数据库加载');
    }

    async loadTransactions() {
        const container = document.getElementById('transactionHistory');
        if (!container) return;

        // 显示加载中
        container.innerHTML = '<div style="text-align: center; padding: 40px;"><i class="fas fa-spinner fa-spin"></i> 読み込み中...</div>';

        try {
            // 获取用户ID
            const userData = this.getUserData();
            if (!userData || !userData.user_id) {
                container.innerHTML = '<div style="text-align: center; padding: 40px; color: #999;">ログインが必要です</div>';
                return;
            }

            // 从API加载积分交易历史
            const response = await fetch(window.getApiUrl(`/loyalty/transactions?user_id=${userData.user_id}`), {
                credentials: 'include'
            });
            const result = await response.json();

            if (result.success && result.data.transactions.length > 0) {
                const transactions = result.data.transactions;

                container.innerHTML = `
                    <div class="transactions-list">
                        ${transactions.map(tx => {
                            const isPositive = tx.points > 0;
                            const type = isPositive ? 'points' : 'payment';
                            return `
                                <div class="transaction-item">
                                    <div class="transaction-icon ${type}">
                                        <i class="fas fa-${this.getTransactionIcon(type)}"></i>
                                    </div>
                                    <div class="transaction-details">
                                        <div class="transaction-description">${tx.description}</div>
                                        <div class="transaction-date">${this.formatDate(tx.created_at)}</div>
                                    </div>
                                    <div class="transaction-amount ${isPositive ? 'positive' : 'negative'}">
                                        ${isPositive ? '+' : ''}${tx.points} ポイント
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                `;
            } else {
                // 没有交易记录
                container.innerHTML = `
                    <div style="text-align: center; padding: 60px 20px;">
                        <i class="fas fa-history" style="font-size: 3rem; color: #ddd; margin-bottom: 15px;"></i>
                        <p style="color: #999;">ポイント取引履歴がありません</p>
                    </div>
                `;
            }

        } catch (error) {
            console.error('积分交易历史加载错误:', error);
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #dc3545;">
                    <i class="fas fa-exclamation-triangle"></i> データの読み込みに失敗しました
                </div>
            `;
        }
    }

    // 格式化日期时间
    formatDate(dateString) {
        const date = new Date(dateString);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}`;
    }

    getTransactionIcon(type) {
        const icons = {
            'charge': 'arrow-circle-up',
            'payment': 'shopping-cart',
            'points': 'star',
            'refund': 'undo'
        };
        return icons[type] || 'exchange-alt';
    }

    // 国選択変更処理
    handleCountryChange(country) {
        const japanAddressFields = document.getElementById('japanAddressFields');
        const internationalAddressFields = document.getElementById('internationalAddressFields');

        if (country === 'japan') {
            // 日本の場合は日本地址字段を表示、国际地址字段を非表示
            if (japanAddressFields) japanAddressFields.style.display = 'block';
            if (internationalAddressFields) internationalAddressFields.style.display = 'none';
        } else if (country === '') {
            // 未選択の場合は両方非表示
            if (japanAddressFields) japanAddressFields.style.display = 'none';
            if (internationalAddressFields) internationalAddressFields.style.display = 'none';
        } else {
            // 日本以外の場合は国际地址字段を表示、日本地址字段を非表示
            if (japanAddressFields) japanAddressFields.style.display = 'none';
            if (internationalAddressFields) internationalAddressFields.style.display = 'block';
        }
    }

    // 外国人チェックボックスの表示/非表示切り替え
    handleForeignerToggle(isChecked) {
        const lastNameKatakanaGroup = document.getElementById('lastNameKatakanaGroup');
        const firstNameKatakanaGroup = document.getElementById('firstNameKatakanaGroup');
        const lastNameKatakanaInput = document.getElementById('lastNameKatakana');
        const firstNameKatakanaInput = document.getElementById('firstNameKatakana');

        // 如果还没有保存过原始值,则保存当前值
        if (!this.savedKatakanaData) {
            this.savedKatakanaData = {
                lastName: lastNameKatakanaInput ? lastNameKatakanaInput.value : '',
                firstName: firstNameKatakanaInput ? firstNameKatakanaInput.value : ''
            };
        }

        if (isChecked) {
            // 外国人の場合はカタカナフィールドを非表示
            // 在清空前保存当前值
            if (lastNameKatakanaInput && lastNameKatakanaInput.value) {
                this.savedKatakanaData.lastName = lastNameKatakanaInput.value;
            }
            if (firstNameKatakanaInput && firstNameKatakanaInput.value) {
                this.savedKatakanaData.firstName = firstNameKatakanaInput.value;
            }

            if (lastNameKatakanaGroup) lastNameKatakanaGroup.style.display = 'none';
            if (firstNameKatakanaGroup) firstNameKatakanaGroup.style.display = 'none';
            // 清除片假名的错误提示
            this.clearError('lastNameKatakana', 'lastNameKatakanaError');
            this.clearError('firstNameKatakana', 'firstNameKatakanaError');
            // 清空片假名值
            if (lastNameKatakanaInput) lastNameKatakanaInput.value = '';
            if (firstNameKatakanaInput) firstNameKatakanaInput.value = '';
        } else {
            // 外国人でない場合はカタカナフィールドを表示
            if (lastNameKatakanaGroup) lastNameKatakanaGroup.style.display = 'block';
            if (firstNameKatakanaGroup) firstNameKatakanaGroup.style.display = 'block';

            // 恢复保存的片假名数据
            if (this.savedKatakanaData) {
                if (lastNameKatakanaInput && this.savedKatakanaData.lastName) {
                    lastNameKatakanaInput.value = this.savedKatakanaData.lastName;
                }
                if (firstNameKatakanaInput && this.savedKatakanaData.firstName) {
                    firstNameKatakanaInput.value = this.savedKatakanaData.firstName;
                }
            }

            // 重新验证片假名字段（如果有值的话）
            if (lastNameKatakanaInput && lastNameKatakanaInput.value) {
                this.validateKatakanaField('lastNameKatakana', 'lastNameKatakanaError', lastNameKatakanaInput.value, 'セイ');
            }
            if (firstNameKatakanaInput && firstNameKatakanaInput.value) {
                this.validateKatakanaField('firstNameKatakana', 'firstNameKatakanaError', firstNameKatakanaInput.value, 'メイ');
            }
        }
    }

    // 显示邮箱修改弹窗
    showEmailChangeModal() {
        // Get user data
        const userData = this.getUserData();
        if (!userData || !userData.user_id) {
            alert('ユーザー情報が見つかりません');
            return;
        }

        // 创建输入弹窗
        const modal = document.createElement('div');
        modal.id = 'emailChangeModal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `;

        modal.innerHTML = `
            <div style="background: white; padding: 30px; border-radius: 12px; max-width: 500px; width: 90%; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <h3 style="margin: 0 0 20px 0; color: #333; font-size: 20px; display: flex; align-items: center; gap: 10px;">
                    <i class="fas fa-envelope"></i>
                    メールアドレス変更
                </h3>
                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                    <p style="color: #666; margin: 0 0 5px 0; font-size: 14px;">
                        現在のメールアドレス
                    </p>
                    <p style="font-weight: 600; margin: 0; color: #333; font-size: 15px;">
                        ${userData.email}
                    </p>
                </div>
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; color: #333; font-weight: 500;">
                        新しいメールアドレス <span style="color: #dc3545;">*</span>
                    </label>
                    <input type="email" id="newEmailInput" placeholder="new-email@example.com"
                           style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; box-sizing: border-box;"
                           required>
                    <small id="newEmailError" style="display: none; color: #dc3545; font-size: 12px; margin-top: 5px;"></small>
                </div>
                <div style="background: #fff3cd; border: 1px solid #ffc107; padding: 12px; border-radius: 6px; margin-bottom: 20px;">
                    <p style="color: #856404; margin: 0; font-size: 13px; line-height: 1.5;">
                        <i class="fas fa-info-circle"></i>
                        新しいメールアドレスに確認リンクを送信します。<br>
                        リンクをクリックして変更を完了してください。
                    </p>
                </div>
                <div id="sendStatus" style="margin-bottom: 15px; font-size: 14px;"></div>
                <div style="display: flex; gap: 10px;">
                    <button id="sendLinkBtn" style="flex: 1; padding: 12px; background: #8a7a5e; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500; transition: background 0.3s;">
                        <i class="fas fa-paper-plane"></i>
                        確認リンクを送信
                    </button>
                    <button id="cancelEmailChangeBtn" style="flex: 1; padding: 12px; background: #6c757d; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500; transition: background 0.3s;">
                        <i class="fas fa-times"></i>
                        キャンセル
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // 获取元素
        const newEmailInput = document.getElementById('newEmailInput');
        const newEmailError = document.getElementById('newEmailError');
        const sendLinkBtn = document.getElementById('sendLinkBtn');
        const cancelBtn = document.getElementById('cancelEmailChangeBtn');
        const sendStatus = document.getElementById('sendStatus');

        // 邮箱验证
        const validateEmail = (email) => {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(email);
        };

        // 输入验证
        newEmailInput.addEventListener('input', () => {
            newEmailError.style.display = 'none';
            newEmailInput.style.borderColor = '#ddd';
        });

        // 发送验证链接
        sendLinkBtn.addEventListener('click', async () => {
            const newEmail = newEmailInput.value.trim();

            // 验证邮箱
            if (!newEmail) {
                newEmailError.textContent = '新しいメールアドレスを入力してください';
                newEmailError.style.display = 'block';
                newEmailInput.style.borderColor = '#dc3545';
                newEmailInput.focus();
                return;
            }

            if (!validateEmail(newEmail)) {
                newEmailError.textContent = '有効なメールアドレスを入力してください';
                newEmailError.style.display = 'block';
                newEmailInput.style.borderColor = '#dc3545';
                newEmailInput.focus();
                return;
            }

            if (newEmail === userData.email) {
                newEmailError.textContent = '新しいメールアドレスは現在のものと異なる必要があります';
                newEmailError.style.display = 'block';
                newEmailInput.style.borderColor = '#dc3545';
                newEmailInput.focus();
                return;
            }

            // 发送请求
            sendLinkBtn.disabled = true;
            sendLinkBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 送信中...';
            sendStatus.innerHTML = '';

            try {
                const response = await fetch(window.getApiUrl('/email-change/request'), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        userId: userData.user_id,
                        currentEmail: userData.email,
                        newEmail: newEmail
                    })
                });

                const result = await response.json();

                if (result.success) {
                    sendStatus.innerHTML = '<div style="background: #d4edda; border: 1px solid #c3e6cb; color: #155724; padding: 12px; border-radius: 6px;"><i class="fas fa-check-circle"></i> 確認リンクを送信しました！新しいメールアドレスを確認してください。</div>';
                    sendLinkBtn.disabled = true;
                    sendLinkBtn.innerHTML = '<i class="fas fa-check"></i> 送信済み';
                    newEmailInput.disabled = true;

                    // 5秒后自动关闭弹窗
                    setTimeout(() => {
                        modal.remove();
                    }, 5000);
                } else {
                    throw new Error(result.message || '確認リンクの送信に失敗しました');
                }
            } catch (error) {
                console.error('发送验证链接错误:', error);
                sendStatus.innerHTML = `<div style="background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; padding: 12px; border-radius: 6px;"><i class="fas fa-exclamation-circle"></i> ${error.message}</div>`;
                sendLinkBtn.disabled = false;
                sendLinkBtn.innerHTML = '<i class="fas fa-paper-plane"></i> 確認リンクを送信';
            }
        });

        // 取消按钮
        cancelBtn.addEventListener('click', () => {
            modal.remove();
        });

        // 点击背景关闭
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });

        // 按回车提交
        newEmailInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendLinkBtn.click();
            }
        });

        // 自动聚焦
        setTimeout(() => newEmailInput.focus(), 100);
    }

    // 郵便番号自動補完機能
    handlePostalCodeInput(value) {
        // ハイフンを自動挿入
        let postalCode = value.replace(/[^0-9]/g, ''); // 数字のみを抽出

        if (postalCode.length > 3) {
            postalCode = postalCode.substring(0, 3) + '-' + postalCode.substring(3, 7);
        }

        // 入力欄を更新
        const postalCodeInput = document.getElementById('postalCode');
        if (postalCodeInput && postalCodeInput.value !== postalCode) {
            postalCodeInput.value = postalCode;
        }

        // 7桁入力されたら住所を自動検索
        const digitsOnly = postalCode.replace(/[^0-9]/g, '');
        if (digitsOnly.length === 7) {
            this.lookupAddress(digitsOnly);
        }
    }

    async lookupAddress(postalCode) {
        try {
            console.log('郵便番号検索:', postalCode);

            const response = await fetch(window.getApiUrl(`/postal/${postalCode}`));
            const result = await response.json();

            if (result.success && result.data) {
                console.log('住所が見つかりました:', result.data);

                // 都道府県を設定
                const prefectureSelect = document.getElementById('prefecture');
                if (prefectureSelect) {
                    // まずoptionに値が存在するか確認
                    const options = Array.from(prefectureSelect.options);
                    const matchingOption = options.find(opt => opt.value === result.data.prefecture);

                    if (matchingOption) {
                        prefectureSelect.value = result.data.prefecture;
                    } else {
                        // 存在しない場合は新しいoptionを追加
                        const newOption = document.createElement('option');
                        newOption.value = result.data.prefecture;
                        newOption.textContent = result.data.prefecture;
                        newOption.selected = true;
                        prefectureSelect.appendChild(newOption);
                    }
                }

                // 市区町村＋町域を住所欄に設定
                const addressInput = document.getElementById('address');
                if (addressInput) {
                    addressInput.value = result.data.city + result.data.town;
                    // 住所欄にフォーカスを移動
                    addressInput.focus();
                }

                console.log('住所を自動入力しました');
            } else {
                console.warn('郵便番号が見つかりません:', postalCode);
            }
        } catch (error) {
            console.error('郵便番号検索エラー:', error);
        }
    }
}

// 全局实例
let userCenterPage;

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing UserCenterPage');
    userCenterPage = new UserCenterPage();
    window.userCenterPage = userCenterPage;
    console.log('UserCenterPage ready');
});
