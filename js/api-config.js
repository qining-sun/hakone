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

// ==================== API URL 辅助函数 ====================
window.getApiUrl = function(path) {
    // 移除开头的斜杠（如果有）
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    // API_CONFIG.BOOKING_API 已经包含 /api，不需要再添加
    return `${window.API_CONFIG.BOOKING_API}/${cleanPath}`;
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
