/**
 * tc-0014 (31 Oct 2026) - Sydney days on a server that runs in UTC.
 * Vercel's clock is UTC: "today", "this week" and a report's From/To were
 * UTC days, so a fare taken in Sydney before 10 or 11 am counted on the day
 * before. Every day boundary on TaxiCharg is now a Sydney one.
 */
const TZ = "Australia/Sydney";

/** Sydney's offset from UTC at that moment, in minutes (600 or 660). */
export function sydneyOffsetMin(at) {
  const name = new Intl.DateTimeFormat("en-US", { timeZone: TZ, timeZoneName: "longOffset" })
    .formatToParts(at).find((p) => p.type === "timeZoneName")?.value || "GMT+10:00";
  const m = /GMT([+-])(\d{1,2}):?(\d{2})?/.exec(name);
  return m ? (m[1] === "-" ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3] || 0)) : 600;
}

/** The Sydney date (YYYY-MM-DD) of a moment. */
export function sydneyDay(at = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(at));
}

/** A Sydney date plus n days. */
export function addDays(day, n) {
  const t = new Date(`${day}T12:00:00Z`);
  t.setUTCDate(t.getUTCDate() + n);
  return t.toISOString().slice(0, 10);
}

/** The moment Sydney's day begins (00:00 Sydney), as a Date. */
export function sydneyMidnight(day) {
  const base = Date.parse(`${day}T00:00:00Z`);
  let t = base - sydneyOffsetMin(new Date(base)) * 60000;
  t = base - sydneyOffsetMin(new Date(t)) * 60000;   // again, in case daylight saving changes that night
  return new Date(t);
}

/** Monday of the Sydney week a moment falls in (YYYY-MM-DD). */
export function sydneyWeekStart(at) {
  const day = sydneyDay(at);
  const dow = new Date(`${day}T12:00:00Z`).getUTCDay();   // 0 Sunday
  return addDays(day, -((dow + 6) % 7));
}

/** The first of the Sydney month (YYYY-MM-DD). */
export function sydneyMonthStart(at = new Date()) {
  return sydneyDay(at).slice(0, 8) + "01";
}
