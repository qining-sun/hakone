# 使用nginx作为基础镜像
FROM nginx:alpine

# 安装 certbot 用于 SSL 证书
RUN apk add --no-cache certbot certbot-nginx

# 设置工作目录
WORKDIR /usr/share/nginx/html

# 删除nginx默认页面
RUN rm -rf /usr/share/nginx/html/*

# 复制项目文件到nginx目录
COPY . /usr/share/nginx/html/

# 复制nginx配置模板
COPY nginx-http-only.conf /etc/nginx/conf.d/nginx-http-only.conf.template
COPY nginx.conf /etc/nginx/conf.d/nginx-https.conf.template

# 复制启动脚本
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# 创建证书目录
RUN mkdir -p /etc/letsencrypt

# 暴露80和443端口
EXPOSE 80 443

# 使用启动脚本
ENTRYPOINT ["/docker-entrypoint.sh"]
