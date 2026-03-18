#!/bin/bash
echo "=== 验证 sqlite3 修复方案 ==="

echo "1. 模拟修复后的安装步骤..."
TEMP_DIR=$(mktemp -d)
cd "$TEMP_DIR"

echo "2. 创建测试 package.json (模拟项目依赖)..."
cat > package.json << 'EOF'
{
  "name": "test-mcp-database-server",
  "version": "1.0.0",
  "dependencies": {
    "@modelcontextprotocol/sdk": "1.9.0",
    "mssql": "11.0.1",
    "mysql2": "^3.14.1",
    "node-sql-parser": "^5.3.13",
    "pg": "^8.11.3",
    "sqlite3": "5.1.7"
  }
}
EOF

echo "3. 安装依赖（不带 --ignore-scripts）..."
if npm install --legacy-peer-deps 2>&1 | tail -100; then
  echo "✓ npm install 成功"
else
  echo "✗ npm install 失败"
  exit 1
fi

echo "4. 检查 sqlite3 绑定文件..."
if find ./node_modules/sqlite3 -name "*.node" 2>/dev/null | grep -q "."; then
  echo "✓ 找到 sqlite3 绑定文件:"
  find ./node_modules/sqlite3 -name "*.node" 2>/dev/null
else
  echo "✗ 未找到 sqlite3 绑定文件"
  echo "检查 build 目录..."
  ls -la ./node_modules/sqlite3/build/ 2>/dev/null || echo "build目录不存在"
  exit 1
fi

echo "5. 测试 sqlite3 模块是否可以加载..."
cat > test_sqlite.js << 'EOF'
try {
  const sqlite3 = require('./node_modules/sqlite3');
  console.log('✓ sqlite3 模块加载成功');
  console.log('sqlite3 版本:', sqlite3.VERSION);
  process.exit(0);
} catch (error) {
  console.error('✗ sqlite3 模块加载失败:', error.message);
  if (error.message.includes('bindings')) {
    console.error('错误类型: 绑定文件问题');
  }
  process.exit(1);
}
EOF

if node test_sqlite.js; then
  echo "✓ sqlite3 模块测试通过"
else
  echo "✗ sqlite3 模块测试失败"
  exit 1
fi

echo "6. 清理..."
cd /
rm -rf "$TEMP_DIR"

echo "=== 验证完成：修复方案应该能解决绑定文件缺失问题 ==="
echo "注意：实际Docker构建还需要验证Alpine Linux特定的编译环境"