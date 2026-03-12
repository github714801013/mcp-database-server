[![MseeP.ai Security Assessment Badge](https://mseep.net/pr/executeautomation-mcp-database-server-badge.png)](https://mseep.ai/app/executeautomation-mcp-database-server)

# MCP Database Server

This MCP (Model Context Protocol) server provides database access capabilities to Claude, supporting SQLite, SQL Server, PostgreSQL, and MySQL databases.

## Installation

1. Clone the repository:
```
git clone https://github.com/executeautomation/mcp-database-server.git
cd mcp-database-server
```

2. Install dependencies:
```
npm install
```

3. Build the project:
```
npm run build
```

### 使用 Conda 环境开发（推荐）

本项目支持使用 Conda 创建独立的 Python + Node.js 混合开发环境：

```bash
# 创建 conda 环境
conda create -n mcp-database python=3.11 nodejs=20 -y

# 激活环境
conda activate mcp-database

# 安装项目依赖
npm install

# 编译项目
npm run build
```

或者使用提供的快捷脚本：

```bash
# Windows
setup-env.bat

# Linux/macOS
source setup-env.sh
```

## 安全配置

本服务器支持对危险操作进行安全控制，采用**细粒度权限管理**：

### 粗粒度权限

| 参数 | 说明 | 默认 |
|------|------|------|
| `--allow-drop` | 启用 DROP TABLE 操作 | 禁止 |
| `--allow-delete` | 启用 DELETE 操作 | 禁止 |
| `--allow-update` | 启用 UPDATE 操作 | 禁止 |
| `--allow-alter` | 启用所有 ALTER TABLE 操作 | 禁止 |
| `--allow-all` | 启用所有危险操作 | - |

### ALTER TABLE 细粒度权限

| 参数 | 说明 | 默认 |
|------|------|------|
| `--allow-add-column` | 允许新增字段 | ✅ **允许** |
| `--allow-drop-column` | 允许删除字段 | 禁止 |
| `--allow-modify-column` | 允许修改字段类型 | 禁止 |
| `--allow-rename-column` | 允许重命名字段 | ✅ **允许** |
| `--allow-rename-table` | 允许重命名表 | ✅ **允许** |
| `--allow-add-constraint` | 允许添加约束 | ✅ **允许** |
| `--allow-drop-constraint` | 允许删除约束 | 禁止 |

**使用示例：**

```bash
# 默认安全模式（ADD COLUMN 和 RENAME 默认允许）
node dist/src/index.js /path/to/database.db

# 允许删除字段
node dist/src/index.js /path/to/database.db --allow-drop-column

# 仅允许新增和修改字段
node dist/src/index.js /path/to/database.db --allow-add-column --allow-modify-column
```

## SQL 注入防护

本服务器内置 SQL 注入检测功能，**默认启用**，采用**双层防护机制**：

### 防护技术

1. **SQL 语法解析器** (`node-sql-parser`)
   - 将 SQL 解析为抽象语法树 (AST)
   - 检测 UNION 注入、堆叠查询、永真条件
   - 识别危险函数调用和系统变量访问

2. **正则表达式模式匹配**
   - 覆盖已知注入模式
   - 按风险等级分类检测

### 检测的注入模式

| 风险等级 | 检测内容 |
|----------|----------|
| **Critical** | 命令注入 (`; DROP`), 系统函数 (`xp_cmdshell`) |
| **High** | 条件注入 (`' OR '1'='1`), 信息泄露 (`@@version`, `information_schema`) |
| **Medium** | 危险函数 (`sleep()`, `load_file()`), 十六进制编码 |
| **Low** | SQL 注释、字符串拼接 |

### 命令行参数

| 参数 | 说明 |
|------|------|
| `--disable-sql-injection-check` | 禁用 SQL 注入检测（不推荐） |
| `--sql-injection-warn-only` | 检测到注入时仅警告，不阻止执行 |
| `--disable-sql-parser` | 禁用 SQL 解析器，仅使用正则匹配 |

### 依赖

```bash
npm install node-sql-parser
```

## Usage Options

There are two ways to use this MCP server with Claude:

1. **Direct usage**: Install the package globally and use it directly
2. **Local development**: Run from your local development environment

### Direct Usage with NPM Package

The easiest way to use this MCP server is by installing it globally:

```bash
npm install -g @executeautomation/database-server
```

This allows you to use the server directly without building it locally.

### Local Development Setup

If you want to modify the code or run from your local environment:

1. Clone and build the repository as shown in the Installation section
2. Run the server using the commands in the Usage section below

## Usage

### SQLite Database

To use with an SQLite database:

```
node dist/src/index.js /path/to/your/database.db
```

### SQL Server Database

To use with a SQL Server database:

```
node dist/src/index.js --sqlserver --server <server-name> --database <database-name> [--user <username> --password <password>]
```

Required parameters:
- `--server`: SQL Server host name or IP address
- `--database`: Name of the database

Optional parameters:
- `--user`: Username for SQL Server authentication (if not provided, Windows Authentication will be used)
- `--password`: Password for SQL Server authentication
- `--port`: Port number (default: 1433)

### PostgreSQL Database

To use with a PostgreSQL database:

```
node dist/src/index.js --postgresql --host <host-name> --database <database-name> [--user <username> --password <password>]
```

Required parameters:
- `--host`: PostgreSQL host name or IP address
- `--database`: Name of the database

Optional parameters:
- `--user`: Username for PostgreSQL authentication
- `--password`: Password for PostgreSQL authentication
- `--port`: Port number (default: 5432)
- `--ssl`: Enable SSL connection (true/false)
- `--connection-timeout`: Connection timeout in milliseconds (default: 30000)

### MySQL Database

#### Standard Authentication

To use with a MySQL database:

```
node dist/src/index.js --mysql --host <host-name> --database <database-name> --port <port> [--user <username> --password <password>]
```

Required parameters:
- `--host`: MySQL host name or IP address
- `--database`: Name of the database
- `--port`: Port number (default: 3306)

Optional parameters:
- `--user`: Username for MySQL authentication
- `--password`: Password for MySQL authentication
- `--ssl`: Enable SSL connection (true/false or object)
- `--connection-timeout`: Connection timeout in milliseconds (default: 30000)

#### AWS IAM Authentication

For Amazon RDS MySQL instances with IAM database authentication:

**Prerequisites:**
- AWS credentials must be configured (the RDS Signer uses the default credential provider chain)
- Configure using one of these methods:
  - `aws configure` (uses default profile)
  - `AWS_PROFILE=myprofile` environment variable
  - `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` environment variables
  - IAM roles (if running on EC2)

```
node dist/src/index.js --mysql --aws-iam-auth --host <rds-endpoint> --database <database-name> --user <aws-username> --aws-region <region>
```

Required parameters:
- `--host`: RDS endpoint hostname
- `--database`: Name of the database
- `--aws-iam-auth`: Enable AWS IAM authentication
- `--user`: AWS IAM username (also the database user)
- `--aws-region`: AWS region where RDS instance is located

Note: SSL is automatically enabled for AWS IAM authentication

## Configuring Claude Desktop

### Direct Usage Configuration

If you installed the package globally, configure Claude Desktop with:

```json
{
  "mcpServers": {
    "sqlite": {
      "command": "npx",
      "args": [
        "-y",
        "@executeautomation/database-server",
        "/path/to/your/database.db"
      ]
    },
    "sqlserver": {
      "command": "npx",
      "args": [
        "-y",
        "@executeautomation/database-server",
        "--sqlserver",
        "--server", "your-server-name",
        "--database", "your-database-name",
        "--user", "your-username",
        "--password", "your-password"
      ]
    },
    "postgresql": {
      "command": "npx",
      "args": [
        "-y",
        "@executeautomation/database-server",
        "--postgresql",
        "--host", "your-host-name",
        "--database", "your-database-name",
        "--user", "your-username",
        "--password", "your-password"
      ]
    },
    "mysql": {
      "command": "npx",
      "args": [
        "-y",
        "@executeautomation/database-server",
        "--mysql",
        "--host", "your-host-name",
        "--database", "your-database-name",
        "--port", "3306",
        "--user", "your-username",
        "--password", "your-password"
      ]
    },
    "mysql-aws": {
      "command": "npx",
      "args": [
        "-y",
        "@executeautomation/database-server",
        "--mysql",
        "--aws-iam-auth",
        "--host", "your-rds-endpoint.region.rds.amazonaws.com",
        "--database", "your-database-name",
        "--user", "your-aws-username",
        "--aws-region", "us-east-1"
      ]
    }
  }
}
```

### Local Development Configuration

For local development, configure Claude Desktop to use your locally built version:

```json
{
  "mcpServers": {
    "sqlite": {
      "command": "node",
      "args": [
        "/absolute/path/to/mcp-database-server/dist/src/index.js", 
        "/path/to/your/database.db"
      ]
    },
    "sqlserver": {
      "command": "node",
      "args": [
        "/absolute/path/to/mcp-database-server/dist/src/index.js",
        "--sqlserver",
        "--server", "your-server-name",
        "--database", "your-database-name",
        "--user", "your-username",
        "--password", "your-password"
      ]
    },
    "postgresql": {
      "command": "node",
      "args": [
        "/absolute/path/to/mcp-database-server/dist/src/index.js",
        "--postgresql",
        "--host", "your-host-name",
        "--database", "your-database-name",
        "--user", "your-username",
        "--password", "your-password"
      ]
    },
    "mysql": {
      "command": "node",
      "args": [
        "/absolute/path/to/mcp-database-server/dist/src/index.js",
        "--mysql",
        "--host", "your-host-name",
        "--database", "your-database-name",
        "--port", "3306",
        "--user", "your-username",
        "--password", "your-password"
      ]
    },
    "mysql-aws": {
      "command": "node",
      "args": [
        "/absolute/path/to/mcp-database-server/dist/src/index.js",
        "--mysql",
        "--aws-iam-auth",
        "--host", "your-rds-endpoint.region.rds.amazonaws.com",
        "--database", "your-database-name",
        "--user", "your-aws-username",
        "--aws-region", "us-east-1"
      ]
    }
  }
}
```

The Claude Desktop configuration file is typically located at:
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- Linux: `~/.config/Claude/claude_desktop_config.json`

## Available Database Tools

The MCP Database Server provides the following tools that Claude can use:

| Tool | Description | Required Parameters |
|------|-------------|---------------------|
| `read_query` | Execute SELECT queries to read data | `query`: SQL SELECT statement |
| `write_query` | Execute INSERT, UPDATE, or DELETE queries | `query`: SQL modification statement |
| `create_table` | Create new tables in the database | `query`: CREATE TABLE statement |
| `alter_table` | Modify existing table schema | `query`: ALTER TABLE statement |
| `drop_table` | Remove a table from the database | `table_name`: Name of table<br>`confirm`: Safety flag (must be true) |
| `list_tables` | Get a list of all tables | None |
| `describe_table` | View schema information for a table | `table_name`: Name of table |
| `export_query` | Export query results as CSV/JSON | `query`: SQL SELECT statement<br>`format`: "csv" or "json" |
| `append_insight` | Add a business insight to memo | `insight`: Text of insight |
| `list_insights` | List all business insights | None |

For practical examples of how to use these tools with Claude, see [Usage Examples](docs/usage-examples.md).

## Additional Documentation

- [SQL Server Setup Guide](docs/sql-server-setup.md): Details on connecting to SQL Server databases
- [PostgreSQL Setup Guide](docs/postgresql-setup.md): Details on connecting to PostgreSQL databases
- [Usage Examples](docs/usage-examples.md): Example queries and commands to use with Claude

## Development

To run the server in development mode:

```
npm run dev
```

To watch for changes during development:

```
npm run watch
```

## Requirements

- Node.js 18+
- For SQL Server connectivity: SQL Server 2012 or later
- For PostgreSQL connectivity: PostgreSQL 9.5 or later

## License

MIT
