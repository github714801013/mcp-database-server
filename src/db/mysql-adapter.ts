import { DbAdapter } from "./adapter.js";
import mysql from "mysql2/promise";
import { Signer } from "@aws-sdk/rds-signer";

/**
 * MySQL database adapter implementation
 */
export class MysqlAdapter implements DbAdapter {
  private pool: mysql.Pool | null = null;
  private config: mysql.PoolOptions;
  private host: string;
  private database: string;
  private awsIamAuth: boolean;
  private awsRegion?: string;

  constructor(connectionInfo: {
    host: string;
    database: string;
    user?: string;
    password?: string;
    port?: number;
    ssl?: boolean | object;
    connectionTimeout?: number;
    awsIamAuth?: boolean;
    awsRegion?: string;
  }) {
    this.host = connectionInfo.host;
    this.database = connectionInfo.database;
    this.awsIamAuth = connectionInfo.awsIamAuth || false;
    this.awsRegion = connectionInfo.awsRegion;
    this.config = {
      host: connectionInfo.host,
      database: connectionInfo.database,
      port: connectionInfo.port || 3306,
      user: connectionInfo.user,
      password: connectionInfo.password,
      connectTimeout: connectionInfo.connectionTimeout || 30000,
      multipleStatements: true,
      // Add connection pooling options for stability
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
    };
    if (typeof connectionInfo.ssl === 'object' || typeof connectionInfo.ssl === 'string') {
      this.config.ssl = connectionInfo.ssl;
    } else if (connectionInfo.ssl === true) {
      // For AWS IAM authentication, configure SSL appropriately for RDS
      if (this.awsIamAuth) {
        this.config.ssl = {
          rejectUnauthorized: false // AWS RDS handles certificate validation
        };
      } else {
        this.config.ssl = {};
      }
    }
    // Validate port
    if (connectionInfo.port && typeof connectionInfo.port !== 'number') {
      const parsedPort = parseInt(connectionInfo.port as any, 10);
      if (isNaN(parsedPort)) {
        throw new Error(`Invalid port value for MySQL: ${connectionInfo.port}`);
      }
      this.config.port = parsedPort;
    }
    // Log the port for debugging
    console.error(`[DEBUG] MySQL connection will use port: ${this.config.port}`);
  }

  /**
   * Generate AWS RDS authentication token
   */
  private async generateAwsAuthToken(): Promise<string> {
    if (!this.awsRegion) {
      throw new Error("AWS region is required for IAM authentication");
    }
    
    if (!this.config.user) {
      throw new Error("AWS username is required for IAM authentication");
    }
    
    try {
      console.info(`[INFO] Generating AWS auth token for region: ${this.awsRegion}, host: ${this.host}, user: ${this.config.user}`);
      
      const signer = new Signer({
        region: this.awsRegion,
        hostname: this.host,
        port: this.config.port || 3306,
        username: this.config.user,
      });
      
      const token = await signer.getAuthToken();
      console.info(`[INFO] AWS auth token generated successfully`);
      return token;
    } catch (err) {
      console.error(`[ERROR] Failed to generate AWS auth token: ${(err as Error).message}`);
      throw new Error(`AWS IAM authentication failed: ${(err as Error).message}. Please check your AWS credentials and IAM permissions.`);
    }
  }

  /**
   * Initialize MySQL connection pool
   */
  async init(): Promise<void> {
    try {
      console.info(`[INFO] Initializing MySQL pool: ${this.host}, Database: ${this.database}`);
      
      // Handle AWS IAM authentication
      if (this.awsIamAuth) {
        console.info(`[INFO] Using AWS IAM authentication for user: ${this.config.user}`);
        
        try {
          const authToken = await this.generateAwsAuthToken();
          
          // Create a new config with the generated token as password
          const awsConfig = {
            ...this.config,
            password: authToken
          };
          
          this.pool = mysql.createPool(awsConfig);
        } catch (err) {
          console.error(`[ERROR] AWS IAM authentication failed: ${(err as Error).message}`);
          throw new Error(`AWS IAM authentication failed: ${(err as Error).message}`);
        }
      } else {
        this.pool = mysql.createPool(this.config);
      }
      
      // Verify pool connectivity
      await this.pool.query("SELECT 1");
      console.info(`[INFO] MySQL connection pool initialized successfully`);
    } catch (err) {
      console.error(`[ERROR] MySQL pool initialization error: ${(err as Error).message}`);
      if (this.awsIamAuth) {
        throw new Error(`Failed to connect to MySQL with AWS IAM authentication: ${(err as Error).message}. Please verify your AWS credentials, IAM permissions, and RDS configuration.`);
      } else {
        throw new Error(`Failed to connect to MySQL: ${(err as Error).message}`);
      }
    }
  }

  /**
   * Execute a SQL query and get all results
   */
  async all(query: string, params: any[] = []): Promise<any[]> {
    if (!this.pool) {
      throw new Error("Database not initialized");
    }
    try {
      const [rows] = await this.pool.execute(query, params);
      return Array.isArray(rows) ? rows : [];
    } catch (err) {
      throw new Error(`MySQL query error: ${(err as Error).message}`);
    }
  }

  /**
   * Execute a SQL query that modifies data
   */
  async run(query: string, params: any[] = []): Promise<{ changes: number, lastID: number }> {
    if (!this.pool) {
      throw new Error("Database not initialized");
    }
    try {
      const [result]: any = await this.pool.execute(query, params);
      const changes = result.affectedRows || 0;
      const lastID = result.insertId || 0;
      return { changes, lastID };
    } catch (err) {
      throw new Error(`MySQL query error: ${(err as Error).message}`);
    }
  }

  /**
   * Execute multiple SQL statements
   */
  async exec(query: string): Promise<void> {
    if (!this.pool) {
      throw new Error("Database not initialized");
    }
    try {
      await this.pool.query(query);
    } catch (err) {
      throw new Error(`MySQL batch error: ${(err as Error).message}`);
    }
  }

  /**
   * Close the database connection pool
   */
  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }

  /**
   * Get database metadata
   */
  getMetadata(): { name: string; type: string; server: string; database: string } {
    return {
      name: "MySQL",
      type: "mysql",
      server: this.host,
      database: this.database,
    };
  }

  /**
   * Get database-specific query for listing tables
   */
  getListTablesQuery(): string {
    return `SELECT table_name AS name FROM information_schema.tables WHERE table_schema = '${this.database}'`;
  }

  /**
   * Get database-specific query for describing a table
   */
  getDescribeTableQuery(tableName: string): string {
    return `DESCRIBE \`${tableName}\``;
  }
} 