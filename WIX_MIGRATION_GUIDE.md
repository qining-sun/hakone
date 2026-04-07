# Wix 网站迁移指南

本指南将帮助您将 Wix 网站迁移到静态网站项目或其他平台。

## 📋 迁移前准备

### 1. 备份 Wix 网站内容
- 登录 Wix 编辑器
- 导出所有图片和媒体文件
- 记录所有页面结构和内容
- 保存所有文本内容（复制到文档中）

### 2. 收集必要信息
- [ ] 网站域名信息
- [ ] 所有页面列表
- [ ] 图片和媒体文件
- [ ] 联系表单配置
- [ ] SEO 设置（meta 标签、描述等）
- [ ] 自定义代码片段
- [ ] 第三方集成（Google Analytics、社交媒体等）

## 🔧 迁移步骤

### 步骤 1: 导出内容

#### 1.1 导出图片和媒体
1. 在 Wix 编辑器中，右键点击图片
2. 选择"下载"或"另存为"
3. 将所有图片保存到本地文件夹（建议按页面分类）
4. 重命名图片文件，使用有意义的名称

#### 1.2 提取文本内容
1. 逐个页面访问并复制所有文本内容
2. 保存到文档中，标注对应的页面
3. 记录文本的格式（标题、段落、列表等）

#### 1.3 获取 HTML 结构
1. 在浏览器中打开 Wix 网站
2. 右键点击页面 → "检查"（开发者工具）
3. 查看 HTML 结构，了解页面布局
4. 截图保存页面布局参考

### 步骤 2: 迁移到静态网站

#### 2.1 创建页面结构
```html
<!-- 示例：创建新页面 -->
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>页面标题</title>
    <link rel="stylesheet" href="css/style.css">
</head>
<body>
    <!-- 页面内容 -->
</body>
</html>
```

#### 2.2 迁移图片资源
1. 将导出的图片放入 `img/` 目录
2. 按页面或功能分类组织（如 `img/about/`, `img/gallery/`）
3. 更新 HTML 中的图片路径

#### 2.3 迁移样式
1. 在浏览器开发者工具中查看 Wix 页面的 CSS
2. 提取关键样式规则
3. 添加到项目的 CSS 文件中
4. 注意响应式设计（移动端适配）

#### 2.4 迁移 JavaScript 功能
1. 检查 Wix 网站使用的 JavaScript 功能
2. 识别需要迁移的交互功能（表单、轮播图、菜单等）
3. 使用原生 JavaScript 或库（如 jQuery）重新实现

### 步骤 3: 功能迁移

#### 3.1 联系表单
如果原网站有联系表单，需要：
- 创建 HTML 表单
- 设置表单处理（可以使用 PHP、Node.js 或第三方服务）
- 配置邮件发送功能

```html
<!-- 示例联系表单 -->
<form action="api/contact.php" method="POST">
    <input type="text" name="name" placeholder="姓名" required>
    <input type="email" name="email" placeholder="邮箱" required>
    <textarea name="message" placeholder="留言" required></textarea>
    <button type="submit">发送</button>
</form>
```

#### 3.2 SEO 设置
迁移 SEO 信息：
- 页面标题（`<title>`）
- Meta 描述（`<meta name="description">`）
- Open Graph 标签（社交媒体分享）
- 结构化数据（Schema.org）

```html
<head>
    <title>页面标题 - 网站名称</title>
    <meta name="description" content="页面描述">
    <meta property="og:title" content="页面标题">
    <meta property="og:description" content="页面描述">
    <meta property="og:image" content="https://yoursite.com/img/og-image.jpg">
</head>
```

#### 3.3 第三方集成
迁移以下服务：
- **Google Analytics**: 添加跟踪代码
- **Google Search Console**: 提交新网站地图
- **社交媒体链接**: 更新社交媒体图标和链接
- **支付系统**: 如果使用 Stripe、PayPal 等，重新配置

### 步骤 4: 域名和托管

