import { NextResponse } from "next/server";
import { firebaseConfigured, guestEnabled } from "@/lib/session";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";
/** Status page data: the app is static + browser storage; sign-in needs Firebase; publishing needs the document store. */
export async function GET() {
  return NextResponse.json({ ok: true, at: new Date().toISOString(), app: "up", signIn: firebaseConfigured() ? "configured" : "not configured", guests: guestEnabled() ? "on" : "off", publishing: process.env["FIREBASE_SERVICE_ACCOUNT_JSON"] ? "firestore" : "local files" });
}
