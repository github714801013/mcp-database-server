import fs from 'fs';
import path from 'path';
import { DbAdapter, createDbAdapter } from './adapter.js';

const adapters = new Map<string, DbAdapter>();

export async function initMultiDatabase(configPath = 'databases.json'): Promise<void> {
  const fullPath = path.resolve(process.cwd(), configPath);
  if (!fs.existsSync(fullPath)) {
    console.warn(`[WARN] Config file ${fullPath} not found. Starting with empty adapters.`);
    return;
  }
  const config = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  for (const [dbName, dbConfig] of Object.entries(config)) {
    try {
      const type = (dbConfig as any).type || 'sqlite';
      const adapter = createDbAdapter(type, dbConfig);
      await adapter.init();
      adapters.set(dbName, adapter);
      console.log(`[INFO] Initialized database: ${dbName}`);
    } catch (e: any) {
      console.error(`[ERROR] Failed to init database ${dbName}: ${e.message}`);
    }
  }
}

export function getDbAdapter(dbName: string): DbAdapter {
  const adapter = adapters.get(dbName);
  if (!adapter) throw new Error(`Database not found: ${dbName}`);
  return adapter;
}

export function getSupportedDbTypes(): string[] {
  return Array.from(adapters.keys());
}

export async function closeMultiDatabase(): Promise<void> {
  for (const adapter of adapters.values()) {
    await adapter.close();
  }
  adapters.clear();
}
