# API 服务器端口配置说明

## 端口分配

API 服务器现在分为三个不同的端口：

| 服务类型 | 端口 | API 地址 | 说明 |
|---------|------|---------|------|
| **预约服务** | 3000 | `http://localhost:3000/api` | 订单、用户、房间、支付等所有预约相关的 API |
| **聊天机器人** | 3001 | `http://localhost:3001/api/ai/invoke` | AI 智能客服聊天接口 |
| **新闻服务** | 3002 | `http://localhost:3002/api` | 酒店新闻公告 API |

## 配置文件

**文件位置**: `js/api-config.js`

```javascript
window.API_CONFIG = {
    // 预约服务 API
    BOOKING_API: `http://${hostname}:3000/api`,

    // 聊天机器人 API
    CHATBOT_API: `http://${hostname}:3001/api/ai/invoke`,

    // 新闻 API
    NEWS_API: `http://${hostname}:3002/api`,
};
```

## 已修改的文件

### 1. 聊天机器人 API (端口 3001)

- ✅ `components/ai-chat.html` (第 22 行)
- ✅ `js/ai-chat-service.js` (第 9 行)

### 2. 新闻 API (端口 3002)

- ✅ `index.html` (第 170, 258 行)

### 3. 预约服务 API (端口 3000)

所有其他 API 调用保持使用 3000 端口（默认端口）：

- `js/user-center-page.js`
- `js/user-center.js`
- `js/order-detail.js`
- `js/booking-user.js`
- `js/room-search.js`
- `js/stripe-payment.js`
- `js/reservation-success.js`
- `js/booking.js`
- `js/booking-api.js`
- `js/reservation.js`
- `js/init.js`
- `login.html`

### 4. 已引入 api-config.js 的 HTML 文件

以下 17 个 HTML 文件已在 `</head>` 前引入 `api-config.js`：

1. index.html
2. booking-user.html
3. booking.html
4. reservation.html
5. reservation-success.html
6. user-center.html
7. order-detail.html
8. login.html
9. verify-email-change.html
10. verify-registration.html
11. rooms.html
12. dining.html
13. onsen.html
14. facilities.html
15. area.html
16. access.html
17. plan-detail.html

## 使用方法

### 前端调用示例

**预约服务 API**:
```javascript
const API_BASE_URL = window.API_CONFIG.BOOKING_API;
const response = await fetch(`${API_BASE_URL}/orders`);
```

**聊天机器人 API**:
```javascript
const CHATBOT_API = window.API_CONFIG.CHATBOT_API;
const response = await fetch(CHATBOT_API, {
    method: 'POST',
    body: JSON.stringify({ message: 'Hello' })
});
```

**新闻 API**:
```javascript
const NEWS_API = window.API_CONFIG.NEWS_API;
const response = await fetch(`${NEWS_API}/news?limit=4`);
```

## 注意事项

1. **兼容性**: `window.API_BASE_URL` 仍然指向 3000 端口（预约服务），确保向后兼容
2. **动态主机名**: 所有 API 地址都使用 `window.location.hostname`，自动适配当前访问的域名/IP
3. **后备机制**: 每个 API 调用都有后备地址，即使 `api-config.js` 未加载也能正常工作

## 启动后端服务

需要分别启动三个后端服务：

```bash
# 预约服务 (端口 3000)
cd yuzawa-api && PORT=3000 npm start

# 聊天机器人服务 (端口 3001)
cd yuzawa-api && PORT=3001 npm start

# 新闻服务 (端口 3002)
cd yuzawa-api && PORT=3002 npm start
```

## 更新日期

2025-10-31
