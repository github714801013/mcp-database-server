/**
 * SQL 注入防护模块
 * 结合正则模式匹配和 SQL 语法解析，提供多层防护
 */

import { Parser, AST } from 'node-sql-parser';

/**
 * SQL 注入检测配置
 */
export interface SqlInjectionConfig {
  /** 是否启用 SQL 注入检测 */
  enabled: boolean;
  /** 检测到注入时的行为: 'error' 抛出错误, 'warn' 仅警告 */
  action: 'error' | 'warn';
  /** 是否检测注释注入 */
  checkComments: boolean;
  /** 是否检测联合查询注入 */
  checkUnion: boolean;
  /** 是否检测危险函数 */
  checkDangerousFunctions: boolean;
  /** 是否使用 SQL 解析器进行深度分析 */
  useParser: boolean;
}

/**
 * 默认 SQL 注入检测配置
 */
export const DEFAULT_SQL_INJECTION_CONFIG: SqlInjectionConfig = {
  enabled: true,
  action: 'error',
  checkComments: true,
  checkUnion: true,
  checkDangerousFunctions: true,
  useParser: true,
};

// 全局配置实例
let config: SqlInjectionConfig = { ...DEFAULT_SQL_INJECTION_CONFIG };

// SQL 解析器实例
const parser = new Parser();

/**
 * 初始化 SQL 注入检测配置
 * @param customConfig 自定义配置
 */
export function initSqlInjectionConfig(customConfig: Partial<SqlInjectionConfig>): void {
  config = {
    ...DEFAULT_SQL_INJECTION_CONFIG,
    ...customConfig,
  };
}

/**
 * 获取当前配置
 */
export function getSqlInjectionConfig(): SqlInjectionConfig {
  return { ...config };
}

/**
 * SQL 注入检测结果
 */
export interface SqlInjectionResult {
  /** 是否检测到潜在注入 */
  isInjection: boolean;
  /** 检测到的注入类型 */
  injectionTypes: string[];
  /** 风险等级: 'low' | 'medium' | 'high' | 'critical' */
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  /** 警告消息 */
  message: string;
}

/**
 * SQL 注入检测模式
 * 按风险等级分类
 */
