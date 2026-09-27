import { NextResponse } from "next/server";
import { sendMail } from "@/lib/mail";
import { gateForm } from "@/lib/protect";

/**
 * The contact form ("Contact Sales"). Behind the honeypot, the "I am human"
 * check and a limit per connection (lib/protect.js), the message goes to
 * the office mailbox (TC_OFFICE_EMAIL) with the person's details, so the
 * office can call them back. Without that address set it is logged only.
 */
export async function POST(request) {
  const body = await request.json().catch(() => null);
  const blocked = await gateForm(request, body, { form: "contact", limit: 5 });
  if (blocked) return blocked;

  const name = String(body?.name || "").trim().slice(0, 120);
  const email = String(body?.email || "").trim().slice(0, 200);
  const phone = String(body?.phone || "").trim().slice(0, 40);
  const message = String(body?.message || "").trim().slice(0, 2000);
  if (!name || !email || !phone) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  const to = process.env.TC_OFFICE_EMAIL;
  if (to) {
    await sendMail({
      to, subject: "TaxiCharg contact: " + name,
      heading: "Someone asked to be called back",
      paragraphs: [`${name} left their details on the TaxiCharg contact form.`, `Email: ${email}`, `Phone: ${phone}`, message ? `Message: ${message}` : ""].filter(Boolean),
    });
  } else {
    console.log("[contact] new lead (TC_OFFICE_EMAIL not set):", { name, email, phone, message, at: new Date().toISOString() });
  }
  return NextResponse.json({ ok: true });
}
