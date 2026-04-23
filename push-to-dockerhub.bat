@echo off
REM Docker Hub 推送脚本 (Windows批处理版本)
REM 使用方法: push-to-dockerhub.bat <your-dockerhub-username> [version]

if "%1"=="" (
    echo 错误: 请提供Docker Hub用户名
    echo 使用方法: push-to-dockerhub.bat ^<your-dockerhub-username^> [version]
    echo 例如: push-to-dockerhub.bat myusername latest
    exit /b 1
)

set DOCKERHUB_USERNAME=%1
set IMAGE_NAME=hakone-web
set VERSION=%2
if "%VERSION%"=="" set VERSION=latest

echo =========================================
echo 推送镜像到Docker Hub
echo =========================================
echo 用户名: %DOCKERHUB_USERNAME%
echo 镜像名: %IMAGE_NAME%
echo 版本: %VERSION%
echo =========================================
echo.

REM 登录Docker Hub
echo 步骤 1/3: 登录Docker Hub...
docker login
if errorlevel 1 (
    echo 错误: Docker Hub登录失败
    exit /b 1
)
echo.

REM 打标签
echo 步骤 2/3: 打标签...
docker tag hakone-web:latest %DOCKERHUB_USERNAME%/%IMAGE_NAME%:%VERSION%
if errorlevel 1 (
    echo 错误: 打标签失败
    exit /b 1
)
echo.

REM 推送镜像
echo 步骤 3/3: 推送镜像...
docker push %DOCKERHUB_USERNAME%/%IMAGE_NAME%:%VERSION%
if errorlevel 1 (
    echo 错误: 推送失败
    exit /b 1
)
echo.

echo =========================================
echo ✓ 成功推送镜像!
echo 镜像地址: %DOCKERHUB_USERNAME%/%IMAGE_NAME%:%VERSION%
echo =========================================
echo.
echo 接下来更新 k8s/deployment.yaml 中的镜像地址:
echo   image: %DOCKERHUB_USERNAME%/%IMAGE_NAME%:%VERSION%
echo.
