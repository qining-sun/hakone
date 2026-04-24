/**
 * API 服务器配置
 * API Server Configuration
 */

// ==================== 快速环境切换 ====================
// 修改下方的环境设置即可快速切换API服务器
// 'auto' = 自动检测（HTTPS用nginx反向代理，HTTP用本地服务器）
// 'dev'  = 开发环境（本地API服务器 localhost）
// 'prod' = 生产环境（远程API服务器或nginx代理）
const ENVIRONMENT = 'auto';  // 👈 修改这里切换环境

// ==================== API 服务器地址配置 ====================
const API_SERVERS = {
    // 开发环境：本地API服务器
    dev: {
        host: 'localhost',  // 或 '127.0.0.1'
        port: 5000
    },
    // 生产环境：远程API服务器（如果不用nginx代理的话）
    prod: {
        host: '160.16.67.238',
        port: 5000
    }
};

// 检测是否为HTTPS环境
const isHTTPS = window.location.protocol === 'https:';

// ==================== 决定使用哪个环境 ====================
let currentEnv;
let useProxy = false;

// 检测是否为私有IP地址（本地网络）
function isPrivateIP(hostname) {
    // localhost 和 127.x.x.x
    if (hostname === 'localhost' || hostname.startsWith('127.')) {
        return true;
    }
    // 192.168.x.x（私有C类地址）
    if (hostname.startsWith('192.168.')) {
        return true;
    }
    // 10.x.x.x（私有A类地址）
    if (hostname.startsWith('10.')) {
        return true;
    }
    // 172.16.x.x - 172.31.x.x（私有B类地址）
    const match = hostname.match(/^172\.(\d+)\./);
    if (match) {
        const second = parseInt(match[1]);
        if (second >= 16 && second <= 31) {
            return true;
        }
    }
    return false;
}

if (ENVIRONMENT === 'auto') {
    // 自动模式：根据协议和主机名自动判断
    if (isHTTPS) {
        // HTTPS环境 = 生产服务器，使用nginx反向代理
        useProxy = true;
        currentEnv = 'proxy';
    } else if (isPrivateIP(window.location.hostname)) {
        // HTTP + 私有IP/localhost = 本地开发环境
        currentEnv = 'dev';
    } else {
        // HTTP + 公网IP = 远程测试环境
        currentEnv = 'prod';
    }
} else if (ENVIRONMENT === 'dev') {
    currentEnv = 'dev';
} else if (ENVIRONMENT === 'prod') {
    currentEnv = 'prod';
}

// ==================== 生成API配置 ====================
if (useProxy) {
    // 使用nginx反向代理（HTTPS环境）
    window.API_CONFIG = {
        BOOKING_API: '/api',
        CHATBOT_API: '/api/chatbot/ai-proxy',
        NEWS_API: '/api/news',
    };
} else {
    // 直接连接API服务器
    let apiHost;
    let apiPort;

    if (currentEnv === 'dev') {
        // 开发环境：使用当前页面的主机名（支持LAN访问）
        apiHost = window.location.hostname;
        apiPort = API_SERVERS.dev.port;
    } else {
        // 生产环境：使用配置的远程服务器
        apiHost = API_SERVERS.prod.host;
        apiPort = API_SERVERS.prod.port;
    }

    const baseUrl = `http://${apiHost}:${apiPort}`;

    window.API_CONFIG = {
        BOOKING_API: `${baseUrl}/api`,
        CHATBOT_API: `${baseUrl}/api/chatbot/ai-proxy`,
        NEWS_API: `${baseUrl}/api/news`,
    };
}

// 兼容旧的 API_BASE_URL
window.API_BASE_URL = window.API_CONFIG.BOOKING_API;

// OAuth (Google/LINE/Facebook) は OAuth provider に登録済みの callback URL
// (https://yuzawamd.com/api/auth/xxx/callback) を使うので、発起リクエストも
// 同じホスト (yuzawamd.com) 経由にしないと session cookie がつながらない。
// 開発環境ではローカル API と同じ。
window.OAUTH_API_BASE = useProxy
    ? 'https://yuzawamd.com/api'
    : window.API_CONFIG.BOOKING_API;

// ==================== API URL 辅助函数 ====================
window.getApiUrl = function(path) {
    // 移除开头的斜杠（如果有）
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    // API_CONFIG.BOOKING_API 已经包含 /api，不需要再添加
    return `${window.API_CONFIG.BOOKING_API}/${cleanPath}`;
};

// OAuth 発起専用の URL ビルダー
window.getOAuthUrl = function(path) {
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    return `${window.OAUTH_API_BASE}/${cleanPath}`;
};

// ==================== 输出配置信息 ====================
console.log('='.repeat(50));
console.log('📡 API Configuration');
console.log('='.repeat(50));
console.log('Environment Setting:', ENVIRONMENT);
console.log('Current Mode:', useProxy ? 'Proxy (Nginx)' : currentEnv.toUpperCase());
console.log('Protocol:', window.location.protocol);
console.log('API Config:', window.API_CONFIG);
console.log('='.repeat(50));

// ==================== 开发/生产环境切换功能 ====================
// TL-Lincoln テスト環境判定（ポート 8880）
window.isTlTestMode =
    window.location.port === '8880' ||
    window.location.hostname === 'test.yuzawamd.com';

// 判断是否为开发环境（非 HTTPS 且为私有IP）
window.isDevelopmentMode = !isHTTPS && isPrivateIP(window.location.hostname);

// 判断是否为生产环境（HTTPS、ただし TL テストポートは除外）
window.isProductionMode = isHTTPS && !window.isTlTestMode;

