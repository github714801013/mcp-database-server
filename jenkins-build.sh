#!/bin/bash
set -e

# 进入源码目录
cd /home/devops/jenkins/workspace/mcp/mcp-database-server

# --- 步骤 1: 核心恢复逻辑 ---
if [ -d ".git" ]; then
    git checkout -- Dockerfile
    echo "Dockerfile has been restored to original state via Git."
else
    echo "Warning: .git directory not found, skipping restore."
fi

# --- 步骤 2: 获取版本号 ---
version=$(git rev-parse --short HEAD 2>/dev/null || echo "build-${BUILD_NUMBER}")
remote_docker_image="harbor.saas.ch999.cn:1088/common/mcp-database-server:$version"

# --- 步骤 3: 热修复逻辑 (简化版) ---
# 仅替换基础镜像
sed -i 's|^FROM node:.*|FROM harbor.saas.ch999.cn:1088/common/node:20-alpine|g' Dockerfile

# 注意：以下热修复已被移除，因为已内置到 Dockerfile 中：
# - python3/make/g++ 安装 (已在 Dockerfile 中)
# - --ignore-scripts (已在 Dockerfile 中)
# - npm rebuild sqlite3 (已在 Dockerfile 中)
# - npm run build (已在 Dockerfile 中)
# - mcp-proxy 安装 (已在 Dockerfile 中)
# - dist/src/index.js 路径修正 (已在 Dockerfile 中)

# --- 步骤 4: 打包推送与部署 ---
docker build -t $remote_docker_image .
docker push $remote_docker_image

ssh devops@10.1.250.157 -T "/home/devops/mcp-database-server/restart.sh $remote_docker_image"

# 清理
docker images -f "reference=*mcp-database-server*" -f "dangling=true" -q | xargs -r docker rmi || true