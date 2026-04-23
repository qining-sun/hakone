# nginx 静态服务器（SSL 由外层 nginx-proxy 管理）
FROM nginx:alpine

WORKDIR /usr/share/nginx/html

# 清空默认页面
RUN rm -rf /usr/share/nginx/html/*

# 复制站点文件
COPY . /usr/share/nginx/html/

# 用我们的 nginx 配置覆盖默认
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
