/**
 * Shared Postgres connection pool.
 *
 * Reads the connection string from POSTGRES_URL (what Vercel's Postgres
 * integration sets automatically) or DATABASE_URL (the generic name most
 * other providers use — Supabase, Neon, Railway, etc.). Works against
 * any standard Postgres server, including a local one for development.
 *
 * The pool is created lazily and only actually opens a connection on
 * the first query, so importing this file is always safe — including
 * at `next build` time, when no database needs to be reachable yet.
 */

import { Pool } from "pg";

let pool;

function connectionString() {
  return process.env.POSTGRES_URL || process.env.DATABASE_URL;
}

function needsSsl(connString) {
  if (!connString) return false;
  if (connString.includes("sslmode=disable")) return false;
  // Local/dev databases (localhost, 127.0.0.1) run without SSL; every
  // hosted provider (Vercel Postgres, Supabase, Neon, Railway...) needs it.
  return !/@localhost|@127\.0\.0\.1/.test(connString);
}

export function getPool() {
  if (!pool) {
    const cs = connectionString();
    if (!cs) {
      throw new Error(
        "No database configured — set POSTGRES_URL (or DATABASE_URL) as an environment variable."
      );
    }
    pool = new Pool({
      connectionString: cs,
      ssl: needsSsl(cs) ? { rejectUnauthorized: false } : false,
    });
  }
  return pool;
}

export async function query(text, params) {
  return getPool().query(text, params);
}

export function isDatabaseConfigured() {
  return Boolean(connectionString());
}
