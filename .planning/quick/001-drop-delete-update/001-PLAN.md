# Quick Task 001: 安全性配置实现

**任务:** 增加安全性配置，允许通过配置来设置是否允许 drop,delete,update 等危险操作
**日期:** 2026-03-12
**模式:** quick

---

## 任务分解

### Task 1: 创建安全配置模块

**文件:** `src/config/securityConfig.ts`
**操作:** 创建安全配置模块，定义安全配置接口和默认值

**验证:**
- 配置接口定义完整
- 默认值为安全模式（危险操作默认禁用）
- 支持通过环境变量和命令行参数配置

**完成标准:**
- [x] SecurityConfig 接口定义
- [x] 默认安全配置
- [x] 配置解析函数

---

### Task 2: 修改工具处理器集成安全检查

**文件:** `src/tools/queryTools.ts`, `src/tools/schemaTools.ts`
**操作:** 在 writeQuery, dropTable, alterTable 等危险操作中添加安全检查

**验证:**
- 禁用操作时返回清晰的错误信息
- 启用操作时正常执行

**完成标准:**
- [x] writeQuery 检查 UPDATE/DELETE 权限
- [x] dropTable 检查 DROP 权限
- [x] alterTable 检查 ALTER 权限

---

### Task 3: 更新主入口解析安全配置参数

**文件:** `src/index.ts`
**操作:** 添加命令行参数解析安全配置

**验证:**
- 支持 `--allow-drop`, `--allow-delete`, `--allow-update`, `--allow-alter` 参数
- 配置正确传递到工具处理器

**完成标准:**
- [x] 命令行参数解析
- [x] 配置初始化
- [x] 帮助信息更新

---

## 实现说明

### 安全配置接口

```typescript
interface SecurityConfig {
  allowDrop: boolean;    // 允许 DROP TABLE 操作
  allowDelete: boolean;  // 允许 DELETE 操作
  allowUpdate: boolean;  // 允许 UPDATE 操作
  allowAlter: boolean;   // 允许 ALTER TABLE 操作
}
```

### 默认配置（安全模式）

所有危险操作默认禁用，需要显式启用。

### 命令行参数

- `--allow-drop`: 启用 DROP TABLE 操作
- `--allow-delete`: 启用 DELETE 操作
- `--allow-update`: 启用 UPDATE 操作
- `--allow-alter`: 启用 ALTER TABLE 操作
- `--allow-all`: 启用所有危险操作