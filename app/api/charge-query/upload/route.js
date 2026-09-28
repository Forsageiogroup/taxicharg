import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { clientIp, rateHit, tooMany } from "@/lib/protect";

/**
 * A place to put the receipt photo (27 Sept, Query a charge). The browser
 * asks here for a one-off signed address and then sends the file straight
 * to storage - the file never passes through this function (whose body
 * limit is smaller than a phone photo) and no key is ever in the page.
 * The same private `applications` bucket the SYD CABS forms use, under
 * charge_query/, so the office sees it on the record like any other
 * attachment.
 */
const TYPES = { "image/jpeg": ".jpg", "image/png": ".png", "application/pdf": ".pdf" };
const MAX = 10 * 1024 * 1024;

export async function POST(request) {
  const ip = clientIp(request);
  if (!(await rateHit(`cq-upload:ip:${ip}`, 20, 900))) return tooMany("Too many uploads from this connection. Please wait 15 minutes.");
  const body = await request.json().catch(() => null);
  const type = String(body?.contentType || "");
  const size = Number(body?.size || 0);
  if (!TYPES[type]) return NextResponse.json({ error: "Please attach a JPG, PNG or PDF." }, { status: 400 });
  if (!(size > 0) || size > MAX) return NextResponse.json({ error: "That file is over 10 MB. A photo from your phone is fine - just not the original scan." }, { status: 400 });

  const safe = String(body?.fileName || "file").replace(/[^a-zA-Z0-9.\-_]/g, "_").slice(-80);
  // charge_query/ for a card charge query (the office sees it on the record);
  // contact/ for the contact form (a link goes in the office email)
  const kind = body?.kind === "contact" ? "contact" : "charge_query";
  const path = `${kind}/${Date.now()}-${Math.random().toString(36).slice(2)}-${safe}`;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "applications";
  const { data, error } = await db().storage.from(bucket).createSignedUploadUrl(path);
  if (error || !data) {
    console.error("[charge-query upload]", error);
    return NextResponse.json({ error: "Could not prepare the upload. Try again, or send the query without the photo." }, { status: 500 });
  }
  return NextResponse.json({ url: data.signedUrl, path, fileName: body?.fileName || safe });
}
