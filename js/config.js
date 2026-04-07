/**
 * 项目配置文件
 * 统一管理URL和基础配置
 */

const APP_CONFIG = {
    // 基础URL配置
    BASE_URL: {
        // Yuzawa项目的基础URL
        HOTEL: 'http://192.168.100.251/yuzawa',

        // Booking项目的基础URL（现在整合在yuzawa中）
        BOOKING: 'http://192.168.100.251/yuzawa',

        // API服务器URL
        API: 'http://192.168.100.251:5000'
    },

    // Hotel项目的页面路径
    HOTEL_PAGES: {
        HOME: '/index.html',
        ROOMS: '/rooms.html',
        DINING: '/dining.html',
        ONSEN: '/onsen.html',
        FACILITIES: '/facilities.html',
        AREA: '/area.html',
        ACCESS: '/access.html'
    },

    // Booking项目的页面路径
    BOOKING_PAGES: {
        HOME: '/reservation.html',
        PLAN_DETAIL: '/plan-detail.html',
        BOOKING: '/booking.html',
        BOOKING_USER: '/booking-user.html',
        ORDER_DETAIL: '/order-detail.html',
        USER_CENTER: '/user-center.html',
        SUCCESS: '/reservation-success.html'
    }
};

// 获取完整的Hotel页面URL
function getHotelUrl(page) {
    return APP_CONFIG.BASE_URL.HOTEL + (APP_CONFIG.HOTEL_PAGES[page] || page);
}

// 获取完整的Booking页面URL
function getBookingUrl(page) {
    return APP_CONFIG.BASE_URL.BOOKING + (APP_CONFIG.BOOKING_PAGES[page] || page);
}

// 获取完整的API URL
function getApiUrl(endpoint) {
    return APP_CONFIG.BASE_URL.API + (endpoint.startsWith('/') ? endpoint : '/' + endpoint);
}

// 导出配置（如果使用模块系统）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { APP_CONFIG, getHotelUrl, getBookingUrl, getApiUrl };
}
