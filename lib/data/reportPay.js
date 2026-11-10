/**
 * DATA LAYER - GET PAID by a shift report (tc-0024, migration 368). The owner, 10 Nov 2026: one way to get card money -
 * end the shift on the terminal, scan the shift report in TaxiCharg, press GET PAID. Everything goes through 368's
 * functions: each card payment on a report is paid once ever, and the figures come from the card records.
 */
import { db } from "@/lib/supabase";

function fail(where, error) {
  const msg = String(error?.message || error || "");
  if (/does not exist|schema cache|PGRST202/i.test(msg)) {
    console.error(`[get paid] ${where}: migration 368 is not on this database`, msg);
    throw Object.assign(new Error("GET PAID is not switched on yet (TaxiCharg is setting it up)."), { status: 503 });
  }
  if (error?.code === "P0001") throw Object.assign(new Error(msg.slice(0, 300)), { status: 400 });
  console.error(`[get paid] ${where}:`, msg);
  throw Object.assign(new Error("TaxiCharg cannot be reached right now. Try again."), { status: 503 });
}
async function rpc(name, args) {
  const { data, error } = await db().rpc(name, args);
  if (error) fail(name, error);
  return data;
}

export const reportShare = (reportId) => rpc("takings_report_share", { p_report: reportId });
export const reportPay = (reportId, driverId, byName, requestId, expect, destination = "bank") =>
  rpc("takings_report_pay", { p_report: reportId, p_driver: driverId, p_staff: null, p_by_name: byName || null,
    p_request_id: requestId, p_expect: expect == null ? null : String(expect), p_note: null, p_destination: destination });
export const reportPayDone = (payoutId, ok, stripePayoutId, reason) =>
  rpc("takings_report_pay_done", { p_payout: payoutId, p_ok: Boolean(ok), p_stripe_payout: stripePayoutId || null, p_reason: reason || null });

const r2 = (n) => (n == null ? null : Math.round(Number(n) * 100) / 100);

/**
 * What the driver sees: the report, what it pays now and whether it was paid before. The Service Fee is never on the
 * driver's report (the owner, 10 Nov: "make sure the service fee must be out form their report") - his fares, his
 * commission, any refund, and what is his. The S710 side shows only the number of payments and what is his (31 Oct).
 * cardOn: the TaxiCharg Driver Card button shows only when the office has switched it on (368).
 */
export function payView(share) {
  if (!share || !share.reportId) return null;
  const stripe = share.provider === "stripe";
  const t = share.toPay || {};
  return {
    reportId: share.reportId, number: share.number, provider: stripe ? "stripe" : "clover",
    toPay: {
      payments: Number(t.payments || 0), amount: r2(t.amount) || 0,
      ...(stripe ? {} : { fares: r2(Number(t.card || 0) - Number(t.serviceFee || 0)) || 0, commission: r2(t.commission) || 0, refunded: r2(t.refunded) || 0 }),
    },
    waiting: (share.items || []).filter((x) => x.state === "not_in").length,
    cardOn: share.cardOn === true,
    lastPaid: share.lastPaid ? { at: share.lastPaid.at, amount: r2(share.lastPaid.amount), payments: Number(share.lastPaid.payments || 0) } : null,
  };
}

/**
 * tc-0024 (the owner, 10 Nov 2026: "make sure the service fee must be out form their report"): the FARES of a Clover
 * shift report - each card payment less its Service Fee, less what was refunded, voided ones out. From the SYD CABS
 * server's own record of each payment (never the paper). null when it cannot be worked out (the terminal then works it
 * out from the card total).
 */
export async function cloverFares(refs) {
  if (!Array.isArray(refs) || !refs.length) return null;
  const { data, error } = await db().from("clover_payments").select("clover_payment_id, total, refunded, service_fee, voided, status").in("clover_payment_id", refs.slice(0, 500));
  if (error) { console.error("[get paid] fares", error.message || error); return null; }
  let cents = 0;
  for (const p of data || []) {
    if (p.voided || p.status === "reversed") continue;
    const total = Number(p.total || 0), fee = Number(p.service_fee || 0), refunded = Number(p.refunded || 0);
    if (!(total > 0)) continue;
    cents += Math.round(Math.max(0, total - refunded) * (total - fee) / total * 100);
  }
  return cents / 100;
}
