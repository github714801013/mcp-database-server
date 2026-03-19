import { formatErrorResponse } from '../utils/formatUtils.js';
import { getActiveDatabases } from '../db/multiDbManager.js';
import type { Request, Response } from 'express';

import { readQueryMulti, writeQueryMulti, exportQueryMulti } from '../tools/multiDbQueryTools.js';
import { createTableMulti, alterTableMulti, dropTableMulti, listTablesMulti, describeTableMulti } from '../tools/multiDbSchemaTools.js';

export function handleListToolsMulti() {
  return {
    tools: [
      {
        name: "read_query",
        description: "Execute SELECT queries to read data from a specific database",
        inputSchema: {
          type: "object",
          properties: {
            database_name: { type: "string" },
            query: { type: "string" },
          },
          required: ["database_name", "query"],
        },
      },
      {
        name: "write_query",
        description: "Execute INSERT, UPDATE, or DELETE queries",
        inputSchema: {
          type: "object",
          properties: {
            database_name: { type: "string" },
            query: { type: "string" },
          },
          required: ["database_name", "query"],
        },
      },
      {
        name: "create_table",
        description: "Create new tables in the database",
        inputSchema: {
          type: "object",
          properties: {
            database_name: { type: "string" },
            query: { type: "string" },
          },
          required: ["database_name", "query"],
        },
      },
      {
        name: "alter_table",
        description: "Modify existing table schema (add columns, rename tables, etc.)",
        inputSchema: {
          type: "object",
          properties: {
            database_name: { type: "string" },
            query: { type: "string" },
          },
          required: ["database_name", "query"],
        },
      },
      {
        name: "drop_table",
        description: "Remove a table from the database with safety confirmation",
        inputSchema: {
          type: "object",
          properties: {
            database_name: { type: "string" },
            table_name: { type: "string" },
            confirm: { type: "boolean" },
          },
          required: ["database_name", "table_name", "confirm"],
        },
      },
      {
        name: "export_query",
        description: "Export query results to various formats (CSV, JSON)",
        inputSchema: {
          type: "object",
          properties: {
            database_name: { type: "string" },
            query: { type: "string" },
            format: { type: "string", enum: ["csv", "json"] },
          },
          required: ["database_name", "query", "format"],
        },
      },
      {
        name: "list_tables",
        description: "Get a list of all tables in the database",
        inputSchema: {
          type: "object",
          properties: {
            database_name: { type: "string" }
          },
          required: ["database_name"],
        },
      },
      {
        name: "describe_table",
        description: "View schema information for a specific table",
        inputSchema: {
          type: "object",
          properties: {
            database_name: { type: "string" },
            table_name: { type: "string" },
          },
          required: ["database_name", "table_name"],
        },
      },
      {
        name: "list_databases",
        description: "List all configured and available databases and their types",
        inputSchema: {
          type: "object",
          properties: {},
          required: []
        }
      }
    ],
  };
}

export async function handleToolCallMulti(name: string, args: any) {
  try {
    switch (name) {
      case "read_query":
        return await readQueryMulti(args.database_name, args.query);
      
      case "write_query":
        return await writeQueryMulti(args.database_name, args.query);
      
      case "create_table":
        return await createTableMulti(args.database_name, args.query);
      
      case "alter_table":
        return await alterTableMulti(args.database_name, args.query);
      
      case "drop_table":
        return await dropTableMulti(args.database_name, args.table_name, args.confirm);
      
      case "export_query":
        return await exportQueryMulti(args.database_name, args.query, args.format);
      
      case "list_tables":
        return await listTablesMulti(args.database_name);
      
      case "describe_table":
        return await describeTableMulti(args.database_name, args.table_name);
      
      case "list_databases":
        return { content: [{ type: "text", text: JSON.stringify(getActiveDatabases(), null, 2) }] };
      
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error: any) {
    return formatErrorResponse(error);
  }
}