# 房间搜索 API 使用指南

## API 端点

```
GET /api/rooms/search
```

## 基础信息

- **请求方法**: GET
- **Content-Type**: application/json
- **认证**: 不需要

## 请求参数

### 必填参数

| 参数名 | 类型 | 说明 | 示例 |
|--------|------|------|------|
| `checkin` | String | 入住日期 (YYYY-MM-DD) | `2025-11-21` |
| `checkout` | String | 退房日期 (YYYY-MM-DD) | `2025-11-22` |
| `adults` | Integer | 成人数量 | `2` |
| `rooms` | Integer | 房间数量 | `1` |

### 可选参数

| 参数名 | 类型 | 说明 | 示例 | 默认值 |
|--------|------|------|------|--------|
| `children` | Integer | 儿童数量 | `0` | `0` |

## 请求示例

### JavaScript (Fetch API)

```javascript
const searchParams = {
    checkin: '2025-11-21',
    checkout: '2025-11-22',
    adults: 2,
    children: 0,
    rooms: 1
};

const queryString = new URLSearchParams(searchParams).toString();
const response = await fetch(`http://160.16.67.238:5000/api/rooms/search?${queryString}`);
const result = await response.json();

console.log(result);
```

### cURL

```bash
curl -X GET "http://160.16.67.238:5000/api/rooms/search?checkin=2025-11-21&checkout=2025-11-22&adults=2&children=0&rooms=1"
```

### Python (requests)

```python
import requests

params = {
    'checkin': '2025-11-21',
    'checkout': '2025-11-22',
    'adults': 2,
    'children': 0,
    'rooms': 1
}

response = requests.get('http://160.16.67.238:5000/api/rooms/search', params=params)
result = response.json()
print(result)
```

## 响应格式

### 成功响应 (200 OK)

```json
{
    "success": true,
    "data": [
        {
            "room_type_code": "twin",
            "room_type_name": "ツインルーム【セミダブルベッド】",
            "room_type_name_en": "Twin Room with Semi-Double Beds",
            "room_size": "33㎡",
            "bed_type": "セミダブルベッド × 2台",
            "max_occupancy": 2,
            "base_price": 18000,
            "price_with_tax": 19800,
            "image_path": "img/rooms/double/room_2_500.jpg",
            "description": "快適なセミダブルベッドを2台配置したツインルームです。",
            "view_type": "山景色ビュー",
            "available_rooms": 5,
            "total_price": 19800,
            "nights": 1
        },
        {
            "room_type_code": "triple",
            "room_type_name": "トリプルルーム【シングルベッド】",
            "room_type_name_en": "Triple Room with Single Beds",
            "room_size": "33㎡",
            "bed_type": "シングルベッド × 3台",
            "max_occupancy": 3,
            "base_price": 20000,
            "price_with_tax": 22000,
            "image_path": "img/rooms/triple/room_3_500.jpg",
            "description": "3名様でのご利用に最適なトリプルルームです。",
            "view_type": "山景色ビュー",
            "available_rooms": 3,
            "total_price": 22000,
            "nights": 1
        }
    ],
    "count": 2
}
```

### 错误响应

#### 400 Bad Request - 缺少必填参数

```json
{
    "success": false,
    "message": "缺少必填参数: checkin, checkout, adults, rooms"
}
```

#### 400 Bad Request - 日期格式错误

```json
{
    "success": false,
    "message": "日期格式错误，请使用 YYYY-MM-DD 格式"
}
```

#### 400 Bad Request - 日期逻辑错误

```json
{
    "success": false,
    "message": "退房日期必须晚于入住日期"
}
```

#### 404 Not Found - 没有可用房间

```json
{
    "success": true,
    "data": [],
    "count": 0,
    "message": "没有符合条件的房间"
}
```

#### 500 Internal Server Error

```json
{
    "success": false,
    "message": "服务器内部错误"
}
```

## 响应字段说明

### 房间对象字段

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `room_type_code` | String | 房型代码 (twin/triple/twin_japanese/family) |
| `room_type_name` | String | 房型名称（日文） |
| `room_type_name_en` | String | 房型名称（英文） |
| `room_size` | String | 房间面积 |
| `bed_type` | String | 床型 |
| `max_occupancy` | Integer | 最大入住人数 |
| `base_price` | Integer | 基础价格（未含税） |
| `price_with_tax` | Integer | 含税价格（含10%消费税） |
| `image_path` | String | 房间图片路径 |
| `description` | String | 房间描述 |
| `view_type` | String | 景观类型 |
| `available_rooms` | Integer | 可用房间数量 |
| `total_price` | Integer | 总价（含税价格 × 入住晚数） |
| `nights` | Integer | 入住晚数 |

## 业务逻辑说明

### 价格计算
- 返回的价格已包含10%消费税
- `total_price` = `price_with_tax` × `nights`
- `nights` = `checkout` - `checkin` 的天数

### 库存检查
- API会自动检查指定日期范围内的房间库存
- 只返回有库存的房间类型
- `available_rooms` 显示该时间段内最少的可用房间数

### 过滤规则
- 自动过滤掉 `max_occupancy` < `adults` 的房型
- 只返回指定日期范围内有库存的房型

## 注意事项

1. **日期格式**: 必须使用 `YYYY-MM-DD` 格式，例如 `2025-11-21`
2. **时区**: 使用服务器本地时区
3. **最小入住**: 至少入住1晚
4. **人数限制**: `adults` 必须 ≤ 房型的 `max_occupancy`
5. **库存实时性**: 返回的 `available_rooms` 为实时库存，建议在预订前再次确认

## 错误处理建议

```javascript
try {
    const response = await fetch(apiUrl);
    const result = await response.json();

    if (!response.ok) {
        // HTTP错误
        console.error('HTTP Error:', response.status);
        alert(result.message || '搜索失败');
        return;
    }

    if (!result.success) {
        // API业务错误
        console.error('API Error:', result.message);
        alert(result.message);
        return;
    }

    if (result.data.length === 0) {
        // 没有可用房间
        alert('该日期没有可用房间，请更改搜索条件');
        return;
    }

    // 处理成功结果
    displayRooms(result.data);

} catch (error) {
    // 网络错误或其他异常
    console.error('Request Error:', error);
    alert('网络错误，请稍后重试');
}
```

## 完整示例代码

```javascript
async function searchRooms(checkin, checkout, adults, children = 0, rooms = 1) {
    const params = new URLSearchParams({
        checkin,
        checkout,
        adults: adults.toString(),
        children: children.toString(),
        rooms: rooms.toString()
    });

    const apiUrl = `http://160.16.67.238:5000/api/rooms/search?${params.toString()}`;

    try {
        const response = await fetch(apiUrl);

        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.message || 'API返回失败');
        }

        return result.data;

    } catch (error) {
        console.error('搜索房间失败:', error);
        throw error;
    }
}

// 使用示例
searchRooms('2025-11-21', '2025-11-22', 2, 0, 1)
    .then(rooms => {
        console.log('搜索结果:', rooms);
        console.log(`找到 ${rooms.length} 个可用房型`);
    })
    .catch(error => {
        console.error('错误:', error.message);
    });
```

## 联系支持

如有问题，请联系开发团队。
