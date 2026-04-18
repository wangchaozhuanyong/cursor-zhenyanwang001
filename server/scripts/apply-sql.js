/**
 * 使用 server/.env 中的 DB_* 依次执行 sql 目录下的脚本（本地一键建库/补表）。
 * 用法：在 server 目录执行  npm run db:init
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

const FILES = ["init.sql", "extend.sql", "extend2.sql", "extend3.sql", "seed.sql"];

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD ?? "",
    multipleStatements: true,
  });

  const dir = path.join(__dirname, "..", "sql");
  if (!fs.existsSync(dir)) {
    console.error(
      `\n❌  sql 目录不存在: ${dir}\n\n` +
      `请先创建 server/sql/ 目录并放入以下文件：\n` +
      FILES.map((f) => `  - ${f}`).join("\n") + "\n\n" +
      `可参考 server/SETUP.md 获取完整建库流程说明。\n`,
    );
    process.exit(1);
  }
  for (const f of FILES) {
    const p = path.join(dir, f);
    if (!fs.existsSync(p)) {
      console.warn("跳过（不存在）:", f);
      continue;
    }
    const sql = fs.readFileSync(p, "utf8");
    await conn.query(sql);
    console.log("✅", f);
  }
  await conn.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
