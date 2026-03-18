import { getDbAdapter } from '../db/multiDbManager.js';
import { formatSuccessResponse } from '../utils/formatUtils.js';
import { validateOperation, validateAlterSql } from '../config/securityConfig.js';
import { validateSqlSafety, validateIdentifier, escapeIdentifier } from '../utils/sqlInjectionGuard.js';

export async function createTableMulti(dbName: string, query: string) {
  try {
    if (!query.trim().toLowerCase().startsWith("create table")) {
      throw new Error("Only CREATE TABLE statements are allowed");
    }

    validateSqlSafety(query, 'create_table');
    const adapter = getDbAdapter(dbName);
    await adapter.exec(query);
    return formatSuccessResponse({ success: true, message: "Table created successfully" });
  } catch (error: any) {
    throw new Error(`SQL Error: ${error.message}`);
  }
}

export async function alterTableMulti(dbName: string, query: string) {
  try {
    if (!query.trim().toLowerCase().startsWith("alter table")) {
      throw new Error("Only ALTER TABLE statements are allowed");
    }

    validateSqlSafety(query, 'alter_table');
    validateAlterSql(query);
    const adapter = getDbAdapter(dbName);
    await adapter.exec(query);
    return formatSuccessResponse({ success: true, message: "Table altered successfully" });
  } catch (error: any) {
    throw new Error(`SQL Error: ${error.message}`);
  }
}

export async function dropTableMulti(dbName: string, tableName: string, confirm: boolean) {
  try {
    if (!tableName) {
      throw new Error("Table name is required");
    }

    validateIdentifier(tableName);

    if (!confirm) {
      return formatSuccessResponse({
        success: false,
        message: "Safety confirmation required. Set confirm=true to proceed with dropping the table."
      });
    }

    validateOperation('drop');
    const adapter = getDbAdapter(dbName);

    const query = adapter.getListTablesQuery();
    const tables = await adapter.all(query);
    const tableNames = tables.map(t => t.name);

    if (!tableNames.includes(tableName)) {
      throw new Error(`Table '${tableName}' does not exist`);
    }

    const safeTableName = escapeIdentifier(tableName);
    await adapter.exec(`DROP TABLE ${safeTableName}`);

    return formatSuccessResponse({
      success: true,
      message: `Table '${tableName}' dropped successfully`
    });
  } catch (error: any) {
    throw new Error(`Error dropping table: ${error.message}`);
  }
}

export async function listTablesMulti(dbName: string) {
  try {
    const adapter = getDbAdapter(dbName);
    const query = adapter.getListTablesQuery();
    const tables = await adapter.all(query);
    return formatSuccessResponse(tables.map((t) => t.name));
  } catch (error: any) {
    throw new Error(`Error listing tables: ${error.message}`);
  }
}

export async function describeTableMulti(dbName: string, tableName: string) {
  try {
    if (!tableName) {
      throw new Error("Table name is required");
    }

    const adapter = getDbAdapter(dbName);
    const query = adapter.getListTablesQuery();
    const tables = await adapter.all(query);
    const tableNames = tables.map(t => t.name);
    
    if (!tableNames.includes(tableName)) {
      throw new Error(`Table '${tableName}' does not exist`);
    }
    
    const descQuery = adapter.getDescribeTableQuery(tableName);
    const columns = await adapter.all(descQuery);
    
    return formatSuccessResponse(columns.map((col) => ({
      name: col.name,
      type: col.type,
      notnull: !!col.notnull,
      default_value: col.dflt_value,
      primary_key: !!col.pk
    })));
  } catch (error: any) {
    throw new Error(`Error describing table: ${error.message}`);
  }
}
