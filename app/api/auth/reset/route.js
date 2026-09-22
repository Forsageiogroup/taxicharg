import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { setDriverSessionId } from "@/lib/data/drivers";

/**
 * The reset page posts the token from the recovery link and the new
 * password. The token proves who they are; the service key sets the
 * password. Any other device signed in as them is signed out.
 */
export async function POST(request) {
  const body = await request.json().catch(() => null);
  const token = String(body?.accessToken || ""), password = String(body?.password || "");
  if (!token) return NextResponse.json({ error: "This link has expired or was already used. Ask for a new one." }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: "Use at least 8 characters." }, { status: 400 });
  const client = db();
  const { data: u, error } = await client.auth.getUser(token);
  if (error || !u?.user) return NextResponse.json({ error: "This link has expired or was already used. Ask for a new one." }, { status: 400 });
  const { error: e2 } = await client.auth.admin.updateUserById(u.user.id, { password });
  if (e2) return NextResponse.json({ error: "Could not save that password: " + e2.message }, { status: 400 });
  const { data: d } = await client.from("drivers").select("id").eq("auth_user_id", u.user.id).maybeSingle();
  if (d) await setDriverSessionId(d.id, null);
  return NextResponse.json({ ok: true });
}
