/**
 * The SYD CABS back end. Taxi Charge keeps its own pages and its own
 * address; underneath, every person, terminal, balance and withdrawal is a
 * row in the same database the SYD CABS panel runs on, so the office
 * handles Taxi Charge people from the panel and nothing is kept twice.
 *
 * Server only. The service-role key bypasses row-level security, so this
 * module must never be imported by anything that runs in the browser.
 *
 *   SUPABASE_URL                the project URL
 *   SUPABASE_SERVICE_ROLE_KEY   the service_role key (server)
 *   SUPABASE_ANON_KEY           the anon key, used only to check a password
 */
import { createClient } from "@supabase/supabase-js";

let service;
export function db() {
  if (!service) {
    const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("Supabase is not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).");
    service = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  }
  return service;
}

/** A throw-away client with the anon key, for checking an email and password. */
export function authClient() {
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase is not configured (SUPABASE_URL / SUPABASE_ANON_KEY).");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
}

export const BRAND = "taxicharge";
