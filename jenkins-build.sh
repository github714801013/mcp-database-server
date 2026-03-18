#!/bin/bash
set -e

# 进入源码目录
cd /home/devops/jenkins/workspace/mcp/mcp-database-server

# --- 步骤 1: 确保 Dockerfile.sse 存在 ---
# 我们在项目中已经提交了 Dockerfile.sse，直接使用它
if [ ! -f "Dockerfile.sse" ]; then
    echo "Error: Dockerfile.sse not found. Please ensure it is committed to the repository."
    exit 1
fi

# --- 步骤 2: 获取版本号 ---
# 使用 git commit hash 作为版本号，确保镜像唯一性
version=$(git rev-parse --short HEAD 2>/dev/null || echo "build-${BUILD_NUMBER}")
remote_docker_image="harbor.saas.ch999.cn:1088/common/mcp-database-server-sse:$version"

# --- 步骤 3: 基础镜像校验 (热修复) ---
# 确保 Dockerfile.sse 使用的是内部 Harbor 的基础镜像
sed -i 's|^FROM node:.*|FROM harbor.saas.ch999.cn:1088/common/node:20-alpine|g' Dockerfile.sse

# --- 步骤 4: 构建与推送 ---
echo "Building multi-db SSE image: $remote_docker_image"
docker build -t $remote_docker_image -f Dockerfile.sse .

echo "Pushing image to Harbor..."
docker push $remote_docker_image

# --- 步骤 5: 远程部署 ---
# 调用 10.1.250.157 上的 restart.sh 脚本
# 注意：该脚本在远程机器上应已配合更新后的 docker-compose.yml
echo "Triggering remote deployment on 10.1.250.157..."
ssh devops@10.1.250.157 -T "/home/devops/mcp-database-server/restart.sh $remote_docker_image"

# --- 步骤 6: 清理 ---
echo "Cleaning up dangling images..."
docker images -f "reference=*mcp-database-server-sse*" -f "dangling=true" -q | xargs -r docker rmi || true

echo "Jenkins Build & Deploy Successful."
