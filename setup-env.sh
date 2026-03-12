#!/bin/bash
# MCP Database Server 环境激活脚本
# 使用方法: source setup-env.sh 或 . setup-env.sh

echo "========================================"
echo "MCP Database Server 环境设置"
echo "========================================"
echo

# 检查 conda 是否可用
if ! command -v conda &> /dev/null; then
    echo "[错误] 未找到 conda，请确保 Anaconda/Miniconda 已安装"
    return 1
fi

# 激活 conda 环境
echo "[1/3] 激活 conda 环境: mcp-database"
conda activate mcp-database
if [ $? -ne 0 ]; then
    echo "[错误] 无法激活 mcp-database 环境"
    echo "       请先运行: conda create -n mcp-database python=3.11 nodejs=20 -y"
    return 1
fi

# 显示版本信息
echo "[2/3] 环境信息:"
echo "      Python: $(python --version 2>&1)"
echo "      Node.js: $(node --version 2>&1)"

# 检查 node_modules 是否存在
if [ ! -d "node_modules" ]; then
    echo "[3/3] 安装项目依赖..."
    npm install
else
    echo "[3/3] 项目依赖已安装"
fi

echo
echo "========================================"
echo "环境设置完成！"
echo ""
echo "使用方法:"
echo "  开发模式: npm run dev"
echo "  构建:     npm run build"
echo "  启动:     npm run start -- <database_path>"
echo ""
echo "安全参数:"
echo "  --allow-drop    启用 DROP TABLE 操作"
echo "  --allow-delete  启用 DELETE 操作"
echo "  --allow-update  启用 UPDATE 操作"
echo "  --allow-alter   启用 ALTER TABLE 操作"
echo "  --allow-all     启用所有危险操作"
echo "========================================"