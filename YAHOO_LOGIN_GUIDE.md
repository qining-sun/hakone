# Yahoo ID 登录接入教程

## 目录
1. [Yahoo 开发者账号设置](#1-yahoo-开发者账号设置)
2. [获取 OAuth 凭证](#2-获取-oauth-凭证)
3. [后端实现](#3-后端实现)
4. [前端实现](#4-前端实现)
5. [测试流程](#5-测试流程)

---

## 1. Yahoo 开发者账号设置

### 1.1 注册 Yahoo 开发者账号

1. 访问 Yahoo Developer Network: https://developer.yahoo.com/
2. 点击右上角 "Sign In" 使用你的 Yahoo 账号登录
3. 如果没有 Yahoo 账号，先注册一个: https://login.yahoo.com/

### 1.2 创建应用

1. 登录后访问: https://developer.yahoo.com/apps/
2. 点击 "Create an App" 按钮
3. 填写应用信息：
   - **Application Name**: Trip7湯沢天空温泉ホテル (或你的应用名称)
   - **Application Type**: 选择 "Web Application"
   - **Description**: 描述你的应用
   - **Home Page URL**: `http://160.16.67.238` 或 `https://yourdomain.com`
   - **Redirect URI(s)**:
     ```
     http://localhost:3000/api/auth/yahoo/callback
     http://160.16.67.238:5000/api/auth/yahoo/callback
     https://yourdomain.com/api/auth/yahoo/callback
     ```
   - **API Permissions**: 勾选需要的权限
     - OpenID Connect Permissions
     - Profile (Read/Write) - 用于获取用户信息

4. 点击 "Create App" 创建应用

---

## 2. 获取 OAuth 凭证

创建应用后，你会看到：

```
Client ID: xxxxxxxxxxxxxxxxxxx
Client Secret: yyyyyyyyyyyyyyyyyyyyyyyy
```

**重要：** 保存这两个值，Client Secret 只显示一次！

---

## 3. 后端实现

### 3.1 安装依赖

```bash
cd C:\xampp\htdocs\yuzawa-api\api
npm install passport-yahoo-oauth2
```

### 3.2 配置环境变量

编辑 `.env` 文件（如果没有则创建）：

```env
# Yahoo OAuth
YAHOO_CLIENT_ID=your_client_id_here
YAHOO_CLIENT_SECRET=your_client_secret_here
YAHOO_CALLBACK_URL=http://160.16.67.238:5000/api/auth/yahoo/callback
```

### 3.3 创建 Yahoo 策略配置

创建文件: `C:\xampp\htdocs\yuzawa-api\api\config\passport-yahoo.js`

```javascript
const passport = require('passport');
const YahooStrategy = require('passport-yahoo-oauth2').Strategy;
const User = require('../models/User');

passport.use(new YahooStrategy({
    clientID: process.env.YAHOO_CLIENT_ID,
    clientSecret: process.env.YAHOO_CLIENT_SECRET,
    callbackURL: process.env.YAHOO_CALLBACK_URL
  },
  async function(accessToken, refreshToken, profile, done) {
    try {
      console.log('Yahoo Profile:', profile);

      // 从 Yahoo profile 获取信息
      const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;

      if (!email) {
        return done(null, false, { message: 'メールアドレスが取得できませんでした' });
      }

      // 查找或创建用户
      let user = await User.findByEmail(email);

      if (!user) {
        // 创建新用户
        const userData = {
          email: email,
          first_name: profile.name?.givenName || '',
          last_name: profile.name?.familyName || '',
          auth_provider: 'yahoo',
          auth_provider_id: profile.id,
          email_verified: true // Yahoo 账号默认已验证
        };

        user = await User.create(userData);
        console.log('✓ 新用户已创建:', user.user_id);
      } else {
        // 更新现有用户的 Yahoo 信息
        if (!user.auth_provider || user.auth_provider === 'local') {
          await User.update(user.user_id, {
            auth_provider: 'yahoo',
            auth_provider_id: profile.id
          });
        }
        console.log('✓ 现有用户已登录:', user.user_id);
      }

      return done(null, user);

    } catch (error) {
      console.error('Yahoo 认证错误:', error);
      return done(error, null);
    }
  }
));

module.exports = passport;
```

### 3.4 创建 Yahoo 登录路由

创建文件: `C:\xampp\htdocs\yuzawa-api\api\routes\yahooAuth.js`

```javascript
const express = require('express');
const router = express.Router();
const passport = require('../config/passport-yahoo');

// Yahoo 登录入口
router.get('/yahoo',
  passport.authenticate('yahoo', {
    scope: ['openid', 'email', 'profile']
  })
);

// Yahoo 登录回调
router.get('/yahoo/callback',
  passport.authenticate('yahoo', {
    failureRedirect: '/login.html?error=yahoo_login_failed',
    session: true
  }),
  function(req, res) {
    // 登录成功，重定向到预约页面
    res.redirect('/reservation.html');
  }
);

module.exports = router;
```

### 3.5 注册路由

在 `server.js` 中添加：

```javascript
// 在其他路由之前添加
const yahooAuthRoutes = require('./routes/yahooAuth');

// 注册路由
app.use('/api/auth', yahooAuthRoutes);
```

### 3.6 更新 User 模型

确保 `User.js` 模型支持 OAuth 字段：

```javascript
// 在 User.create 方法中添加字段
static async create(userData) {
    const query = `
        INSERT INTO users (
            email,
            password_hash,
            first_name,
            last_name,
            auth_provider,
            auth_provider_id,
            email_verified
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
        userData.email,
        userData.password_hash || null,
        userData.first_name || null,
        userData.last_name || null,
        userData.auth_provider || 'local',
        userData.auth_provider_id || null,
        userData.email_verified || false
    ];

    // ... 执行查询
}
```

### 3.7 数据库添加字段（如果还没有）

```sql
ALTER TABLE users
ADD COLUMN auth_provider VARCHAR(20) DEFAULT 'local',
ADD COLUMN auth_provider_id VARCHAR(255),
ADD COLUMN email_verified BOOLEAN DEFAULT FALSE;
```

---

## 4. 前端实现

### 4.1 修改登录页面

在 `login.html` 中添加 Yahoo 登录按钮：

找到社交登录按钮区域（大约在第764行附近），添加：

```html
<div class="social-auth-buttons">
    <!-- Google 登录按钮 -->
    <button class="social-auth-btn google-auth" id="google-login-btn">
        <i class="fab fa-google"></i>
        <span>Googleでログイン</span>
    </button>

    <!-- Yahoo 登录按钮 - 新增 -->
    <button class="social-auth-btn yahoo-auth" id="yahoo-login-btn">
        <i class="fab fa-yahoo"></i>
        <span>Yahooでログイン</span>
    </button>
</div>
```

### 4.2 添加 CSS 样式

在 `login.html` 的 `<style>` 标签中添加：

```css
/* Yahoo 登录按钮样式 */
.yahoo-auth {
    background: linear-gradient(135deg, #6001d2 0%, #7d00ff 100%);
    color: white;
}

.yahoo-auth:hover {
    background: linear-gradient(135deg, #5001b8 0%, #6a00d9 100%);
    transform: translateY(-2px);
}

.yahoo-auth i {
    color: white;
}
```

### 4.3 添加 JavaScript 事件

在 `login.html` 的底部脚本区域添加：

```javascript
// Yahoo 登录按钮点击事件
document.getElementById('yahoo-login-btn')?.addEventListener('click', () => {
    console.log('Yahoo 登录');
    // 跳转到 Yahoo OAuth 认证页面
    window.location.href = window.getApiUrl('/auth/yahoo');
});
```

---

## 5. 测试流程

### 5.1 启动服务器

```bash
cd C:\xampp\htdocs\yuzawa-api\api
node server.js
```

确保看到：
```
✓ Server running on port 5000
```

### 5.2 测试登录

1. 打开浏览器访问: `http://localhost/login.html` 或 `http://160.16.67.238/login.html`
2. 点击 "Yahooでログイン" 按钮
3. 应该会跳转到 Yahoo 登录页面
4. 使用 Yahoo 账号登录并授权
5. 授权后会跳转回你的应用
6. 成功后应该跳转到 `reservation.html`

### 5.3 调试

在浏览器开发者工具 Console 中查看：
- 是否有错误信息
- 网络请求是否成功

在服务器端查看日志：
```
Yahoo Profile: { id: '...', emails: [...], ... }
✓ 新用户已创建: 123
```

---

## 6. 常见问题

### Q1: 重定向 URI 不匹配
**错误**: `redirect_uri_mismatch`

**解决**:
1. 检查 Yahoo Developer Console 中的 Redirect URI 配置
2. 确保完全匹配（包括 http/https、端口号）
3. 重启服务器

### Q2: 无法获取用户邮箱
**错误**: `メールアドレスが取得できませんでした`

**解决**:
1. 确保在 Yahoo App 设置中勾选了 "Profile (Read)" 权限
2. 在 OAuth 请求中包含 `scope: ['email', 'profile']`
3. 用户授权时必须同意共享邮箱

### Q3: Session 不工作
**错误**: 登录后仍然显示未登录

**解决**:
1. 检查 `express-session` 配置
2. 确保 `passport.initialize()` 和 `passport.session()` 已注册
3. 检查 cookie 设置

---

## 7. 安全建议

1. **生产环境必须使用 HTTPS**
2. **不要在前端暴露 Client Secret**
3. **定期更换 Client Secret**
4. **限制 Redirect URI 只包含你的域名**
5. **验证用户邮箱是否已验证**

---

## 8. Yahoo OAuth 2.0 文档

官方文档: https://developer.yahoo.com/oauth2/guide/

---

## 完成！

现在你的应用已经支持 Yahoo ID 登录了。用户可以选择：
- 邮箱密码登录
- Google 登录
- Yahoo 登录

所有登录方式都会创建统一的用户账号，方便管理。
