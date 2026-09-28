import { db } from "@/lib/supabase";
import { sendMail, mailConfigured } from "@/lib/mail";
import { hashCode } from "@/lib/auth";
import { sendSms, smsConfigured, toE164 } from "@/lib/sms";

/**
 * The emailed log-in code (27 Sept): six digits, ten minutes, five guesses.
 * Only the hash is stored (migration 129, tc_login_codes). On unless
 * TC_LOGIN_CODE=off. If the site cannot send email at all, the step is
 * skipped and logged - a driver must not be locked out by a mail outage.
 */
export function codeStepEnabled() {
  return process.env.TC_LOGIN_CODE !== "off" && mailConfigured();
}

async function newCode(driver) {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const { error } = await db().from("tc_login_codes").upsert(
    { driver_id: driver.id, code_hash: await hashCode(driver.id, code), expires_at: expires, attempts: 0, created_at: new Date().toISOString() },
    { onConflict: "driver_id" }
  );
  if (error) throw error;
  return code;
}

/** The same code, by text message (28 Sept). Needs Twilio (lib/sms.js). */
export function smsCodesEnabled() { return smsConfigured(); }
export async function sendLoginCodeSms(driver) {
  const to = toE164(driver.phone);
  if (!to) throw new Error("no mobile number we can text");
  const code = await newCode(driver);
  const r = await sendSms(to, `${code} is your TaxiCharg log-in code. It works for 10 minutes. If you did not ask for it, ignore this message.`);
  if (!r.sent) throw new Error("code sms not sent: " + (r.error || r.skipped || "unknown"));
  return to;
}

export async function sendLoginCode(driver) {
  const code = await newCode(driver);
  const r = await sendMail({
    to: driver.email,
    subject: `${code} is your TaxiCharg log-in code`,
    heading: "Your log-in code",
    paragraphs: [
      `Hi ${driver.name || ""},`.replace(" ,", ","),
      `Your code is ${code}. It works for ten minutes.`,
      "If you did not just try to log in to TaxiCharg, someone has your password: change it from the log in page (Forgot your password?) and tell us.",
    ],
  });
  if (!r.sent) throw new Error("code email not sent: " + (r.error || r.skipped || "unknown"));
}

/** Check a code. Returns "ok", "wrong", "spent" (expired or too many tries) or "none". */
export async function checkLoginCode(driverId, code) {
  const { data } = await db().from("tc_login_codes").select("code_hash, expires_at, attempts").eq("driver_id", driverId).maybeSingle();
  if (!data) return "none";
  const spend = () => db().from("tc_login_codes").delete().eq("driver_id", driverId);
  if (new Date(data.expires_at).getTime() < Date.now() || data.attempts >= 5) { await spend(); return "spent"; }
  const want = await hashCode(driverId, String(code || "").replace(/\D/g, ""));
  if (want !== data.code_hash) {
    await db().from("tc_login_codes").update({ attempts: data.attempts + 1 }).eq("driver_id", driverId);
    return data.attempts + 1 >= 5 ? "spent" : "wrong";
  }
  await spend();
  return "ok";
}
