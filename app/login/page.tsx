import { redirect } from "next/navigation";
import { BP } from "@/lib/basepath";
import { currentUser, demoEnabled } from "@/lib/session";
import { firebaseClientConfig, firebaseConfigured } from "@/lib/isdead-auth/config";
import { NtLogin } from "@/components/NtLogin";
export const dynamic = "force-dynamic";
export default async function Login({ searchParams }: { searchParams: Promise<{ callbackUrl?: string; mode?: string; email?: string }> }) {
  const { callbackUrl, mode } = await searchParams;
  const rel = callbackUrl?.startsWith(BP + "/") ? callbackUrl.slice(BP.length) : callbackUrl;
  const to = BP + (rel && /^\/(?!\/)/.test(rel) ? rel : "/app");
  // A signed-in user hitting /login goes straight to the app (guests still see the form so they can upgrade). Completing a link sign-in must render.
  const u = await currentUser(); if (u && !u.guest && mode !== "link") redirect(to);
  return <NtLogin config={firebaseConfigured() ? firebaseClientConfig() : null} demo={demoEnabled()} to={to} mode={mode === "signup" ? "signup" : mode === "reset" ? "reset" : mode === "link" ? "link" : "signin"} />;
}
