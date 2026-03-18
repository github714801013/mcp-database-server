---
status: awaiting_human_verify
trigger: "调查问题：docker-sqlite3-binding-file-missing\n\n**摘要：** 在 Docker 容器中运行 MCP 代理时出现 sqlite3 绑定文件缺失错误。错误显示找不到 `node_sqlite3.node` 文件。"
created: 2026-03-12
updated: 2026-03-12
---

## Current Focus
<!-- OVERWRITE on each update - reflects NOW -->

hypothesis: 修复已应用，需要用户验证Docker构建是否成功
test: 用户需要构建Docker镜像并测试MCP代理启动
expecting: Docker构建成功，MCP代理能正常启动
next_action: 等待用户验证修复

## Symptoms
<!-- Written during gathering, then IMMUTABLE -->

expected: MCP代理在Docker容器中正常启动
actual: MCP代理启动失败，找不到sqlite3绑定文件
errors: Error: Could not locate the bindings file. Tried:
 → /app/node_modules/sqlite3/build/node_sqlite3.node
 → /app/node_modules/sqlite3/build/Debug/node_sqlite3.node
 → /app/node_modules/sqlite3/build/Release/node_sqlite3.node
 → /app/node_modules/sqlite3/out/Debug/node_sqlite3.node
 → /app/node_modules/sqlite3/Debug/node_sqlite3.node
 → /app/node_modules/sqlite3/out/Release/node_sqlite3.node
 → /app/node_modules/sqlite3/Release/node_sqlite3.node
 → /app/node_modules/sqlite3/build/default/node_sqlite3.node
 → /app/node_modules/sqlite3/compiled/20.19.4/linux/x64/node_sqlite3.node
 → /app/node_modules/sqlite3/addon-build/release/install-root/node_sqlite3.node
 → /app/node_modules/sqlite3/addon-build/debug/install-root/node_sqlite3.node
 → /app/node_modules/sqlite3/addon-build/default/install-root/node_sqlite3.node
 → /app/node_modules/sqlite3/lib/binding/node-v115-linux-x64/node_sqlite3.node
    at bindings (/app/node_modules/bindings/bindings.js:126:9)
    at Object.<anonymous> (/app/node_modules/sqlite3/lib/sqlite3-binding.js:1:37)
    at Module._compile (node:internal/modules/cjs/loader:1529:14)
    at Module._extensions..js (node:internal/modules/cjs/loader:1613:10)
    at Module.load (node:internal/modules/cjs/loader:1275:32)
    at Module._load (node:internal/modules/cjs/loader:1096:12)
    at Module.require (node:internal/modules/cjs/loader:1298:19)
    at require (node:internal/modules/helpers:182:18)
    at Object.<anonymous> (/app/node_modules/sqlite3/lib/sqlite3.js:2:17)
    at Module._compile (node:internal/modules/cjs/loader:1529:14) {
  tries: [
    '/app/node_modules/sqlite3/build/node_sqlite3.node',
    '/app/node_modules/sqlite3/build/Debug/node_sqlite3.node',
    '/app/node_modules/sqlite3/build/Release/node_sqlite3.node',
    '/app/node_modules/sqlite3/out/Debug/node_sqlite3.node',
    '/app/node_modules/sqlite3/Debug/node_sqlite3.node',
    '/app/node_modules/sqlite3/out/Release/node_sqlite3.node',
    '/app/node_modules/sqlite3/Release/node_sqlite3.node',
    '/app/node_modules/sqlite3/build/default/node_sqlite3.node',
    '/app/node_modules/sqlite3/compiled/20.19.4/linux/x64/node_sqlite3.node',
    '/app/node_modules/sqlite3/addon-build/release/install-root/node_sqlite3.node',
    '/app/node_modules/sqlite3/addon-build/debug/install-root/node_sqlite3.node',
    '/app/node_modules/sqlite3/addon-build/default/install-root/node_sqlite3.node',
    '/app/node_modules/sqlite3/lib/binding/node-v115-linux-x64/node_sqlite3.node'
  ]
}
reproduction: 在Docker容器中启动MCP代理时触发
started: 修复node-sql-parser问题后新出现

## Eliminated
<!-- APPEND only - prevents re-investigating -->

## Evidence
<!-- APPEND only - facts discovered -->

- timestamp: 2026-03-12
  checked: package.json
  found: 依赖中包含sqlite3 5.1.7版本
  implication: sqlite3是一个需要本地编译的Node.js原生模块

- timestamp: 2026-03-12
  checked: sqlite3 package.json中的scripts
  found: 包含"install": "prebuild-install -r napi || node-gyp rebuild"
  implication: --ignore-scripts会跳过这个install脚本，导致sqlite3的native绑定文件没有被编译

- timestamp: 2026-03-12
  checked: git历史记录
  found: 提交8ac52a2在npm rebuild sqlite3后添加了`|| true`
  implication: 这个改变可能隐藏了sqlite3编译失败的错误，导致绑定文件实际上没有被创建

- timestamp: 2026-03-12
  checked: Node.js版本
  found: 本地开发环境使用Node 24.9.0，错误信息显示寻找20.19.4的绑定文件
  implication: 版本不匹配可能导致预编译的二进制文件不兼容

- timestamp: 2026-03-12
  checked: 在Windows上测试npm rebuild sqlite3
  found: 需要Visual Studio进行编译，在Windows上失败
  implication: 在Docker的Linux环境中，编译可能因为其他原因失败

- timestamp: 2026-03-12
  checked: 在Windows上测试不带--ignore-scripts的安装
  found: prebuild-install警告"No prebuilt binaries found (target=undefined runtime=napi arch=x64 libc= platform=win32)"，然后node-gyp重建因缺少Visual Studio失败
  implication: 在Windows上没有预编译二进制，需要编译。在Linux上可能有预编译二进制，或者编译环境更容易设置

## Resolution
<!-- OVERWRITE as understanding evolves -->

root_cause: 使用`--ignore-scripts`安装依赖跳过了sqlite3的install脚本（该脚本负责下载预编译二进制或编译原生模块），而后续的`npm rebuild sqlite3 || true`可能因为编译环境问题失败，`|| true`隐藏了错误，导致绑定文件从未被创建。

fix: 1. 添加`sqlite-dev`包提供SQLite头文件；2. 移除`--ignore-scripts`标志以允许sqlite3的install脚本运行；3. 移除`npm rebuild sqlite3 || true`步骤，因为install脚本已经处理了编译。

verification: 需要构建Docker镜像并测试MCP代理能否正常启动
files_changed: [Dockerfile]