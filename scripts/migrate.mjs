// One-time (and safe-to-rerun) schema setup.
// Usage: node scripts/migrate.mjs
// Requires POSTGRES_URL or DATABASE_URL to be set in the environment.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { getPool } from "../lib/db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const sql = readFileSync(path.join(__dirname, "..", "lib", "db", "schema.sql"), "utf8");
  const pool = getPool();
  console.log("Running schema.sql...");
  await pool.query(sql);
  console.log("Done — tables are ready.");
  await pool.end();
}

main().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
