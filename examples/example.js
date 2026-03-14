// Example of using the SQLite MCP Server

// 测试 SQL 注入防护功能
import { detectSqlInjection } from '../dist/src/utils/sqlInjectionGuard.js';

// 测试用例
const testCases = [
  { sql: "SELECT * FROM users WHERE id = 1", expected: false, desc: "正常查询" },
  { sql: "SELECT * FROM users WHERE id = 1 OR 1=1", expected: true, desc: "OR 1=1 注入" },
  { sql: "SELECT * FROM users WHERE name = 'admin'--'", expected: true, desc: "注释注入" },
  { sql: "SELECT * FROM users UNION SELECT * FROM passwords", expected: true, desc: "UNION 注入" },
];

console.log("=== SQL 注入防护测试 ===\n");

testCases.forEach((test, index) => {
  const result = detectSqlInjection(test.sql);
  const status = result.isInjection === test.expected ? "✅" : "❌";
  console.log(`${index + 1}. ${test.desc}`);
  console.log(`   SQL: ${test.sql}`);
  console.log(`   检测结果: ${result.isInjection ? "检测到注入" : "安全"}`);
  console.log(`   风险等级: ${result.riskLevel}`);
  console.log(`   预期: ${test.expected ? "注入" : "安全"} ${status}\n`);
});

console.log("=== 测试完成 ===");
