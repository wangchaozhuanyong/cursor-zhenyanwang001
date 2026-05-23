/**
 * 使用 server/.env 中的 DB_* 依次执行 sql 目录下的脚本（本地一键建库/补表）。
 * 用法：在 server 目录执行  npm run db:init
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
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
    await conn.end();
    console.warn(`\n⚠️  未找到 ${dir}，自动回退到迁移链路（npm run migrate）\n`);
    const result = spawnSync(process.execPath, [path.join(__dirname, "migrate-cli.js"), "up"], {
      cwd: path.join(__dirname, ".."),
      stdio: "inherit",
      env: process.env,
    });
    process.exit(result.status ?? 1);
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
