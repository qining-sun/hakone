/**
 * Google One Tap 登录功能
 * 自动在页面右上角显示 Google 登录弹窗
 */

(function() {
    'use strict';

    // Google Client ID - 必须与后端 .env 文件中的一致
    const GOOGLE_CLIENT_ID = '905797216492-5q1nbg7v2ghapc8bptuh9ivu9g1cfhl5.apps.googleusercontent.com';

    // 配置选项
    const ONE_TAP_CONFIG = {
        // 是否自动显示 One Tap（用户未登录时）
        autoShow: true,
        // 关闭后多久再次显示（毫秒）- 设置为 0 表示每次页面加载都显示
        cooldownPeriod: 0,
        // 是否在移动端显示
        showOnMobile: true,
        // 要排除的页面（不显示 One Tap）- login.html 允许显示以便测试
        excludePages: ['user-center.html', 'booking-user.html']
    };

    console.log('[Google One Tap] 脚本已加载，Client ID:', GOOGLE_CLIENT_ID.substring(0, 20) + '...');

    // 检查是否应该显示 One Tap
    function shouldShowOneTap() {
        // 检查是否在排除页面
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        if (ONE_TAP_CONFIG.excludePages.includes(currentPage)) {
            console.log('[Google One Tap] 当前页面已排除:', currentPage);
            return false;
        }

        // 检查移动端设置
        if (!ONE_TAP_CONFIG.showOnMobile && window.innerWidth < 768) {
            console.log('[Google One Tap] 移动端已禁用');
            return false;
        }

        // 检查冷却期
        if (ONE_TAP_CONFIG.cooldownPeriod > 0) {
            const lastDismissed = localStorage.getItem('googleOneTapDismissed');
            if (lastDismissed) {
                const elapsed = Date.now() - parseInt(lastDismissed);
                if (elapsed < ONE_TAP_CONFIG.cooldownPeriod) {
                    console.log('[Google One Tap] 冷却期内，跳过显示');
                    return false;
                }
            }
        }

        return true;
    }

    // 检查用户是否已登录
    async function isUserLoggedIn() {
        try {
            // 等待 sessionService 加载
            let attempts = 0;
            while (!window.sessionService && attempts < 10) {
                await new Promise(r => setTimeout(r, 100));
                attempts++;
            }

            if (window.sessionService) {
                const user = await window.sessionService.getCurrentUser();
                return !!user;
            }
            return false;
        } catch (e) {
            console.error('[Google One Tap] 检查登录状态失败:', e);
            return false;
        }
    }

    // 处理登录成功
    async function handleCredentialResponse(response) {
        console.log('[Google One Tap] 收到凭证响应');

        try {
            // 发送 ID Token 到后端验证
            const apiUrl = window.getApiUrl ? window.getApiUrl('/auth/google/one-tap') : '/api/auth/google/one-tap';

            const result = await fetch(apiUrl, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    credential: response.credential
                })
            });

            const data = await result.json();

            if (data.success) {
                console.log('[Google One Tap] 登录成功:', data.data.user.email);

                // 显示成功提示
                showNotification('ログインしました', 'success');

                // 刷新页面以更新登录状态
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            } else {
                console.error('[Google One Tap] 登录失败:', data.message);
                showNotification(data.message || 'ログインに失敗しました', 'error');
            }
        } catch (error) {
            console.error('[Google One Tap] 请求错误:', error);
            showNotification('ログインに失敗しました', 'error');
        }
    }

    // 显示通知
    function showNotification(message, type) {
        // 创建通知元素
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            padding: 16px 24px;
            background: ${type === 'success' ? '#4caf50' : '#f44336'};
            color: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10001;
            font-family: 'Noto Sans JP', sans-serif;
            font-size: 14px;
            font-weight: 500;
            animation: slideIn 0.3s ease;
        `;
        notification.textContent = message;

        // 添加动画样式
        if (!document.getElementById('one-tap-notification-style')) {
            const style = document.createElement('style');
            style.id = 'one-tap-notification-style';
            style.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(notification);

        // 3秒后移除
        setTimeout(() => {
            notification.style.animation = 'slideIn 0.3s ease reverse';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // 初始化 Google One Tap
    async function initializeOneTap() {
        console.log('[Google One Tap] 开始初始化...');

        // 检查是否应该显示
        if (!shouldShowOneTap()) {
            return;
        }

        // 检查用户是否已登录
        const loggedIn = await isUserLoggedIn();
        if (loggedIn) {
            console.log('[Google One Tap] 用户已登录，跳过 One Tap');
            return;
        }

        // 加载 Google Identity Services 库
        if (!window.google || !window.google.accounts) {
            console.log('[Google One Tap] 加载 Google Identity Services...');

            const script = document.createElement('script');
            script.src = 'https://accounts.google.com/gsi/client';
            script.async = true;
            script.defer = true;
            script.onload = () => {
                console.log('[Google One Tap] Google Identity Services 已加载');
                setupOneTap();
            };
            script.onerror = () => {
                console.error('[Google One Tap] 加载 Google Identity Services 失败');
            };
            document.head.appendChild(script);
        } else {
            setupOneTap();
        }
    }

    // 设置 One Tap
    function setupOneTap() {
        try {
            console.log('[Google One Tap] 正在初始化...');
            console.log('[Google One Tap] 当前域名:', window.location.origin);

            google.accounts.id.initialize({
                client_id: GOOGLE_CLIENT_ID,
                callback: handleCredentialResponse,
                auto_select: false, // 不自动选择账号
                cancel_on_tap_outside: true, // 点击外部关闭
                context: 'signin', // 登录上下文
                ux_mode: 'popup', // 弹窗模式
                itp_support: true, // 支持 Intelligent Tracking Prevention
                use_fedcm_for_prompt: false // 显式禁用 FedCM（避免 CORS 错误）
            });

            console.log('[Google One Tap] 初始化完成，正在调用 prompt()...');

            // 显示 One Tap 弹窗
            google.accounts.id.prompt((notification) => {
                console.log('[Google One Tap] prompt 回调触发');
                if (notification.isNotDisplayed()) {
                    const reason = notification.getNotDisplayedReason();
                    console.warn('[Google One Tap] 未显示，原因:', reason);
                    // 常见原因说明
                    const reasons = {
                        'opt_out_or_no_session': '用户未登录 Google 或选择了退出',
                        'suppressed_by_user': '用户之前关闭过，被 Google 暂时抑制',
                        'unregistered_origin': '当前域名未在 Google Cloud Console 注册',
                        'unknown_reason': '未知原因',
                        'secure_http_required': '需要 HTTPS（localhost 除外）',
                        'browser_not_supported': '浏览器不支持'
                    };
                    console.warn('[Google One Tap] 原因说明:', reasons[reason] || reason);
                } else if (notification.isSkippedMoment()) {
                    console.log('[Google One Tap] 被跳过，原因:', notification.getSkippedReason());
                } else if (notification.isDismissedMoment()) {
                    console.log('[Google One Tap] 被关闭，原因:', notification.getDismissedReason());
                    if (ONE_TAP_CONFIG.cooldownPeriod > 0) {
                        localStorage.setItem('googleOneTapDismissed', Date.now().toString());
                    }
                } else {
                    console.log('[Google One Tap] 正在显示弹窗...');
                }
            });

        } catch (error) {
            console.error('[Google One Tap] 初始化错误:', error);
        }
    }

    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            // 延迟一点初始化，确保其他脚本先加载
            setTimeout(initializeOneTap, 500);
        });
    } else {
        setTimeout(initializeOneTap, 500);
    }

    // 暴露手动触发方法
    window.GoogleOneTap = {
        show: function() {
            if (window.google && window.google.accounts) {
                google.accounts.id.prompt();
            } else {
                initializeOneTap();
            }
        },
        cancel: function() {
            if (window.google && window.google.accounts) {
                google.accounts.id.cancel();
            }
        }
    };

})();
