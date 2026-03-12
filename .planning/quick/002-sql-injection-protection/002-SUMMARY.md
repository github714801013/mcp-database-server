# Quick Task 002: SQL 注入防护模块

**任务:** 增加防止 SQL 注入的模块
**日期:** 2026-03-12
**状态:** 完成（已增强）

---

## 实现内容

### 1. 双层防护架构

本模块采用**双层防护机制**：

| 层级 | 技术 | 描述 |
|------|------|------|
| **第一层** | `node-sql-parser` | SQL 语法解析，生成 AST 进行深度分析 |
| **第二层** | 正则表达式 | 模式匹配，覆盖已知注入模式 |

### 2. SQL 解析器分析能力

通过 `node-sql-parser` 实现：

- **语法验证**: 检测 SQL 是否为有效语法
- **堆叠查询检测**: 识别多条语句堆叠攻击
- **UNION 注入检测**: 分析 AST 结构中的 UNION 查询
- **永真条件检测**: 识别 `OR 1=1`、`'a'='a'` 等条件注入
- **危险函数识别**: 检测 `sleep()`、`load_file()` 等危险函数
- **系统变量检测**: 识别 `@@version`、`@@datadir` 等敏感信息访问

### 3. 正则表达式模式匹配

按风险等级分类的检测模式：

| 等级 | 示例模式 |
|------|----------|
| **Critical** | `; DROP TABLE`, `xp_cmdshell`, `sp_executesql` |
| **High** | `' OR '1'='1`, `@@version`, `information_schema` |
| **Medium** | `sleep()`, `load_file()`, 十六进制编码 |
| **Low** | SQL 注释 `--`, 字符串拼接 |

### 4. 依赖包

```bash
npm install node-sql-parser
```

---

## 文件变更

| 文件 | 变更类型 |
|------|----------|
| `src/utils/sqlInjectionGuard.ts` | 新增 + 增强 |
| `src/tools/queryTools.ts` | 修改 |
| `src/tools/schemaTools.ts` | 修改 |
| `src/index.ts` | 修改 |
| `package.json` | 新增依赖 |

---

## 命令行参数

| 参数 | 说明 |
|------|------|
| `--disable-sql-injection-check` | 禁用 SQL 注入检测 |
| `--sql-injection-warn-only` | 仅警告模式 |
| `--disable-sql-parser` | 禁用 SQL 解析器分析 |

---

## 使用示例

```bash
# 默认启用所有防护
node dist/src/index.js /path/to/database.db

# 禁用解析器（仅使用正则匹配）
node dist/src/index.js /path/to/database.db --disable-sql-parser

# 调试模式
node dist/src/index.js /path/to/database.db --sql-injection-warn-only
```