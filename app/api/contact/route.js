import { NextResponse } from "next/server";
import { sendMail } from "@/lib/mail";
import { gateForm } from "@/lib/protect";
import { db } from "@/lib/supabase";

/**
 * The contact form (28 Sept). Behind the honeypot, the "I am human" check
 * and a limit per connection (lib/protect.js), the message goes to the
 * office mailbox (TC_OFFICE_EMAIL) with the person's details, what it is
 * about, and a link to anything they attached (the file sits in the
 * private bucket under contact/; the link works for seven days). The
 * person gets a short acknowledgement. Without TC_OFFICE_EMAIL it is
 * logged only.
 */
const str = (v, n = 200) => String(v ?? "").trim().slice(0, n);

export async function POST(request) {
  const body = await request.json().catch(() => null);
  const blocked = await gateForm(request, body, { form: "contact", limit: 5 });
  if (blocked) return blocked;

  const name = `${str(body?.first, 60)} ${str(body?.last, 60)}`.trim() || str(body?.name, 120);
  const email = str(body?.email);
  const phone = str(body?.phone, 40);
  const topic = str(body?.topic, 80);
  const message = str(body?.message, 3000);
  if (!name || !email || !phone) {
    return NextResponse.json({ error: "Name, phone and email are required." }, { status: 400 });
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "That email address does not look right." }, { status: 400 });
  }

  // a link to the attachment, if any, that the office can open for a week
  const docs = (Array.isArray(body?.documents) ? body.documents : []).slice(0, 2)
    .filter((d) => d && typeof d.storagePath === "string" && d.storagePath.startsWith("contact/"));
  const links = [];
  for (const d of docs) {
    try {
      const bucket = process.env.SUPABASE_STORAGE_BUCKET || "applications";
      const { data } = await db().storage.from(bucket).createSignedUrl(d.storagePath, 7 * 24 * 3600);
      if (data?.signedUrl) links.push(`Attachment (${str(d.fileName, 80) || "file"}, link works 7 days): ${data.signedUrl}`);
    } catch (err) {
      console.error("[contact] signed url", err.message || err);
    }
  }

  const to = process.env.TC_OFFICE_EMAIL;
  if (to) {
    await sendMail({
      to, subject: `TaxiCharg contact${topic ? " - " + topic : ""}: ${name}`,
      heading: "Someone wrote to TaxiCharg",
      paragraphs: [
        `${name} sent a message through the contact form.${topic ? " It is about: " + topic + "." : ""}`,
        `Email: ${email}`, `Phone: ${phone}`,
        message ? `Message: ${message}` : "(No message - they asked to be called.)",
        ...links,
      ],
    });
    await sendMail({
      to: email, subject: "We have your message - TaxiCharg",
      heading: "Thanks - we have your message",
      paragraphs: [
        `Hi ${name.split(" ")[0]},`,
        `We have received your message${topic ? " about " + topic.toLowerCase() : ""}. One of the team will come back to you by email or phone.`,
        "If it is urgent, reply to this email.",
      ],
    });
  } else {
    console.log("[contact] new message (TC_OFFICE_EMAIL not set):", { name, email, phone, topic, message, docs, at: new Date().toISOString() });
  }
  return NextResponse.json({ ok: true });
}
