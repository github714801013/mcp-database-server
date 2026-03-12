# Quick Task 003: ALTER TABLE 细粒度权限控制

**任务:** 增加细粒度的 ALTER TABLE 权限控制，例如允许新增字段但禁止删除字段
**日期:** 2026-03-12
**状态:** 完成

---

## 实现内容

### 1. 增强 SecurityConfig 接口

新增 `AlterPermissions` 接口，支持细粒度控制：

```typescript
interface AlterPermissions {
  allowAddColumn: boolean;      // 新增字段
  allowDropColumn: boolean;     // 删除字段
  allowModifyColumn: boolean;   // 修改字段
  allowRenameColumn: boolean;   // 重命名字段
  allowRenameTable: boolean;    // 重命名表
  allowAddConstraint: boolean;  // 添加约束
  allowDropConstraint: boolean; // 删除约束
}
```

### 2. 默认权限配置

| 操作 | 默认值 | 原因 |
|------|--------|------|
| ADD COLUMN | ✅ 允许 | 相对安全，不丢失数据 |
| DROP COLUMN | ❌ 禁止 | 危险，会丢失数据 |
| MODIFY COLUMN | ❌ 禁止 | 可能丢失数据 |
| RENAME COLUMN | ✅ 允许 | 相对安全 |
| RENAME TABLE | ✅ 允许 | 相对安全 |
| ADD CONSTRAINT | ✅ 允许 | 增强数据完整性 |
| DROP CONSTRAINT | ❌ 禁止 | 可能影响数据完整性 |

### 3. SQL 解析函数

新增 `parseAlterOperations()` 函数，自动识别 ALTER TABLE 语句中的具体操作类型。

### 4. 新增命令行参数

```
--allow-add-column      允许新增字段
--allow-drop-column     允许删除字段
--allow-modify-column   允许修改字段
--allow-rename-column   允许重命名字段
--allow-rename-table    允许重命名表
--allow-add-constraint  允许添加约束
--allow-drop-constraint 允许删除约束
```

---

## 使用示例

```bash
# 默认配置：ADD COLUMN 允许，DROP COLUMN 禁止
node dist/src/index.js /path/to/database.db

# 允许删除字段
node dist/src/index.js /path/to/database.db --allow-drop-column

# 允许修改字段类型
node dist/src/index.js /path/to/database.db --allow-modify-column
```

---

## 文件变更

| 文件 | 变更类型 |
|------|----------|
| `src/config/securityConfig.ts` | 增强 |
| `src/tools/schemaTools.ts` | 修改 |
| `src/index.ts` | 修改 |
| `readme.md` | 更新 |