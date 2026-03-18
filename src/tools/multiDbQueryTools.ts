import { getDbAdapter } from '../db/multiDbManager.js';
import { formatSuccessResponse, convertToCSV } from '../utils/formatUtils.js';
import { validateOperation } from '../config/securityConfig.js';
import { validateSqlSafety } from '../utils/sqlInjectionGuard.js';

export async function readQueryMulti(dbName: string, query: string) {
  try {
    if (!query.trim().toLowerCase().startsWith("select")) {
      throw new Error("Only SELECT queries are allowed with read_query");
    }

    validateSqlSafety(query, 'read_query');
    const adapter = getDbAdapter(dbName);
    const result = await adapter.all(query);
    return formatSuccessResponse(result);
  } catch (error: any) {
    throw new Error(`SQL Error: ${error.message}`);
  }
}

export async function writeQueryMulti(dbName: string, query: string) {
  try {
    const lowerQuery = query.trim().toLowerCase();

    if (lowerQuery.startsWith("select")) {
      throw new Error("Use read_query for SELECT operations");
    }

    if (!(lowerQuery.startsWith("insert") || lowerQuery.startsWith("update") || lowerQuery.startsWith("delete"))) {
      throw new Error("Only INSERT, UPDATE, or DELETE operations are allowed with write_query");
    }

    validateSqlSafety(query, 'write_query');

    if (lowerQuery.startsWith("update")) {
      validateOperation('update');
    }
    if (lowerQuery.startsWith("delete")) {
      validateOperation('delete');
    }

    const adapter = getDbAdapter(dbName);
    const result = await adapter.run(query);
    return formatSuccessResponse({ affected_rows: result.changes });
  } catch (error: any) {
    throw new Error(`SQL Error: ${error.message}`);
  }
}

export async function exportQueryMulti(dbName: string, query: string, format: string) {
  try {
    if (!query.trim().toLowerCase().startsWith("select")) {
      throw new Error("Only SELECT queries are allowed with export_query");
    }

    validateSqlSafety(query, 'export_query');
    const adapter = getDbAdapter(dbName);
    const result = await adapter.all(query);

    if (format === "csv") {
      const csvData = convertToCSV(result);
      return {
        content: [{
          type: "text",
          text: csvData
        }],
        isError: false,
      };
    } else if (format === "json") {
      return formatSuccessResponse(result);
    } else {
      throw new Error("Unsupported export format. Use 'csv' or 'json'");
    }
  } catch (error: any) {
    throw new Error(`Export Error: ${error.message}`);
  }
}
