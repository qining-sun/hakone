# 临时订单系统 - 前端集成指南

## 📋 概述

临时订单系统（orders_tmp）已成功集成到 booking-user.html 页面，提供：
- ✅ 自动保存用户填写的订单信息
- ✅ 页面刷新后自动恢复订单草稿
- ✅ 服务器端价格计算，防止篡改
- ✅ 支付成功后自动转移到 orders_pending

---

## 🚀 已完成的修改

### 1. 后端文件（已创建）

- **`api/models/OrderTemp.js`** - 临时订单模型
- **`api/routes/orderTemp.js`** - 临时订单 API 路由
- **`api/database/create_orders_tmp.sql`** - 数据库表创建脚本
- **`api/server.js`** - 已注册路由和定时清理任务

### 2. 前端文件（已创建/修改）

- **`js/order-temp.js`** ✨ 新文件 - 临时订单管理模块
- **`booking-user.html`** ✅ 已修改 - 添加了脚本引用和初始化代码

---

## 📝 需要手动修改的部分

### ⚠️ 重要：修改 Stripe 支付回调

需要修改 `js/stripe-payment.js` 文件中的 `createOrderAfterPayment` 函数。

**找到这段代码（大约在 1398 行）：**

```javascript
async function createOrderAfterPayment(paymentData) {
    console.log('=== 支付成功，开始创建订单 ===');
    console.log('支付数据:', paymentData);

    // 从 metadata 中获取订单信息
    const metadata = paymentData.metadata || {};
    console.log('Metadata:', metadata);

    // 如果订单已经创建，直接返回
    if (window.bookingOrderCode) {
        console.log('订单已存在，订单号:', window.bookingOrderCode);
        return;
    }

    // 调用现有的订单创建函数
    if (typeof window.submitFinalBooking === 'function') {
        console.log('调用 submitFinalBooking 创建订单...');
        try {
            const orderResult = await window.submitFinalBooking();
            // ...
        } catch (error) {
            // ...
        }
    }
}
```

**替换为以下代码：**

```javascript
async function createOrderAfterPayment(paymentData) {
    console.log('=== 支付成功，开始创建订单 ===');
    console.log('支付数据:', paymentData);

    // 如果订单已经创建，直接返回
    if (window.bookingOrderCode) {
        console.log('订单已存在，订单号:', window.bookingOrderCode);
        return;
    }

    // 使用临时订单系统转移订单
    if (window.OrderTemp && window.OrderTemp.getTempOrderCode()) {
        console.log('使用临时订单系统转移订单...');
        try {
            const tempOrderCode = window.OrderTemp.getTempOrderCode();
            console.log('临时订单编号:', tempOrderCode);

            // 调用 API 转移订单到 orders_pending
            const newOrderCode = await window.OrderTemp.completePayment(paymentData.id);

            // 保存新的订单编号
            window.bookingOrderCode = newOrderCode;
            console.log('✅ 订单转移成功，新订单号:', newOrderCode);

            return newOrderCode;

        } catch (error) {
            console.error('❌ 订单转移失败:', error);
            throw new Error('订单创建失败: ' + error.message);
        }
    }
    // 兼容旧的订单创建流程（如果没有临时订单）
    else if (typeof window.submitFinalBooking === 'function') {
        console.log('使用旧的订单创建流程...');
        try {
            const orderResult = await window.submitFinalBooking();
            console.log('submitFinalBooking返回值:', orderResult);
            return orderResult;
        } catch (error) {
            console.error('订单创建失败:', error);
            throw error;
        }
    } else {
        throw new Error('无法创建订单：没有可用的订单创建方法');
    }
}
```

---

## 🔧 工作原理

### 1. 页面加载时

```javascript
// booking-user.html 页面加载
↓
// 初始化 OrderTemp 模块
OrderTemp.init()
↓
// 检查 localStorage 是否有临时订单编号
tempOrderCode = localStorage.getItem('temp_order_code')
↓
// 如果有，从服务器加载订单草稿
if (tempOrderCode) {
    await loadOrderDraft()  // GET /api/order-temp/:orderCode
    fillFormWithOrderData() // 填充表单
}
```

### 2. 用户填写表单时

```javascript
// 用户输入字段
↓
// 触发 input 事件
↓
// 防抖延迟 500ms
↓
// 自动保存
saveOrderDraft()
↓
// POST /api/order-temp
// {
//     order_code: "TMP1734567890" (如果有则更新，否则创建)
//     room_type_code, checkin_date, ...
// }
↓
// 服务器验证库存、计算价格
↓
// 返回订单数据（包含服务器计算的价格）
↓
// 保存订单编号到 localStorage
localStorage.setItem('temp_order_code', orderCode)
↓
// 更新页面显示的价格
updatePriceDisplay()
```

### 3. 支付成功后

```javascript
// Stripe 支付成功
↓
// createOrderAfterPayment(paymentIntent)
↓
// OrderTemp.completePayment(paymentIntent.id)
↓
// POST /api/order-temp/:tempOrderCode/complete-payment
// { stripePaymentId: "pi_xxx" }
↓
// 服务器端操作（事务）:
// 1. 验证临时订单存在且未过期
// 2. 再次验证库存
// 3. 插入 orders_pending 表
// 4. 扣减库存
// 5. 删除临时订单
↓
// 返回新的正式订单编号
// { orderCode: "ORD1734567890" }
↓
// 清除 localStorage
localStorage.removeItem('temp_order_code')
↓
// 跳转到订单确认页面
window.location.href = `/order-confirmation.html?code=${orderCode}`
```

