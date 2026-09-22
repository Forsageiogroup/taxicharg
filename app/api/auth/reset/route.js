import { NextResponse } from "next/server";
import { db, authClient } from "@/lib/supabase";
import { setDriverSessionId } from "@/lib/data/drivers";

/**
 * The reset page posts the token from the email and the new password. The
 * token is spent here, and only here - so the link in the email can be
 * opened (by the person, or by a mail scanner) without using it up. The
 * service key sets the password. Any other device signed in as them is
 * signed out.
 *
 *   { tokenHash, kind: 'invite' | 'recovery', password }   the email link
 *   { accessToken, password }                               an older link
 */
const SPENT = "This link has expired or was already used. Ask for a new one from the log in page.";
export async function POST(request) {
  const body = await request.json().catch(() => null);
  const password = String(body?.password || "");
  if (password.length < 8) return NextResponse.json({ error: "Use at least 8 characters." }, { status: 400 });
  const client = db();
  let user = null;
  if (body?.tokenHash) {
    const type = body.kind === "invite" ? "invite" : "recovery";
    const { data, error } = await authClient().auth.verifyOtp({ token_hash: String(body.tokenHash), type });
    if (error || !data?.user) return NextResponse.json({ error: SPENT }, { status: 400 });
    user = data.user;
  } else if (body?.accessToken) {
    const { data, error } = await client.auth.getUser(String(body.accessToken));
    if (error || !data?.user) return NextResponse.json({ error: SPENT }, { status: 400 });
    user = data.user;
  } else {
    return NextResponse.json({ error: SPENT }, { status: 400 });
  }
  const u = { user };
  const { error: e2 } = await client.auth.admin.updateUserById(u.user.id, { password });
  if (e2) return NextResponse.json({ error: "Could not save that password: " + e2.message }, { status: 400 });
  const { data: d } = await client.from("drivers").select("id").eq("auth_user_id", u.user.id).maybeSingle();
  if (d) await setDriverSessionId(d.id, null);
  return NextResponse.json({ ok: true });
}
