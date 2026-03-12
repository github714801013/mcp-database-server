/**
 * 安全配置模块
 * 控制危险操作的权限
 */

/**
 * ALTER TABLE 子操作权限配置
 * 允许细粒度控制 ALTER TABLE 的具体操作
 */
export interface AlterPermissions {
  /** 允许 ADD COLUMN（新增字段） */
  allowAddColumn: boolean;
  /** 允许 DROP COLUMN（删除字段） */
  allowDropColumn: boolean;
  /** 允许 MODIFY COLUMN（修改字段类型/属性） */
  allowModifyColumn: boolean;
  /** 允许 RENAME COLUMN（重命名字段） */
  allowRenameColumn: boolean;
  /** 允许 RENAME TABLE（重命名表） */
  allowRenameTable: boolean;
  /** 允许 ADD CONSTRAINT（添加约束） */
  allowAddConstraint: boolean;
  /** 允许 DROP CONSTRAINT（删除约束） */
  allowDropConstraint: boolean;
}

/**
 * 安全配置接口
 * 定义哪些危险操作被允许执行
 */
export interface SecurityConfig {
  /** 允许 DROP TABLE 操作 */
  allowDrop: boolean;
  /** 允许 DELETE 操作 */
  allowDelete: boolean;
  /** 允许 UPDATE 操作 */
  allowUpdate: boolean;
  /** 允许 ALTER TABLE 操作（粗粒度，建议使用 alterPermissions） */
  allowAlter: boolean;
  /** ALTER TABLE 子操作权限（细粒度） */
  alterPermissions: AlterPermissions;
}

/**
 * 默认 ALTER 权限配置
 * 默认允许安全的操作（ADD COLUMN、RENAME），禁止危险操作
 */
export const DEFAULT_ALTER_PERMISSIONS: AlterPermissions = {
  allowAddColumn: true,      // 新增字段 - 默认允许（相对安全）
  allowDropColumn: false,    // 删除字段 - 默认禁止（危险）
  allowModifyColumn: false,  // 修改字段 - 默认禁止（可能丢失数据）
  allowRenameColumn: true,   // 重命名字段 - 默认允许（相对安全）
  allowRenameTable: true,    // 重命名表 - 默认允许（相对安全）
  allowAddConstraint: true,  // 添加约束 - 默认允许
  allowDropConstraint: false, // 删除约束 - 默认禁止
};

/**
 * 默认安全配置
 * 所有危险操作默认禁用，采用最小权限原则
 */
export const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  allowDrop: false,
  allowDelete: false,
  allowUpdate: false,
  allowAlter: false,
  alterPermissions: { ...DEFAULT_ALTER_PERMISSIONS },
};

/**
 * 危险操作类型
 */
export type DangerousOperation = 'drop' | 'delete' | 'update' | 'alter';

/**
 * ALTER 子操作类型
 */
export type AlterSubOperation = keyof AlterPermissions;

/**
 * 操作类型到配置键的映射
 */
const OPERATION_CONFIG_MAP: Record<DangerousOperation, keyof SecurityConfig> = {
  drop: 'allowDrop',
  delete: 'allowDelete',
  update: 'allowUpdate',
  alter: 'allowAlter',
};

/**
 * 操作类型到错误消息的映射
 */
const OPERATION_ERROR_MESSAGE: Record<DangerousOperation, string> = {
  drop: 'DROP TABLE 操作已被安全配置禁用。请使用 --allow-drop 参数启用此操作。',
  delete: 'DELETE 操作已被安全配置禁用。请使用 --allow-delete 参数启用此操作。',
  update: 'UPDATE 操作已被安全配置禁用。请使用 --allow-update 参数启用此操作。',
  alter: 'ALTER TABLE 操作已被安全配置禁用。请使用 --allow-alter 参数启用此操作。',
};

/**
 * ALTER 子操作到错误消息的映射
 */