---

## 🎯 自动保存的字段

以下字段会自动保存到 orders_tmp 表：

### 基本信息
- ✅ 房型代码、入住/退房日期、房间数、人数
- ✅ **价格（服务器计算，防止篡改）**

### 客人信息
- ✅ 姓名、姓名片假名
- ✅ 邮箱、电话、国家代码

### 地址信息
- ✅ 国家、邮编、都道府县、城市、详细地址

### 追加服务
- ✅ 早餐、晚餐、貸切風呂
- ✅ **服务费用（服务器计算）**

### 其他
- ✅ 特别要求

---

## ⏱️ 过期机制

- 临时订单在创建 **30 分钟后自动过期**
- 每次更新订单时，过期时间会刷新
- 服务器每小时自动清理过期订单
- 用户加载过期订单时，会提示订单已过期并清除本地缓存

---

## 🔒 安全机制

### 1. 价格防篡改

```javascript
// ❌ 旧方式（不安全）
const price = calculatePriceOnFrontend(); // 可被修改！
await stripe.createPayment({ amount: price });

// ✅ 新方式（安全）
await OrderTemp.save(); // 服务器计算并保存价格
const order = await OrderTemp.load(); // 获取服务器计算的价格
await stripe.createPayment({ amount: order.total_price }); // 使用服务器价格
```

### 2. 库存验证

- 创建临时订单时验证库存
- 支付完成后再次验证库存（防止在等待期间库存被占用）
- 使用数据库事务确保原子性

### 3. 数据完整性

- 所有订单转移操作使用数据库事务
- 任何步骤失败都会回滚
- 防止库存扣减但订单未创建的情况

---

## 🧪 测试步骤

### 1. 测试自动保存

1. 打开 booking-user.html
2. 填写表单字段
3. 打开浏览器控制台，应该看到：
   ```
   💾 Saving order draft...
   ✅ Order draft saved: TMP1734567890
   💰 Server calculated price: 36000
   ```
4. 刷新页面，表单应该自动填充之前的数据

### 2. 测试价格计算

1. 查看控制台，确认价格是服务器计算的：
   ```
   Server calculated price: 36000
   ```
2. 尝试在浏览器开发者工具中修改价格
3. 支付时应该使用服务器返回的价格，而不是被篡改的价格

### 3. 测试支付流程

1. 完成表单填写
2. 进入支付步骤
3. 使用测试卡号完成支付
4. 控制台应该显示：
   ```
   💳 Completing payment for temp order: TMP1734567890
   ✅ Payment completed, new order code: ORD1734567891
   ```
5. 页面应该跳转到订单确认页面

### 4. 测试过期处理

1. 创建一个临时订单
2. 等待 30 分钟（或修改数据库中的 expires_at 字段）
3. 刷新页面
4. 应该显示订单已过期，并清除本地缓存

---

## 📊 数据流图

```
用户打开页面
    ↓
[localStorage] 检查临时订单编号
    ↓
如果有 → GET /api/order-temp/:code → 填充表单
    ↓
用户填写/修改表单
    ↓
[防抖 500ms] → POST /api/order-temp → 保存/更新
    ↓
← 返回服务器计算的价格
    ↓
更新页面显示
    ↓
用户完成支付
    ↓
POST /api/order-temp/:code/complete-payment
    ↓
[数据库事务]
    ├─ 验证库存
    ├─ 插入 orders_pending
    ├─ 扣减库存
    └─ 删除临时订单
    ↓
← 返回新订单编号
    ↓
清除 localStorage
    ↓
跳转到订单确认页面
```

---

## ❓ 常见问题

### Q1: 用户刷新页面会丢失数据吗？
**A:** 不会。所有数据都保存在服务器的 orders_tmp 表中，刷新页面会自动恢复。

### Q2: 多个标签页会冲突吗？
**A:** 不会。临时订单编号保存在 localStorage 中，所有标签页共享同一个临时订单。

### Q3: 临时订单过期后怎么办？
**A:** 系统会提示订单已过期，用户需要重新填写并创建新的临时订单。

### Q4: 支付失败后临时订单会怎样？
**A:** 临时订单仍然保留，用户可以重新尝试支付。

### Q5: 价格会在哪里计算？
**A:** 价格**始终在服务器端**计算，前端只显示服务器返回的价格，确保安全性。

---

## ✅ 完成清单

- [x] 创建后端 OrderTemp 模型
- [x] 创建 API 路由
- [x] 创建数据库表
- [x] 注册路由到 server.js
- [x] 添加定时清理任务
- [x] 创建前端 order-temp.js 模块
- [x] 修改 booking-user.html 集成脚本
- [ ] **修改 stripe-payment.js 的支付回调** ⚠️ 需要手动完成

---

## 📞 需要帮助？

如果遇到问题，请检查：

1. **浏览器控制台** - 查看错误信息和日志
2. **网络请求** - 检查 API 调用是否成功
3. **服务器日志** - 查看后端错误
4. **数据库** - 确认 orders_tmp 表是否正确创建

参考文档：
- 后端 API 文档：`api/database/ORDER_TEMP_API_GUIDE.md`
- 前端代码：`js/order-temp.js`
