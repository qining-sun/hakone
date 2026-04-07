/**
 * 初始化脚本 - 在所有其他脚本之前加载
 * Initialization Script - Load before all other scripts
 */

// 1. 设置全局 API 基础 URL（优先使用 api-config.js 中的配置）
// 生产环境使用相对路径 /api，开发环境使用完整URL
window.API_BASE_URL = window.API_BASE_URL || window.API_CONFIG?.BOOKING_API || '/api';

// 1.1 获取完整API URL的帮助函数（兼容本地和生产环境）
window.getApiUrl = function(endpoint) {
    // 确保endpoint以/开头
    if (!endpoint.startsWith('/')) {
        endpoint = '/' + endpoint;
    }
    // 如果API_BASE_URL已包含/api，直接拼接endpoint
    // 如果不包含，添加/api前缀
    if (window.API_BASE_URL.includes('/api')) {
        return window.API_BASE_URL + endpoint;
    } else {
        return window.API_BASE_URL + '/api' + endpoint;
    }
};

// 2. 检测 localStorage 是否可用
window.isLocalStorageAvailable = (function() {
    try {
        const test = '__localStorage_test__';
        localStorage.setItem(test, test);
        localStorage.removeItem(test);
        return true;
    } catch (e) {
        console.warn('localStorage 不可用');
        return false;
    }
})();

// 3. 检测 sessionStorage 是否可用（作为第二选择）
window.isSessionStorageAvailable = (function() {
    try {
        const test = '__sessionStorage_test__';
        sessionStorage.setItem(test, test);
        sessionStorage.removeItem(test);
        return true;
    } catch (e) {
        console.warn('sessionStorage 也不可用');
        return false;
    }
})();

// 4. 内存存储备用方案
window.memoryStorage = {};

// 5. 安全的存储包装器（优先级：localStorage > sessionStorage > memoryStorage）
window.safeStorage = {
    getItem: function(key) {
        try {
            if (window.isLocalStorageAvailable) {
                return localStorage.getItem(key);
            } else if (window.isSessionStorageAvailable) {
                return sessionStorage.getItem(key);
            } else {
                return window.memoryStorage[key] || null;
            }
        } catch (e) {
            console.error('获取存储项失败:', e);
            // 尝试从其他存储方式读取
            try {
                if (window.isSessionStorageAvailable) {
                    return sessionStorage.getItem(key);
                }
            } catch (e2) {
                console.error('从 sessionStorage 读取也失败:', e2);
            }
            return window.memoryStorage[key] || null;
        }
    },

    setItem: function(key, value) {
        let saved = false;

        // 尝试保存到 localStorage
        if (window.isLocalStorageAvailable) {
            try {
                localStorage.setItem(key, value);
                saved = true;
            } catch (e) {
                console.warn('保存到 localStorage 失败:', e);
            }
        }

        // 尝试保存到 sessionStorage
        if (window.isSessionStorageAvailable) {
            try {
                sessionStorage.setItem(key, value);
                saved = true;
            } catch (e) {
                console.warn('保存到 sessionStorage 失败:', e);
            }
        }

        // 总是保存到内存存储作为最后备份
        window.memoryStorage[key] = value;

        if (!saved) {
            console.warn('数据仅保存到内存存储，页面刷新后会丢失');
        }
    },

    removeItem: function(key) {
        try {
            if (window.isLocalStorageAvailable) {
                localStorage.removeItem(key);
            }
        } catch (e) {
            console.error('从 localStorage 删除失败:', e);
        }

        try {
            if (window.isSessionStorageAvailable) {
                sessionStorage.removeItem(key);
            }
        } catch (e) {
            console.error('从 sessionStorage 删除失败:', e);
        }

        delete window.memoryStorage[key];
    },

    clear: function() {
        try {
            if (window.isLocalStorageAvailable) {
                localStorage.clear();
            }
        } catch (e) {
            console.error('清除 localStorage 失败:', e);
        }

        try {
            if (window.isSessionStorageAvailable) {
                sessionStorage.clear();
            }
        } catch (e) {
            console.error('清除 sessionStorage 失败:', e);
        }

        window.memoryStorage = {};
    }
};

console.log('初始化完成 | localStorage:', window.isLocalStorageAvailable, '| sessionStorage:', window.isSessionStorageAvailable, '| API URL:', window.API_BASE_URL);

// 6. 加载 Google One Tap 脚本
(function() {
    // 动态加载 Google One Tap 脚本
    const script = document.createElement('script');
    script.src = 'js/google-one-tap.js';
    script.async = true;
    script.defer = true;
    // 如果当前路径不是在根目录，调整路径
    if (window.location.pathname.includes('/')) {
        const pathParts = window.location.pathname.split('/');
        const depth = pathParts.filter(p => p && !p.includes('.html')).length;
        if (depth > 0) {
            script.src = '../'.repeat(depth) + 'js/google-one-tap.js';
        }
    }
    document.head.appendChild(script);
    console.log('Google One Tap 脚本加载中...');
})();

// 7. CSS 版本管理已移至 css-versions.js
// 请使用 css-versions.js 统一管理全局 CSS 版本号
