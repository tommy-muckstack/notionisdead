"use client";
import { useState } from "react";
import Link from "next/link";
import type { FirebaseClientConfig } from "@/lib/isdead-auth/config";
import { signInWithEmail, signUpWithEmail, signInWithGoogle, resetPassword, authErrorMessage } from "@/lib/isdead-auth/client";
import { BP } from "@/lib/basepath";
import { NtMark } from "@/components/NtHome";
import "./ntlogin.css";

const G = <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden><path fill="#4285F4" d="M23 12.3c0-.8-.1-1.5-.2-2.2H12v4.2h6.2a5.3 5.3 0 01-2.3 3.5v2.9h3.7c2.2-2 3.4-5 3.4-8.4z" /><path fill="#34A853" d="M12 23.5c3.1 0 5.7-1 7.6-2.8l-3.7-2.9c-1 .7-2.3 1.1-3.9 1.1-3 0-5.5-2-6.4-4.7H1.8v3A11.5 11.5 0 0012 23.5z" /><path fill="#FBBC05" d="M5.6 14.2a6.9 6.9 0 010-4.4v-3H1.8a11.5 11.5 0 000 10.4z" /><path fill="#EA4335" d="M12 5.4c1.7 0 3.2.6 4.4 1.7l3.3-3.3A11.5 11.5 0 001.8 6.8l3.8 3A6.9 6.9 0 0112 5.4z" /></svg>;
type Mode = "signin" | "signup" | "reset";
/** Same auth as every IsDead app: email + password (sign in / sign up / reset) and Google, in Notion's two-step layout. */
export function NtLogin({ config, demo, to, mode: initialMode = "signin" }: { config: FirebaseClientConfig | null; demo: boolean; to: string; mode?: Mode }) {
  const [mode, setMode] = useState<Mode>(initialMode); const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState(""), [password, setPassword] = useState(""), [busy, setBusy] = useState(false), [err, setErr] = useState(""), [note, setNote] = useState("");
  const session = `${BP}/api/session`;
  const run = async (f: () => Promise<void>) => { setBusy(true); setErr(""); setNote(""); try { await f(); } catch (e) { setErr(authErrorMessage(e)); } finally { setBusy(false); } };
  const go = (m: Mode) => { setMode(m); setStep(1); setErr(""); setNote(""); setPassword(""); };
  const submit = (e: React.FormEvent) => { e.preventDefault();
    if (step === 1 && mode !== "reset") { setStep(2); setErr(""); return; }
    if (!config) { setErr("Sign-in isn't configured on this deployment yet."); return; }
    if (mode === "reset") return run(async () => { await resetPassword(config, email); setNote("If that email has an account, a reset link is on its way."); go("signin"); });
    run(async () => { if (mode === "signup") await signUpWithEmail(config, session, email, password); else await signInWithEmail(config, session, email, password); window.location.assign(to); }); };
  const su = mode === "signup";
  const google = () => run(async () => { await signInWithGoogle(config!, session); window.location.assign(to); });
  const form = <div className="ntl-card" data-testid="login-card" data-mode={mode} data-step={step}>
    <div className="ntl-mk"><NtMark s={22} /></div>
    <h1>{su ? "Your workspace, your browser." : mode === "reset" ? "Reset your password" : "Think it. Make it."}<span>{su ? "Sign up with your email" : mode === "reset" ? "We'll email you a reset link" : "Log in to your NotionIsDead account"}</span></h1>
    <form onSubmit={submit}>
      <label htmlFor="nt-email">{su ? "Work email" : "Email"}</label>
      <input id="nt-email" type="email" required autoComplete="email" placeholder={su ? "name@company.com" : "Enter your email address..."} value={email} onChange={e => setEmail(e.target.value)} readOnly={step === 2 && mode !== "reset"} />
      {step === 2 && mode !== "reset" && <><label htmlFor="nt-pass">Password</label><input id="nt-pass" type="password" required minLength={6} autoFocus autoComplete={su ? "new-password" : "current-password"} value={password} onChange={e => setPassword(e.target.value)} /></>}
      {step === 1 && (su ? <p className="tip"><b>Tip:</b> Any email works. Your pages stay in this browser and are attached to the account on first sign-in.</p> : mode === "signin" && <p className="hint">Use the same account as your other IsDead apps.</p>)}
      <button className="ntl-go" disabled={busy}>{mode === "reset" ? "Email me a reset link" : step === 2 && su ? "Create account" : step === 2 ? "Log in" : "Continue"}</button>
    </form>
    {err && <p role="alert" className="err">{err}</p>}{note && <p role="status" className="hint">{note}</p>}
    {step === 2 && <p className="sw"><a href={`${BP}/login${su ? "?mode=signup" : ""}`} onClick={e => { e.preventDefault(); setStep(1); setPassword(""); }}>Use a different email</a></p>}
    {mode !== "reset" && <><div className="or"><i /><span>or continue with</span><i /></div>
      <div className="prov one"><button type="button" disabled={busy || !config} onClick={google}>{G}Google</button></div></>}
    <p className="sw">{su ? <>Existing user? <a href={`${BP}/login`} onClick={e => { e.preventDefault(); go("signin"); }}>Log in</a></> : mode === "reset" ? <a href={`${BP}/login`} onClick={e => { e.preventDefault(); go("signin"); }}>Back to log in</a> : <>New user? <a href={`${BP}/login?mode=signup`} onClick={e => { e.preventDefault(); go("signup"); }}>Sign up</a>{step === 2 && <> · <a href={`${BP}/login?mode=reset`} onClick={e => { e.preventDefault(); go("reset"); }}>Forgot password?</a></>}</>}</p>
    <p className="tos">By continuing, you acknowledge that you understand and agree to the <Link href="/legal#terms">Terms &amp; Conditions</Link> and <Link href="/legal#privacy">Privacy Policy</Link></p>
    {!config && <p role="status" className="hint cfg">Sign-in not configured. Email and Google sign-in turn on once Firebase is set up.</p>}
    {demo && <button type="button" className="ntl-demo" onClick={async () => { const r = await fetch(`${BP}/api/session/demo`, { method: "POST" }); if (r.ok) window.location.assign(to); }}>Use the demo account</button>}
    <p className="sw"><Link href="/app">Continue as a guest instead →</Link></p>
  </div>;
  return su
    ? <main className="ntl ntl-su"><div className="bk"><div className="sb">{Array.from({ length: 11 }).map((_, i) => <i key={i} />)}</div><div className="cv"><div className="cov" /></div></div><div className="ov" /><div className="md">{form}</div></main>
    : <main className="ntl"><div className="ntl-col">{form}</div><div className="lang">🌐 Language: English (US)</div></main>;
}
