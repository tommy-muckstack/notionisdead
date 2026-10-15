"use client";
import { useEffect, useState } from "react";
import { BP } from "@/lib/basepath";
type H = { ok: boolean; at: string; app: string; signIn: string; guests: string; publishing: string };
export function StatusLive() {
  const [h, setH] = useState<H | null | "error">(null);
  useEffect(() => { fetch(`${BP}/api/health`, { cache: "no-store" }).then(r => r.json()).then(setH).catch(() => setH("error")); }, []);
  const rows: [string, string, boolean][] = h && h !== "error" ? [["Web app", "Operational", true], ["Sign-in (Firebase)", h.signIn === "configured" ? "Operational" : "Not configured on this deployment (guest mode works)", h.signIn === "configured"], ["Guest sessions", h.guests === "on" ? "Operational" : "Off", h.guests === "on"], ["Publishing", h.publishing === "firestore" ? "Operational (Firestore)" : "Local file store (development)", true]] : [];
  return <div className="nt-status" data-testid="status" aria-live="polite">{h === null ? <p>Checking…</p> : h === "error" ? <p className="bad">● Could not reach the health endpoint.</p> : <>{rows.map(([k, v, ok]) => <div key={k}><span>{k}</span><b className={ok ? "ok" : "warn"}>● {v}</b></div>)}<small>Checked {new Date(h.at).toLocaleString()}</small></>}</div>;
}
