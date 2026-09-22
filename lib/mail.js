/**
 * Taxi Charge's own email. Password resets and sign-up requests go out
 * from a Taxi Charge address, in Taxi Charge wording, so a Taxi Charge
 * user never sees the other brand. Plain SMTP (Hostinger or any mailbox):
 *
 *   TC_SMTP_HOST, TC_SMTP_PORT (465 or 587), TC_SMTP_USER, TC_SMTP_PASS
 *   TC_MAIL_FROM      e.g. "TaxiCharg <noreply@taxicharg.com.au>"
 *   TC_OFFICE_EMAIL   where sign-up requests go (the office)
 *
 * Not configured: nothing is sent and the caller is told so.
 */
import nodemailer from "nodemailer";

export function mailConfigured() {
  return !!(process.env.TC_SMTP_HOST && process.env.TC_SMTP_USER && process.env.TC_SMTP_PASS && process.env.TC_MAIL_FROM);
}

export async function sendMail({ to, subject, heading, paragraphs = [], button }) {
  if (!mailConfigured()) return { sent: false, skipped: "mail not configured" };
  const port = Number(process.env.TC_SMTP_PORT || 465);
  const transport = nodemailer.createTransport({
    host: process.env.TC_SMTP_HOST, port, secure: port === 465,
    auth: { user: process.env.TC_SMTP_USER, pass: process.env.TC_SMTP_PASS },
  });
  const esc = (s) => String(s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const html = `
  <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;color:#141a25;">
    <div style="padding:22px 0 10px;font-weight:800;font-size:20px;letter-spacing:-.02em;">TAXI<span style="display:inline-block;background:linear-gradient(135deg,#faa638,#eb5835);color:#fff;border-radius:999px;width:22px;height:22px;line-height:22px;text-align:center;font-size:15px;margin:0 3px;">C</span><span style="color:#f97d23;">HARG</span></div>
    <h2 style="font-size:19px;margin:8px 0 14px;">${esc(heading || subject)}</h2>
    ${paragraphs.map((p) => `<p style="font-size:15px;line-height:1.55;margin:0 0 12px;">${esc(p)}</p>`).join("")}
    ${button ? `<p style="margin:20px 0;"><a href="${esc(button.url)}" style="display:inline-block;background:#f97d23;color:#fff;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:10px;">${esc(button.label)}</a></p><p style="font-size:12px;color:#4a5a68;">If the button does not work, copy this link: ${esc(button.url)}</p>` : ""}
    <p style="font-size:12px;color:#4a5a68;margin-top:26px;border-top:1px solid #e5e7eb;padding-top:12px;">TaxiCharg · Driver payment solution</p>
  </div>`;
  const text = [heading || subject, "", ...paragraphs, button ? `${button.label}: ${button.url}` : ""].join("\n");
  try {
    await transport.sendMail({ from: process.env.TC_MAIL_FROM, to, subject, html, text });
    return { sent: true, via: "smtp" };
  } catch (err) {
    return { sent: false, error: err.message };
  }
}
