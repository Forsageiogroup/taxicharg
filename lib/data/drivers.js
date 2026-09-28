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

/** Every query below used to drop its error on the floor: a missing column
 * (a migration not yet run) looked exactly like "no such driver". Now it is
 * in the Vercel logs, once per call, with the query it came from. */
function got(where, res) {
  if (res.error) console.error(`[drivers] ${where}:`, res.error.message || res.error);
  return res.data;
}

const FIELDS = "id, reference, full_name, email, phone, abn, status, role, brand, onboarded_on, created_at, auth_user_id, tc_session_id, tc_connections, other_networks, referral_code";

const EMPTY_CONNECTIONS = {
  clover: { connected: false, merchantId: null, connectedAt: null },
  stripe: { connected: false, accountId: null, payoutsEnabled: false, connectedAt: null },
};

async function decorate(row) {
  if (!row) return null;
  const [terms, allocs, bal] = await Promise.all([
    // every terminal the office has put in their hands, working or not
    db().from("clover_terminals").select("id, serial, mid, tid, label, status, updated_at, taxi:taxi_id(plate, vehicle_class)").eq("driver_id", row.id).order("status").order("updated_at", { ascending: false }),
    // and the record of which terminals they have held, and when
    db().from("terminal_allocations").select("id, terminal_id, from_at, to_at, terminal:terminal_id(serial, tid, label)").eq("driver_id", row.id).order("from_at", { ascending: false }).limit(50),
    db().from("driver_wallet_balance").select("balance").eq("driver_id", row.id).maybeSingle(),
  ]);
  const held = allocs.data || [];
  const terminals = (terms.data || []).map((t) => {
    const a = held.find((x) => x.terminal_id === t.id && !x.to_at);
    return { id: t.id, serial: t.serial, mid: t.mid, tid: t.tid, label: t.label || "", status: t.status,
      plate: (t.taxi && t.taxi.plate) || "", vehicleClass: (t.taxi && t.taxi.vehicle_class) || "", since: a ? a.from_at : null };
  });
  const history = held.filter((x) => x.to_at).map((x) => ({ id: x.id, serial: x.terminal ? x.terminal.serial : "", tid: x.terminal ? x.terminal.tid : "", label: (x.terminal && x.terminal.label) || "", from: x.from_at, to: x.to_at }));
  const t = terminals.find((x) => x.status === "active") || terminals[0] || null;
  return {
    id: row.id,
    driverId: row.reference || "",
    name: row.full_name,
    email: row.email || "",
    phone: row.phone || "",
    plate: (t && t.plate) || "",
    abn: row.abn || "",
    terminalNumber: t ? (t.serial || t.tid || "") : "",
    terminal: t,
    terminals,
    terminalHistory: history,
    paymentMethod: "Bank transfer",
    fleet: row.other_networks || "",
    status: row.status === "suspended" ? "suspended" : row.status === "active" ? "active" : row.status || "active",
    balance: Number((bal.data && bal.data.balance) || 0),
    joinedAt: (row.onboarded_on || String(row.created_at || "").slice(0, 10) || ""),
    connections: { ...EMPTY_CONNECTIONS, ...(row.tc_connections || {}) },
    sessionId: row.tc_session_id || null,
    referralCode: row.referral_code || null,
    authUserId: row.auth_user_id || null,
    brand: row.brand,
  };
}

export async function listDrivers() {
  const data = got("listDrivers", await db().from("drivers").select(FIELDS).eq("brand", BRAND).order("created_at"));
  return Promise.all((data || []).map(decorate));
}

export async function findDriverByEmail(email) {
  const data = got("findDriverByEmail", await db().from("drivers").select(FIELDS).ilike("email", String(email || "").trim()).limit(1).maybeSingle());
  return decorate(data);
}

/**
 * A driver by mobile number (28 Sept, the text-message log in). Any brand,
 * the same as the email lookup above - one log-in page for everyone.
 * Matched on the last nine digits, however the number was typed when they
 * were added. If the number is on more than one record: suspended ones are
 * set aside first (an old account that was closed should not block the
 * driver's current one); then, since this is the Taxi Charge site, a Taxi
 * Charge record wins over the same person's SYD CABS driver record (the
 * owner is both, on one mobile - 28 Sept); still more than one and it is
 * nothing - two people on one number is a question for the office.
 */
export async function findDriverByPhone(raw) {
  const digits = String(raw || "").replace(/\D/g, "");
  if (digits.length < 9) return null;
  const tail = digits.slice(-9);
  const data = got("findDriverByPhone", await db().from("drivers").select(FIELDS)
    .ilike("phone", "%" + tail.slice(0, 3) + "%" + tail.slice(3, 6) + "%" + tail.slice(6) + "%").limit(10));
  const hits = (data || []).filter((d) => String(d.phone || "").replace(/\D/g, "").slice(-9) === tail);
  if (hits.length === 1) return decorate(hits[0]);
  const live = hits.filter((d) => d.status !== "suspended");
  if (live.length === 1) return decorate(live[0]);
  const ours = live.filter((d) => d.brand === BRAND);
  if (ours.length === 1) return decorate(ours[0]);
  if (live.length === 0 && hits.length > 0) return decorate(hits[0]); // all suspended: let the route say so
  return null;
}

export async function findDriverById(id) {
  if (!id) return null;
  const data = got("findDriverById", await db().from("drivers").select(FIELDS).eq("id", id).maybeSingle());
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
