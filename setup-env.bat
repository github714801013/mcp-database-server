@echo off
REM MCP Database Server 环境激活脚本
REM 使用方法: 运行此脚本后，将自动激活 conda 环境并安装项目依赖

echo ========================================
echo MCP Database Server 环境设置
echo ========================================
echo.

REM 检查 conda 是否可用
where conda >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未找到 conda，请确保 Anaconda/Miniconda 已安装并添加到 PATH
    exit /b 1
)

REM 激活 conda 环境
echo [1/3] 激活 conda 环境: mcp-database
call conda activate mcp-database
if %errorlevel% neq 0 (
    echo [错误] 无法激活 mcp-database 环境
    echo        请先运行: conda create -n mcp-database python=3.11 nodejs=20 -y
    exit /b 1
)

REM 显示版本信息
echo [2/3] 环境信息:
echo       Python: $(python --version)
echo       Node.js: $(node --version)

REM 检查 node_modules 是否存在
if not exist "node_modules" (
    echo [3/3] 安装项目依赖...
    call npm install
) else (
    echo [3/3] 依赖已安装，跳过
)

echo.
echo ========================================
echo 环境已就绪!
echo.
echo 使用方法:
echo   - 编译项目: npm run build
echo   - 启动服务: npm start -- ^<database_path^>
echo   - 安全参数: --allow-drop --allow-delete --allow-update --allow-alter
echo ========================================