// 数据库环境配置
const DB_ENV_CONFIG = {
    test: {
        label: 'テスト',
        dbName: 'hotel_booking_test'
    },
    production: {
        label: '本番',
        dbName: 'hotel_booking'
    }
};

// Stripe 环境配置
const STRIPE_ENV_CONFIG = {
    test: {
        label: 'テスト',
        mode: 'test'
    },
    production: {
        label: '本番',
        mode: 'live'
    }
};

// API Provider 配置（自社 API 或 TL-Lincoln）
const API_PROVIDER_CONFIG = {
    local: {
        label: '自社',
        provider: 'local'
    },
    'tl-lincoln': {
        label: 'TL-Lincoln',
        provider: 'tl-lincoln'
    }
};

// 获取数据库环境
window.getDbEnvironment = function() {
    if (window.isTlTestMode) {
        return 'test';
    }
    if (window.isProductionMode) {
        return 'production';
    }
    return localStorage.getItem('dbEnvironment') || 'production';
};

window.setDbEnvironment = function(env) {
    if (window.isProductionMode) {
        console.warn('⚠️ 生産環境では環境切り替えは無効です');
        return false;
    }
    if (DB_ENV_CONFIG[env]) {
        localStorage.setItem('dbEnvironment', env);
        return true;
    }
    return false;
};

window.switchDbEnvironment = function(env) {
    if (window.isProductionMode) {
        console.warn('⚠️ 生産環境では環境切り替えは無効です');
        return false;
    }
    if (window.setDbEnvironment(env)) {
        window.location.reload();
        return true;
    }
    return false;
};

// 获取 Stripe 环境
window.getStripeEnvironment = function() {
    if (window.isTlTestMode) {
        return 'test';
    }
    if (window.isProductionMode) {
        return 'production';
    }
    return localStorage.getItem('stripeEnvironment') || 'test';
};

window.setStripeEnvironment = function(env) {
    if (window.isProductionMode) {
        console.warn('⚠️ 生産環境では環境切り替えは無効です');
        return false;
    }
    if (STRIPE_ENV_CONFIG[env]) {
        localStorage.setItem('stripeEnvironment', env);
        return true;
    }
    return false;
};

window.switchStripeEnvironment = function(env) {
    if (window.isProductionMode) {
        console.warn('⚠️ 生産環境では環境切り替えは無効です');
        return false;
    }
    if (window.setStripeEnvironment(env)) {
        window.location.reload();
        return true;
    }
    return false;
};

// 获取 API Provider
window.getApiProvider = function() {
    if (window.isTlTestMode) {
        return 'tl-lincoln';
    }
    if (window.isProductionMode) {
        return 'local';
    }
    return localStorage.getItem('apiProvider') || 'local';
};

window.setApiProvider = function(provider) {
    if (window.isProductionMode) {
        console.warn('⚠️ 生産環境では環境切り替えは無効です');
        return false;
    }
    if (API_PROVIDER_CONFIG[provider]) {
        localStorage.setItem('apiProvider', provider);
        return true;
    }
    return false;
};

window.switchApiProvider = function(provider) {
    if (window.isProductionMode) {
        console.warn('⚠️ 生産環境では環境切り替えは無効です');
        return false;
    }
    if (window.setApiProvider(provider)) {
        window.location.reload();
        return true;
    }
    return false;
};

window.DB_ENV_CONFIG = DB_ENV_CONFIG;
window.STRIPE_ENV_CONFIG = STRIPE_ENV_CONFIG;
window.API_PROVIDER_CONFIG = API_PROVIDER_CONFIG;

if (window.isProductionMode) {
    console.log('🔒 Production Mode - 本番環境');
    console.log('📦 DB Environment: production (強制)');
    console.log('💳 Stripe Environment: production (強制)');
    console.log('🔗 API Provider: local (強制)');
} else if (window.isDevelopmentMode) {
    console.log('🔧 Development Mode - 開発環境');
    console.log('📦 DB Environment:', window.getDbEnvironment());
    console.log('💳 Stripe Environment:', window.getStripeEnvironment());
    console.log('🔗 API Provider:', window.getApiProvider());
}

// ==================== ホテルID設定 ====================
// 箱根ホテル = hotel_id: 2
window.HOTEL_ID = 2;

// ==================== API 请求辅助函数 ====================
window.getApiHeaders = function(additionalHeaders = {}) {
    const headers = {
        'X-DB-Environment': window.getDbEnvironment(),
        'X-Stripe-Environment': window.getStripeEnvironment(),
        'X-API-Provider': window.getApiProvider(),
        'X-Hotel-ID': String(window.HOTEL_ID),
        ...additionalHeaders
    };
    return headers;
};

// ==================== 全局 Fetch 拦截器 ====================
const originalFetch = window.fetch;

window.fetch = function(url, options = {}) {
    const urlStr = typeof url === 'string' ? url : url.toString();
    const isApiRequest = urlStr.includes('/api/') || urlStr.includes(':5000/') || urlStr.includes(':4000/');

    if (isApiRequest) {
        const envHeaders = window.getApiHeaders();
        options = {
            ...options,
            headers: {
                ...envHeaders,
                ...(options.headers || {})
            }
        };
    }

    return originalFetch(url, options);
};

console.log('🏨 Hotel ID:', window.HOTEL_ID, '(箱根)');
console.log('📤 API Environment Headers:', window.getApiHeaders());
console.log('✅ Fetch interceptor installed - API requests will include environment headers');
