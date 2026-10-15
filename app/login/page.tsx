import { BP } from "@/lib/basepath";
import { demoEnabled } from "@/lib/session";
import { firebaseClientConfig, firebaseConfigured } from "@/lib/isdead-auth/config";
import { NtLogin } from "@/components/NtLogin";
export const dynamic = "force-dynamic";
export default async function Login({ searchParams }: { searchParams: Promise<{ callbackUrl?: string; mode?: string }> }) {
  const { callbackUrl, mode } = await searchParams;
  const rel = callbackUrl?.startsWith(BP + "/") ? callbackUrl.slice(BP.length) : callbackUrl;
  const to = BP + (rel && /^\/(?!\/)/.test(rel) ? rel : "/app");
  return <NtLogin config={firebaseConfigured() ? firebaseClientConfig() : null} demo={demoEnabled()} to={to} signup={mode === "signup"} />;
}
