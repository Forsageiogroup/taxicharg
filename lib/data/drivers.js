/**
 * DATA LAYER — drivers (the SYD CABS register, brand taxicharge)
 * -------------------------------------------------------------------
 * The same functions and the same shapes the pages have always used;
 * underneath, a Taxi Charge user is a row in the shared `drivers` table
 * marked brand = 'taxicharge', their terminal is a `clover_terminals` row
 * allocated to them, and their balance is the wallet (driver_wallet_balance).
 * Passwords are no longer stored here at all: Supabase Auth holds them.
 * -------------------------------------------------------------------
 */

import { db, authClient, BRAND } from "@/lib/supabase";

const FIELDS = "id, reference, full_name, email, phone, abn, status, role, brand, onboarded_on, created_at, auth_user_id, tc_session_id, tc_connections, other_networks";

const EMPTY_CONNECTIONS = {
  clover: { connected: false, merchantId: null, connectedAt: null },
  stripe: { connected: false, accountId: null, payoutsEnabled: false, connectedAt: null },
};

async function decorate(row) {
  if (!row) return null;
  const [term, bal] = await Promise.all([
    db().from("clover_terminals").select("id, serial, mid, tid, label, status, taxi:taxi_id(plate)").eq("driver_id", row.id).eq("status", "active").order("updated_at", { ascending: false }).limit(1).maybeSingle(),
    db().from("driver_wallet_balance").select("balance").eq("driver_id", row.id).maybeSingle(),
  ]);
  const t = term.data || null;
  return {
    id: row.id,
    driverId: row.reference || "",
    name: row.full_name,
    email: row.email || "",
    phone: row.phone || "",
    plate: (t && t.taxi && t.taxi.plate) || "",
    abn: row.abn || "",
    terminalNumber: t ? (t.serial || t.tid || "") : "",
    terminal: t ? { id: t.id, serial: t.serial, mid: t.mid, tid: t.tid, label: t.label } : null,
    paymentMethod: "Bank transfer",
    fleet: row.other_networks || "",
    status: row.status === "suspended" ? "suspended" : row.status === "active" ? "active" : row.status || "active",
    balance: Number((bal.data && bal.data.balance) || 0),
    joinedAt: (row.onboarded_on || String(row.created_at || "").slice(0, 10) || ""),
    connections: { ...EMPTY_CONNECTIONS, ...(row.tc_connections || {}) },
    sessionId: row.tc_session_id || null,
    authUserId: row.auth_user_id || null,
    brand: row.brand,
  };
}

export async function listDrivers() {
  const { data } = await db().from("drivers").select(FIELDS).eq("brand", BRAND).order("created_at");
  return Promise.all((data || []).map(decorate));
}

export async function findDriverByEmail(email) {
  const { data } = await db().from("drivers").select(FIELDS).ilike("email", String(email || "").trim()).limit(1).maybeSingle();
  return decorate(data);
}

export async function findDriverById(id) {
  if (!id) return null;
  const { data } = await db().from("drivers").select(FIELDS).eq("id", id).maybeSingle();
  return decorate(data);
}

/**
 * The email and password are checked by Supabase Auth - the same login the
 * office issues from the panel - and the person must be on the register.
 */
export async function verifyDriverPassword(email, password) {
  const { data, error } = await authClient().auth.signInWithPassword({ email: String(email || "").trim(), password });
  if (error || !data || !data.user) return null;
  const { data: row } = await db().from("drivers").select(FIELDS).eq("auth_user_id", data.user.id).maybeSingle();
  if (!row) return null;
  try { await authClient().auth.admin?.signOut?.(data.session?.access_token); } catch {}
  return decorate(row);
}

export async function setDriverSessionId(id, sessionId) {
  const { data } = await db().from("drivers").update({ tc_session_id: sessionId }).eq("id", id).select(FIELDS).maybeSingle();
  return decorate(data);
}

export async function updateDriverConnection(id, provider, patch) {
  const driver = await findDriverById(id);
  if (!driver) return null;
  const next = { ...driver.connections, [provider]: { ...driver.connections[provider], ...patch } };
  const { data } = await db().from("drivers").update({ tc_connections: next, updated_at: new Date().toISOString() }).eq("id", id).select(FIELDS).maybeSingle();
  return decorate(data);
}

/** The person may change their ABN here; the plate belongs to the cab record and is the office's to set. */
export async function updateDriverProfile(id, patch) {
  const upd = {};
  if (patch.abn !== undefined) upd.abn = String(patch.abn || "").trim() || null;
  if (patch.phone !== undefined) upd.phone = String(patch.phone || "").trim() || null;
  if (!Object.keys(upd).length) return findDriverById(id);
  upd.updated_at = new Date().toISOString();
  const { data } = await db().from("drivers").update(upd).eq("id", id).select(FIELDS).maybeSingle();
  return decorate(data);
}
