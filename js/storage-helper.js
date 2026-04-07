/**
 * 安全的 localStorage 访问工具
 * Safe localStorage Access Helper
 */

// 检测 localStorage 是否可用
window.isLocalStorageAvailable = (function() {
    try {
        const test = '__localStorage_test__';
        localStorage.setItem(test, test);
        localStorage.removeItem(test);
        return true;
    } catch (e) {
        console.warn('localStorage 不可用，将使用内存存储作为备用方案');
        return false;
    }
})();

// 内存存储备用方案
window.memoryStorage = {};

// 安全的 localStorage 包装器
window.safeStorage = {
    getItem: function(key) {
        try {
            if (window.isLocalStorageAvailable) {
                return localStorage.getItem(key);
            } else {
                return window.memoryStorage[key] || null;
            }
        } catch (e) {
            console.error('获取存储项失败:', e);
            return window.memoryStorage[key] || null;
        }
    },

    setItem: function(key, value) {
        try {
            if (window.isLocalStorageAvailable) {
                localStorage.setItem(key, value);
            } else {
                window.memoryStorage[key] = value;
            }
        } catch (e) {
            console.error('设置存储项失败:', e);
            window.memoryStorage[key] = value;
        }
    },

    removeItem: function(key) {
        try {
            if (window.isLocalStorageAvailable) {
                localStorage.removeItem(key);
            } else {
                delete window.memoryStorage[key];
            }
        } catch (e) {
            console.error('删除存储项失败:', e);
            delete window.memoryStorage[key];
        }
    },

    clear: function() {
        try {
            if (window.isLocalStorageAvailable) {
                localStorage.clear();
            } else {
                window.memoryStorage = {};
            }
        } catch (e) {
            console.error('清除存储失败:', e);
            window.memoryStorage = {};
        }
    }
};

console.log('Storage Helper 已加载，localStorage 可用:', window.isLocalStorageAvailable);
