import { NextResponse } from "next/server";
import { sendMail } from "@/lib/mail";
import { gateForm } from "@/lib/protect";
import { findDriverByReferralCode, recordReferral } from "@/lib/data/referrals";

/**
 * "Apply to join": the office sets people up - a terminal has to be
 * allocated and the paperwork done - so a sign-up is a request to the
 * office, not an account. It lands in the office mailbox and the person is
 * told the team will be in touch. The office adds them in the panel, marked
 * Taxi Charge, and the login email they get is a Taxi Charge one.
 */
export async function POST(request) {
  const body = await request.json().catch(() => null);
  const blocked = await gateForm(request, body, { form: "signup", limit: 5 });
  if (blocked) return blocked;
  if (!body?.name || !body?.email || !body?.phone) {
    return NextResponse.json({ error: "Name, email and phone are required." }, { status: 400 });
  }
  // a friend's code: remembered, so the office can link them and pay both
  let referred = null;
  if (body.ref) {
    const referrer = await findDriverByReferralCode(body.ref);
    if (!referrer) return NextResponse.json({ error: "That referral code does not match a TaxiCharg driver. Check it with your friend, or leave it blank." }, { status: 400 });
    await recordReferral({ referrer, name: body.name, email: body.email, phone: body.phone });
    referred = referrer;
  }
  const to = process.env.TC_OFFICE_EMAIL;
  if (to) {
    await sendMail({
      to, subject: "TaxiCharg sign-up: " + body.name,
      heading: "New TaxiCharg sign-up",
      paragraphs: [
        `${body.name} has applied to join TaxiCharg.`,
        `Email: ${body.email}`, `Phone: ${body.phone}`, body.interest ? `Interested in: ${String(body.interest).slice(0, 80)}` : "", referred ? `Referred by: ${referred.name} (${referred.reference || ""}, code ${referred.code}) - link them on the register and the referral tracks itself` : "", body.plate ? `Plate: ${String(body.plate).slice(0, 12)}` : "", body.fleet ? `Fleet / network: ${body.fleet}` : "",
        "Add them on the register (Drivers > Add > role Terminal user, brand Taxi Charge) and send the login from the panel.",
      ].filter(Boolean),
    });
  } else {
    console.log("[signup] new TaxiCharg sign-up (TC_OFFICE_EMAIL not set):", { ...body, at: new Date().toISOString() });
  }
  return NextResponse.json({ ok: true, message: "Thanks! Your application has been received. Our team will verify your details and set up your account." });
}
