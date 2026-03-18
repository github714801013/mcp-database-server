#!/bin/bash
set -e

echo "=== 测试 Docker 构建问题 ==="
echo "创建测试目录..."
TEST_DIR=$(mktemp -d)
cd "$TEST_DIR"

echo "复制必要的文件..."
cat > package.json << 'EOF'
{
  "name": "test-sqlite3",
  "version": "1.0.0",
  "dependencies": {
    "sqlite3": "5.1.7"
  }
}
EOF

cat > Dockerfile.test << 'EOF'
FROM harbor.saas.ch999.cn:1088/common/node:20-alpine

# 安装编译依赖（sqlite3 需要）
RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package*.json ./

# 测试不同的安装方法
RUN echo "=== 方法1: 正常安装（带scripts）===" && \
    npm ci --legacy-peer-deps 2>&1 | tail -50

RUN echo "=== 方法2: 使用 --ignore-scripts ===" && \
    npm ci --ignore-scripts --legacy-peer-deps 2>&1 | tail -50 && \
    echo "检查绑定文件..." && \
    find /app/node_modules/sqlite3 -name "*.node" 2>/dev/null || echo "未找到.node文件"

RUN echo "=== 方法3: 使用 --ignore-scripts 然后重建 ===" && \
    npm ci --ignore-scripts --legacy-peer-deps && \
    echo "运行 npm rebuild sqlite3..." && \
    npm rebuild sqlite3 2>&1 | tail -50 && \
    echo "检查绑定文件..." && \
    find /app/node_modules/sqlite3 -name "*.node" 2>/dev/null || echo "未找到.node文件"

CMD ["node", "-e", "console.log('测试完成')"]
EOF

echo "构建测试镜像..."
docker build -f Dockerfile.test -t test-sqlite3 .

echo "运行测试容器..."
docker run --rm test-sqlite3

echo "清理..."
cd /
rm -rf "$TEST_DIR"
docker rmi test-sqlite3 || true

echo "=== 测试完成 ==="