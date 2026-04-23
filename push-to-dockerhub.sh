#!/bin/bash

# Docker Hub 推送脚本
# 使用方法: ./push-to-dockerhub.sh <your-dockerhub-username>

if [ -z "$1" ]; then
    echo "错误: 请提供Docker Hub用户名"
    echo "使用方法: ./push-to-dockerhub.sh <your-dockerhub-username>"
    exit 1
fi

DOCKERHUB_USERNAME=$1
IMAGE_NAME="hakone-web"
VERSION=${2:-"latest"}

echo "========================================="
echo "推送镜像到Docker Hub"
echo "========================================="
echo "用户名: $DOCKERHUB_USERNAME"
echo "镜像名: $IMAGE_NAME"
echo "版本: $VERSION"
echo "========================================="

# 登录Docker Hub
echo "步骤 1/3: 登录Docker Hub..."
docker login

if [ $? -ne 0 ]; then
    echo "错误: Docker Hub登录失败"
    exit 1
fi

# 打标签
echo "步骤 2/3: 打标签..."
docker tag hakone-web:latest $DOCKERHUB_USERNAME/$IMAGE_NAME:$VERSION

if [ $? -ne 0 ]; then
    echo "错误: 打标签失败"
    exit 1
fi

# 推送镜像
echo "步骤 3/3: 推送镜像..."
docker push $DOCKERHUB_USERNAME/$IMAGE_NAME:$VERSION

if [ $? -ne 0 ]; then
    echo "错误: 推送失败"
    exit 1
fi

echo "========================================="
echo "✓ 成功推送镜像!"
echo "镜像地址: $DOCKERHUB_USERNAME/$IMAGE_NAME:$VERSION"
echo "========================================="
echo ""
echo "接下来更新 k8s/deployment.yaml 中的镜像地址:"
echo "  image: $DOCKERHUB_USERNAME/$IMAGE_NAME:$VERSION"
