import express from 'express';
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { initMultiDatabase, closeMultiDatabase } from './db/multiDbManager.js';
import { handleListToolsMulti, handleToolCallMulti } from './handlers/multiDbToolHandlers.js';
import { initSecurityConfig, parseSecurityConfigFromArgs } from './config/securityConfig.js';
import { initSqlInjectionConfig, parseSqlInjectionConfigFromArgs } from './utils/sqlInjectionGuard.js';

const app = express();
const port = process.env.PORT || 3001;

const server = new Server({
  name: "executeautomation/database-server-sse",
  version: "1.1.0",
}, { capabilities: { tools: {} } });

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return handleListToolsMulti();
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  return await handleToolCallMulti(request.params.name, request.params.arguments);
});

let transport: SSEServerTransport;

app.get('/sse', async (req, res) => {
  transport = new SSEServerTransport("/message", res);
  await server.connect(transport);
});

app.post('/message', async (req, res) => {
  if (transport) {
    await transport.handlePostMessage(req, res);
  } else {
    res.status(500).send("SSE connection not established");
  }
});

async function start() {
  const args = process.argv.slice(2);
  
  // 初始化安全配置与注入检测（支持命令行参数传递 --allow-all 等）
  initSecurityConfig(parseSecurityConfigFromArgs(args));
  initSqlInjectionConfig(parseSqlInjectionConfigFromArgs(args));
  
  // 查找是否有自定义配置文件路径，默认 databases.json
  const configArgIndex = args.indexOf('--config');
  const configPath = configArgIndex >= 0 && configArgIndex + 1 < args.length 
    ? args[configArgIndex + 1] 
    : 'databases.json';

  await initMultiDatabase(configPath);
  app.listen(port, () => {
    console.log(`[INFO] SSE Server running at http://localhost:${port}/sse`);
  });
}

process.on('SIGINT', async () => {
  await closeMultiDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closeMultiDatabase();
  process.exit(0);
});

start().catch(console.error);
