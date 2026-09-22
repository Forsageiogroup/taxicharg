import { NextResponse } from "next/server";
import { sendMail } from "@/lib/mail";

/**
 * "Apply to join": the office sets people up - a terminal has to be
 * allocated and the paperwork done - so a sign-up is a request to the
 * office, not an account. It lands in the office mailbox and the person is
 * told the team will be in touch. The office adds them in the panel, marked
 * Taxi Charge, and the login email they get is a Taxi Charge one.
 */
export async function POST(request) {
  const body = await request.json().catch(() => null);
  if (!body?.name || !body?.email || !body?.phone) {
    return NextResponse.json({ error: "Name, email and phone are required." }, { status: 400 });
  }
  const to = process.env.TC_OFFICE_EMAIL;
  if (to) {
    await sendMail({
      to, subject: "TaxiCharg sign-up: " + body.name,
      heading: "New TaxiCharg sign-up",
      paragraphs: [
        `${body.name} has applied to join TaxiCharg.`,
        `Email: ${body.email}`, `Phone: ${body.phone}`, body.plate ? `Plate: ${body.plate}` : "", body.fleet ? `Fleet / network: ${body.fleet}` : "",
        "Add them on the register (Drivers > Add > role Terminal user, brand Taxi Charge) and send the login from the panel.",
      ].filter(Boolean),
    });
  } else {
    console.log("[signup] new TaxiCharg sign-up (TC_OFFICE_EMAIL not set):", { ...body, at: new Date().toISOString() });
  }
  return NextResponse.json({ ok: true, message: "Thanks! Your application has been received. Our team will verify your details and set up your account." });
}
