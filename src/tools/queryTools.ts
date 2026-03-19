import { dbAll, dbRun, dbExec } from '../db/index.js';
import { formatErrorResponse, formatSuccessResponse, convertToCSV } from '../utils/formatUtils.js';
import { validateOperation } from '../config/securityConfig.js';
import { validateSqlSafety, isReadOnlyQuery } from '../utils/sqlInjectionGuard.js';

/**
 * Execute a read-only SQL query
 * @param query SQL query to execute
 * @returns Query results
 */
export async function readQuery(query: string) {
  try {
    if (!isReadOnlyQuery(query)) {
      throw new Error("Only SELECT or WITH (read-only) queries are allowed with read_query");
    }

    // SQL 注入检测
    validateSqlSafety(query, 'read_query');

    const result = await dbAll(query);
    return formatSuccessResponse(result);
  } catch (error: any) {
    throw new Error(`SQL Error: ${error.message}`);
  }
}

/**
 * Execute a data modification SQL query
 * @param query SQL query to execute
 * @returns Information about affected rows
 */
export async function writeQuery(query: string) {
  try {
    const lowerQuery = query.trim().toLowerCase();

    if (isReadOnlyQuery(query)) {
      throw new Error("Use read_query for SELECT or WITH (read-only) operations");
    }

    if (!(lowerQuery.includes("insert") || lowerQuery.includes("update") || lowerQuery.includes("delete"))) {
      throw new Error("Only INSERT, UPDATE, or DELETE operations are allowed with write_query");
    }

    // SQL 注入检测
    validateSqlSafety(query, 'write_query');

    // 安全检查：验证 UPDATE 和 DELETE 操作权限
    if (lowerQuery.includes("update")) {
      validateOperation('update');
    }
    if (lowerQuery.includes("delete")) {
      validateOperation('delete');
    }

    const result = await dbRun(query);
    return formatSuccessResponse({ affected_rows: result.changes });
  } catch (error: any) {
    throw new Error(`SQL Error: ${error.message}`);
  }
}

/**
 * Export query results to CSV or JSON format
 * @param query SQL query to execute
 * @param format Output format (csv or json)
 * @returns Formatted query results
 */
export async function exportQuery(query: string, format: string) {
  try {
    if (!isReadOnlyQuery(query)) {
      throw new Error("Only SELECT or WITH (read-only) queries are allowed with export_query");
    }

    // SQL 注入检测
    validateSqlSafety(query, 'export_query');

    const result = await dbAll(query);

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