const INJECTION_PATTERNS = {
  // 高危模式 - 直接执行命令
  critical: [
    /;\s*(drop|delete|truncate|update|insert|alter|create|exec|execute)\s/i,
    /xp_cmdshell/i,
    /sp_executesql/i,
    /;\s*shutdown/i,
    /;\s*waitfor\s+delay/i,
  ],

  // 高风险模式
  high: [
    /'\s*(or|and)\s+['"]?\d+['"]?\s*=\s*['"]?\d+/i,
    /'\s*(or|and)\s+['"]?[a-z]+['"]?\s*=\s*['"]?[a-z]+/i,
    /\b(OR|AND)\b\s+['"]?\d+['"]?\s*=\s*['"]?\d+/i,
    /'\s*;\s*--/i,
    /concat\s*\(\s*(@@version|user|database)/i,
    /@@version/i,
    /@@datadir/i,
    /information_schema/i,
    /sys\.tables/i,
    /sysobjects/i,
    /syscolumns/i,
  ],

  // 中等风险模式
  medium: [
    /'\s*(or|and)\s/i,
    /"\s*(or|and)\s/i,
    /\bunion\b.*\bselect\b/i,
    /\bselect\b.*\bfrom\b.*\bunion\b/i,
    /load_file\s*\(/i,
    /into\s+outfile/i,
    /into\s+dumpfile/i,
    /benchmark\s*\(/i,
    /sleep\s*\(/i,
    /pg_sleep\s*\(/i,
    /waitfor\s+delay/i,
    /char\s*\(\s*\d+\s*\)/i,
    /0x[0-9a-f]+/i,
  ],

  // 低风险模式 - 需要上下文判断
  low: [
    /--/,
    /\/\*/,
    /\*\//,
    /'\s*\+/,
    /\+\s*'/,
    /\|\|/,
    /\\x[0-9a-f]{2}/i,
    /%27/i,
    /%22/i,
    /%25/i,
  ],
};

/**
 * 危险 SQL 函数列表
 */
const DANGEROUS_FUNCTIONS = [
  'exec', 'execute', 'xp_cmdshell', 'sp_executesql',
  'load_file', 'into outfile', 'into dumpfile',
  'benchmark', 'sleep', 'pg_sleep', 'waitfor',
  'sys_exec', 'sys_eval', 'pg_read_file',
  'utl_file', 'utl_http', 'http_uri',
];

/**
 * 危险的系统变量
 */
const DANGEROUS_VARIABLES = [
  '@@version', '@@datadir', '@@hostname', '@@basedir',
  '@@plugin_dir', '@@tmpdir', '@@log_error',
];

/**
 * 使用 SQL 解析器进行深度分析
 * @param sql SQL 语句
 * @returns 检测到的风险列表
 */
function analyzeWithParser(sql: string): string[] {
  const risks: string[] = [];

  if (!config.useParser) {
    return risks;
  }

  try {
    // 尝试解析 SQL
    const ast = parser.astify(sql) as AST | AST[];

    // 分析 AST 结构
    if (Array.isArray(ast)) {
      // 多条语句 - 可能是注入攻击
      if (ast.length > 1) {
        risks.push('检测到多条 SQL 语句堆叠');
      }
      for (const node of ast) {
        analyzeAstNode(node, risks);
      }
    } else {
      analyzeAstNode(ast, risks);
    }
  } catch (error) {
    // 解析失败可能是因为非标准 SQL 或注入尝试
    risks.push('SQL 语法解析失败，可能存在异常结构');
  }

  return risks;
}

/**
 * 分析 AST 节点
 * @param node AST 节点
 * @param risks 风险列表
 */
function analyzeAstNode(node: any, risks: string[]): void {
  if (!node || typeof node !== 'object') return;

  // 检查 UNION 注入
  if (node._next) {
    risks.push('检测到 UNION 查询结构');
  }

  // 检查表达式中的危险模式
  if (node.where) {
    analyzeExpression(node.where, risks);
  }

  if (node.on) {
    analyzeExpression(node.on, risks);
  }

  if (node.having) {
    analyzeExpression(node.having, risks);
  }

  // 检查 SELECT 列
  if (node.columns) {
    for (const col of node.columns) {
      if (col.expr) {
        analyzeExpression(col.expr, risks);
      }
    }
  }

  // 检查 FROM 子句
  if (node.from) {
    for (const table of node.from) {
      if (table.expr) {
        analyzeExpression(table.expr, risks);
      }
    }
  }
}

/**
 * 分析表达式
 * @param expr 表达式节点
 * @param risks 风险列表
 */
function analyzeExpression(expr: any, risks: string[]): void {
  if (!expr || typeof expr !== 'object') return;

  // 检查函数调用
  if (expr.type === 'function') {
    const funcName = expr.name?.toLowerCase();
    if (funcName && DANGEROUS_FUNCTIONS.some(f => funcName.includes(f))) {
      risks.push(`检测到危险函数: ${funcName}`);
    }

    // 检查参数
    if (expr.args) {
      for (const arg of expr.args.value || []) {
        analyzeExpression(arg, risks);
      }
    }
  }

  // 检查二元表达式 (OR 1=1 类型)
  if (expr.type === 'binary_expr') {
    const op = expr.operator?.toUpperCase();

    // 检查 tautology (永真条件)
    if (op === 'OR' || op === 'AND') {
      if (isTautology(expr)) {
        risks.push(`检测到永真/永假条件: ${op} 条件注入`);
      }
    }

    // 递归检查左右表达式
    analyzeExpression(expr.left, risks);
    analyzeExpression(expr.right, risks);
  }

  // 检查系统变量
  if (expr.type === 'var' || expr.type === 'variable') {
    const varName = expr.name || expr.value;
    if (typeof varName === 'string') {
      const lowerVar = varName.toLowerCase();
      if (DANGEROUS_VARIABLES.some(v => lowerVar.includes(v.toLowerCase()))) {
        risks.push(`检测到危险系统变量: ${varName}`);
      }
    }
  }

  // 检查注释
  if (expr.type === 'comment') {
    risks.push('检测到 SQL 注释');
  }
}

/**
 * 检查是否为永真/永假条件
 * @param expr 二元表达式
 * @returns 是否为永真/永假条件
 */
function isTautology(expr: any): boolean {
  if (!expr || expr.type !== 'binary_expr') return false;

  const left = expr.left;
  const right = expr.right;
  const op = expr.operator;

  // 1=1, 'a'='a' 等
  if (left.type === 'number' && right.type === 'number') {
    if (op === '=' && left.value === right.value) return true;
  }

  if (left.type === 'string' && right.type === 'string') {
    if (op === '=' && left.value === right.value) return true;
  }

  return false;
}

/**
 * 检测 SQL 注入
 * @param sql 要检测的 SQL 语句
 * @param context 上下文信息（用于日志）
 * @returns 检测结果
 */
export function detectSqlInjection(sql: string, context?: string): SqlInjectionResult {
  if (!config.enabled) {
    return {
      isInjection: false,
      injectionTypes: [],
      riskLevel: 'low',
      message: 'SQL injection detection is disabled',
    };
  }

  const injectionTypes: string[] = [];
  let maxRiskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';

  // 第一层：使用 SQL 解析器进行深度分析
  const parserRisks = analyzeWithParser(sql);
  for (const risk of parserRisks) {
    injectionTypes.push(`[解析器] ${risk}`);
    maxRiskLevel = 'high';
  }

  // 第二层：正则表达式模式匹配
  // 检查高危模式
  for (const pattern of INJECTION_PATTERNS.critical) {
    if (pattern.test(sql)) {
      injectionTypes.push(`[高危] 模式匹配: ${pattern.source}`);
      maxRiskLevel = 'critical';
    }
  }

  // 检查高风险模式
  if (maxRiskLevel !== 'critical') {
    for (const pattern of INJECTION_PATTERNS.high) {
      if (pattern.test(sql)) {
        injectionTypes.push(`[高风险] 模式匹配: ${pattern.source}`);
        maxRiskLevel = maxRiskLevel === 'low' ? 'high' : maxRiskLevel;
      }
    }
  }

  // 检查中等风险模式
  if (maxRiskLevel === 'low') {
    for (const pattern of INJECTION_PATTERNS.medium) {
      if (pattern.test(sql)) {
        injectionTypes.push(`[中等风险] 模式匹配: ${pattern.source}`);
        maxRiskLevel = 'medium';
      }
    }
  }

  // 检查危险函数
  if (config.checkDangerousFunctions) {
    const lowerSql = sql.toLowerCase();
    for (const func of DANGEROUS_FUNCTIONS) {
      if (lowerSql.includes(func.toLowerCase())) {
        injectionTypes.push(`[危险函数] ${func}`);
        if (maxRiskLevel === 'low') {
          maxRiskLevel = 'high';
        }
      }
    }
  }

  // 检查注释（可选）
  if (config.checkComments && maxRiskLevel === 'low') {
    for (const pattern of INJECTION_PATTERNS.low) {
      if (pattern.test(sql)) {
        injectionTypes.push(`[潜在风险] 模式匹配: ${pattern.source}`);
      }
    }
  }

  const isInjection = injectionTypes.length > 0 && maxRiskLevel !== 'low';

  return {
    isInjection,
    injectionTypes,
    riskLevel: isInjection ? maxRiskLevel : 'low',
    message: isInjection
      ? `检测到潜在的 SQL 注入攻击 (${maxRiskLevel} 风险): ${injectionTypes.join('; ')}`
      : '未检测到 SQL 注入风险',
  };
}

/**
 * 验证 SQL 语句安全性
 * 如果检测到注入，根据配置抛出错误或警告
 * @param sql 要验证的 SQL 语句
 * @param context 上下文信息
 * @throws Error 如果检测到注入且配置为 error 模式
 */
export function validateSqlSafety(sql: string, context?: string): void {
  const result = detectSqlInjection(sql, context);

  if (result.isInjection) {
    const logMessage = `[SQL 注入检测] ${context ? `[${context}] ` : ''}${result.message}`;

    if (config.action === 'error') {
      throw new Error(`SQL 安全违规: ${result.message}`);
    } else {
      console.warn(logMessage);
    }
  }
}

/**
 * 对标识符进行安全转义
 * @param identifier 表名、列名等标识符
 * @param quoteChar 引号字符（默认双引号）
 * @returns 转义后的标识符
 */
export function escapeIdentifier(identifier: string, quoteChar: string = '"'): string {
  // 移除现有的引号
  const cleaned = identifier.replace(new RegExp(`[${quoteChar}]`, 'g'), '');

  // 双写内部引号并包裹
  const escaped = cleaned.replace(new RegExp(quoteChar, 'g'), quoteChar + quoteChar);

  return `${quoteChar}${escaped}${quoteChar}`;
}

/**
 * 验证标识符合法性
 * @param identifier 表名、列名等标识符
 * @throws Error 如果标识符不合法
 */
export function validateIdentifier(identifier: string): void {
  if (!identifier || identifier.trim() === '') {
    throw new Error('标识符不能为空');
  }

  // 检查标识符格式（只允许字母、数字、下划线）
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(identifier)) {
    // 允许带引号的标识符
    if (!/^["\'][^"\']*["\']$/.test(identifier)) {
      throw new Error(`非法标识符: ${identifier}`);
    }
  }

  // 检查 SQL 关键字
  const lowerIdentifier = identifier.toLowerCase();
  const sqlKeywords = [
    'select', 'insert', 'update', 'delete', 'drop', 'create', 'alter',
    'truncate', 'exec', 'execute', 'union', 'where', 'from', 'join',
  ];

  if (sqlKeywords.includes(lowerIdentifier)) {
    throw new Error(`标识符不能使用 SQL 关键字: ${identifier}`);
  }
}

/**
 * 检查是否为纯 SELECT 查询（只读）
 * @param sql SQL 语句
 * @returns 是否为只读查询
 */
export function isReadOnlyQuery(sql: string): boolean {
  const normalized = sql.trim().toLowerCase();

  // 以 SELECT 开头
  if (!normalized.startsWith('select')) {
    return false;
  }

  // 检查是否包含修改语句
  const modifyingKeywords = ['insert', 'update', 'delete', 'drop', 'create', 'alter', 'truncate'];
  for (const keyword of modifyingKeywords) {
    // 使用单词边界检查，避免误判如 "selected"
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    if (regex.test(sql)) {
      return false;
    }
  }

  return true;
}

/**
 * 验证 SQL 语法有效性
 * @param sql SQL 语句
 * @returns 是否为有效 SQL
 */
export function validateSqlSyntax(sql: string): { valid: boolean; error?: string } {
  try {
    parser.astify(sql);
    return { valid: true };
  } catch (error: any) {
    return { valid: false, error: error.message };
  }
}

/**
 * 从命令行参数解析 SQL 注入检测配置
 * @param args 命令行参数
 * @returns 部分配置对象
 */
export function parseSqlInjectionConfigFromArgs(args: string[]): Partial<SqlInjectionConfig> {
  const parsedConfig: Partial<SqlInjectionConfig> = {};

  if (args.includes('--disable-sql-injection-check')) {
    parsedConfig.enabled = false;
  }

  if (args.includes('--sql-injection-warn-only')) {
    parsedConfig.action = 'warn';
  }

  if (args.includes('--disable-sql-parser')) {
    parsedConfig.useParser = false;
  }

  return parsedConfig;
}