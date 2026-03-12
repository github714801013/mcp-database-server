# MCP Database Server - Project Roadmap

## 项目概述

MCP Database Server 是一个 Model Context Protocol (MCP) 服务器，支持与多种数据库（SQLite、SQL Server、PostgreSQL、MySQL）进行交互。

**当前版本:** 1.1.0
**开始日期:** 2026-03-12

---

## 当前里程碑: v1.2.0 - 安全性增强

**目标:** 增加安全性配置，允许通过配置来控制危险操作的权限

### Phase 1: 安全性配置实现

**状态:** pending

**目标:**
- 实现危险操作的安全配置机制
- 支持 DROP、DELETE、UPDATE、ALTER 等操作的控制
- 通过配置文件或命令行参数启用/禁用危险操作

**验证标准:**
- [ ] 可通过配置禁用 DROP TABLE 操作
- [ ] 可通过配置禁用 DELETE 操作
- [ ] 可通过配置禁用 UPDATE 操作
- [ ] 可通过配置禁用 ALTER TABLE 操作
- [ ] 配置可通过命令行参数传入
- [ ] 默认安全配置（危险操作默认禁用）

---

## 历史记录

| 日期 | 版本 | 描述 |
|------|------|------|
| 2026-03-12 | v1.2.0 | 开始安全性增强里程碑 |