#### 4.1 域名配置
1. 在域名注册商处修改 DNS 设置
2. 指向新的托管服务器
3. 等待 DNS 传播（通常 24-48 小时）

#### 4.2 部署网站
根据您的托管方式：
- **静态托管**: GitHub Pages, Netlify, Vercel
- **VPS/服务器**: 使用 Nginx 或 Apache
- **Docker**: 使用项目中的 Dockerfile 部署

### 步骤 5: 测试和优化

#### 5.1 功能测试
- [ ] 所有页面正常加载
- [ ] 图片显示正常
- [ ] 链接工作正常
- [ ] 表单提交功能正常
- [ ] 移动端响应式设计正常
- [ ] 浏览器兼容性测试

#### 5.2 性能优化
- 压缩图片（使用工具如 TinyPNG）
- 优化 CSS 和 JavaScript（压缩、合并）
- 启用 Gzip 压缩
- 使用 CDN 加速静态资源

#### 5.3 SEO 优化
- 提交网站地图（sitemap.xml）
- 检查所有页面的 SEO 设置
- 设置 301 重定向（如果 URL 结构改变）
- 提交到 Google Search Console

## 🛠️ 实用工具

### 内容提取工具
- **HTTrack Website Copier**: 下载整个网站
- **SingleFile**: 浏览器扩展，保存完整网页
- **Wget**: 命令行工具下载网站

### 图片优化
- **TinyPNG**: 在线图片压缩
- **ImageOptim**: 批量图片优化
- **Squoosh**: Google 的图片压缩工具

### 代码工具
- **VS Code**: 代码编辑器
- **Prettier**: 代码格式化
- **Browser DevTools**: 浏览器开发者工具

## ⚠️ 注意事项

1. **版权问题**: 确保您有权迁移所有内容
2. **第三方服务**: 某些 Wix 应用可能无法直接迁移
3. **数据库内容**: 如果有动态内容，需要导出数据库
4. **邮件服务**: 联系表单需要配置邮件发送服务
5. **SSL 证书**: 确保新网站有 HTTPS 支持

## 📝 迁移检查清单

### 内容迁移
- [ ] 所有页面内容已迁移
- [ ] 所有图片已下载并上传
- [ ] 所有文本内容已复制
- [ ] 页面结构已重建

### 功能迁移
- [ ] 导航菜单正常工作
- [ ] 联系表单正常工作
- [ ] 社交媒体链接已更新
- [ ] 搜索功能（如有）已实现

### 技术设置
- [ ] 域名 DNS 已配置
- [ ] SSL 证书已安装
- [ ] 网站地图已创建
- [ ] 404 错误页面已设置
- [ ] 301 重定向已配置（如需要）

### SEO 和性能
- [ ] Meta 标签已设置
- [ ] 图片已优化
- [ ] 代码已压缩
- [ ] Google Analytics 已配置
- [ ] 网站已提交到搜索引擎

## 🔗 相关资源

- [Wix 导出指南](https://support.wix.com/)
- [静态网站托管对比](https://www.staticgen.com/)
- [SEO 最佳实践](https://developers.google.com/search/docs)

## 💡 针对本项目的迁移建议

基于您的项目结构（yuzawa 温泉旅馆网站），建议：

1. **保持设计一致性**: 迁移时保持与现有页面风格一致
2. **使用现有组件**: 利用项目中的 `components/` 目录（navbar, footer）
3. **遵循现有结构**: 按照现有 HTML/CSS/JS 的组织方式添加新页面
4. **测试响应式**: 确保移动端显示正常
5. **多语言支持**: 如果原网站有中英文，保持多语言结构

## 📞 需要帮助？

如果在迁移过程中遇到问题：
1. 检查浏览器控制台是否有错误
2. 验证文件路径是否正确
3. 检查服务器配置（Nginx/Apache）
4. 查看项目文档（README.md, API_PORTS.md）

---

**最后更新**: 2024年
**适用项目**: yuzawa 温泉旅馆网站


