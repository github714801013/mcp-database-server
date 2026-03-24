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

// 使用 Map 管理不同会话的 transport 实例
const transports = new Map<string, SSEServerTransport>();

app.get('/sse', async (req, res) => {
  const transport = new SSEServerTransport("/message", res);
  
  // 建立连接后，将 transport 实例保存到 Map 中
  // transport.sessionId 是 SDK 生成的会话 ID
  const sessionId = (transport as any).sessionId;
  if (sessionId) {
    transports.set(sessionId, transport);
    console.log(`[INFO] New SSE connection established: ${sessionId}`);
    
    res.on('close', () => {
      transports.delete(sessionId);
      console.log(`[INFO] SSE connection closed: ${sessionId}`);
    });
  }

  await server.connect(transport);
});

app.post('/message', async (req, res) => {
  const sessionId = req.query.sessionId as string;
  const transport = transports.get(sessionId);

  if (transport) {
    await transport.handlePostMessage(req, res);
  } else {
    // 兼容逻辑：如果没有 sessionId 且当前只有一个 transport，尝试使用它（针对旧版客户端或单会话场景）
    if (!sessionId && transports.size === 1) {
      const [firstTransport] = transports.values();
      await firstTransport.handlePostMessage(req, res);
    } else {
      res.status(404).send("SSE connection not found or expired. Make sure to provide a valid sessionId.");
    }
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
