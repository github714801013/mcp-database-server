#!/bin/bash
echo "=== 测试 sqlite3 预编译二进制问题 ==="

echo "1. 检查当前环境..."
node --version
npm --version

echo "2. 模拟 Docker 环境步骤..."
echo "创建临时目录..."
TEMP_DIR=$(mktemp -d)
cd "$TEMP_DIR"

echo "创建测试 package.json..."
cat > package.json << 'EOF'
{
  "name": "test-sqlite3-binary",
  "version": "1.0.0",
  "dependencies": {
    "sqlite3": "5.1.7"
  }
}
EOF

echo "3. 安装 sqlite3（带scripts）..."
npm install --ignore-scripts 2>&1 | tail -30

echo "4. 检查安装后的文件..."
find ./node_modules/sqlite3 -name "*.node" 2>/dev/null || echo "未找到.node文件"

echo "5. 尝试运行 prebuild-install..."
cd ./node_modules/sqlite3
node -e "
const prebuildInstall = require('prebuild-install');
const path = require('path');
const opts = {
  pkg: require('./package.json'),
  arch: process.arch,
  platform: process.platform,
  debug: false,
  verbose: true,
  path: '.'
};

console.log('预编译选项:', JSON.stringify(opts, null, 2));
console.log('Node版本:', process.version);
console.log('平台:', process.platform, process.arch);
" 2>&1 | head -50

echo "6. 清理..."
cd /
rm -rf "$TEMP_DIR"

echo "=== 测试完成 ==="