const ALTER_SUB_OPERATION_ERROR_MESSAGE: Record<AlterSubOperation, string> = {
  allowAddColumn: 'ADD COLUMN 操作已被安全配置禁用。请使用 --allow-add-column 参数启用此操作。',
  allowDropColumn: 'DROP COLUMN 操作已被安全配置禁用。请使用 --allow-drop-column 参数启用此操作。',
  allowModifyColumn: 'MODIFY COLUMN 操作已被安全配置禁用。请使用 --allow-modify-column 参数启用此操作。',
  allowRenameColumn: 'RENAME COLUMN 操作已被安全配置禁用。请使用 --allow-rename-column 参数启用此操作。',
  allowRenameTable: 'RENAME TABLE 操作已被安全配置禁用。请使用 --allow-rename-table 参数启用此操作。',
  allowAddConstraint: 'ADD CONSTRAINT 操作已被安全配置禁用。请使用 --allow-add-constraint 参数启用此操作。',
  allowDropConstraint: 'DROP CONSTRAINT 操作已被安全配置禁用。请使用 --allow-drop-constraint 参数启用此操作。',
};

// 全局安全配置实例
let securityConfig: SecurityConfig = { ...DEFAULT_SECURITY_CONFIG };

/**
 * 初始化安全配置
 * @param config 安全配置对象
 */
export function initSecurityConfig(config: Partial<SecurityConfig>): void {
  securityConfig = {
    ...DEFAULT_SECURITY_CONFIG,
    ...config,
    // 合并 ALTER 权限配置
    alterPermissions: {
      ...DEFAULT_ALTER_PERMISSIONS,
      ...(config.alterPermissions || {}),
    },
  };
}

/**
 * 获取当前安全配置
 * @returns 当前安全配置对象
 */
export function getSecurityConfig(): SecurityConfig {
  return { ...securityConfig };
}

/**
 * 检查指定操作是否被允许
 * @param operation 危险操作类型
 * @returns 操作是否被允许
 */
export function isOperationAllowed(operation: DangerousOperation): boolean {
  const configKey = OPERATION_CONFIG_MAP[operation];
  return securityConfig[configKey] as boolean;
}

/**
 * 检查 ALTER 子操作是否被允许
 * @param subOperation ALTER 子操作类型
 * @returns 操作是否被允许
 */
export function isAlterSubOperationAllowed(subOperation: AlterSubOperation): boolean {
  // 如果启用了粗粒度的 allowAlter，则允许所有 ALTER 子操作
  if (securityConfig.allowAlter) {
    return true;
  }
  return securityConfig.alterPermissions[subOperation];
}

/**
 * 获取操作被禁用时的错误消息
 * @param operation 危险操作类型
 * @returns 错误消息
 */
export function getDisabledOperationError(operation: DangerousOperation): string {
  return OPERATION_ERROR_MESSAGE[operation];
}

/**
 * 获取 ALTER 子操作被禁用时的错误消息
 * @param subOperation ALTER 子操作类型
 * @returns 错误消息
 */
export function getDisabledAlterSubOperationError(subOperation: AlterSubOperation): string {
  return ALTER_SUB_OPERATION_ERROR_MESSAGE[subOperation];
}

/**
 * 验证操作是否被允许，如果不允许则抛出错误
 * @param operation 危险操作类型
 * @throws Error 如果操作被禁用
 */
export function validateOperation(operation: DangerousOperation): void {
  if (!isOperationAllowed(operation)) {
    throw new Error(getDisabledOperationError(operation));
  }
}

/**
 * 验证 ALTER 子操作是否被允许
 * @param subOperation ALTER 子操作类型
 * @throws Error 如果操作被禁用
 */
export function validateAlterSubOperation(subOperation: AlterSubOperation): void {
  if (!isAlterSubOperationAllowed(subOperation)) {
    throw new Error(getDisabledAlterSubOperationError(subOperation));
  }
}

/**
 * 解析 ALTER TABLE SQL 语句，识别具体操作类型
 * @param sql ALTER TABLE 语句
 * @returns 识别出的子操作列表
 */
