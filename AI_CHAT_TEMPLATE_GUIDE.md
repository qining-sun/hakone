# Trip7 AI 聊天机器人 - 统一模板使用指南

## 📋 概述

Trip7 AI聊天机器人已经被制作成统一的可复用组件，类似于header和footer，可以轻松地在所有页面中使用。

## 📁 文件结构

```
yuzawa/
├── components/
│   └── ai-chat.html           # AI聊天机器人组件（HTML模板）
├── css/
│   └── ai-chat-styles.css     # AI聊天机器人样式
├── js/
│   ├── ai-chat-service.js     # AI聊天服务核心逻辑
│   └── load-ai-chat.js        # AI组件加载器（统一入口）
└── img/
    └── logo.ico               # AI头像图标
```

## 🚀 在页面中使用

### 方法一：推荐方式（自动加载）

只需在页面底部添加一行代码即可：

```html
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <title>页面标题</title>
    <!-- 其他CSS和meta标签 -->
</head>
<body>
    <!-- 页面内容 -->

    <!-- 其他脚本 -->
    <script src="js/load-navbar.js"></script>
    <script src="js/load-footer.js"></script>

    <!-- AI聊天机器人 - 统一模板 -->
    <script src="js/load-ai-chat.js"></script>
</body>
</html>
```

### 方法二：手动配置（高级用法）

如果需要自定义配置，可以手动引入：

```html
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <title>页面标题</title>
    <link rel="stylesheet" href="css/ai-chat-styles.css">
</head>
<body>
    <!-- 页面内容 -->

    <!-- AI聊天机器人容器 -->
    <div id="ai-chat-container"></div>

    <!-- Marked.js库 - 用于Markdown渲染 -->
    <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>

    <!-- AI聊天机器人脚本 -->
    <script src="js/ai-chat-service.js"></script>

    <!-- 初始化 -->
    <script>
    document.addEventListener('DOMContentLoaded', function() {
        window.aiChat = initAIFrontdesk({
            container: '#ai-chat-container',
            apiUrl: 'http://192.168.100.251:3000/api/ai-proxy', // 可自定义API地址
            timeout: 40000 // 可自定义超时时间
        });
    });
    </script>
</body>
</html>
```

## ✨ 功能特性

### 1. 自动语言检测
- 🌍 自动检测用户浏览器语言
- 支持中文（cn）、日文（jp）、英文（en）
- 用户可手动切换语言

### 2. 多语言界面
- **中文**: "欢迎来到Trip7汤泽温泉酒店！"
- **日文**: "Trip7湯沢温泉ホテルへようこそ！"
- **英文**: "Welcome to Yuzawa Machizukuri!"

### 3. Markdown支持
- AI回复支持Markdown格式
- 支持标题、列表、粗体、代码块等

### 4. 对话历史
- 自动保存对话历史
- 支持上下文理解

## 🎨 自定义配置

### 修改API地址

编辑 `components/ai-chat.html`:

```javascript
window.aiChat = initAIFrontdesk({
    container: '#ai-chat-container',
    apiUrl: 'https://your-api-domain.com/api/ai-proxy', // 修改这里
    timeout: 40000
});
```

### 修改样式

编辑 `css/ai-chat-styles.css`，可以自定义：
- 按钮颜色和样式
- 聊天窗口大小
- 消息气泡样式
- 动画效果

### 修改欢迎语

编辑 `js/ai-chat-service.js` 的 `updateLanguageDisplay` 函数:

```javascript
const langMap = {
    'cn': {
        flag: '🇨🇳',
        welcome: '您的自定义欢迎语...',
        // ...
    },
    // ...
};
```

## 📱 响应式设计

AI聊天机器人已完全适配移动端：
- 手机：全屏显示
- 平板：自适应窗口
- 桌面：固定在右下角

## 🔧 高级功能

### JavaScript API

```javascript
// 获取AI聊天实例
const aiChat = window.aiChat;

// 发送消息
aiChat.sendMessage('您好，我想预订房间');

// 清除对话历史
aiChat.clearHistory();

// 设置用户状态
aiChat.setUserStatus('Trip7湯沢温泉ホテル', 'user_12345');

// 切换语言
aiChat.setUserLanguage('cn'); // 'cn', 'jp', 'en'

// 获取当前语言
const currentLang = aiChat.getUserLanguage();
```

## 📝 已更新页面

以下页面已经使用统一模板：
- ✅ index.html
- ✅ rooms.html

## 🔄 迁移现有页面

如果其他页面还在使用旧的AI聊天代码，请按以下步骤迁移：

1. **移除旧的CSS引用**
   ```html
   <!-- 删除这些 -->
   <link rel="stylesheet" href="css/ai-chatbot.css">
   <link rel="stylesheet" href="css/ai-chatbot-tidio-style.css">
   <link rel="stylesheet" href="css/ai-chat-styles.css">
   ```

2. **移除旧的容器**
   ```html
   <!-- 删除这个 -->
   <div id="ai-chat-container"></div>
   ```

3. **移除旧的JS引用和初始化代码**
   ```html
   <!-- 删除这些 -->
   <script src="js/ai-chatbot.js"></script>
   <script src="js/ai-chatbot-tidio.js"></script>
   <script src="js/ai-chat-service.js"></script>
   <script>
   // 删除旧的初始化代码
   </script>
   ```

4. **添加新的加载器**
   ```html
   <!-- 只需添加这一行 -->
   <script src="js/load-ai-chat.js"></script>
   ```

## ❓ 常见问题

### Q: 为什么AI聊天按钮没有显示？
A: 检查浏览器控制台是否有错误，确保 `js/load-ai-chat.js` 正确加载。

### Q: 如何修改聊天按钮的位置？
A: 编辑 `css/ai-chat-styles.css` 中的 `#ai-chat-container` 样式。

### Q: 如何禁用某个页面的AI聊天功能？
A: 不要在该页面引入 `load-ai-chat.js` 即可。

### Q: 如何测试Markdown渲染？
A: 在浏览器控制台运行 `window.testMarkdown()` 查看测试消息。

## 🎯 优势

✅ **统一管理**: 所有页面使用相同的AI组件，便于维护
✅ **一键部署**: 只需一行代码即可添加AI聊天功能
✅ **自动更新**: 修改组件文件后，所有页面自动生效
✅ **配置简单**: 支持自定义配置，也可使用默认设置
✅ **性能优化**: 按需加载，不影响页面加载速度

## 📞 支持

如有问题，请查看：
- 浏览器控制台日志
- `AI_CHATBOT_README.md` （详细功能说明）
- 联系开发团队

---

**最后更新**: 2025-10-30
**版本**: 1.0.0
