#!/bin/sh

# 检查 SSL 证书是否存在
if [ -f /etc/letsencrypt/live/yuzawamd.com/fullchain.pem ] && [ -f /etc/letsencrypt/live/yuzawamd.com/privkey.pem ]; then
    echo "SSL 证书已存在，使用 HTTPS 配置"
    cp /etc/nginx/conf.d/nginx-https.conf.template /etc/nginx/conf.d/default.conf
else
    echo "SSL 证书不存在，使用 HTTP-only 配置"
    cp /etc/nginx/conf.d/nginx-http-only.conf.template /etc/nginx/conf.d/default.conf
fi

# 测试 nginx 配置
nginx -t

# 启动 nginx
exec nginx -g 'daemon off;'
