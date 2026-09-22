import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { findDriverByEmail } from "@/lib/data/drivers";
import { sendMail } from "@/lib/mail";

/**
 * "Forgot your password?" A recovery link is made for the account and sent
 * in a Taxi Charge email (the database's own reset email would carry the
 * other brand). The reply is the same whether or not the address is known,
 * so nobody can type addresses here and learn who has an account.
 */
export async function POST(request) {
  const body = await request.json().catch(() => null);
  const email = String(body?.email || "").trim().toLowerCase();
  const reply = NextResponse.json({ ok: true, message: "If that email has an account, a link to choose a new password is on its way. Check junk mail too." });
  if (!email) return reply;
  try {
    const driver = await findDriverByEmail(email);
    if (!driver) return reply;
    const site = (process.env.TC_SITE_URL || new URL(request.url).origin).replace(/\/$/, "");
    const { data, error } = await db().auth.admin.generateLink({ type: "recovery", email, options: { redirectTo: site + "/reset" } });
    if (error || !data?.properties?.action_link) { console.error("[forgot] generateLink", error); return reply; }
    await sendMail({
      to: email, subject: "Choose a new TaxiCharg password",
      heading: "Choose a new password",
      paragraphs: [
        `Hi ${driver.name || ""},`.replace(" ,", ","),
        "Someone asked to reset the password for your TaxiCharg account. Press the button to choose a new one. The link works once and expires after an hour.",
        "If this was not you, ignore this email - your password has not changed.",
      ],
      button: { label: "Choose a new password", url: data.properties.action_link },
    });
  } catch (err) {
    console.error("[forgot]", err);
  }
  return reply;
}
