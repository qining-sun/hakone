# 湯沢温泉ホテル - 数据库架构说明

## 数据库连接配置

### 开发环境
```php
$host = 'localhost';
$username = 'root';
$password = '';
```

### 数据库列表
- `hotel_news` - 新闻数据库
- `hotel_booking` - 预订系统数据库（订单、用户等）

---

## 订单系统架构

### 订单状态流转

```
新订单（已支付）
    ↓
orders_pending (待确认)
    ↓ [管理员确认]
orders_confirmed (已确认)
    ↓ [取消操作]
orders_cancelled (已取消)
```

### 三个订单表说明

| 表名 | 说明 | 订单状态 | 用途 |
|-----|------|---------|------|
| `orders_pending` | 待确认订单 | pending | 存放已支付但管理员未确认的订单 |
| `orders_confirmed` | 已确认订单 | confirmed | 存放管理员已确认的订单（正常进行中） |
| `orders_cancelled` | 已取消订单 | cancelled | 存放被取消的订单 |

### 订单状态映射（前端显示）

| 数据库表 | status 字段值 | 前端显示（日语） | 前端CSS类 | 说明 |
|---------|--------------|----------------|----------|------|
| orders_pending | pending | 未確認 | status-pending | 黄色标签 |
| orders_confirmed | confirmed | 予約確定 | status-confirmed | 绿色标签 |
| orders_confirmed (已入住) | completed | 宿泊済み | status-completed | 灰色标签 |
| orders_cancelled | cancelled | キャンセル済み | status-cancelled | 红色标签 |

---

## 表结构

### orders_pending（待确认订单表）

主要字段（需根据实际情况调整）：

```sql
CREATE TABLE `orders_pending` (
  `id` varchar(50) PRIMARY KEY,           -- 订单号（如：TMP17618913496614763）
  `user_email` varchar(255),              -- 用户邮箱
  `user_name` varchar(100),               -- 用户姓名
  `user_phone` varchar(20),               -- 用户电话
  `room_name` varchar(255),               -- 房间名称
  `checkin_date` date,                    -- 入住日期
  `checkout_date` date,                   -- 退房日期
  `guests` int,                           -- 客人数量
  `rooms` int,                            -- 房间数量
  `total_price` decimal(10,2),            -- 总价
  `payment_status` varchar(20),           -- 支付状态
  `created_at` timestamp,                 -- 创建时间
  `updated_at` timestamp                  -- 更新时间
);
```

### orders_confirmed（已确认订单表）

结构与 `orders_pending` 相同，额外字段：

```sql
-- 额外字段
`confirmed_at` timestamp,                 -- 确认时间
`confirmed_by` varchar(100),              -- 确认管理员
`status` varchar(20) DEFAULT 'confirmed'  -- 状态：confirmed/completed
```

### orders_cancelled（已取消订单表）

结构与 `orders_confirmed` 相同，额外字段：

```sql
-- 额外字段
`cancelled_at` timestamp,                 -- 取消时间
`cancelled_by` varchar(100),              -- 取消人（用户/管理员）
`cancel_reason` text,                     -- 取消原因
`refund_status` varchar(20)               -- 退款状态
```

---

## 用户中心订单查询逻辑

### 查询所有用户订单

```sql
-- 1. 查询待确认订单
SELECT *, 'pending' as order_status, 'orders_pending' as source_table
FROM orders_pending
WHERE user_email = ?

UNION ALL

-- 2. 查询已确认订单
SELECT *,
  CASE
    WHEN checkout_date < CURDATE() THEN 'completed'
    ELSE 'confirmed'
  END as order_status,
  'orders_confirmed' as source_table
FROM orders_confirmed
WHERE user_email = ?

UNION ALL

-- 3. 查询已取消订单
SELECT *, 'cancelled' as order_status, 'orders_confirmed' as source_table
FROM orders_cancelled
WHERE user_email = ?

ORDER BY created_at DESC;
```

### 订单状态判断规则

1. **未確認 (pending)**: 订单在 `orders_pending` 表中
2. **予約確定 (confirmed)**: 订单在 `orders_confirmed` 表中，且 `checkout_date >= 今天`
3. **宿泊済み (completed)**: 订单在 `orders_confirmed` 表中，且 `checkout_date < 今天`
4. **キャンセル済み (cancelled)**: 订单在 `orders_cancelled` 表中

---

## API 接口说明

### 获取用户订单列表

**接口**: `GET /api/get_user_orders.php`

**参数**:
- `email` (required): 用户邮箱

**返回示例**:
```json
{
  "success": true,
  "data": [
    {
      "id": "TMP17618913496614763",
      "user_email": "user@example.com",
      "room_name": "ツインルーム【セミダブルベッド】",
      "checkin_date": "2024-12-20",
      "checkout_date": "2024-12-22",
      "guests": 2,
      "rooms": 1,
      "total_price": 36000,
      "order_status": "confirmed",
      "source_table": "orders_confirmed"
    }
  ]
}
```

---

## 前端状态显示参考

### JavaScript 状态文本映射

```javascript
function getOrderStatusText(status) {
    const statusMap = {
        'pending': '未確認',
        'confirmed': '予約確定',
        'completed': '宿泊済み',
        'cancelled': 'キャンセル済み'
    };
    return statusMap[status] || status;
}
```

### CSS 状态样式类

```css
.booking-status {
    padding: 4px 12px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 600;
}

.status-pending {
    background: #fff3cd;
    color: #856404;
}

.status-confirmed {
    background: #d4edda;
    color: #155724;
}

.status-completed {
    background: #e2e3e5;
    color: #383d41;
}

.status-cancelled {
    background: #f8d7da;
    color: #721c24;
}
```

---

## 重要说明

1. **订单唯一性**: 同一个订单ID在三个表中只能存在一个
2. **订单迁移**:
   - 管理员确认时：从 `orders_pending` 移动到 `orders_confirmed`
   - 取消订单时：从 `orders_pending` 或 `orders_confirmed` 移动到 `orders_cancelled`
3. **日期判断**: 使用 `checkout_date` 判断订单是否已完成（已入住）
4. **用户关联**: 使用 `user_email` 字段关联用户订单

---

## 更新日志

- 2024-10-31: 创建初始文档，定义订单状态流转和表结构
