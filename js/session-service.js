/**
 * Session 服务 - 管理用户身份验证和会话
 * 使用服务器端 session，客户端只存储 HttpOnly Cookie
 */

class SessionService {
    constructor() {
        // 使用 API_CONFIG 中的配置（通过反向代理）
        this.apiBaseUrl = window.API_CONFIG?.BOOKING_API || window.API_BASE_URL || '/api/booking';
        this.currentUser = null;
        this.isChecking = false;
    }

    /**
     * 获取当前登录用户信息
     * @returns {Promise<Object|null>} 用户信息或null
     */
    async getCurrentUser() {
        console.log('[SessionService] getCurrentUser 被调用');
        console.log('[SessionService] API Base URL:', this.apiBaseUrl);

        // 如果已经有缓存的用户信息，直接返回
        if (this.currentUser) {
            console.log('[SessionService] 返回缓存的用户信息');
            return this.currentUser;
        }

        // 防止重复检查
        if (this.isChecking) {
            console.log('[SessionService] 正在检查中，等待...');
            await new Promise(resolve => setTimeout(resolve, 100));
            return this.currentUser;
        }

        this.isChecking = true;

        try {
            const url = window.getApiUrl('/session/me');
            console.log('[SessionService] 请求 URL:', url);

            const response = await fetch(url, {
                method: 'GET',
                credentials: 'include', // 重要：发送cookie
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            console.log('[SessionService] 响应状态:', response.status);

            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    this.currentUser = result.data;
                    return this.currentUser;
                }
            }

            // 未登录或session过期
            this.currentUser = null;
            return null;

        } catch (error) {
            console.error('获取用户信息失败:', error);
            this.currentUser = null;
            return null;
        } finally {
            this.isChecking = false;
        }
    }

    /**
     * 检查用户是否已登录
     * @returns {Promise<boolean>}
     */
    async isLoggedIn() {
        try {
            const response = await fetch(window.getApiUrl('/session/status'), {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const result = await response.json();
                return result.success && result.loggedIn;
            }

            return false;
        } catch (error) {
            console.error('检查登录状态失败:', error);
            return false;
        }
    }

    /**
     * 登录
     * @param {string} email - 邮箱
     * @param {string} password - 密码
     * @param {boolean} remember - 是否记住登录
     * @returns {Promise<Object>} 登录结果
     */
    async login(email, password, remember = false) {
        try {
            const response = await fetch(window.getApiUrl('/auth/login'), {
                method: 'POST',
                credentials: 'include', // 重要：接收cookie
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password, remember })
            });

            const result = await response.json();

            if (result.success) {
                // 登录成功后，获取用户信息并缓存
                await this.getCurrentUser();
            }

            return result;

        } catch (error) {
            console.error('登录请求失败:', error);
            return {
                success: false,
                message: 'ネットワークエラー。もう一度お試しください。'
            };
        }
    }

    /**
     * 登出
     * @returns {Promise<Object>} 登出结果
     */
    async logout() {
        try {
            const response = await fetch(window.getApiUrl('/auth/logout'), {
                method: 'POST',
                credentials: 'include', // 重要：发送cookie
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();

            if (result.success) {
                // 清除缓存的用户信息
                this.currentUser = null;

                // 清除旧的localStorage数据（兼容性清理）
                this.clearLegacyStorage();
            }

            return result;

        } catch (error) {
            console.error('登出请求失败:', error);
            return {
                success: false,
                message: 'ネットワークエラー。もう一度お試しください。'
            };
        }
    }

    /**
     * 刷新用户信息（从服务器重新获取）
     * @returns {Promise<Object|null>}
     */
    async refreshUser() {
        this.currentUser = null;
        return await this.getCurrentUser();
    }

    /**
     * 清除旧的localStorage和Cookie数据（兼容性处理）
     * 用于从旧的localStorage存储方式迁移到session方式
     */
    clearLegacyStorage() {
        try {
            // 清除localStorage中的用户数据
            if (typeof localStorage !== 'undefined') {
                localStorage.removeItem('currentUser');
                localStorage.removeItem('reservationData');
                console.log('✓ 已清除旧的localStorage数据');
            }

            // 清除旧的Cookie（如果存在）
            const cookies = ['currentUser', 'userData', 'user'];
            cookies.forEach(cookieName => {
                document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
            });
            console.log('✓ 已清除旧的Cookie数据');

        } catch (error) {
            console.warn('清除旧存储数据时出错:', error);
        }
    }

    /**
     * 获取用户的特定信息
     * @param {string} field - 字段名
     * @returns {Promise<any>} 字段值
     */
    async getUserField(field) {
        const user = await this.getCurrentUser();
        return user ? user[field] : null;
    }
}

// 创建全局单例
window.sessionService = new SessionService();

// 导出供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SessionService;
}
