---
status: verifying
trigger: "调查问题：mcp-proxy-node-sql-parser-import-error"
created: 2026-03-12T00:00:00.000Z
updated: 2026-03-12T00:00:00.000Z
---

## Current Focus

hypothesis: 修复已完成
test: 编译 TypeScript 并测试导入
expecting: 编译成功，没有导入错误
next_action: 运行 TypeScript 编译并测试修复

## Symptoms

expected: MCP代理正常启动
actual: MCP代理启动失败，导入node-sql-parser时出现SyntaxError
errors: SyntaxError: Named export 'Parser' not found. The requested module 'node-sql-parser' is a CommonJS module, which may not support all module.exports as named exports.
CommonJS modules can always be imported via the default export, for example using:

import pkg from 'node-sql-parser';
const { Parser } = pkg;

    at ModuleJob._instantiate (node:internal/modules/esm/module_job:175:21)
    at async ModuleJob.run (node:internal/modules/esm/module_job:258:5)
    at async ModuleLoader.import (node:internal/modules/esm/loader:540:24)
    at async asyncRunEntryPointWithESMLoader (node:internal/modules/run_main:117:5)

Node.js v20.19.4
could not start the proxy McpError: MCP error -32000: Connection closed
    at McpError.fromError (file:///usr/local/lib/node_modules/mcp-proxy/dist/stdio-CvFTizsx.mjs:4493:10)
    at Client._onclose (file:///usr/local/lib/node_modules/mcp-proxy/dist/stdio-CvFTizsx.mjs:15938:28)
    at _transport.onclose (file:///usr/local/lib/node_modules/mcp-proxy/dist/stdio-CvFTizsx.mjs:15914:9)
    at ChildProcess.<anonymous> (file:///usr/local/lib/node_modules/mcp-proxy/dist/stdio-CvFTizsx.mjs:4964:19)
    at ChildProcess.emit (node:events:524:28)
    at maybeClose (node:internal/child_process:1104:16)
    at ChildProcess._handle.onexit (node:internal/child_process:304:5) {
  code: -32000,
  data: undefined
}
reproduction: 启动MCP代理时触发
started: 一直存在（从未正常工作）

## Eliminated

## Evidence

- timestamp: 2026-03-12T00:00:00.000Z
  checked: package.json 文件
  found: 项目配置为 ES 模块 (`"type": "module"`)，但 node-sql-parser 包没有 `"type": "module"` 字段
  implication: node-sql-parser 是 CommonJS 模块，在 ES 模块项目中不能使用命名导入

- timestamp: 2026-03-12T00:00:00.000Z
  checked: node-sql-parser 包结构
  found: 包使用 webpack 打包，types.d.ts 定义了 `export class Parser`，但实际实现是 CommonJS
  implication: TypeScript 定义与实现不匹配，导致 ES 模块导入失败## Resolution

root_cause: node-sql-parser 包是 CommonJS 模块，但在 ES 模块项目（package.json 中设置了 "type": "module"）中使用了命名导入 `import { Parser, AST } from 'node-sql-parser'`，这会导致 SyntaxError
fix: 已将命名导入改为默认导入：`import pkg from 'node-sql-parser'; const { Parser, AST } = pkg;`
verification: 待测试
files_changed: [src/utils/sqlInjectionGuard.ts]