export function parseAlterOperations(sql: string): AlterSubOperation[] {
  const operations: AlterSubOperation[] = [];
  const lowerSql = sql.toLowerCase();

  // ADD COLUMN
  if (/\badd\s+(column\s+)?\w+/.test(lowerSql)) {
    operations.push('allowAddColumn');
  }

  // DROP COLUMN
  if (/\bdrop\s+column\b/.test(lowerSql)) {
    operations.push('allowDropColumn');
  }

  // MODIFY COLUMN / ALTER COLUMN
  if (/\b(modify\s+column|alter\s+column)\b/.test(lowerSql)) {
    operations.push('allowModifyColumn');
  }

  // RENAME COLUMN
  if (/\brename\s+column\b/.test(lowerSql)) {
    operations.push('allowRenameColumn');
  }

  // RENAME TO (重命名表)
  if (/\brename\s+to\b/.test(lowerSql)) {
    operations.push('allowRenameTable');
  }

  // ADD CONSTRAINT
  if (/\badd\s+(constraint|primary\s+key|foreign\s+key|unique|check)\b/.test(lowerSql)) {
    operations.push('allowAddConstraint');
  }

  // DROP CONSTRAINT
  if (/\bdrop\s+constraint\b/.test(lowerSql)) {
    operations.push('allowDropConstraint');
  }

  // 如果没有识别到具体操作，默认需要 allowAlter 权限
  if (operations.length === 0) {
    // 返回一个特殊标记，表示需要粗粒度的 allowAlter 权限
  }

  return operations;
}

/**
 * 验证 ALTER TABLE 语句的权限
 * @param sql ALTER TABLE 语句
 * @throws Error 如果任何子操作被禁用
 */
export function validateAlterSql(sql: string): void {
  const operations = parseAlterOperations(sql);

  if (operations.length === 0) {
    // 未识别的具体操作，检查粗粒度权限
    if (!securityConfig.allowAlter) {
      throw new Error('ALTER TABLE 操作已被安全配置禁用。请使用 --allow-alter 参数启用此操作。');
    }
    return;
  }

  // 检查每个子操作的权限
  for (const op of operations) {
    validateAlterSubOperation(op);
  }
}

/**
 * 从命令行参数解析安全配置
 * @param args 命令行参数数组
 * @returns 部分安全配置对象
 */
export function parseSecurityConfigFromArgs(args: string[]): Partial<SecurityConfig> {
  const config: Partial<SecurityConfig> = {};
  const alterPerms: Partial<AlterPermissions> = {};

  // 检查 --allow-all 参数（启用所有危险操作）
  if (args.includes('--allow-all')) {
    config.allowDrop = true;
    config.allowDelete = true;
    config.allowUpdate = true;
    config.allowAlter = true;
    // 同时启用所有 ALTER 子操作
    config.alterPermissions = {
      allowAddColumn: true,
      allowDropColumn: true,
      allowModifyColumn: true,
      allowRenameColumn: true,
      allowRenameTable: true,
      allowAddConstraint: true,
      allowDropConstraint: true,
    };
    return config;
  }

  // 检查各个单独的权限参数
  if (args.includes('--allow-drop')) {
    config.allowDrop = true;
  }
  if (args.includes('--allow-delete')) {
    config.allowDelete = true;
  }
  if (args.includes('--allow-update')) {
    config.allowUpdate = true;
  }
  if (args.includes('--allow-alter')) {
    config.allowAlter = true;
  }

  // ALTER 子操作参数
  if (args.includes('--allow-add-column')) {
    alterPerms.allowAddColumn = true;
  }
  if (args.includes('--allow-drop-column')) {
    alterPerms.allowDropColumn = true;
  }
  if (args.includes('--allow-modify-column')) {
    alterPerms.allowModifyColumn = true;
  }
  if (args.includes('--allow-rename-column')) {
    alterPerms.allowRenameColumn = true;
  }
  if (args.includes('--allow-rename-table')) {
    alterPerms.allowRenameTable = true;
  }
  if (args.includes('--allow-add-constraint')) {
    alterPerms.allowAddConstraint = true;
  }
  if (args.includes('--allow-drop-constraint')) {
    alterPerms.allowDropConstraint = true;
  }

  if (Object.keys(alterPerms).length > 0) {
    config.alterPermissions = alterPerms as AlterPermissions;
  }

  return config;
}