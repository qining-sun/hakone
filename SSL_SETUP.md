# SSL 证书配置说明

## 域名配置
- 主域名: yuzawamd.com
- 子域名: www.yuzawamd.com

## 部署步骤

### 1. 确保域名已解析到服务器
```bash
# 检查 DNS 解析
dig yuzawamd.com
dig www.yuzawamd.com
```

### 2. 在 Debian 服务器上部署

```bash
# 上传项目文件到服务器
# 然后构建并启动容器
docker-compose up -d --build

# 查看日志
docker logs hotel-web
```

### 3. 申请 Let's Encrypt 证书

```bash
# 进入容器
docker exec -it hotel-web sh

# 申请证书
certbot certonly --webroot -w /usr/share/nginx/html \
  -d yuzawamd.com -d www.yuzawamd.com \
  --email chenzk@softusing.co.jp \
  --agree-tos --no-eff-email

# 退出容器
exit

# 重启容器以加载证书
docker-compose restart
```

### 4. 设置自动续期

```bash
# 在宿主机添加定时任务
crontab -e

# 添加以下行(每天凌晨2点检查续期)
0 2 * * * docker exec hotel-web certbot renew --quiet && docker-compose restart hotel-web
```

### 5. 验证 HTTPS

访问 https://yuzawamd.com 和 https://www.yuzawamd.com 检查证书是否正常。

## 防火墙配置

```bash
# 确保防火墙开放 80 和 443 端口
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw reload
```

## 证书管理

```bash
# 查看证书信息
docker exec hotel-web certbot certificates

# 手动续期
docker exec hotel-web certbot renew

# 测试续期
docker exec hotel-web certbot renew --dry-run
```

## 注意事项

1. 首次部署时,HTTP 会自动重定向到 HTTPS
2. 证书有效期 90 天,需要定期续期(自动续期已配置)
3. 证书保存在 Docker volume `letsencrypt` 中
4. 如果证书申请失败,检查域名解析和 80 端口是否可访问
