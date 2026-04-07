/**
 * API 服务器配置（安全版本）
 * API Server Configuration (Secure Version)
 */

// ==================== 安全配置 ====================
// 生产环境永远使用反向代理，不暴露真实IP
const isHTTPS = window.location.protocol === 'https:';
const isLocalhost = window.location.hostname === 'localhost' ||
                   window.location.hostname === '127.0.0.1';

// ==================== API配置 ====================
if (isHTTPS || !isLocalhost) {
    // 生产环境：使用 Nginx 反向代理（不暴露真实IP）
    window.API_CONFIG = {
        BOOKING_API: '/api',
        CHATBOT_API: '/api/chatbot/ai-proxy',
        NEWS_API: '/api/news',
    };
    console.log('🔒 使用安全代理模式 (Nginx Proxy)');
} else {
    // 开发环境：仅在 localhost 使用直连
    window.API_CONFIG = {
        BOOKING_API: 'http://localhost:5000',
        CHATBOT_API: 'http://localhost:5000/api/chatbot/ai-proxy',
        NEWS_API: 'http://localhost:5000/api/news',
    };
    console.log('🔧 开发模式 (localhost:5000)');
}

// 兼容旧的 API_BASE_URL
window.API_BASE_URL = window.API_CONFIG.BOOKING_API;

// 输出配置信息（生产环境不显示敏感信息）
console.log('📡 API Configuration:', {
    mode: isHTTPS ? 'Production (Proxy)' : 'Development',
    protocol: window.location.protocol
});
