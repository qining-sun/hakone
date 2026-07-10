/**
 * 项目配置文件
 * 从后端 API 获取配置信息
 */

// 初始 API URL（用于获取配置）
// 根据当前页面 URL 自动判断环境
const CONFIG_API_URL = (function() {
    const hostname = window.location.hostname;
    if (hostname === 'yuzawamd.com' || hostname === 'www.yuzawamd.com') {
        return 'https://yuzawamd.com/api';
    }
    // 开发环境
    return 'http://' + hostname + ':5000/api';
})();

// 全局配置对象（从 API 加载后填充）
let APP_CONFIG = null;

// 配置加载状态
let configLoaded = false;
let configLoadPromise = null;

/**
 * 从后端 API 加载配置
 */
async function loadConfig() {
    if (configLoaded && APP_CONFIG) {
        return APP_CONFIG;
    }

    if (configLoadPromise) {
        return configLoadPromise;
    }

    configLoadPromise = (async () => {
        try {
            const response = await fetch(CONFIG_API_URL + '/config');
            const result = await response.json();

            if (result.success && result.data) {
                APP_CONFIG = result.data;
                configLoaded = true;
                console.log('✓ 配置加载成功');
                return APP_CONFIG;
            } else {
                throw new Error('配置加载失败');
            }
        } catch (error) {
            console.error('✗ 配置加载失败:', error);
            // 使用备用配置
            APP_CONFIG = getFallbackConfig();
            configLoaded = true;
            return APP_CONFIG;
        }
    })();

    return configLoadPromise;
}

/**
 * 备用配置（API 不可用时使用）
 */
function getFallbackConfig() {
    const hostname = window.location.hostname;
    const isProduction = hostname === 'yuzawamd.com' || hostname === 'www.yuzawamd.com';
    const baseUrl = isProduction ? 'https://yuzawamd.com' : 'http://' + hostname + '/yuzawa';

    return {
        CONTACT: {
            EMAIL: {
                SUPPORT: 'hakone@trip7.me',
                SOLUTION: 'hakone@trip7.me'
            },
            TEL: '0460-83-8434',
            ADDRESS: '〒250-0631 神奈川県足柄下郡箱根町仙石原1245-325',
            HOTEL_NAME: 'Trip7箱根仙石原温泉ホテル'
        },
        BASE_URL: {
            HOTEL: baseUrl,
            BOOKING: baseUrl,
            API: CONFIG_API_URL
        },
        HOTEL_PAGES: {
            HOME: '/index.html',
            ROOMS: '/rooms.html',
            DINING: '/dining.html',
            ONSEN: '/onsen.html',
            FACILITIES: '/facilities.html',
            AREA: '/area.html',
            ACCESS: '/access.html'
        },
        BOOKING_PAGES: {
            HOME: '/reservation',
            PLAN_DETAIL: '/plan-detail',
            BOOKING_USER: '/booking',
            ORDER_DETAIL: '/order-detail',
            USER_CENTER: '/user-center',
            SUCCESS: '/reservation-success.html'
        }
    };
}

/**
 * 获取配置（同步，需要先调用 loadConfig）
 */
function getConfig() {
    if (!APP_CONFIG) {
        console.warn('配置尚未加载，使用备用配置');
        APP_CONFIG = getFallbackConfig();
    }
    return APP_CONFIG;
}

/**
 * 获取完整的 Hotel 页面 URL
 */
function getHotelUrl(page) {
    const config = getConfig();
    return config.BASE_URL.HOTEL + (config.HOTEL_PAGES[page] || page);
}

/**
 * 获取完整的 Booking 页面 URL
 */
function getBookingUrl(page) {
    const config = getConfig();
    return config.BASE_URL.BOOKING + (config.BOOKING_PAGES[page] || page);
}

/**
 * 获取完整的 API URL
 */
function getApiUrl(endpoint) {
    const config = getConfig();
    return config.BASE_URL.API + (endpoint.startsWith('/') ? endpoint : '/' + endpoint);
}

/**
 * 填充页面中的联系信息
 */
function fillContactInfo() {
    const config = getConfig();

    // 填充 SUPPORT 邮箱
    document.querySelectorAll('.contact-email-support').forEach(el => {
        el.textContent = config.CONTACT.EMAIL.SUPPORT;
    });

    // 填充 SUPPORT 邮箱链接
    document.querySelectorAll('.contact-email-support-link').forEach(el => {
        el.href = 'mailto:' + config.CONTACT.EMAIL.SUPPORT;
        el.textContent = config.CONTACT.EMAIL.SUPPORT;
    });

    // 填充 SOLUTION 邮箱
    document.querySelectorAll('.contact-email-solution').forEach(el => {
        el.textContent = config.CONTACT.EMAIL.SOLUTION;
    });

    // 填充 SOLUTION 邮箱链接
    document.querySelectorAll('.contact-email-solution-link').forEach(el => {
        el.href = 'mailto:' + config.CONTACT.EMAIL.SOLUTION;
        el.textContent = config.CONTACT.EMAIL.SOLUTION;
    });

    // 填充电话
    document.querySelectorAll('.contact-tel').forEach(el => {
        el.textContent = config.CONTACT.TEL;
    });

    // 填充电话链接
    document.querySelectorAll('.contact-tel-link').forEach(el => {
        el.href = 'tel:' + config.CONTACT.TEL.replace(/-/g, '');
        el.textContent = config.CONTACT.TEL;
    });

    // 填充地址
    document.querySelectorAll('.contact-address').forEach(el => {
        el.textContent = config.CONTACT.ADDRESS;
    });

    // 填充酒店名称
    document.querySelectorAll('.hotel-name').forEach(el => {
        el.textContent = config.CONTACT.HOTEL_NAME;
    });
}

/**
 * 页面加载完成后自动加载配置并填充联系信息
 */
document.addEventListener('DOMContentLoaded', async () => {
    await loadConfig();
    fillContactInfo();
});

// 导出（如果使用模块系统）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { loadConfig, getConfig, getHotelUrl, getBookingUrl, getApiUrl, fillContactInfo };
}
