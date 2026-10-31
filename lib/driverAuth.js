/**
 * Who is calling a driver API (tc-0016). The website sends its own login
 * cookie; the TaxiCharg phone app sends the driver's Supabase sign-in
 * (Authorization: Bearer <access token>) - the same login he uses in the app.
 * Either way the answer is the driver record, or null.
 */
import { requireDriverSession } from "@/lib/driverSession";
import { authClient, db } from "@/lib/supabase";
import { findDriverById } from "@/lib/data/drivers";

export async function driverFromRequest(request) {
  const h = request?.headers?.get?.("authorization") || "";
  const m = /^Bearer\s+([A-Za-z0-9._-]{20,4096})$/.exec(h.trim());
  if (!m) {
    const s = await requireDriverSession();
    return s ? s.driver : null;
  }
  const { data, error } = await authClient().auth.getUser(m[1]);
  if (error || !data?.user?.id) return null;
  const res = await db().from("drivers").select("id").eq("auth_user_id", data.user.id).limit(2);
  if (res.error || !res.data || res.data.length !== 1) return null;   // none, or more than one record: refused
  return findDriverById(res.data[0].id);
}
