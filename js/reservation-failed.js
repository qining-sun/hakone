/**
 * 预约失败页面逻辑
 * Reservation Failed Page Logic
 */

// 错误类型配置
const ERROR_TYPES = {
    'inventory': {
        title: '在庫切れ',
        message: '申し訳ございませんが、ご希望の日程は満室となりました。他のお客様がご予約されたため、空室がなくなりました。',
        showRefund: true,
        showReason: 'inventory'
    },
    'payment': {
        title: '決済エラー',
        message: 'クレジットカードの決済処理中にエラーが発生しました。カード情報をご確認の上、再度お試しください。',
        showRefund: false,
        showReason: 'payment'
    },
    'timeout': {
        title: 'セッションタイムアウト',
        message: '予約セッションが期限切れになりました。お手数ですが、最初からやり直してください。',
        showRefund: false,
        showReason: 'timeout'
    },
    'system': {
        title: 'システムエラー',
        message: 'システムに一時的な問題が発生しました。しばらく経ってから再度お試しください。',
        showRefund: true,
        showReason: 'system'
    },
    'default': {
        title: '予約エラー',
        message: 'ご予約の処理中にエラーが発生しました。お手数ですが、再度お試しください。',
        showRefund: false,
        showReason: 'system'
    }
};

// 页面初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('=== reservation-failed.js 初始化 ===');

    // 解析URL参数
    const urlParams = new URLSearchParams(window.location.search);
    const errorType = urlParams.get('error') || urlParams.get('reason') || 'default';
    const orderCode = urlParams.get('orderCode') || urlParams.get('order_code');
    const errorCode = urlParams.get('code');
    const customMessage = urlParams.get('message');
    const refunded = urlParams.get('refunded') === 'true';

    console.log('错误类型:', errorType);
    console.log('订单号:', orderCode);
    console.log('是否已退款:', refunded);

    // 获取错误配置
    const errorConfig = ERROR_TYPES[errorType] || ERROR_TYPES['default'];

    // 更新页面内容
    updatePageContent(errorConfig, {
        orderCode,
        errorCode,
        customMessage,
        refunded
    });

    // 设置当前时间
    setCurrentTime();

    // 隐藏所有原因，只显示相关的
    hideAllReasons();
    showRelevantReason(errorConfig.showReason);
});

/**
 * 更新页面内容
 */
function updatePageContent(config, params) {
    // 更新失败原因描述
    const failedReason = document.getElementById('failedReason');
    if (failedReason) {
        failedReason.textContent = params.customMessage || config.message;
    }

    // 显示订单号（如果有）
    if (params.orderCode) {
        const orderCodeSection = document.getElementById('orderCodeSection');
        const orderCodeEl = document.getElementById('orderCode');
        if (orderCodeSection && orderCodeEl) {
            orderCodeSection.style.display = 'flex';
            orderCodeEl.textContent = params.orderCode;
        }
    }

    // 显示错误代码（如果有）
    if (params.errorCode) {
        const errorCodeSection = document.getElementById('errorCodeSection');
        const errorCodeEl = document.getElementById('errorCode');
        if (errorCodeSection && errorCodeEl) {
            errorCodeSection.style.display = 'flex';
            errorCodeEl.textContent = params.errorCode;
        }
    }

    // 显示退款通知（如果需要）
    if (config.showRefund || params.refunded) {
        const refundNotice = document.getElementById('refundNotice');
        if (refundNotice) {
            refundNotice.style.display = 'flex';
        }
    }
}

/**
 * 设置当前时间
 */
function setCurrentTime() {
    const errorTime = document.getElementById('errorTime');
    if (errorTime) {
        const now = new Date();
        const options = {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            timeZone: 'Asia/Tokyo'
        };
        errorTime.textContent = now.toLocaleString('ja-JP', options);
    }
}

/**
 * 隐藏所有原因
 */
function hideAllReasons() {
    const reasons = ['inventory', 'payment', 'timeout', 'system'];
    reasons.forEach(reason => {
        const el = document.getElementById(`reason-${reason}`);
        if (el) {
            el.style.display = 'none';
        }
    });
}

/**
 * 显示相关原因
 */
function showRelevantReason(reasonType) {
    const el = document.getElementById(`reason-${reasonType}`);
    if (el) {
        el.style.display = 'flex';
        el.classList.add('active');
    }
}

/**
 * 从其他页面跳转到失败页面的辅助函数
 * 可以在其他JS文件中调用
 */
window.redirectToFailedPage = function(options = {}) {
    const params = new URLSearchParams();

    if (options.error) params.set('error', options.error);
    if (options.reason) params.set('reason', options.reason);
    if (options.orderCode) params.set('orderCode', options.orderCode);
    if (options.code) params.set('code', options.code);
    if (options.message) params.set('message', options.message);
    if (options.refunded) params.set('refunded', 'true');

    // 使用不带 .html 后缀的 URL，避免服务器 URL 重写导致参数丢失
    window.location.href = `reservation-failed.html?${params.toString()}`;
};

console.log('reservation-failed.js 加载完成');
