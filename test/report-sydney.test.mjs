// tc-0014 tests: Sydney days, the report's sums, the download.
//   node --import ./test/register.mjs --experimental-test-module-mocks --test test/report-sydney.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { sydneyDay, sydneyMidnight, sydneyWeekStart, addDays, sydneyMonthStart } from "../lib/time/sydney.js";
import { summarise, inSydneyRange, rowNet } from "../lib/money/report.js";
import { reportCsv } from "../lib/money/reportCsv.js";

test("S1 a Sydney morning is that Sydney day, not the UTC day before", () => {
  // 31 Oct 2026 08:00 Sydney (AEDT, UTC+11) = 30 Oct 21:00 UTC
  assert.equal(sydneyDay(new Date("2026-10-30T21:00:00Z")), "2026-10-31");
  assert.equal(sydneyDay(new Date("2026-10-31T02:28:00Z")), "2026-10-31");   // 1:28 pm
});
test("S2 Sydney midnight in summer (+11) and winter (+10)", () => {
  assert.equal(sydneyMidnight("2026-10-31").toISOString(), "2026-10-30T13:00:00.000Z");
  assert.equal(sydneyMidnight("2026-07-01").toISOString(), "2026-06-30T14:00:00.000Z");
});
test("S3 the nights daylight saving changes", () => {
  // starts Sun 4 Oct 2026 (02:00 -> 03:00); midnight is still +10 that night
  assert.equal(sydneyMidnight("2026-10-04").toISOString(), "2026-10-03T14:00:00.000Z");
  assert.equal(sydneyMidnight("2026-10-05").toISOString(), "2026-10-04T13:00:00.000Z");
  // ends Sun 5 Apr 2026 (03:00 -> 02:00)
  assert.equal(sydneyMidnight("2026-04-05").toISOString(), "2026-04-04T13:00:00.000Z");
  assert.equal(sydneyMidnight("2026-04-06").toISOString(), "2026-04-05T14:00:00.000Z");
});
test("S4 weeks start on a Sydney Monday; month and day arithmetic", () => {
  assert.equal(sydneyWeekStart(new Date("2026-10-31T02:28:00Z")), "2026-10-26");   // Sat 31 Oct
  assert.equal(sydneyWeekStart(new Date("2026-10-25T14:30:00Z")), "2026-10-26");   // Mon 26 Oct 1:30 am Sydney (still Sun in UTC)
  assert.equal(addDays("2026-10-31", 1), "2026-11-01");
  assert.equal(addDays("2026-03-01", -1), "2026-02-28");
  assert.equal(sydneyMonthStart(new Date("2026-10-31T13:30:00Z")), "2026-11-01");  // 12:30 am 1 Nov Sydney
});
test("S5 a report's From-To keeps a Sydney early-morning fare on its own day", () => {
  const rows = [{ date: "2026-09-30T14:30:00.000Z" }, { date: "2026-10-31T12:59:00.000Z" }, { date: "2026-10-31T13:00:00.000Z" }];
  // 1 Oct 00:30 Sydney is in; 31 Oct 23:59 Sydney is in; 1 Nov 00:00 Sydney is out
  assert.deepEqual(inSydneyRange(rows, "2026-10-01", "2026-10-31").map((r) => r.date), ["2026-09-30T14:30:00.000Z", "2026-10-31T12:59:00.000Z"]);
});

// ---- the sums (TC Test's real staging fare: $30, 5% service fee, no commission) ----
const tcFare = { date: "2026-10-31T02:28:00Z", status: "settled", total: 30, fee: 1.5, commission: 0, refundAmount: 0, net: 28.5, transactions: 1, method: "EFTPOS" };
test("R1 net to you is the fare less the service fee - $28.50, not the $30 card total", () => {
  const m = summarise([tcFare]);
  assert.equal(m.faceValue, 30); assert.equal(m.feesPaid, 1.5); assert.equal(m.commission, 0);
  assert.equal(m.netToYou, 28.5); assert.equal(m.transactions, 1); assert.equal(m.totalFeesAndRefunds, 1.5);
});
test("R2 with commission (Shakir, 1% on $20) and a takings report without net", () => {
  const sh = { status: "settled", total: 20, fee: 1, commission: 0.2, refundAmount: 0, net: 19.2, transactions: 1 };
  const rep = { status: "settled", total: 100, fee: 0, commission: 0, refundAmount: 10, transactions: 3 };
  assert.equal(rowNet(rep), 90);
  assert.equal(summarise([sh, rep]).netToYou, 109.2);
});
test("R3 a pending report does not count as money he has", () => {
  assert.equal(summarise([{ status: "pending", total: 50, fee: 0, commission: 0, refundAmount: 0 }]).netToYou, 0);
});

test("C1 the download: numbers on top, one line per fare, Excel-safe", () => {
  const csv = reportCsv({ name: "TC Test", from: "2026-10-01", to: "2026-10-31", metrics: summarise([tcFare]), paidOut: 28.5, balance: 0,
    rows: [tcFare, { ...tcFare, status: "voided", net: 0, note: "=HYPERLINK(\"x\")" }] });
  assert.match(csv, /^TaxiCharg report,TC Test\r\n/);
  assert.match(csv, /Net to you after fees,28\.50\r\n/);
  assert.match(csv, /Paid out to you,28\.50\r\n/);
  assert.match(csv, /"31\/10\/2026, 13:28",settled,EFTPOS,,30\.00,1\.50,0\.00,0\.00,28\.50,\r\n/);
  assert.match(csv, /,voided,.*,0\.00,"'=HYPERLINK\(""x""\)"\r\n/);
});
